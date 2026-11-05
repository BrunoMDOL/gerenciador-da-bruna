import { useState } from 'react';
import { Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { periodoDosUltimos } from '@/gerenciador/lib/db';
import { data } from '@/gerenciador/lib/formatos';
import { cn } from '@/lib/utils';
import type { PedidoDeAnalise } from './tipos';

const OPCOES = [7, 14, 30] as const;
type Dias = (typeof OPCOES)[number];

interface RodarAgoraProps {
  pedir: (pedido: PedidoDeAnalise, opcoes?: { onSuccess?: () => void; onSettled?: () => void }) => void;
  ocupado: boolean;
  /** Já há uma análise rodando: avisa, mas não impede. */
  rodando?: boolean;
}

/**
 * "Rodar agora": escolhe o período (7, 14 ou 30 dias até agora) e manda para a
 * edge function. O período é calculado na hora do clique, não ao abrir a tela.
 */
export function RodarAgora({ pedir, ocupado, rodando }: RodarAgoraProps) {
  const [aberto, setAberto] = useState(false);
  const [dias, setDias] = useState<Dias>(7);

  const confirmar = () => {
    const p = periodoDosUltimos(dias);
    // Fecha nos dois casos: no 202 a tela vai para o detalhe; no erro, o toast
    // (ou o painel da pendência) fica visível, e não atrás do diálogo.
    pedir({ de: p.de, ate: p.ate, tipo: 'manual' }, { onSettled: () => setAberto(false) });
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!ocupado) setAberto(v); }}>
      <Button onClick={() => setAberto(true)} disabled={ocupado}>
        {ocupado ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
        Rodar agora
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rodar uma análise agora</DialogTitle>
          <DialogDescription>
            A análise lê as métricas, os erros, a régua e uma amostra das conversas do período, e volta com achados e sugestões.
            Leva alguns minutos; a tela acompanha sozinha.
          </DialogDescription>
        </DialogHeader>
        <fieldset className="space-y-2">
          <legend className="text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">Período, até agora</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Período da análise">
            {OPCOES.map((d) => {
              const p = periodoDosUltimos(d);
              const ativo = d === dias;
              return (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => setDias(d)}
                  className={cn(
                    'flex min-h-[56px] flex-col items-start justify-center rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    ativo ? 'border-croqui-ink bg-accent text-foreground' : 'border-border text-croqui-soft hover:border-croqui-ink hover:text-foreground',
                  )}
                >
                  <span className="font-croqui-num text-lg font-semibold leading-none tabular-nums">{d} dias</span>
                  <span className="mt-1 font-data text-2xs">{data(p.de)} a {data(p.ate)}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        {rodando && (
          <p className="text-[13px] text-warning">Já tem uma análise em andamento. Dá para esperar ela terminar antes de pedir outra.</p>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setAberto(false)} disabled={ocupado}>Cancelar</Button>
          <Button onClick={confirmar} disabled={ocupado}>
            {ocupado ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
            Rodar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
