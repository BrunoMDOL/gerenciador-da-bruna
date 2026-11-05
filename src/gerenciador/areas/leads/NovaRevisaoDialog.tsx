import { useEffect, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { NovaRevisao } from './dados';
import { Contador } from './NovaOrientacaoDialog';
import { GRAVIDADES, TIPOS_DE_REVISAO } from './textos';

export const CAMPO_MAXIMO = 400;
export const HORAS_PADRAO = 72;

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  aoSalvar: (f: NovaRevisao) => Promise<unknown>;
  salvando: boolean;
  nomeDoLead: string;
}

/**
 * A revisão para o próximo turno (bruna_revisoes), escrita e já conferida
 * pelo gestor: a Bruna lê na próxima mensagem deste lead e a revisão some
 * depois que o cliente responde. Só vale em SP, RJ e Goiânia.
 */
export function NovaRevisaoDialog({ aberto, aoFechar, aoSalvar, salvando, nomeDoLead }: Props) {
  const [tipo, setTipo] = useState('outro');
  const [gravidade, setGravidade] = useState<'grave' | 'media' | 'leve'>('media');
  const [erro, setErro] = useState('');
  const [naProxima, setNaProxima] = useState('');
  const [horas, setHoras] = useState(String(HORAS_PADRAO));
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setTipo('outro'); setGravidade('media'); setErro(''); setNaProxima(''); setHoras(String(HORAS_PADRAO)); setAviso(null);
  }, [aberto]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const er = erro.trim();
    const np = naProxima.trim();
    if (!er) return setAviso('Diga o que a Bruna errou.');
    if (er.length > CAMPO_MAXIMO) return setAviso(`O erro passa de ${CAMPO_MAXIMO} caracteres.`);
    if (!np) return setAviso('Diga o que ela deve fazer na próxima mensagem.');
    if (np.length > CAMPO_MAXIMO) return setAviso(`"Na próxima" passa de ${CAMPO_MAXIMO} caracteres.`);
    const h = Number(horas);
    if (!Number.isInteger(h) || h < 1 || h > 720) return setAviso('A validade é em horas inteiras, de 1 a 720.');
    setAviso(null);
    try {
      await aoSalvar({ tipo, gravidade, erro: er, naProxima: np, horas: h });
      aoFechar();
    } catch {
      // o toast da ação já disse o que o banco respondeu
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v && !salvando) aoFechar(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={enviar} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base">Revisão para o próximo turno de {nomeDoLead}</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-croqui-soft">
              A Bruna lê a revisão na próxima mensagem deste lead e ela some depois que o cliente responde. Uma revisão nova substitui a anterior ainda viva.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="revisao-tipo" className="text-[13px]">Tipo do erro</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger id="revisao-tipo" className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_DE_REVISAO.map((t) => <SelectItem key={t.valor} value={t.valor}>{t.rotulo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <fieldset className="space-y-1.5">
              <legend className="text-[13px] font-medium">Gravidade</legend>
              <div className="flex rounded-md border border-input" role="group">
                {GRAVIDADES.map((g) => (
                  <button
                    key={g.valor}
                    type="button"
                    aria-pressed={gravidade === g.valor}
                    onClick={() => setGravidade(g.valor)}
                    className={cn(
                      'h-9 flex-1 text-sm transition-colors first:rounded-l-md last:rounded-r-md',
                      gravidade === g.valor ? 'bg-action font-semibold text-action-foreground' : 'text-croqui-soft hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {g.rotulo}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="revisao-erro" className="text-[13px]">O que a Bruna errou</Label>
              <Contador atual={erro.length} maximo={CAMPO_MAXIMO} />
            </div>
            <Textarea id="revisao-erro" value={erro} onChange={(e) => setErro(e.target.value)} maxLength={CAMPO_MAXIMO} rows={4} placeholder="Com hora e fala: “às 11:10 você disse que a faixa vai de R$397 a R$1.290; R$397 é de uma película que escurece”." className="text-sm" autoFocus />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="revisao-na-proxima" className="text-[13px]">Na próxima mensagem</Label>
              <Contador atual={naProxima.length} maximo={CAMPO_MAXIMO} />
            </div>
            <Textarea id="revisao-na-proxima" value={naProxima} onChange={(e) => setNaProxima(e.target.value)} maxLength={CAMPO_MAXIMO} rows={4} placeholder="O que fazer de concreto: “corrija em uma linha e pergunte o bairro com outras palavras”." className="text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="revisao-horas" className="text-[13px]">Vale por <span className="font-normal text-croqui-soft">(horas; some antes se o cliente responder)</span></Label>
            <Input id="revisao-horas" type="number" min={1} max={720} inputMode="numeric" value={horas} onChange={(e) => setHoras(e.target.value)} className="h-9 w-28 font-croqui-num text-sm tabular-nums" />
          </div>

          {aviso && <p role="alert" className="text-[13px] text-destructive">{aviso}</p>}

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={aoFechar} disabled={salvando}>Cancelar</Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Gravar revisão
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
