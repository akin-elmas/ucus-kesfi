import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type { FlightDto } from '../api/flight.types';
import { fetchFlightPage, type FlightFilters } from '../api/flights';

export function flightListQueryKey(filters: FlightFilters) {
  return ['flights', 'list', filters] as const;
}

/**
 * Sayfalı uçuş listesi.
 *
 * Sırasız yanıt (P1): queryKey filtreyi içerir, bu yüzden her filtre/sıralama ayrı bir
 * sorgudur. Geç dönen eski yanıt yalnız KENDİ anahtarına yazılır; ekran yeni anahtarı
 * izlediği için eski sonuç yeni listenin üzerine yazamaz. Ayrıca `signal` fetch'e
 * geçirilir: anahtar değişip eski sorgunun gözlemcisi kalmayınca TanStack isteği iptal eder.
 *
 * `gcTime: 0`: filtre değişince eski anahtarın sayfaları hemen atılır; aynı filtreye
 * geri dönüldüğünde sayfalama sayfa 1'den temiz başlar, eski sayfalar karışmaz.
 * (Detaya gidip dönmek ekranı unmount etmez; gözlemci aktif kaldığı için sayfalar korunur.)
 */
export type UseFlightListResult = {
  /** Yüklenen tüm sayfaların düzleştirilmiş hali (sunucu sırası). */
  flights: FlightDto[];
  /** Son başarılı sayfanın meta.total değeri; henüz veri yoksa undefined. */
  total: number | undefined;
  /** Herhangi bir istek sürüyor (ilk yükleme, yenileme veya sonraki sayfa). */
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  /** Son istek hata verdi (ilk yükleme veya sonraki sayfa). */
  isError: boolean;
  /** Hata sonraki sayfa isteğinden geldi; önceki sayfalar elde. */
  isFetchNextPageError: boolean;
  error: Error | null;
  /** Liste sonuna yaklaşınca çağrılır; guard'lı, aynı sayfayı iki kez istemez. */
  loadMore: () => void;
  /** "Tekrar dene": ilk yükleme hatasında refetch, sonraki sayfa hatasında fetchNextPage. */
  retry: () => void;
};

export function useFlightList(filters: FlightFilters): UseFlightListResult {
  const query = useInfiniteQuery({
    queryKey: flightListQueryKey(filters),
    queryFn: ({ pageParam, signal }) => fetchFlightPage(filters, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: lastPage => (lastPage.meta.hasMore ? lastPage.meta.page + 1 : undefined),
    gcTime: 0,
  });

  const {
    data,
    error,
    isFetching,
    isFetchingNextPage,
    isError,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = query;

  const flights = useMemo(() => data?.pages.flatMap(p => p.items) ?? [], [data]);
  const total = data && data.pages.length > 0 ? data.pages[data.pages.length - 1].meta.total : undefined;

  const loadMore = useCallback(() => {
    // fetchNextPage varsayılan cancelRefetch:true ile süren isteği iptal edip aynı sayfayı
    // yeniden ister; bu yüzden hem guard hem cancelRefetch:false. Hata varken de otomatik
    // istemeyiz — kullanıcı "Tekrar dene" ile ister.
    if (!hasNextPage || isFetchingNextPage || isFetching || isError) return;
    void fetchNextPage({ cancelRefetch: false });
  }, [hasNextPage, isFetchingNextPage, isFetching, isError, fetchNextPage]);

  const retry = useCallback(() => {
    if (isFetching) return;
    if (isFetchNextPageError) {
      // Elde olan sayfalar korunur; yalnız başarısız sayfa yeniden istenir.
      void fetchNextPage();
    } else {
      void refetch();
    }
  }, [isFetching, isFetchNextPageError, fetchNextPage, refetch]);

  return {
    flights,
    total,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    isError,
    isFetchNextPageError,
    error,
    loadMore,
    retry,
  };
}
