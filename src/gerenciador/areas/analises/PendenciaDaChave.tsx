import { KeyRound, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { rota } from '@/gerenciador/lib/rotas';

/**
 * A função respondeu 503 "ANTHROPIC_API_KEY ausente": não é erro da tela, é
 * uma pendência do dono. Diz o que falta e aponta para onde ela está registrada.
 */
export function PendenciaDaChave({ aoFechar, className }: { aoFechar?: () => void; className?: string }) {
  return (
    <section role="alert" className={cn('rounded-md border border-warning/60 bg-card px-4 py-3', className)}>
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={1.75} aria-hidden />
        <div className="min-w-0 flex-1 text-[13px]">
          <p className="font-semibold text-foreground">A análise precisa da chave da Anthropic</p>
          <p className="mt-1 leading-relaxed text-croqui-soft">
            A função bruna-analise respondeu que ANTHROPIC_API_KEY não está nos segredos do projeto Supabase. Sem ela, nem a
            análise nem o copiloto rodam. A pendência fica registrada em Configurações › Geral, com o que o dono precisa fazer.
          </p>
          <Link
            to={rota('/configuracoes/geral')}
            className="mt-2 inline-block font-medium text-foreground underline decoration-croqui-rule underline-offset-4 hover:decoration-croqui-red"
          >
            Ver a pendência em Configurações › Geral
          </Link>
        </div>
        {aoFechar && (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-croqui-soft" aria-label="Fechar aviso" onClick={aoFechar}>
            <X className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>
    </section>
  );
}
