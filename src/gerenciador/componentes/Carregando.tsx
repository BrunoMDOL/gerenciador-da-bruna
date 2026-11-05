import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Carregando({ texto = 'Carregando', className }: { texto?: string; className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-10 text-[13px] text-croqui-soft', className)} role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {texto}
    </div>
  );
}

/** Esqueleto de linha, com o contorno pontilhado do desenho em construção. */
export function Esqueleto({ linhas = 3, className }: { linhas?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="h-3 rounded-sm border border-dashed border-croqui-rule" style={{ width: `${90 - (i % 3) * 18}%` }} />
      ))}
    </div>
  );
}
