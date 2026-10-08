import {
  buildFlightListQuery,
  buildFlightsByIdsQuery,
  DEFAULT_FILTERS,
  PAGE_SIZE,
  type FlightFilters,
} from '../src/api/flights';

/** "/flights?a=1&b=2" -> { path, params } — sıra/encoding'e bağımlı olmadan doğrulamak için. */
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

  describe('filtre değişince sayfalama başa döner', () => {
    // Sayfa 3'e kadar ilerlenmiş bir listede kullanıcı filtreyi/sıralamayı değiştiriyor.
    const changes: Array<[string, FlightFilters]> = [
      ['DEFAULT_FILTERS', DEFAULT_FILTERS],
      ['yalnızca direkt açıldı', { ...DEFAULT_FILTERS, onlyDirect: true }],
      ['sıralama süreye çevrildi', { ...DEFAULT_FILTERS, sort: 'duration' }],
      ['ikisi birden', { onlyDirect: true, sort: 'duration' }],
    ];

    it.each(changes)('%s: yeni sonucun ilk sorgusu page=1', (_label, filters) => {
      const before = parse(buildFlightListQuery({ onlyDirect: false, sort: 'price' }, 3));
      expect(before.params.get('page')).toBe('3');

      const after = parse(buildFlightListQuery(filters, 1));
      expect(after.params.get('page')).toBe('1');
      expect(after.params.get('sort')).toBe(filters.sort);
      expect(after.params.get('onlyDirect')).toBe(String(filters.onlyDirect));
    });

    it('farklı filtreler farklı sorgu üretir (eski sayfalar yeni sonuca karışamaz)', () => {
      const queries = changes.map(([, f]) => buildFlightListQuery(f, 1));
      expect(new Set(queries).size).toBe(queries.length);
    });
  });
});

describe('buildFlightsByIdsQuery', () => {
  it('kimlikleri virgülle tek parametrede, limit=50 ve fiyat sırasıyla gönderir', () => {
    const { path, params } = parse(buildFlightsByIdsQuery(['FL001', 'FL007', 'FL013']));

    expect(path).toBe('/flights');
    expect(params.get('ids')).toBe('FL001,FL007,FL013');
    expect(params.get('ids')!.split(',')).toEqual(['FL001', 'FL007', 'FL013']);
    expect(params.get('limit')).toBe('50');
    expect(params.get('sort')).toBe('price');
  });

  it('sıralama parametresi verilirse kullanılır; onlyDirect gönderilmez', () => {
    const { params } = parse(buildFlightsByIdsQuery(['FL024'], 'duration'));

    expect(params.get('sort')).toBe('duration');
    expect(params.has('onlyDirect')).toBe(false);
    expect(params.has('page')).toBe(false);
  });
});
