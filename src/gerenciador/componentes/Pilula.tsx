import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type TomDaPilula = 'tinta' | 'suave' | 'caneta' | 'ok' | 'alerta' | 'bruna';

const TOM: Record<TomDaPilula, string> = {
  tinta: 'border-croqui-ink/60 text-foreground',
  suave: 'border-border text-croqui-soft',
  caneta: 'border-croqui-red/60 text-croqui-red-text',
  ok: 'border-success/50 text-success',
  alerta: 'border-warning/60 text-warning',
  bruna: 'border-primary/40 bg-bubble-agent text-bot',
};

/**
 * Estado em uma palavra: contorno de 1px, sem fundo cheio (a tinta faz o
 * trabalho). A cor nunca vai sozinha: o texto diz o estado.
 */
export function Pilula({ children, tom = 'suave', className, titulo }: { children: ReactNode; tom?: TomDaPilula; className?: string; titulo?: string }) {
  return (
    <span title={titulo} className={cn('inline-flex h-5 items-center whitespace-nowrap rounded-sm border px-1.5 text-2xs font-medium leading-none', TOM[tom], className)}>
      {children}
    </span>
  );
}
