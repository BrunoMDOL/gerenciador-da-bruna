import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CartaoDeSugestao, Erro, Painel } from '@/gerenciador/componentes';
import { useGestor } from '@/gerenciador/lib/acesso';
import type { TipoSugestao } from '@/gerenciador/lib/tipos';
import { CHAVES, invalidarOutrasAreas } from '../chaves';
import { listarSugestoesAbertas } from './sugestoes';
import { plural } from './texto';

/**
 * As sugestões abertas (da análise ou do copiloto) sobre o assunto desta aba,
 * no mesmo cartão de Análises e do Copiloto. Sem sugestão aberta, nada aparece;
 * se a leitura falha, o erro aparece, para não passar por "nenhuma sugestão".
 */
export function SugestoesDaArea({ tipo, recarregar, className }: { tipo: TipoSugestao; recarregar: readonly unknown[]; className?: string }) {
  const { user, email } = useGestor();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: CHAVES.sugestoes(tipo), queryFn: () => listarSugestoesAbertas(tipo) });
  if (q.isError && !q.data) {
    return (
      <Painel titulo="Sugestões abertas" className={className}>
        <Erro mensagem={q.error.message} tentar={() => void q.refetch()} />
      </Painel>
    );
  }
  const sugestoes = q.data ?? [];
  if (!sugestoes.length) return null;

  const aoMudar = () => {
    void qc.invalidateQueries({ queryKey: CHAVES.sugestoes(tipo) });
    void qc.invalidateQueries({ queryKey: [...recarregar] });
    invalidarOutrasAreas(qc, 'sugestoes');
  };

  return (
    <Painel titulo="Sugestões abertas" nota={plural(sugestoes.length, 'esperando decisão', 'esperando decisão')} className={className}>
      <div className="grid gap-3 lg:grid-cols-2">
        {sugestoes.map((s) => (
          <CartaoDeSugestao key={s.id} sugestao={s} quem={{ email, userId: user?.id ?? null }} aoMudar={aoMudar} mostrarOrigem />
        ))}
      </div>
    </Painel>
  );
}
