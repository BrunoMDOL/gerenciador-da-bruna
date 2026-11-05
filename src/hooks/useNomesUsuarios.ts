import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const NOMES_USUARIOS_KEY = ['usuarios_nome'] as const;

/**
 * Nome de cada login do painel, por user_id. É o que a conversa mostra no lugar
 * de "Atendente" (`mensagens.enviado_por`). A lista é curta e muda pouco: uma
 * busca serve a todas as conversas abertas.
 */
export function useNomesUsuarios() {
  const { data } = useQuery({
    queryKey: NOMES_USUARIOS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('usuarios_nome').select('user_id, nome');
      if (error) throw error;
      return new Map((data ?? []).map((u) => [u.user_id, u.nome] as const));
    },
    staleTime: 10 * 60 * 1000,
  });
  return data ?? new Map<string, string>();
}
