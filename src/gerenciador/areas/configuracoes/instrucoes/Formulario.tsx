import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { nomeDaRegiao } from '@/gerenciador/lib/formatos';
import type { EscopoInstrucao, Instrucao, TurnoInstrucao } from '@/gerenciador/lib/tipos';
import { Contador } from '../comum/Contador';
import { GRUPOS_DE_REGIAO, deInputLocal, paraInputLocal, sigla } from '../comum/util';
import { TEXTO_MAXIMO, TITULO_MAXIMO, TODOS_OS_TURNOS, TURNOS, type FormularioDeInstrucao } from './dados';

interface Props {
  /** null = orientação nova. */
  instrucao: Instrucao | null;
  /** Nome do lead, quando a orientação é de um lead só. */
  nomeDoLead?: string | null;
  salvando: boolean;
  aoFechar: () => void;
  /** Rejeita quando o banco recusa; o toast já avisou e o diálogo fica aberto. */
  aoSalvar: (f: FormularioDeInstrucao) => Promise<unknown>;
}

const PRIORIDADE_PADRAO = 100;

/**
 * Criar ou editar uma orientação: para todas as conversas ou para uma
 * região. A de um lead nasce na tela do lead; aqui ela só se edita.
 */
export function FormularioDeInstrucaoDialog({ instrucao, nomeDoLead, salvando, aoFechar, aoSalvar }: Props) {
  const [escopo, setEscopo] = useState<EscopoInstrucao>(instrucao?.escopo ?? 'global');
  const [region, setRegion] = useState<string>(instrucao?.region ?? '');
  const [titulo, setTitulo] = useState(instrucao?.titulo ?? '');
  const [texto, setTexto] = useState(instrucao?.texto ?? '');
  const [turnos, setTurnos] = useState<TurnoInstrucao[]>(instrucao?.aplica_em?.length ? instrucao.aplica_em : TODOS_OS_TURNOS);
  const [prioridade, setPrioridade] = useState(String(instrucao?.prioridade ?? PRIORIDADE_PADRAO));
  const [fim, setFim] = useState(paraInputLocal(instrucao?.vigencia_fim));
  const [erro, setErro] = useState<string | null>(null);
  // O diálogo monta de novo a cada abertura: o estado inicial basta.

  const doLead = instrucao?.escopo === 'contato';

  const alternarTurno = (t: TurnoInstrucao, marcado: boolean) => {
    setTurnos((atual) => (marcado ? TODOS_OS_TURNOS.filter((x) => x === t || atual.includes(x)) : atual.filter((x) => x !== t)));
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const t = titulo.trim();
    const x = texto.trim();
    if (escopo === 'region' && !region) return setErro('Escolha a região.');
    if (!t) return setErro('Dê um título curto à orientação.');
    if (t.length > TITULO_MAXIMO) return setErro(`O título passa de ${TITULO_MAXIMO} caracteres.`);
    if (!x) return setErro('Escreva o que a Bruna deve fazer.');
    if (x.length > TEXTO_MAXIMO) return setErro(`O texto passa de ${TEXTO_MAXIMO} caracteres.`);
    if (!turnos.length) return setErro('Marque pelo menos um turno em que a orientação vale.');
    const p = Number(prioridade);
    if (!Number.isInteger(p) || p < 0 || p > 10000) return setErro('A prioridade é um número inteiro de 0 a 10000.');
    let vigenciaFim: string | null;
    try {
      vigenciaFim = deInputLocal(fim);
    } catch {
      return setErro('A data de fim da vigência não é válida.');
    }
    const mudouOFim = vigenciaFim !== (instrucao?.vigencia_fim ? new Date(instrucao.vigencia_fim).toISOString() : null);
    if (vigenciaFim && mudouOFim && new Date(vigenciaFim).getTime() <= Date.now()) return setErro('A vigência precisa terminar no futuro.');
    setErro(null);
    try {
      await aoSalvar({
        escopo, region: escopo === 'region' ? region : null, titulo: t, texto: x,
        aplica_em: TODOS_OS_TURNOS.filter((v) => turnos.includes(v)), prioridade: p, vigencia_fim: vigenciaFim,
      });
    } catch {
      // o toast já mostrou a mensagem do banco
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v && !salvando) aoFechar(); }}>
      <DialogContent className="max-h-[94vh] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-xl">
        <form onSubmit={enviar} noValidate className="space-y-4">
          <DialogHeader className="text-left">
            <DialogTitle className="pr-6 text-base">{instrucao ? 'Editar orientação' : 'Nova orientação'}</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-croqui-soft">
              A Bruna lê as orientações vivas em todo turno em que elas valem, acima das regras gerais do núcleo e abaixo dos limites duros. O
              cliente nunca vê.
            </DialogDescription>
          </DialogHeader>

          {doLead ? (
            <p className="rounded-sm border border-border px-3 py-2 text-[13px]">
              Só para o lead <span className="font-croqui-num tabular-nums">{instrucao?.contato_id}</span>
              {nomeDoLead ? <> · <span className="font-medium">{nomeDoLead}</span></> : null}
            </p>
          ) : (
            <fieldset className="space-y-2">
              <legend className="text-[13px] font-medium">Para quem</legend>
              <div className="flex flex-col gap-1 sm:flex-row sm:gap-5">
                {([['global', 'Todas as conversas'], ['region', 'Uma região']] as const).map(([valor, rotulo]) => (
                  <label key={valor} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="instrucao-escopo"
                      value={valor}
                      checked={escopo === valor}
                      onChange={() => setEscopo(valor)}
                      className="h-4 w-4 accent-[hsl(var(--action))]"
                    />
                    {rotulo}
                  </label>
                ))}
              </div>
              {escopo === 'region' && (
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="h-10 sm:w-72" aria-label="Região da orientação"><SelectValue placeholder="Escolha a região" /></SelectTrigger>
                  <SelectContent>
                    {GRUPOS_DE_REGIAO.map((g) => (
                      <SelectGroup key={g.rotulo}>
                        <SelectLabel className="text-2xs uppercase tracking-[0.1em] text-croqui-soft">{g.rotulo}</SelectLabel>
                        {g.regioes.map((r) => <SelectItem key={r} value={r}>{sigla(r)} · {nomeDaRegiao(r)}</SelectItem>)}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </fieldset>
          )}

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="instrucao-titulo" className="text-[13px]">Título</Label>
              <Contador atual={titulo.length} maximo={TITULO_MAXIMO} />
            </div>
            <Input id="instrucao-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="h-10 text-sm" placeholder="Ex.: confirmar o bairro antes de oferecer horário" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="instrucao-texto" className="text-[13px]">O que a Bruna deve fazer</Label>
              <Contador atual={texto.length} maximo={TEXTO_MAXIMO} />
            </div>
            <Textarea
              id="instrucao-texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={7}
              className="text-sm leading-relaxed"
              placeholder="Escreva como se falasse com a Bruna: o que fazer, o que evitar e por quê."
            />
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-[13px] font-medium">Vale em que turnos</legend>
            <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
              {TURNOS.map((t) => (
                <label key={t.valor} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={turnos.includes(t.valor)} onCheckedChange={(v) => alternarTurno(t.valor, v === true)} aria-label={t.rotulo} />
                  <span>{t.rotulo} <span className="text-2xs text-croqui-soft">({t.descricao})</span></span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="instrucao-prioridade" className="text-[13px]">Prioridade <span className="font-normal text-croqui-soft">(menor vem antes)</span></Label>
              <Input
                id="instrucao-prioridade"
                type="number"
                inputMode="numeric"
                min={0}
                max={10000}
                step={1}
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value)}
                className="h-10 font-croqui-num text-sm tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="instrucao-fim" className="text-[13px]">Vale até <span className="font-normal text-croqui-soft">(horário de Brasília; vazio é sem prazo)</span></Label>
              <Input id="instrucao-fim" type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} className="h-10 text-sm" />
            </div>
          </div>

          {erro && <p role="alert" className={cn('text-[13px] text-destructive')}>{erro}</p>}

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={aoFechar} disabled={salvando}>Cancelar</Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {instrucao ? 'Salvar alterações' : 'Criar orientação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
