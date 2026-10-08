import {
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import type { FlightDto, FlightListResponse } from '../api/flight.types';
import { fetchFlight } from '../api/flights';
import { useFavoritesStore } from '../state/favoritesStore';

export const flightDetailKey = (id: string) => ['flights', 'detail', id] as const;

function findKnownFlight(queryClient: QueryClient, id: string): FlightDto | undefined {
  const lists = queryClient.getQueriesData<InfiniteData<FlightListResponse>>({
    queryKey: ['flights', 'list'],
  });
  for (const [, data] of lists) {
    for (const page of data?.pages ?? []) {
      const hit = page.items.find(f => f.id === id);
      if (hit) return hit;
    }
  }
  return useFavoritesStore.getState().items.find(f => f.id === id);
}

export function useFlight(id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: flightDetailKey(id),
    queryFn: ({ signal }) => fetchFlight(id, signal),
    initialData: () => findKnownFlight(queryClient, id),
  });
}
