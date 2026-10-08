import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import flightsJson from '../case-kit/flights.json';
import type { FlightDto } from '../src/api/flight.types';
import { FavoritesScreen } from '../src/screens/FavoritesScreen';
import { WRITE_ERROR_MESSAGE, useFavoritesStore } from '../src/state/favoritesStore';

const flights = flightsJson as FlightDto[];
const byId = (id: string) => {
  const f = flights.find(x => x.id === id);
  if (!f) throw new Error(`fixture yok: ${id}`);
  return f;
};
const FL001 = byId('FL001');
const FL024 = byId('FL024');

type Props = ComponentProps<typeof FavoritesScreen>;
let navigate: jest.Mock;
let parentNavigate: jest.Mock;

async function renderScreen() {
  navigate = jest.fn();
  parentNavigate = jest.fn();
  const navigation = {
    navigate,
    getParent: jest.fn(() => ({ navigate: parentNavigate })),
  } as unknown as Props['navigation'];
  const route = { key: 'FavoriteList-test', name: 'FavoriteList' } as Props['route'];
  return render(<FavoritesScreen navigation={navigation} route={route} />);
}

function visibleCardIds(): string[] {
  return screen
    .queryAllByTestId(/^flight-card-/)
    .map(el => String(el.props.testID).replace('flight-card-', ''));
}

beforeEach(() => {
  useFavoritesStore.setState({ items: [], lastWriteError: null });
});

describe('FavoritesScreen', () => {
  it('favoriler eklenme sırasından bağımsız olarak kalkış saatine göre listelenir ve sayaç gösterilir', async () => {
    useFavoritesStore.setState({ items: [FL024, FL001], lastWriteError: null });

    await renderScreen();

    expect(visibleCardIds()).toEqual(['FL001', 'FL024']);
    expect(screen.getByTestId('favorites-count')).toHaveTextContent('2 favori uçuş');
    expect(screen.queryByTestId('favorites-empty')).toBeNull();
    expect(screen.queryByTestId('favorites-write-error')).toBeNull();
  });

  it('karta basınca detaya doğru id ile gider; favori butonu detayı açmaz', async () => {
    useFavoritesStore.setState({ items: [FL024, FL001], lastWriteError: null });
    await renderScreen();

    await fireEvent.press(screen.getByTestId('flight-card-FL024'));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('FlightDetail', { id: 'FL024' });

    navigate.mockClear();
    await fireEvent.press(screen.getByTestId('favorite-FL001'));
    expect(navigate).not.toHaveBeenCalled();
    expect(visibleCardIds()).toEqual(['FL024']);
    expect(useFavoritesStore.getState().items.map(f => f.id)).toEqual(['FL024']);
  });

  it('son favori çıkarılınca boş durum gösterilir ve store boşalır', async () => {
    useFavoritesStore.setState({ items: [FL024], lastWriteError: null });
    await renderScreen();
    expect(visibleCardIds()).toEqual(['FL024']);

    await fireEvent.press(screen.getByTestId('favorite-FL024'));

    expect(screen.queryByTestId('flight-card-FL024')).toBeNull();
    expect(screen.getByTestId('favorites-empty')).toBeOnTheScreen();
    expect(screen.getByText('Henüz favori uçuş yok')).toBeOnTheScreen();
    expect(screen.queryByTestId('favorites-count')).toBeNull();
    expect(useFavoritesStore.getState().items).toEqual([]);
    expect(navigate).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Uçuşlara göz at' }));
    expect(parentNavigate).toHaveBeenCalledWith('FlightsTab', { screen: 'FlightList' });
  });

  it('yazma hatası varsa ekran uyarıyı alert olarak gösterir', async () => {
    useFavoritesStore.setState({ items: [FL001], lastWriteError: WRITE_ERROR_MESSAGE });

    await renderScreen();

    const alert = screen.getByTestId('favorites-write-error');
    expect(alert).toHaveTextContent('Favori kaydedilemedi. Tekrar dene.');
    expect(alert).toHaveProp('accessibilityRole', 'alert');
    expect(screen.getByRole('alert')).toBe(alert);
    expect(visibleCardIds()).toEqual(['FL001']);
  });
});
