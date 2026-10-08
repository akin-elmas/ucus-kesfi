import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ComponentProps } from 'react';
import flightsJson from '../case-kit/flights.json';
import type { FlightDto, FlightListResponse } from '../src/api/flight.types';
import { createQueryClient } from '../src/api/queryClient';
import { FlightListScreen } from '../src/screens/FlightListScreen';
import {
  __resetFavoritesStoreForTests,
  useFavoritesStore,
} from '../src/state/favoritesStore';

const flights = flightsJson as FlightDto[];

// ---------------------------------------------------------------------------
// Sahte servis: case-kit/server.js ile aynı filtre/sıralama/sayfalama kuralı.
// ---------------------------------------------------------------------------

function serveFlights(url: string): FlightListResponse {
  const q = new URL(url).searchParams;
  const page = Number(q.get('page') ?? '1');
  const limit = Number(q.get('limit') ?? '8');
  const sort = (q.get('sort') ?? 'price') as 'price' | 'duration';
  const onlyDirect = q.get('onlyDirect') === 'true';
  const key = sort === 'duration' ? 'durationMinutes' : 'priceMinor';
  const rows = flights
    .filter(f => !onlyDirect || f.stops === 0)
    .sort(
      (a, b) =>
        a[key] - b[key] ||
        Date.parse(a.departureAt) - Date.parse(b.departureAt) ||
        a.id.localeCompare(b.id),
    );
  const total = rows.length;
  const totalPages = Math.ceil(total / limit);
  return {
    items: rows.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total, totalPages, hasMore: page < totalPages, sort, onlyDirect },
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const errorBody = {
  error: { code: 'FLIGHTS_UNAVAILABLE', message: 'Uçuşlar geçici olarak alınamıyor.' },
};

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();
const requestedUrls = () => fetchMock.mock.calls.map(([url]) => new URL(url));
const idsOf = (res: FlightListResponse) => res.items.map(f => f.id);

/** Ekranda görünen kartların id'leri, sırasıyla. */
function visibleCardIds(): string[] {
  return screen
    .queryAllByTestId(/^flight-card-/)
    .map(el => String(el.props.testID).replace('flight-card-', ''));
}

// ---------------------------------------------------------------------------

type Props = ComponentProps<typeof FlightListScreen>;
let queryClient: QueryClient;
let navigate: jest.Mock;

async function renderScreen() {
  navigate = jest.fn();
  const navigation = { navigate } as unknown as Props['navigation'];
  const route = { key: 'FlightList-test', name: 'FlightList' } as Props['route'];
  return render(
    <QueryClientProvider client={queryClient}>
      <FlightListScreen navigation={navigation} route={route} />
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  queryClient = createQueryClient(); // retry: false
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  await AsyncStorage.clear();
  __resetFavoritesStoreForTests();
});

afterEach(() => {
  queryClient.clear();
});

// ---------------------------------------------------------------------------

describe('FlightListScreen — hata ve "Tekrar dene" (P1-1)', () => {
  it('servis hatasında mesaj gösterir; "Tekrar dene" ile liste gelir ve hata kalkar', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(500, errorBody))
      .mockImplementation(async url => jsonResponse(200, serveFlights(url)));

    await renderScreen();

    expect(await screen.findByTestId('list-error')).toBeTruthy();
    expect(
      screen.getByText('Uçuşlar şu anda yüklenemedi. Lütfen tekrar deneyin.'),
    ).toBeTruthy();
    expect(screen.queryByTestId('flight-list')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));

    expect(await screen.findByTestId('flight-card-FL004')).toBeTruthy();
    expect(screen.getByTestId('result-count')).toHaveTextContent('24 uçuş');
    expect(screen.queryByTestId('list-error')).toBeNull();
    expect(screen.queryByText('Bir sorun oluştu')).toBeNull();

    // Fiyata göre ilk sayfa, sunucu sırasıyla.
    expect(visibleCardIds()).toEqual(idsOf(serveFlights('http://x/flights?page=1&limit=8')));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestedUrls()[1].searchParams.get('page')).toBe('1');
  });
});

