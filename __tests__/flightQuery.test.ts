import {
  buildFlightListQuery,
  DEFAULT_FILTERS,
  PAGE_SIZE,
  type FlightFilters,
} from '../src/api/flights';
import { flightListQueryKey } from '../src/hooks/useFlightList';

function parse(query: string) {
  const [path, search = ''] = query.split('?');
  const params = new URLSearchParams(search);
  return { path, params, entries: Object.fromEntries(params.entries()) };
}

describe('buildFlightListQuery', () => {
  it('varsayılan filtre: ilk sayfa, 8 kayıt, fiyata göre, direkt filtresi kapalı', () => {
    const { path, entries } = parse(buildFlightListQuery(DEFAULT_FILTERS, 1));

    expect(path).toBe('/flights');
    expect(entries).toEqual({
      page: '1',
      limit: '8',
      sort: 'price',
      onlyDirect: 'false',
    });
    expect(PAGE_SIZE).toBe(8);
  });

  it('yalnızca direkt + en kısa süre seçilince parametreler sunucuya taşınır', () => {
    const filters: FlightFilters = { onlyDirect: true, sort: 'duration' };
    const { params } = parse(buildFlightListQuery(filters, 1));

    expect(params.get('onlyDirect')).toBe('true');
    expect(params.get('sort')).toBe('duration');
    expect(params.get('page')).toBe('1');
    expect(params.get('limit')).toBe('8');
  });

  it('her parametre tam bir kez gönderilir (tekrarlanan anahtar yok)', () => {
    const { params } = parse(buildFlightListQuery({ onlyDirect: true, sort: 'duration' }, 2));
    for (const key of ['page', 'limit', 'sort', 'onlyDirect']) {
      expect(params.getAll(key)).toHaveLength(1);
    }
  });

  it('istenen sayfa numarası sorguya taşınır, filtreler korunur', () => {
    const filters: FlightFilters = { onlyDirect: true, sort: 'price' };
    const { params } = parse(buildFlightListQuery(filters, 3));

    expect(params.get('page')).toBe('3');
    expect(params.get('onlyDirect')).toBe('true');
    expect(params.get('sort')).toBe('price');
  });

  it('özel limit verilirse kullanılır', () => {
    const { params } = parse(buildFlightListQuery(DEFAULT_FILTERS, 1, 20));
    expect(params.get('limit')).toBe('20');
  });

  it.each([
    [{ onlyDirect: false, sort: 'price' }, 'false', 'price'],
    [{ onlyDirect: true, sort: 'price' }, 'true', 'price'],
    [{ onlyDirect: false, sort: 'duration' }, 'false', 'duration'],
    [{ onlyDirect: true, sort: 'duration' }, 'true', 'duration'],
  ] as [FlightFilters, string, string][])(
    '%o filtresi sunucuya onlyDirect=%s, sort=%s olarak gider',
    (filters, onlyDirect, sort) => {
      const { params } = parse(buildFlightListQuery(filters, 1));
      expect(params.get('onlyDirect')).toBe(onlyDirect);
      expect(params.get('sort')).toBe(sort);
    },
  );
});

describe('flightListQueryKey', () => {
  it('her filtre kombinasyonu ayrı bir sorgu anahtarı üretir', () => {
    const combos: FlightFilters[] = [
      { onlyDirect: false, sort: 'price' },
      { onlyDirect: true, sort: 'price' },
      { onlyDirect: false, sort: 'duration' },
      { onlyDirect: true, sort: 'duration' },
    ];
    const keys = combos.map(f => JSON.stringify(flightListQueryKey(f)));
    expect(new Set(keys).size).toBe(combos.length);
  });

  it('aynı filtre aynı anahtarı üretir', () => {
    expect(flightListQueryKey({ onlyDirect: true, sort: 'duration' })).toEqual(
      flightListQueryKey({ onlyDirect: true, sort: 'duration' }),
    );
  });
});
