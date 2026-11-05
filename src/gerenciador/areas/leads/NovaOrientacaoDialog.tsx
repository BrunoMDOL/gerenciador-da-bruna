import { useEffect, useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { TurnoInstrucao } from '@/gerenciador/lib/tipos';
import type { NovaOrientacao } from './dados';
import { deBrasilia, paraCampoDeBrasilia } from './fuso';
import { TURNOS } from './textos';

export const TITULO_MAXIMO = 120;
export const TEXTO_MAXIMO = 1500;
const TODOS_OS_TURNOS: TurnoInstrucao[] = ['conversa', 'toque', 'retorno'];

interface Props {
  aberto: boolean;
  aoFechar: () => void;
  /** Rejeita quando o banco recusa; o toast já avisou e o diálogo fica aberto. */
  aoSalvar: (f: NovaOrientacao) => Promise<unknown>;
  salvando: boolean;
  nomeDoLead: string;
}

/**
 * Uma orientação durável só para este lead (bruna_instrucoes, escopo contato):
 * a linha ORIENTAÇÕES DO GESTOR que a Bruna lê em todo turno até a vigência
 * acabar ou alguém desativar.
 */
export function NovaOrientacaoDialog({ aberto, aoFechar, aoSalvar, salvando, nomeDoLead }: Props) {
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [turnos, setTurnos] = useState<TurnoInstrucao[]>(TODOS_OS_TURNOS);
  const [fim, setFim] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    setTitulo(''); setTexto(''); setTurnos(TODOS_OS_TURNOS); setFim(''); setErro(null);
  }, [aberto]);

  const alternarTurno = (t: TurnoInstrucao, marcado: boolean) => {
    setTurnos((atual) => (marcado ? TODOS_OS_TURNOS.filter((x) => x === t || atual.includes(x)) : atual.filter((x) => x !== t)));
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const t = titulo.trim();
    const x = texto.trim();
    if (!t) return setErro('Dê um título curto à orientação.');
    if (t.length > TITULO_MAXIMO) return setErro(`O título passa de ${TITULO_MAXIMO} caracteres.`);
    if (!x) return setErro('Escreva o que a Bruna deve fazer neste lead.');
    if (x.length > TEXTO_MAXIMO) return setErro(`O texto passa de ${TEXTO_MAXIMO} caracteres.`);
    if (!turnos.length) return setErro('Marque pelo menos um turno em que a orientação vale.');
    let vigenciaFim: string | null = null;
    if (fim) {
      // O campo vem sem fuso: é a hora de Brasília que o gestor viu e digitou.
      const d = deBrasilia(fim);
      if (!d) return setErro('A data de fim da vigência não é válida.');
      if (d.getTime() <= Date.now()) return setErro('A vigência precisa terminar no futuro.');
      vigenciaFim = d.toISOString();
    }
    setErro(null);
    try {
      await aoSalvar({ titulo: t, texto: x, aplicaEm: TODOS_OS_TURNOS.filter((v) => turnos.includes(v)), vigenciaFim });
      aoFechar();
    } catch {
      // o toast da ação já disse o que o banco respondeu
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v && !salvando) aoFechar(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={enviar} noValidate className="space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base">Nova orientação para {nomeDoLead}</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-croqui-soft">
              A Bruna lê esta orientação em todo turno com este lead, e só com ele. O cliente nunca vê.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="orientacao-titulo" className="text-[13px]">Título</Label>
              <Contador atual={titulo.length} maximo={TITULO_MAXIMO} />
            </div>
            <Input id="orientacao-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={TITULO_MAXIMO} placeholder="Ex.: não oferecer consultoria até ele mandar a foto" className="h-9 text-sm" autoFocus />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="orientacao-texto" className="text-[13px]">O que a Bruna deve fazer</Label>
              <Contador atual={texto.length} maximo={TEXTO_MAXIMO} />
            </div>
            <Textarea id="orientacao-texto" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={TEXTO_MAXIMO} rows={6} placeholder="Escreva como se falasse com a Bruna: o que fazer, o que evitar e por quê." className="text-sm" />
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-[13px] font-medium">Vale em que turnos</legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              {TURNOS.map((t) => (
                <label key={t.valor} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={turnos.includes(t.valor)} onCheckedChange={(v) => alternarTurno(t.valor, v === true)} aria-label={t.rotulo} />
                  <span>{t.rotulo} <span className="text-2xs text-croqui-soft">({t.descricao})</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="orientacao-fim" className="text-[13px]">Vale até <span className="font-normal text-croqui-soft">(horário de Brasília; opcional, vazio é sem prazo)</span></Label>
            <Input id="orientacao-fim" type="datetime-local" value={fim} min={paraCampoDeBrasilia()} onChange={(e) => setFim(e.target.value)} className="h-9 text-sm sm:w-64" />
          </div>

          {erro && <p role="alert" className="text-[13px] text-destructive">{erro}</p>}

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={aoFechar} disabled={salvando}>Cancelar</Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Criar orientação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Contador({ atual, maximo }: { atual: number; maximo: number }) {
  return (
    <span className={`font-croqui-num text-2xs tabular-nums ${atual > maximo ? 'text-croqui-red-text' : 'text-croqui-soft'}`} aria-live="polite">
      {atual}/{maximo}
    </span>
  );
}
