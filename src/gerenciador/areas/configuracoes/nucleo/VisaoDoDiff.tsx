import { useMemo, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { numero } from '@/gerenciador/lib/formatos';
import type { BlocoDoDiff, LinhaDoDiff } from './diff';

interface Props {
  blocos: BlocoDoDiff[];
  /** O título da seção onde cai uma linha da versão comparada (para o cabeçalho do trecho). */
  secaoDaLinha?: (linha: number) => string | null;
  /** Rótulo acessível da tabela. */
  rotulo: string;
  className?: string;
}

const NENHUMA: ReadonlySet<number> = new Set();
const MARCADOR: Record<LinhaDoDiff['tipo'], string> = { igual: ' ', removida: '−', adicionada: '+' };
const NOME_DO_TIPO: Record<LinhaDoDiff['tipo'], string> = { igual: 'igual', removida: 'sai', adicionada: 'entra' };
const NUMERO = 'select-none px-1.5 text-right font-croqui-num text-2xs leading-[1.625rem] tabular-nums text-croqui-soft';

/**
 * O diff em linhas: o que sai leva "−" e risco de caneta; o que entra leva "+",
 * tinta mais forte e o traço à esquerda. A cor nunca vai sozinha. As linhas
 * iguais entre os trechos ficam dobradas e abrem com um clique.
 */
export function VisaoDoDiff({ blocos, secaoDaLinha, rotulo, className }: Props) {
  // As dobras abertas valem para os blocos em que foram abertas: o índice de
  // uma dobra não diz nada num diff novo (outra base, outra comparada, outro
  // texto na edição), então elas voltam fechadas.
  const [dobras, setDobras] = useState<{ de: BlocoDoDiff[]; abertas: ReadonlySet<number> }>(() => ({ de: blocos, abertas: NENHUMA }));
  const abertas = dobras.de === blocos ? dobras.abertas : NENHUMA;
  const abrir = (i: number) => setDobras((atual) => ({ de: blocos, abertas: new Set(atual.de === blocos ? atual.abertas : NENHUMA).add(i) }));

  const titulos = useMemo(
    () => blocos.map((b) => {
      if (b.tipo !== 'trecho' || !secaoDaLinha) return null;
      const primeira = b.linhas.find((l) => l.tipo !== 'igual') ?? b.linhas[0];
      return secaoDaLinha(primeira.b ?? primeira.a ?? 1);
    }),
    [blocos, secaoDaLinha],
  );

  return (
    <div className={cn('overflow-hidden rounded-md border border-border bg-card', className)} role="table" aria-label={rotulo}>
      {blocos.map((bloco, i) => {
        if (bloco.tipo === 'dobra' && !abertas.has(i)) {
          const primeira = bloco.linhas[0];
          const ultima = bloco.linhas[bloco.linhas.length - 1];
          return (
            <div role="row" key={`d${i}`} className="border-b border-border last:border-b-0">
              <span role="cell" className="block">
                <button
                  type="button"
                  onClick={() => abrir(i)}
                  className="flex min-h-10 w-full items-center gap-2 bg-accent/40 px-3 py-1.5 text-left text-2xs text-croqui-soft transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ChevronsUpDown className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                  <span>
                    <span className="font-croqui-num tabular-nums">{numero(bloco.linhas.length)}</span> linhas iguais
                    <span className="ml-1 font-croqui-num tabular-nums">({numero(primeira.b)}–{numero(ultima.b)})</span>
                    <span className="ml-1 underline decoration-croqui-rule underline-offset-4">mostrar</span>
                  </span>
                </button>
              </span>
            </div>
          );
        }
        return (
          <div role="rowgroup" key={`t${i}`} className="border-b border-border last:border-b-0">
            {bloco.tipo === 'trecho' && titulos[i] && (
              <div role="row" className="border-b border-border/70 bg-background px-3 py-1 text-2xs text-croqui-soft">
                <span role="cell">em <span className="font-medium text-foreground">{titulos[i]}</span></span>
              </div>
            )}
            {bloco.linhas.map((l, k) => <Linha key={k} linha={l} />)}
          </div>
        );
      })}
    </div>
  );
}

function Linha({ linha: l }: { linha: LinhaDoDiff }) {
  return (
    <div
      role="row"
      data-tipo={l.tipo}
      className={cn(
        'grid grid-cols-[2.5rem_1.25rem_minmax(0,1fr)] items-start text-[13px] leading-relaxed sm:grid-cols-[2.75rem_2.75rem_1.25rem_minmax(0,1fr)]',
        l.tipo === 'adicionada' ? 'border-l-2 border-l-foreground bg-accent/70' : 'border-l-2 border-l-transparent',
      )}
    >
      {/* No celular, uma coluna só de número: a da comparada, ou a da base quando a linha saiu. */}
      <span role="cell" className={cn(NUMERO, 'hidden sm:block')}>{l.a ?? ''}</span>
      <span role="cell" className={cn(NUMERO, 'hidden sm:block')}>{l.b ?? ''}</span>
      <span role="cell" className={cn(NUMERO, 'sm:hidden')}>{l.b ?? l.a ?? ''}</span>
      <span
        role="cell"
        aria-label={NOME_DO_TIPO[l.tipo]}
        className={cn(
          'select-none text-center font-croqui-num font-semibold',
          l.tipo === 'removida' && 'text-croqui-red-text',
          l.tipo === 'adicionada' && 'text-foreground',
        )}
      >
        {MARCADOR[l.tipo]}
      </span>
      <span
        role="cell"
        className={cn(
          'min-w-0 whitespace-pre-wrap break-words pr-3',
          l.tipo === 'igual' && 'text-foreground/80',
          l.tipo === 'removida' && 'text-croqui-soft line-through decoration-croqui-red/70',
          l.tipo === 'adicionada' && 'font-medium text-foreground',
        )}
      >
        {l.texto || ' '}
      </span>
    </div>
  );
}
