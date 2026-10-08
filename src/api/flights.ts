import { getJson } from './client';
import type {
  FlightDetailResponse,
  FlightListResponse,
  FlightSort,
} from './flight.types';

export const PAGE_SIZE = 8;

/** Listeyi belirleyen kullanıcı seçimleri. Varsayılan: filtre kapalı, en düşük fiyat. */
export type FlightFilters = {
  onlyDirect: boolean;
  sort: FlightSort;
};

export const DEFAULT_FILTERS: FlightFilters = { onlyDirect: false, sort: 'price' };

/**
 * /flights için query string üretir. Filtre ve sıralama sunucuda uygulanır;
 * istemci yalnızca parametreyi taşır.
 */
export function buildFlightListQuery(
  filters: FlightFilters,
  page: number,
  limit: number = PAGE_SIZE,
): string {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sort: filters.sort,
    onlyDirect: String(filters.onlyDirect),
  });
  return `/flights?${params.toString()}`;
}


export function fetchFlightPage(
  filters: FlightFilters,
  page: number,
  signal?: AbortSignal,
): Promise<FlightListResponse> {
  return getJson<FlightListResponse>(buildFlightListQuery(filters, page), signal);
}


export async function fetchFlight(id: string, signal?: AbortSignal) {
  const res = await getJson<FlightDetailResponse>(`/flights/${encodeURIComponent(id)}`, signal);
  return res.item;
}