describe('FlightListScreen — filtre değişimi sayfalamayı sıfırlar', () => {
  it('"Yalnızca direkt" açılınca page=1&onlyDirect=true istenir, eski kartlar kalmaz', async () => {
    fetchMock.mockImplementation(async url => jsonResponse(200, serveFlights(url)));

    await renderScreen();
    await screen.findByTestId('flight-card-FL004');

    const first = requestedUrls()[0].searchParams;
    expect(first.get('page')).toBe('1');
    expect(first.get('onlyDirect')).toBe('false');
    expect(first.get('sort')).toBe('price');

    const allFlightsPage1 = visibleCardIds();
    // FL004 aktarmalı: direkt filtresinde gelmemeli.
    expect(allFlightsPage1).toContain('FL004');

    // Sonraki sayfayı da yükleyip sayfalamayı ilerlet (page=2).
    const list = screen.getByTestId('flight-list');
    await fireEvent(list, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } } });
    await fireEvent(list, 'contentSizeChange', 400, 2500);
    await fireEvent.scroll(list, {
      nativeEvent: {
        contentOffset: { x: 0, y: 1700 },
        contentSize: { height: 2500, width: 400 },
        layoutMeasurement: { height: 800, width: 400 },
      },
    });
    await waitFor(() =>
      expect(requestedUrls().some(u => u.searchParams.get('page') === '2')).toBe(true),
    );

    const callsBefore = fetchMock.mock.calls.length;
    await fireEvent(screen.getByTestId('filter-only-direct'), 'valueChange', true);

    await waitFor(() => expect(screen.getByTestId('result-count')).toHaveTextContent('17 uçuş'));

    const next = requestedUrls()[callsBefore].searchParams;
    expect(next.get('page')).toBe('1');
    expect(next.get('onlyDirect')).toBe('true');
    expect(next.get('sort')).toBe('price');

    const directPage1 = idsOf(serveFlights('http://x/flights?page=1&limit=8&onlyDirect=true'));
    expect(visibleCardIds()).toEqual(directPage1);
    for (const id of allFlightsPage1.filter(id => !directPage1.includes(id))) {
      expect(screen.queryByTestId(`flight-card-${id}`)).toBeNull();
    }
    // Ekrandaki her uçuş direkt.
    for (const id of visibleCardIds()) {
      expect(flights.find(f => f.id === id)!.stops).toBe(0);
    }
  });
});

describe('FlightListScreen — sırasız yanıt (P1-2)', () => {
  type Pending = {
    url: URL;
    resolve: () => void;
  };

  /**
   * Her isteği elle bırakılana kadar bekleten fetch. `honorAbort` true ise iptal edilen
   * istek AbortError ile reddedilir (gerçek fetch gibi); false ise sinyal yok sayılır ve
   * eski yanıt bırakıldığında yine de başarıyla döner (en kötü durum).
   */
  function deferredFetch(honorAbort: boolean) {
    const pending: Pending[] = [];
    fetchMock.mockImplementation(
      (url, init) =>
        new Promise<Response>((resolve, reject) => {
          const signal = init?.signal;
          if (honorAbort && signal) {
            signal.addEventListener('abort', () => {
              const err = new Error('Aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
          pending.push({
            url: new URL(url),
            resolve: () => resolve(jsonResponse(200, serveFlights(url))),
          });
        }),
    );
    const find = (sort: string) => {
      const hit = pending.find(p => p.url.searchParams.get('sort') === sort);
      if (!hit) throw new Error(`istek yok: sort=${sort}`);
      return hit;
    };
    return { pending, find };
  }

  it.each([
    ['abort sinyalini yok sayan servis', false],
    ['abort sinyaline uyan servis', true],
  ])('%s: geç dönen eski (price) yanıtı yeni (duration) sonucun üzerine yazmaz', async (_l, honorAbort) => {
    const net = deferredFetch(honorAbort);

    await renderScreen();
    await waitFor(() => expect(net.pending).toHaveLength(1));
    const priceReq = net.find('price');

    await fireEvent.press(screen.getByTestId('sort-duration'));
    await waitFor(() => expect(net.pending).toHaveLength(2));
    const durationReq = net.find('duration');
    expect(durationReq.url.searchParams.get('page')).toBe('1');

    const durationIds = idsOf(serveFlights(durationReq.url.toString()));
    const priceIds = idsOf(serveFlights(priceReq.url.toString()));
    expect(durationIds).not.toEqual(priceIds);

    // Önce yeni yanıt döner...
    await act(async () => durationReq.resolve());
    await waitFor(() => expect(visibleCardIds()).toEqual(durationIds));

    // ...sonra eski yanıt geç gelir.
    await act(async () => priceReq.resolve());
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(visibleCardIds()).toEqual(durationIds);
    expect(screen.getByTestId('result-count')).toHaveTextContent('24 uçuş');
    expect(screen.queryByTestId('list-error')).toBeNull();
    expect(screen.getByRole('button', { name: 'Sırala: En kısa süre', selected: true })).toBeTruthy();
  });
});

describe('FlightListScreen — kart ve favori dokunuşları', () => {
  it('favori butonu navigasyonu tetiklemez; karta basmak detayı açar', async () => {
    fetchMock.mockImplementation(async url => jsonResponse(200, serveFlights(url)));
    await act(() => useFavoritesStore.getState().hydrate());

    await renderScreen();
    const fav = await screen.findByTestId('favorite-FL004');

    await fireEvent.press(fav);

    expect(navigate).not.toHaveBeenCalled();
    expect(useFavoritesStore.getState().items.map(f => f.id)).toEqual(['FL004']);
    expect(screen.getByTestId('favorite-FL004')).toHaveTextContent('★Favoride');

    await fireEvent.press(screen.getByTestId('flight-card-FL004'));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('FlightDetail', { id: 'FL004' });
  });
});
