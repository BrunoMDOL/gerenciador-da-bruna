import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PainelProps {
  titulo?: ReactNode;
  /** Texto curto ao lado do título, em grafite suave. */
  nota?: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Sem o recheio interno: para tabelas e listas que já têm o próprio ritmo. */
  semRecheio?: boolean;
}

/**
 * Um bloco da prancheta: folha contornada por traço de 1px, sem sombra em
 * repouso. É o único contêiner de seção do gerenciador; cartão colorido não existe.
 */
export function Painel({ titulo, nota, acoes, children, className, semRecheio }: PainelProps) {
  return (
    <section className={cn('rounded-md border border-border bg-card', className)}>
      {(titulo || acoes) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <div className="flex min-w-0 items-baseline gap-2">
            {titulo && <h2 className="truncate text-[13.5px] font-semibold text-foreground">{titulo}</h2>}
            {nota && <span className="truncate text-2xs text-croqui-soft">{nota}</span>}
          </div>
          {acoes && <div className="flex shrink-0 items-center gap-1.5">{acoes}</div>}
        </div>
      )}
      <div className={cn(!semRecheio && 'p-4')}>{children}</div>
    </section>
  );
}
