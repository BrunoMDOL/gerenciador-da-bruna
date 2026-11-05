import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CirclePause, LoaderCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { relativo } from '@/gerenciador/lib/formatos';
import { cn } from '@/lib/utils';
import { reguaPausada, useRegua, useRetomarRegua, type Dias } from './dados';
import { ROTAS } from './rotas';

/**
 * Quando a escada de 24 h ou os retornos prometidos estão pausados, isto fica
 * no topo da página, em caneta: é a única coisa que muda o que a Bruna faz hoje.
 * Some quando nada está pausado.
 */
export function PausaDaRegua({ dias, className }: { dias: Dias; className?: string }) {
  const q = useRegua(dias);
  const retomar = useRetomarRegua();
  const [confirmando, setConfirmando] = useState(false);

  const pausas = q.data?.resumo?.pausas;
  if (!q.data || !reguaPausada(pausas)) return null;

  const partes = [pausas.escada_pausada ? 'escada de 24 h' : null, pausas.retornos_pausados ? 'retornos prometidos' : null].filter(Boolean);
  const quem = [pausas.motivo, pausas.pausado_por ? `por ${pausas.pausado_por}` : null, pausas.pausado_em ? relativo(pausas.pausado_em) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col gap-3 rounded-md border border-border border-l-2 border-l-croqui-red bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <CirclePause className="mt-0.5 h-4 w-4 shrink-0 text-croqui-red-text" strokeWidth={1.75} aria-hidden />
        <div className="min-w-0">
          <p className="text-[13.5px] font-semibold text-croqui-red-text">Régua pausada: {partes.join(' e ')}</p>
          <p className="text-[13px] text-croqui-soft">
            {quem || 'sem motivo registrado'}. Nenhum toque da escada{pausas.retornos_pausados ? ' nem retorno prometido' : ''} sai até retomar.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to={ROTAS.regua}>Abrir Régua</Link>
        </Button>
        {!confirmando ? (
          <Button size="sm" onClick={() => setConfirmando(true)}>
            <Play strokeWidth={1.75} aria-hidden /> Retomar
          </Button>
        ) : (
          <>
            <Button size="sm" disabled={retomar.isPending} onClick={() => retomar.mutate(undefined, { onSettled: () => setConfirmando(false) })}>
              {retomar.isPending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Play strokeWidth={1.75} aria-hidden />}
              Confirmar retomada
            </Button>
            <Button size="sm" variant="ghost" disabled={retomar.isPending} onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
