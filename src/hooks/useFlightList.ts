import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import type { FlightDto } from '../api/flight.types';
import { fetchFlightPage, type FlightFilters } from '../api/flights';

export function flightListQueryKey(filters: FlightFilters) {
  return ['flights', 'list', filters] as const;
}

type UseFlightListResult = {
  flights: FlightDto[];
  total: number | undefined;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
  error: Error | null;
  loadMore: () => void;
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
  const total =
    data && data.pages.length > 0 ? data.pages[data.pages.length - 1].meta.total : undefined;

  const loadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || isFetching || isError) return;
    void fetchNextPage({ cancelRefetch: false });
  }, [hasNextPage, isFetchingNextPage, isFetching, isError, fetchNextPage]);

  const retry = useCallback(() => {
    if (isFetching) return;
    if (isFetchNextPageError) {
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
