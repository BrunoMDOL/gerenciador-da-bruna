import { useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { dataHora, nomeCurto } from '@/gerenciador/lib/formatos';
import { useCancelarRetorno } from './dados';
import type { RetornoComLead } from './tipos';

/**
 * Confirma o cancelamento de um retorno prometido, com o motivo, e chama
 * bruna_gestor_retorno_cancelar (que audita e tira do lead as tags de espera
 * 824 e 825).
 */
export function CancelarRetorno({ retorno, aoFechar }: { retorno: RetornoComLead | null; aoFechar: () => void }) {
  const cancelar = useCancelarRetorno();
  const [motivo, setMotivo] = useState('');
  const id = useId();
  const nome = retorno ? nomeCurto(retorno.lead?.user_name, retorno.lead?.user_number) : '';

  const fechar = () => {
    if (cancelar.isPending) return;
    setMotivo('');
    aoFechar();
  };

  const confirmar = () => {
    if (!retorno) return;
    cancelar.mutate({ id: retorno.id, motivo }, { onSuccess: () => { setMotivo(''); aoFechar(); } });
  };

  return (
    <Dialog open={retorno != null} onOpenChange={(aberto) => { if (!aberto) fechar(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar o retorno de {nome}?</DialogTitle>
          <DialogDescription>
            A Bruna não manda a mensagem combinada para {retorno ? dataHora(retorno.quando) : ''}. As tags AGUARDANDO RETORNO DO CLIENTE e
            FECHADO TEMPORARIAMENTE saem do lead, e a escada e a FUP90 voltam a valer para ele.
          </DialogDescription>
        </DialogHeader>
        {retorno?.motivo && <p className="rounded-sm bg-accent/60 px-3 py-2 text-[13px] text-foreground">{retorno.motivo}</p>}
        <div className="space-y-1.5">
          <Label htmlFor={id}>Por que cancelar</Label>
          <Textarea
            id={id}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            maxLength={120}
            placeholder="Ex.: o cliente já mandou as fotos pelo e-mail"
          />
          <p className="text-2xs text-croqui-soft">Fica no retorno como "gestor: …" e na auditoria. Até 120 caracteres.</p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={fechar} disabled={cancelar.isPending}>Voltar</Button>
          <Button onClick={confirmar} disabled={cancelar.isPending}>
            {cancelar.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Cancelar o retorno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
