import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VazioProps {
  Icone?: LucideIcon;
  titulo: string;
  descricao?: ReactNode;
  acao?: ReactNode;
  className?: string;
}

/** O vazio diz o que fazer, não só que não há nada. */
export function Vazio({ Icone, titulo, descricao, acao, className }: VazioProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {Icone && <Icone className="mb-3 h-6 w-6 text-croqui-soft" strokeWidth={1.5} aria-hidden />}
      <p className="text-sm font-medium text-foreground">{titulo}</p>
      {descricao && <p className="mt-1 max-w-md text-[13px] leading-relaxed text-croqui-soft">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}
