import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MedidaProps {
  rotulo: string;
  valor: ReactNode;
  /** Texto curto embaixo ("de 694 atendidos"). */
  nota?: ReactNode;
  /** Variação contra o período anterior; a cor nunca vai sozinha: tem seta e texto. */
  variacao?: { texto: string; sinal: -1 | 0 | 1; /** true quando subir é ruim (erros, chamados). */ inverso?: boolean };
  onClick?: () => void;
  className?: string;
  /** Destaque com a caneta: o número que pede atenção primeiro. */
  caneta?: boolean;
}

/**
 * Número é medida: Barlow Semi Condensed com algarismos tabulares, rótulo em
 * cima, nota embaixo. Clicável quando leva à lista que o explica.
 */
export function Medida({ rotulo, valor, nota, variacao, onClick, className, caneta }: MedidaProps) {
  const bom = variacao ? (variacao.inverso ? -variacao.sinal : variacao.sinal) : 0;
  const Seta = variacao?.sinal === 1 ? ArrowUp : variacao?.sinal === -1 ? ArrowDown : Minus;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex min-w-0 flex-col items-start gap-1 rounded-md border border-border bg-card px-4 py-3 text-left',
        onClick && 'transition-colors hover:border-croqui-red focus-visible:border-croqui-red',
        className,
      )}
    >
      <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">{rotulo}</span>
      <span className={cn('font-croqui-num text-[30px] font-semibold leading-none tabular-nums', caneta ? 'text-croqui-red-text' : 'text-foreground')}>
        {valor}
      </span>
      {(nota || variacao) && (
        <span className="flex flex-wrap items-center gap-x-2 text-2xs text-croqui-soft">
          {variacao && (
            <span className={cn('inline-flex items-center gap-0.5 font-medium', bom > 0 && 'text-success', bom < 0 && 'text-croqui-red-text')}>
              <Seta className="h-3 w-3" strokeWidth={2} aria-hidden />
              {variacao.texto}
            </span>
          )}
          {nota}
        </span>
      )}
    </Tag>
  );
}
