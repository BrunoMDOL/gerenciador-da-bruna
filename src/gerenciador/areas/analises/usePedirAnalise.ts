import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { auditarGestor } from '@/gerenciador/lib/auditoria';
import { CHAVE, ChaveAusente, comecarRepeticao, emAndamento, pedirAnalise } from './dados';
import type { AnaliseNaTela, PedidoDeAnalise, RespostaDaAnalise } from './tipos';
import { rota } from '@/gerenciador/lib/rotas';

/**
 * Pede uma análise à edge function (período novo ou repetição de uma que
 * falhou). No 202 audita, recarrega e leva ao detalhe, que acompanha sozinho.
 * No 503 sem a chave da Anthropic, levanta `chaveAusente` para a tela mostrar
 * a pendência em vez de um toast.
 */
export function usePedirAnalise() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const qc = useQueryClient();
  const [chaveAusente, setChaveAusente] = useState(false);

  const m = useMutation<RespostaDaAnalise, Error, PedidoDeAnalise>({
    mutationFn: pedirAnalise,
    onSuccess: async (r, pedido) => {
      toast.success(`Análise nº ${r.analise_id} começou. A tela acompanha sozinha.`);
      if ('analise_id' in pedido && emAndamento(r.status)) {
        // O 202 sai antes de a função trocar 'falhou' por 'coletando'. A tela já
        // mostra a rodada na fila, e a releitura (segurarRepeticao) não volta
        // para a falha antiga: o acompanhamento de 5 s começa agora.
        qc.setQueryData<AnaliseNaTela | null>(CHAVE.detalhe(r.analise_id), (a) => (a ? comecarRepeticao(a) : a));
      }
      await auditarGestor({
        acao: 'gestor_analise_pedida',
        entidade: 'bruna_analises',
        entidadeId: r.analise_id,
        detalhes: { ...pedido, status: r.status },
      });
      await qc.invalidateQueries({ queryKey: CHAVE.tudo });
      const destino = rota(`/analises/${r.analise_id}`);
      // "Tentar de novo" já está no detalhe: sem entrada repetida no histórico.
      if (pathname !== destino) navigate(destino, { state: { de: `${pathname}${search}` } });
    },
    onError: (e, pedido) => {
      if (e instanceof ChaveAusente) {
        setChaveAusente(true);
        // Num "Tentar de novo", a função regrava a linha como falhou ("ANTHROPIC_API_KEY ausente"): a tela relê.
        if ('analise_id' in pedido) void qc.invalidateQueries({ queryKey: CHAVE.tudo });
        return;
      }
      toast.error(e.message || 'Não deu para pedir a análise.');
    },
  });

  return {
    pedir: m.mutate,
    ocupado: m.isPending,
    chaveAusente,
    limparChaveAusente: () => setChaveAusente(false),
  };
}
