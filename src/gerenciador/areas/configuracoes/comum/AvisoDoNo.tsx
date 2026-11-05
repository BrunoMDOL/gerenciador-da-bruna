import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pendenciaDoNo, useConfigs } from '../geral/dados';
import { ROTAS } from '../rotas';
import { diaComAno } from './util';

/**
 * Enquanto a pendência n8n_montar_contexto (bruna_gestor_config.pendencias)
 * não estiver resolvida, as orientações ficam gravadas mas não chegam à
 * conversa: o "Montar contexto v3" no ar ainda não escreve a linha.
 */
export function AvisoDoNo({ className }: { className?: string }) {
  const configs = useConfigs();
  const pendencia = pendenciaDoNo(configs.data);
  if (!pendencia) return null;
  return (
    <div role="status" className={cn('flex items-start gap-3 rounded-md border border-warning/60 bg-card px-4 py-3', className)}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={1.75} aria-hidden />
      <div className="min-w-0 text-[13px] leading-relaxed">
        <p className="font-medium text-foreground">
          A linha ORIENTAÇÕES DO GESTOR só entra na conversa depois que o nó “Montar contexto v3” subir ao n8n.
        </p>
        <p className="mt-0.5 text-croqui-soft">
          Até lá, o que você grava aqui fica guardado e aparece no estado do lead, mas a Bruna ainda não lê.
          {pendencia.desde ? <> Pendente desde <span className="font-croqui-num tabular-nums">{diaComAno(pendencia.desde)}</span>.</> : null}{' '}
          <Link to={`${ROTAS.geral}#pendencias`} className="text-foreground underline decoration-croqui-rule underline-offset-4 hover:decoration-foreground">
            Ver em Geral › Pendências
          </Link>
        </p>
      </div>
    </div>
  );
}
