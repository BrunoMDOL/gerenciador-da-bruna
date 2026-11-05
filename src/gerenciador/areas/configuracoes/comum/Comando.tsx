import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { copiar } from './util';

/**
 * Um comando para rodar no repositório, com o botão de copiar. Texto em
 * Barlow (o Croqui não tem mono), em linhas que quebram em vez de rolar.
 */
export function Comando({ children, rotulo, className }: { children: string; rotulo?: string; className?: string }) {
  const [copiado, setCopiado] = useState(false);
  const aoCopiar = async () => {
    const ok = await copiar(children);
    if (ok) {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
      toast.success('Comando copiado.');
    } else {
      toast.error('O navegador não deixou copiar. Selecione o texto e copie à mão.');
    }
  };
  return (
    <div className={cn('flex items-start gap-2 rounded-sm border border-border bg-background px-3 py-2', className)}>
      {/* Sem ligadura: a Barlow junta "--" num travessão, e "--gravar" viraria "—gravar". */}
      <code className="min-w-0 flex-1 whitespace-pre-wrap break-all font-croqui-num text-[13px] leading-relaxed text-foreground [font-variant-ligatures:none]">{children}</code>
      <button
        type="button"
        onClick={() => void aoCopiar()}
        aria-label={rotulo ? `Copiar: ${rotulo}` : 'Copiar o comando'}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-croqui-soft transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {copiado ? <Check className="h-4 w-4" strokeWidth={1.75} aria-hidden /> : <Copy className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
      </button>
    </div>
  );
}
