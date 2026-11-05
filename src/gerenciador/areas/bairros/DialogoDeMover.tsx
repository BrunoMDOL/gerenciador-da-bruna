import { useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { mensagemDeErro, type AcoesDoFoco } from './dados';
import { depoisDeAoDescer, depoisDeAoSubir } from './regras';
import type { ItemDoFoco } from './tipos';

const NO_COMECO = '\u0000no-comeco';

interface Props {
  item: ItemDoFoco;
  /** A lista do mesmo tipo, na ordem atual. */
  doMesmoTipo: ItemDoFoco[];
  acoes: AcoesDoFoco;
  aoFechar: () => void;
}

/** Levar um item para outra posição da lista (dentro do mesmo tipo). */
export function DialogoDeMover({ item, doMesmoTipo, acoes, aoFechar }: Props) {
  const nomes = doMesmoTipo.map((i) => i.nome);
  const posicao = nomes.indexOf(item.nome);
  const atual = posicao > 0 ? nomes[posicao - 1] : NO_COMECO;
  const [destino, setDestino] = useState(atual);
  const [erro, setErro] = useState<string | null>(null);
  const movendo = acoes.mover.isPending;
  const subir = depoisDeAoSubir(nomes, item.nome);
  const descer = depoisDeAoDescer(nomes, item.nome);

  const mover = async (depoisDe: string | null) => {
    setErro(null);
    try {
      await acoes.mover.mutateAsync({ tipo: item.tipo, nome: item.nome, depoisDe });
      aoFechar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  };

  return (
    <Dialog open onOpenChange={(aberto) => { if (!aberto && !movendo) aoFechar(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Mover {item.nome}</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed text-croqui-soft">
            Hoje é o <span className="font-croqui-num tabular-nums text-foreground">{posicao + 1}º</span> de {nomes.length}.
            {' '}A posição muda só a ordem da lista que a Bruna lê e do arquivo exportado; quem é foco continua igual.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void mover(subir ?? null)} disabled={subir === undefined || movendo}>
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Subir uma posição
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => { if (descer !== undefined) void mover(descer); }} disabled={descer === undefined || movendo}>
            <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Descer uma posição
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mover-destino" className="text-[13px]">Ou colocar</Label>
          <select
            id="mover-destino"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-9"
          >
            <option value={NO_COMECO}>No começo da lista</option>
            {nomes.filter((n) => n !== item.nome).map((n) => <option key={n} value={n}>Depois de {n}</option>)}
          </select>
        </div>

        {erro && (
          <p role="alert" className="flex items-start gap-2 text-[13px] text-destructive">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            <span>Não moveu: {erro}</span>
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={aoFechar} disabled={movendo}>Cancelar</Button>
          <Button type="button" onClick={() => void mover(destino === NO_COMECO ? null : destino)} disabled={destino === atual || movendo}>
            {movendo ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Mover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
