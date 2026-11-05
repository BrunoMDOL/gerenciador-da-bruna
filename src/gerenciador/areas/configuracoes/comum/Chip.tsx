import { useEffect, useRef, type ReactNode } from 'react';
import { Cota } from '@/components/croqui/Cota';
import { cn } from '@/lib/utils';

/**
 * Um filtro da faixa: texto em grafite, o ativo em tinta 600 com a cota
 * caneta na base, como as abas do painel. É filtro, não navegação: leva só
 * aria-pressed.
 */
export function Chip({
  ativo, onClick, children, contagem, titulo,
}: { ativo: boolean; onClick: () => void; children: ReactNode; contagem?: number; titulo?: string }) {
  const ref = useRef<HTMLButtonElement>(null);

  // A FaixaDeAbas traz para a vista o item com aria-current="page", que um
  // filtro não leva; o chip ativo faz isso sozinho, só na horizontal do trilho.
  useEffect(() => {
    const chip = ref.current;
    const trilho = chip?.parentElement;
    if (!ativo || !chip || !trilho || trilho.scrollWidth <= trilho.clientWidth) return;
    const inicio = chip.offsetLeft - trilho.offsetLeft;
    const fim = inicio + chip.offsetWidth;
    if (inicio < trilho.scrollLeft || fim > trilho.scrollLeft + trilho.clientWidth) trilho.scrollLeft = Math.max(0, inicio - 32);
  }, [ativo]);

  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={ativo}
      title={titulo}
      onClick={onClick}
      className={cn(
        'relative flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-[13.5px] transition-colors',
        ativo ? 'font-semibold text-foreground' : 'font-medium text-croqui-soft hover:text-foreground',
      )}
    >
      {children}
      {contagem != null && <span className="font-croqui-num text-2xs tabular-nums text-croqui-soft">{contagem.toLocaleString('pt-BR')}</span>}
      {ativo && <Cota tom="caneta" className="absolute inset-x-1 bottom-0 h-2" />}
    </button>
  );
}
