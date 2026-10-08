import { Platform } from 'react-native';
import type { ApiErrorResponse } from './flight.types';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function toUserMessage(error: unknown, subject: 'list' | 'detail' = 'list'): string {
  if (error instanceof ApiError) {
    if (error.code === 'FLIGHT_NOT_FOUND') return 'Bu uçuş artık bulunamıyor.';
    return subject === 'detail'
      ? 'Uçuş bilgisi şu anda yüklenemedi. Lütfen tekrar deneyin.'
      : 'Uçuşlar şu anda yüklenemedi. Lütfen tekrar deneyin.';
  }
  return 'Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.';
}

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { signal });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new ApiError('Network request failed', 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (body as ApiErrorResponse | null)?.error;
    throw new ApiError(err?.message ?? `HTTP ${res.status}`, res.status, err?.code);
  }
  return body as T;
}
