import { QueryClient } from "@tanstack/react-query";


export const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 5 * 60 * 1000, 
        refetchOnMount: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
};

export const queryClient = createQueryClient();
