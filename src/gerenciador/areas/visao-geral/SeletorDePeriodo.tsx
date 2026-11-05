import { cn } from '@/lib/utils';
import { DIAS_PERMITIDOS, type Dias } from './dados';

/**
 * 7 / 14 / 30 dias: controle segmentado em tinta (o ativo é tinta cheia, como o
 * botão padrão), 36px de altura no ponteiro fino e 40px no grosso.
 */
export function SeletorDePeriodo({ dias, aoMudar }: { dias: Dias; aoMudar: (dias: Dias) => void }) {
  return (
    <div
      role="group"
      aria-label="Período"
      className="inline-flex h-9 items-center rounded-md border border-border bg-background p-0.5 [@media(pointer:coarse)]:h-10"
    >
      {DIAS_PERMITIDOS.map((d) => {
        const ativo = d === dias;
        return (
          <button
            key={d}
            type="button"
            aria-pressed={ativo}
            onClick={() => aoMudar(d)}
            className={cn(
              'h-full min-w-[56px] rounded-sm px-3 font-croqui-num text-[13px] font-medium tabular-nums transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
              ativo ? 'bg-action text-action-foreground' : 'text-croqui-soft hover:text-foreground',
            )}
          >
            {d} dias
          </button>
        );
      })}
    </div>
  );
}
