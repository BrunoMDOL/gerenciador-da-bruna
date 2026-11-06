import { Link } from 'react-router-dom';
import { CircleCheck } from 'lucide-react';
import { Erro, Esqueleto, Painel, Vazio } from '@/gerenciador/componentes';
import { numero } from '@/gerenciador/lib/formatos';
import { cn } from '@/lib/utils';
import { linhasDeErro } from './calculos';
import { descreverPeriodo, useErros, useMetricas, type Dias } from './dados';
import { rotaDeLeads } from './rotas';
import { LINK } from './util';

/**
 * Os tipos de erro mais frequentes do período (bruna_gestor_erros, com as
 * contagens de bruna_gestor_metricas), cada um levando a quem o resolve.
 */
export function ErrosDoPeriodo({ dias, className }: { dias: Dias; className?: string }) {
  const erros = useErros(dias);
  const metricas = useMetricas(dias);
  const carregando = erros.isPending || metricas.isPending;
  const falha = erros.isError ? erros : metricas.isError ? metricas : null;
  // A lista só sai com as duas fontes prontas: com uma só, as contagens trocariam
  // de fonte quando a outra chegasse, e a lista apareceria junto do esqueleto ou do erro.
  const linhas = !carregando && !falha && erros.data ? linhasDeErro(erros.data, metricas.data?.atual ?? null) : [];

  return (
    <Painel
      titulo="Erros do período"
      nota="os mais frequentes"
      acoes={<Link to={rotaDeLeads({ filtro: 'com_revisao' })} className={cn('text-[13px] text-croqui-soft hover:text-foreground', LINK)}>leads com revisão</Link>}
      className={className}
      semRecheio
    >
      {carregando && !falha && <div className="p-4"><Esqueleto linhas={5} /></div>}
      {falha && <div className="p-4"><Erro mensagem={falha.error.message} tentar={() => { void erros.refetch(); void metricas.refetch(); }} /></div>}
      {!carregando && !falha && linhas.length === 0 && (
        <Vazio
          Icone={CircleCheck}
          titulo="Sem erros no período"
          descricao={`Nenhuma revisão, chamado ou encaminhamento com erro ${descreverPeriodo(dias)}. Se parecer bom demais, abra uma conversa em Leads.`}
          className="py-8"
        />
      )}
      {linhas.length > 0 && (
        <ul className="divide-y divide-border">
          {linhas.slice(0, 8).map((l) => (
            <li key={l.chave}>
              <Link to={l.rota} className="flex items-baseline justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none">
                <span className="min-w-0">
                  <span className="block text-[13.5px] text-foreground">{l.rotulo}</span>
                  {l.detalhe && <span className="block truncate text-2xs text-croqui-soft">{l.detalhe}</span>}
                </span>
                <span className={cn('shrink-0 font-croqui-num text-[18px] font-semibold tabular-nums', l.caneta ? 'text-croqui-red-text' : 'text-foreground')}>{numero(l.n)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Painel>
  );
}
