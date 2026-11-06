import { useNavigate } from 'react-router-dom';
import { Erro, Esqueleto, Medida } from '@/gerenciador/componentes';
import { duracao, numero, pct, variacao } from '@/gerenciador/lib/formatos';
import type { Metricas } from '@/gerenciador/lib/tipos';
import { cn } from '@/lib/utils';
import { useMetricas, type Dias } from './dados';
import { ROTAS, rotaDeLeads } from './rotas';
import { n } from './util';

const GRADE = 'grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-5';

type Campo = keyof Metricas;

function comparar(a: Metricas, b: Metricas, campo: Campo, inverso = false) {
  const atual = a[campo], anterior = b[campo];
  if (typeof atual !== 'number' || typeof anterior !== 'number') return undefined;
  return { ...variacao(atual, anterior), inverso };
}

/**
 * As dez medidas do período, cada uma com a variação contra o período de
 * comparação (os N dias anteriores; com "hoje", ontem até esta hora; com
 * "ontem", anteontem) e o caminho até a lista que a explica. A legenda embaixo
 * diz com o que se compara. Onde subir não é nem bom nem ruim (silêncios,
 * FUP90), a nota diz quanto era, sem cor.
 */
export function Medidas({ dias, className }: { dias: Dias; className?: string }) {
  const q = useMetricas(dias);
  const navigate = useNavigate();
  const ir = (rota: string) => () => navigate(rota);

  if (q.isPending) {
    return (
      <div role="status" aria-label="Carregando as medidas" className={cn(GRADE, className)}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-md border border-dashed border-croqui-rule px-4 py-3">
            <Esqueleto linhas={2} />
          </div>
        ))}
      </div>
    );
  }
  if (q.isError) {
    return <div className={className}><Erro mensagem={q.error.message} tentar={() => q.refetch()} /></div>;
  }

  const a = q.data.atual;
  const b = q.data.anterior;
  const encErro = n(a.encaminhamentos_com_erro);
  const chamErro = n(a.chamados_com_erro);
  const graves = n(a.revisoes_graves);

  return (
    <div className={cn(GRADE, className)}>
      <Medida
        rotulo="Leads atendidos"
        valor={numero(a.atendidos)}
        nota={`${numero(a.novos)} novos no período`}
        variacao={comparar(a, b, 'atendidos')}
        onClick={ir(rotaDeLeads())}
      />
      <Medida
        rotulo="Responderam"
        valor={numero(a.responderam)}
        nota="leads que escreveram"
        variacao={comparar(a, b, 'responderam')}
        onClick={ir(rotaDeLeads())}
      />
      <Medida
        rotulo="Agendados pela Bruna"
        valor={numero(a.agendados_bruna)}
        nota={`${pct(a.agendados_bruna, a.atendidos)} dos atendidos · ${numero(a.agendados)} no total`}
        variacao={comparar(a, b, 'agendados_bruna')}
        onClick={ir(rotaDeLeads({ filtro: 'agendados' }))}
      />
      <Medida
        rotulo="Convites"
        valor={numero(a.convites)}
        nota={`${pct(a.convites, a.atendidos)} dos atendidos receberam`}
        variacao={comparar(a, b, 'convites')}
        onClick={ir(rotaDeLeads())}
      />
      <Medida
        rotulo="Encaminhamentos"
        valor={numero(a.encaminhamentos)}
        nota={encErro ? `${numero(encErro)} não saíram` : 'ao representante'}
        caneta={encErro > 0}
        variacao={comparar(a, b, 'encaminhamentos')}
        onClick={ir(rotaDeLeads())}
      />
      <Medida
        rotulo="Chamados ao atendente"
        valor={numero(a.chamados)}
        nota={chamErro ? `${numero(chamErro)} não saíram` : 'todos saíram'}
        caneta={chamErro > 0}
        variacao={comparar(a, b, 'chamados', true)}
        onClick={ir(rotaDeLeads({ filtro: 'com_chamado' }))}
      />
      <Medida
        rotulo="Revisões"
        valor={numero(a.revisoes)}
        nota={`${numero(graves)} graves · ${numero(a.revisoes_sem_verificar)} sem conferir`}
        caneta={graves > 0}
        variacao={comparar(a, b, 'revisoes', true)}
        onClick={ir(rotaDeLeads({ filtro: 'com_revisao' }))}
      />
      <Medida
        rotulo="Silêncios"
        valor={numero(a.silencios)}
        nota={`era ${numero(b.silencios)} · a Bruna escolheu não responder`}
        onClick={ir(rotaDeLeads())}
      />
      <Medida
        rotulo="Tempo de resposta"
        valor={duracao(a.tempo_resposta_mediano_s)}
        nota="mediana, do cliente à Bruna"
        variacao={comparar(a, b, 'tempo_resposta_mediano_s', true)}
        onClick={ir(rotaDeLeads({ filtro: 'sem_resposta_24h' }))}
      />
      <Medida
        rotulo="FUP90"
        valor={numero(a.fup90_envios)}
        nota={`${numero(a.fup90_respondidos)} responderam (${pct(a.fup90_respondidos, a.fup90_envios)})`}
        onClick={ir(ROTAS.reguaFup90)}
      />
      <p className="col-span-full text-2xs text-croqui-soft">Variação contra {q.data.comparacao}.</p>
    </div>
  );
}
