import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Contador } from '../comum/Contador';
import { blocosComContexto, contarTrechos, diffDeLinhas } from './diff';
import { normalizarMiolo, partesDoCorpo, type Secao } from './secoes';
import { variacaoDeTamanho } from './textos';
import { VisaoDoDiff } from './VisaoDoDiff';

const NOTA_MAXIMA = 500;

interface Props {
  secao: Secao | null;
  /** A versão de onde a nova parte. */
  base: { id: number; numero: number };
  /** true quando a base não é a publicada e é mais velha que ela. */
  baseAtrasada: boolean;
  salvando: boolean;
  aoFechar: () => void;
  /** Rejeita quando o banco recusa; o toast já avisou e o diálogo fica aberto. */
  aoSalvar: (secao: Secao, miolo: string, nota: string) => Promise<unknown>;
}

/**
 * Editar uma seção do núcleo: o miolo da seção num campo grande, o que muda
 * em diff e a nota obrigatória. Salvar cria uma versão nova em rascunho;
 * nada vai ao ar daqui.
 */
export function EditarSecao({ secao, base, baseAtrasada, salvando, aoFechar, aoSalvar }: Props) {
  const original = useMemo(() => (secao ? partesDoCorpo(secao.corpo).miolo : ''), [secao]);
  const [miolo, setMiolo] = useState(original);
  const [nota, setNota] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [verDiff, setVerDiff] = useState(false);
  // O diálogo monta de novo a cada seção aberta: o estado inicial basta.

  const novo = normalizarMiolo(miolo);
  const mudou = novo !== original;
  const diff = useMemo(() => (verDiff && mudou ? diffDeLinhas(original, novo) : null), [verDiff, mudou, original, novo]);
  const blocos = useMemo(() => (diff ? blocosComContexto(diff.linhas, 2) : []), [diff]);

  if (!secao) return null;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!mudou) return setErro('Nada mudou nesta seção.');
    const n = nota.trim();
    if (!n) return setErro('Escreva a nota: o que mudou e por quê. Ela fica no histórico da versão.');
    if (n.length > NOTA_MAXIMA) return setErro(`A nota passa de ${NOTA_MAXIMA} caracteres.`);
    setErro(null);
    try {
      await aoSalvar(secao, novo, n);
    } catch {
      // o toast já mostrou a mensagem do banco
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v && !salvando) aoFechar(); }}>
      <DialogContent className="flex max-h-[94vh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <form onSubmit={enviar} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="border-b border-border px-5 py-4 text-left">
            <DialogTitle className="pr-6 text-base leading-snug">Editar “{secao.titulo}”</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-croqui-soft">
              Salvar cria uma versão nova do núcleo, em rascunho, a partir da versão nº {base.numero}. A Bruna só passa a ler depois de publicada.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {baseAtrasada && (
              <p className="flex items-start gap-2 rounded-sm border border-warning/60 px-3 py-2 text-[13px] text-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={1.75} aria-hidden />
                A versão nº {base.numero} é mais velha que a publicada. A versão nova parte dela e não leva o que mudou depois.
              </p>
            )}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="nucleo-secao-texto" className="text-[13px]">Texto da seção</Label>
                <span className="font-croqui-num text-2xs tabular-nums text-croqui-soft">
                  {novo.length.toLocaleString('pt-BR')} caracteres · {variacaoDeTamanho(original.length, novo.length)}
                </span>
              </div>
              <Textarea
                id="nucleo-secao-texto"
                value={miolo}
                onChange={(e) => setMiolo(e.target.value)}
                rows={16}
                spellCheck
                className="min-h-[40vh] text-[13.5px] leading-relaxed"
              />
            </div>

            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => setVerDiff((v) => !v)} disabled={!mudou} aria-expanded={verDiff}>
                {verDiff ? 'Esconder o que muda' : 'Ver o que muda'}
              </Button>
              {verDiff && diff && (
                <div className="mt-2 space-y-1.5">
                  <p className="text-2xs text-croqui-soft">
                    <span className="font-croqui-num tabular-nums text-foreground">+{diff.adicionadas}</span> linha(s) entram ·{' '}
                    <span className="font-croqui-num tabular-nums text-foreground">−{diff.removidas}</span> saem · {contarTrechos(blocos)} trecho(s)
                  </p>
                  <VisaoDoDiff blocos={blocos} rotulo={`O que muda em ${secao.titulo}`} />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="nucleo-secao-nota" className="text-[13px]">Nota da versão <span className="font-normal text-croqui-soft">(obrigatória)</span></Label>
                <Contador atual={nota.length} maximo={NOTA_MAXIMA} />
              </div>
              <Input
                id="nucleo-secao-nota"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="O que mudou e por quê. Ex.: a pergunta do bairro vem antes do objetivo"
                className="h-10 text-sm"
              />
            </div>
            {erro && <p role="alert" className="text-[13px] text-destructive">{erro}</p>}
          </div>

          <DialogFooter className="gap-2 border-t border-border px-5 py-3">
            <Button type="button" variant="ghost" onClick={aoFechar} disabled={salvando}>Cancelar</Button>
            <Button type="submit" disabled={salvando || !mudou}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Salvar como versão nova
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
