import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 12 * 60 * 60 * 1000, gcTime: 24 * 60 * 60 * 1000, retry: false, refetchOnWindowFocus: false }, mutations: { retry: false } } });
