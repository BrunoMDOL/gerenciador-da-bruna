import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Erro, Esqueleto, Painel, Pilula } from '@/gerenciador/componentes';
import { numero, pct } from '@/gerenciador/lib/formatos';
import { cn } from '@/lib/utils';
import { useRegua, type Dias } from './dados';
import { ROTAS, rotaDeLeads } from './rotas';
import { LINK, n, soma } from './util';

interface Linha {
  chave: string;
  rotulo: string;
  valor: string;
  detalhe: string;
  rota: string;
  pausada?: boolean;
  pilula?: string;
}

/**
 * A régua em três linhas: a escada de 24 h, os retornos prometidos e a
 * campanha FUP90, cada uma com o caminho até a tela da Régua.
 */
export function ReguaResumo({ dias, className }: { dias: Dias; className?: string }) {
  const q = useRegua(dias);
  const r = q.data?.resumo;

  const linhas: Linha[] = r
    ? [
        {
          chave: 'escada',
          rotulo: 'Escada de 24 h',
          valor: `${numero(soma(r.escada, 'enviados'))} toques`,
          detalhe: `${numero(soma(r.escada, 'pulados'))} pulados · ${pct(soma(r.escada, 'respondeu_24h'), soma(r.escada, 'enviados'))} responderam em 24 h`,
          rota: ROTAS.regua,
          pausada: Boolean(r.pausas?.escada_pausada),
        },
        {
          chave: 'retornos',
          rotulo: 'Retornos prometidos',
          valor: `${numero(n(r.retornos?.pendentes))} pendentes`,
          detalhe: `${q.data?.retornosAtrasados == null ? '—' : numero(q.data.retornosAtrasados)} atrasados · ${numero(n(r.retornos?.enviados))} enviados no período`,
          rota: rotaDeLeads({ filtro: 'retorno_pendente' }),
          pausada: Boolean(r.pausas?.retornos_pausados),
        },
        {
          chave: 'fup90',
          rotulo: 'FUP90',
          valor: r.campanha ? (r.campanha.ativa ? 'ativa' : 'desativada') : 'sem campanha',
          detalhe: `${numero(soma(r.fup90, 'envios'))} envios · ${numero(soma(r.fup90, 'respondidos'))} responderam · ${numero(n(r.fup90_inscricoes?.ativa))} inscrições ativas`,
          rota: ROTAS.reguaFup90,
          pilula: r.campanha && !r.campanha.ativa ? 'desligada' : undefined,
        },
      ]
    : [];

  return (
    <Painel
      titulo="Régua"
      nota="no período"
      acoes={<Link to={ROTAS.regua} className={cn('text-[13px] text-croqui-soft hover:text-foreground', LINK)}>abrir</Link>}
      className={className}
      semRecheio
    >
      {q.isPending && <div className="p-4"><Esqueleto linhas={3} /></div>}
      {q.isError && <div className="p-4"><Erro mensagem={q.error.message} tentar={() => q.refetch()} /></div>}
      {linhas.length > 0 && (
        <ul className="divide-y divide-border">
          {linhas.map((l) => (
            <li key={l.chave}>
              <Link to={l.rota} className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-[13.5px] text-foreground">{l.rotulo}</span>
                    <span className={cn('font-croqui-num text-[15px] font-semibold tabular-nums', l.pausada || l.pilula ? 'text-croqui-red-text' : 'text-foreground')}>{l.valor}</span>
                    {l.pausada && <Pilula tom="caneta">pausada</Pilula>}
                    {l.pilula && <Pilula tom="caneta">{l.pilula}</Pilula>}
                  </span>
                  <span className="block text-2xs text-croqui-soft">{l.detalhe}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-croqui-soft group-hover:text-foreground" strokeWidth={1.75} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Painel>
  );
}
