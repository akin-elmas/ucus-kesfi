import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Hata kullanıcıya hemen gösterilir; yeniden deneme "Tekrar dene" ile kullanıcıdadır.
        retry: false,
        // Veri sabit: listeye dönüşte yeniden çekme yok, yüklenmiş sayfalar korunur.
        staleTime: Infinity,
        refetchOnWindowFocus: false,
      },
    },
  });
}
