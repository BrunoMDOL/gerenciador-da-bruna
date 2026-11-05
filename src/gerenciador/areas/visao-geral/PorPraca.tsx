import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Erro, Esqueleto, Painel, Vazio } from '@/gerenciador/componentes';
import { nomeDaRegiao, numero, pct } from '@/gerenciador/lib/formatos';
import { cn } from '@/lib/utils';
import { ehRegiaoDaBusca } from '@/gerenciador/areas/leads/textos';
import { useMetricas, type Dias } from './dados';
import { rotaDeLeads } from './rotas';
import { LINK, n } from './util';

const FUNIS = new Set(['brasil', 'brasil2']);

const NUM = 'py-2 text-right font-croqui-num tabular-nums';

/**
 * Atendidos, responderam e agendados por região, do maior para o menor. SP, RJ
 * e Goiânia são praças; Brasil e Brasil 2 são funis de qualificação, e a nota
 * diz isso em vez de dar cor a cada um. O nome leva aos leads da região quando
 * a busca de leads a conhece (o funil Arquitetos fica fora dela: sem link).
 */
export function PorPraca({ dias, className }: { dias: Dias; className?: string }) {
  const q = useMetricas(dias);

  const linhas = Object.entries(q.data?.atual?.por_regiao ?? {})
    .map(([region, d]) => ({ region, nome: nomeDaRegiao(region), atendidos: n(d?.atendidos), responderam: n(d?.responderam), agendados: n(d?.agendados) }))
    .sort((a, b) => b.atendidos - a.atendidos || b.responderam - a.responderam);

  return (
    <Painel titulo="Por praça" nota="e funis de qualificação" className={className} semRecheio>
      {q.isPending && <div className="p-4"><Esqueleto linhas={5} /></div>}
      {q.isError && <div className="p-4"><Erro mensagem={q.error.message} tentar={() => q.refetch()} /></div>}
      {q.data && linhas.length === 0 && (
        <Vazio Icone={MapPin} titulo="Nenhuma conversa no período" descricao="Nenhuma praça teve mensagem da Bruna nestes dias. Amplie o período." className="py-8" />
      )}
      {linhas.length > 0 && (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-2xs uppercase tracking-[0.1em] text-croqui-soft">
              <th scope="col" className="px-4 py-2 text-left font-medium">Praça</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Atend.</th>
              <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">Resp.</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Agend.</th>
              <th scope="col" className="py-2 pl-2 pr-4 text-right font-medium">Taxa</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.region} className="border-t border-border transition-colors hover:bg-accent/60">
                <th scope="row" className="px-4 py-2 text-left font-normal">
                  {ehRegiaoDaBusca(l.region)
                    ? <Link to={rotaDeLeads({ region: l.region })} className={cn('text-foreground', LINK)}>{l.nome}</Link>
                    : <span className="text-foreground">{l.nome}</span>}
                  {FUNIS.has(l.region) && <span className="ml-1.5 text-2xs text-croqui-soft">funil</span>}
                </th>
                <td className={cn('px-2', NUM)}>{numero(l.atendidos)}</td>
                <td className={cn('hidden px-2 sm:table-cell', NUM)}>{numero(l.responderam)}</td>
                <td className={cn('px-2', NUM)}>{numero(l.agendados)}</td>
                <td className={cn('pl-2 pr-4', NUM)}>{pct(l.agendados, l.atendidos)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-[1.5px] border-foreground font-semibold">
              <th scope="row" className="px-4 py-2 text-left">Total</th>
              <td className={cn('px-2', NUM)}>{numero(q.data?.atual.atendidos)}</td>
              <td className={cn('hidden px-2 sm:table-cell', NUM)}>{numero(q.data?.atual.responderam)}</td>
              <td className={cn('px-2', NUM)}>{numero(q.data?.atual.agendados)}</td>
              <td className={cn('pl-2 pr-4', NUM)}>{pct(q.data?.atual.agendados, q.data?.atual.atendidos)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </Painel>
  );
}
