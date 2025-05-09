import { QueryClient } from '@tanstack/react-query';
import { API_BASE_URL, HTTP_STATUS } from './constants';

// Tipo para opções do fetcher
type FetcherOptions = {
  on401?: 'redirect' | 'returnNull';
};

// Cliente React Query para gerenciar o cache e consultas
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 segundos
      retry: 1,
      refetchOnWindowFocus: true, 
      gcTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

// Função auxiliar para fazer requisições HTTP
export async function apiRequest(
  method: string,
  url: string,
  body?: any,
  additionalHeaders?: Record<string, string>
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  const options: RequestInit = {
    method,
    headers,
    credentials: 'include', // Importante para incluir cookies
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  // Usar a URL completa, garantindo que os endpoints da API sejam acessados corretamente
  // Não importa se a URL já tiver o prefixo /api, isso garante que sempre será o endereço correto
  const fullUrl = url.startsWith('http') ? url : url;

  try {
    const response = await fetch(fullUrl, options);

    // Tratar erros 401 (não autorizado) - redirecionando para login
    if (response.status === HTTP_STATUS.UNAUTHORIZED) {
      console.log('Usuário não autenticado. Redirecionando para login...');
      
      // Limpar os dados do usuário no cache
      queryClient.setQueryData(['/api/auth/user'], null);

      // Verificar se já estamos na página de autenticação para evitar redirecionamento em loop
      if (!window.location.pathname.includes('/auth')) {
        console.log('Redirecionando para página de login...');
        window.location.href = '/auth';
      }
      return response;
    }

    return response;
  } catch (error) {
    console.error('Erro na requisição:', error);
    throw error;
  }
}

// Função para gerar o queryFn para useQuery
export function getQueryFn({ on401 = 'redirect' }: FetcherOptions = {}) {
  return async ({ queryKey }: { queryKey: unknown[] }): Promise<any> => {
    const [url] = queryKey as [string];

    try {
      const response = await apiRequest('GET', url);
      
      if (!response.ok) {
        if (response.status === HTTP_STATUS.UNAUTHORIZED && on401 === 'returnNull') {
          return null;
        }
        
        if (response.headers.get('content-type')?.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erro na requisição');
        } else {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
      }

      return await response.json();
    } catch (error) {
      console.error('Erro no getQueryFn:', error);
      throw error;
    }
  };
}