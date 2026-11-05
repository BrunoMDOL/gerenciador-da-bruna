import { AlertTriangle, CheckCircle2, Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StatusDaAnalise as Status } from './tipos';

const ESTADO: Record<Status, { nome: string; Icone: LucideIcon; classe: string; gira?: boolean }> = {
  pendente: { nome: 'na fila', Icone: Loader2, classe: 'text-croqui-soft', gira: true },
  coletando: { nome: 'coletando', Icone: Loader2, classe: 'text-foreground', gira: true },
  analisando: { nome: 'analisando', Icone: Loader2, classe: 'text-foreground', gira: true },
  concluida: { nome: 'concluída', Icone: CheckCircle2, classe: 'text-success' },
  falhou: { nome: 'falhou', Icone: AlertTriangle, classe: 'text-destructive' },
};

/** O status em marcador e palavra (nunca só cor); em falhou, o erro em texto embaixo. */
export function StatusDaAnalise({ status, erro, className }: { status: Status; erro?: string | null; className?: string }) {
  const e = ESTADO[status] ?? ESTADO.pendente;
  const { Icone } = e;
  return (
    <span className={cn('inline-flex min-w-0 flex-col items-start gap-0.5', className)}>
      <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium', e.classe)}>
        <Icone className={cn('h-3.5 w-3.5 shrink-0', e.gira && 'animate-spin')} strokeWidth={1.75} aria-hidden />
        {e.nome}
      </span>
      {status === 'falhou' && erro ? <span className="line-clamp-2 break-words text-2xs text-croqui-soft" title={erro}>{erro}</span> : null}
    </span>
  );
}
