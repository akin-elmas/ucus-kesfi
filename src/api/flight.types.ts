/**
 * Servisin döndürdüğü ham veri tipleri (wire format).
 * Bu dosyayı olduğu gibi projene alabilirsin; sözleşmenin parçasıdır.
 *
 * Not: Bunlar API'nin döndürdüğü şekli tanımlar. Ekranlarında kullanacağın
 * domain modelini (ör. formatlanmış fiyat, favori bayrağı) kendin tasarla.
 */

export type Airport = {
  code: string;
  city: string;
  name: string;
};

export type FlightDto = {
  id: string;
  flightNumber: string;
  airline: string;
  origin: Airport;
  destination: Airport;
  /** ISO 8601, +03:00 ofsetli. Gösterim Europe/Istanbul. */
  departureAt: string;
  /** ISO 8601, +03:00 ofsetli. Ertesi güne sarkabilir. */
  arrivalAt: string;
  /** Toplam yolculuk süresi (dakika). */
  durationMinutes: number;
  /** 0 = direkt, 1 = aktarmalı. */
  stops: 0 | 1;
  /** TRY kuruş. 355000 => 3.550,00 TL */
  priceMinor: number;
  currency: 'TRY';
  /** 0 = bagaj dahil değil, null = bilgi yok. İkisi farklı anlam taşır. */
  baggageKg: number | null;
};

export type FlightSort = 'price' | 'duration';

export type FlightListQuery = {
  page?: number;
  limit?: number;
  sort?: FlightSort;
  onlyDirect?: boolean;
  /** Toplu getirme: verilirse yalnizca bu kimlikler doner, onlyDirect uygulanmaz. */
  ids?: string[];
};

export type FlightListMeta = {
  page: number;
  limit: number;
  /** Filtre uygulandıktan sonraki toplam kayıt sayısı. */
  total: number;
  totalPages: number;
  hasMore: boolean;
  sort: FlightSort;
  onlyDirect: boolean;
};

export type FlightListResponse = {
  items: FlightDto[];
  meta: FlightListMeta;
};

export type FlightDetailResponse = {
  item: FlightDto;
};

export type ApiErrorResponse = {
  error: {
    code:
      | 'FLIGHTS_UNAVAILABLE'
      | 'FLIGHT_NOT_FOUND'
      | 'INVALID_SORT'
      | 'TOO_MANY_IDS'
      | 'NOT_FOUND';
    message: string;
  };
};
