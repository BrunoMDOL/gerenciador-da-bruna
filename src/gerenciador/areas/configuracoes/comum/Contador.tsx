import { cn } from '@/lib/utils';

/** "312/1.500": passa do limite, vira caneta e diz quanto sobra. */
export function Contador({ atual, maximo, className }: { atual: number; maximo: number; className?: string }) {
  const passou = atual > maximo;
  return (
    <span
      className={cn('font-croqui-num text-2xs tabular-nums', passou ? 'font-semibold text-croqui-red-text' : 'text-croqui-soft', className)}
      aria-live="polite"
    >
      {atual.toLocaleString('pt-BR')}/{maximo.toLocaleString('pt-BR')}
      {passou ? <span className="sr-only"> caracteres, passou do limite</span> : <span className="sr-only"> caracteres</span>}
    </span>
  );
}
