import { useState, type FormEvent, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { chaveDaBase } from '@/gerenciador/lib/acoes';
import { nomeDaRegiao } from '@/gerenciador/lib/formatos';
import type { EntradaDaBase } from '@/gerenciador/lib/tipos';
import { Contador } from '../comum/Contador';
import { sigla } from '../comum/util';
import {
  CATEGORIA_MAXIMA, CONTEUDO_MAXIMO, FONTE_MAXIMA, PALAVRAS_MAXIMAS, TITULO_MAXIMO, nomeDaCategoria, normalizarCategoria, type FormularioDaBase,
} from './dados';
import { Tags } from './Tags';

const NOVA = '__nova__';
const SEM_PRACA = '__todas__';
const SEM_CONFIANCA = '__sem__';

interface Props {
  /** null = entrada nova. */
  entrada: EntradaDaBase | null;
  /** Para entrada nova: o que já vem preenchido (de uma pergunta sem resposta, por exemplo). */
  inicial?: Partial<FormularioDaBase>;
  /** Um quadro acima do formulário (a pergunta que esta entrada responde). */
  contexto?: ReactNode;
  categorias: string[];
  regioes: string[];
  chavesExistentes: Set<string>;
  salvando: boolean;
  aoFechar: () => void;
  aoSalvar: (f: FormularioDaBase) => Promise<unknown>;
}

function inicialDe(entrada: EntradaDaBase | null, inicial?: Partial<FormularioDaBase>): FormularioDaBase {
  if (entrada) {
    return {
      titulo: entrada.titulo, conteudo: entrada.conteudo, categoria: entrada.categoria, region: entrada.region,
      palavras_chave: entrada.palavras_chave ?? [], prioridade: entrada.prioridade, ativo: entrada.ativo,
      fonte: entrada.fonte, confianca: entrada.confianca === 'alta' || entrada.confianca === 'media' ? entrada.confianca : null,
    };
  }
  return {
    titulo: '', conteudo: '', categoria: '', region: null, palavras_chave: [], prioridade: 100, ativo: true, fonte: null, confianca: 'alta',
    ...inicial,
  };
}

/**
 * Criar ou editar uma entrada da base. A chave nasce do título (e não muda
 * depois, porque a tool e o histórico de consultas falam por ela).
 */
export function FormularioDaBaseDialog({ entrada, inicial, contexto, categorias, regioes, chavesExistentes, salvando, aoFechar, aoSalvar }: Props) {
  const [f, setF] = useState<FormularioDaBase>(() => inicialDe(entrada, inicial));
  const [novaCategoria, setNovaCategoria] = useState(false);
  const [prioridade, setPrioridade] = useState(String(f.prioridade));
  const [erro, setErro] = useState<string | null>(null);
  // O diálogo monta de novo a cada abertura: o estado inicial basta, sem efeito de reinício.

  const mudar = (m: Partial<FormularioDaBase>) => setF((atual) => ({ ...atual, ...m }));
  const chave = entrada ? entrada.chave : chaveDaBase(f.titulo || '');
  const chaveRepetida = !entrada && f.titulo.trim() !== '' && chavesExistentes.has(chave);
  const opcoesDeCategoria = [...new Set([...categorias, ...(f.categoria && !novaCategoria ? [f.categoria] : [])])].sort();

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const titulo = f.titulo.trim();
    const conteudo = f.conteudo.trim();
    const categoria = normalizarCategoria(f.categoria);
    if (!titulo) return setErro('Dê um título à entrada.');
    if (titulo.length > TITULO_MAXIMO) return setErro(`O título passa de ${TITULO_MAXIMO} caracteres.`);
    if (chaveRepetida) return setErro(`Já existe uma entrada com a chave "${chave}". Mude o título ou edite a que já existe.`);
    if (!conteudo) return setErro('Escreva o conteúdo: o que a Bruna vai ler e usar com o cliente.');
    if (conteudo.length > CONTEUDO_MAXIMO) return setErro(`O conteúdo passa de ${CONTEUDO_MAXIMO} caracteres.`);
    if (!categoria) return setErro('Escolha ou escreva a categoria.');
    const p = Number(prioridade);
    if (!Number.isInteger(p) || p < 0 || p > 10000) return setErro('A prioridade é um número inteiro de 0 a 10000.');
    if ((f.fonte ?? '').length > FONTE_MAXIMA) return setErro(`A fonte passa de ${FONTE_MAXIMA} caracteres.`);
    setErro(null);
    try {
      await aoSalvar({ ...f, titulo, conteudo, categoria, prioridade: p });
    } catch {
      // o toast já mostrou a mensagem do banco
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v && !salvando) aoFechar(); }}>
      <DialogContent className="max-h-[94vh] w-[calc(100vw-1rem)] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={enviar} noValidate className="space-y-4">
          <DialogHeader className="text-left">
            <DialogTitle className="pr-6 text-base">{entrada ? `Editar “${entrada.titulo}”` : 'Nova entrada na base'}</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-croqui-soft">
              A Bruna consulta a base com a tool consultar_base quando o cliente pergunta. O que você salva vale na próxima consulta, sem subir nada;
              a versão anterior fica no histórico.
            </DialogDescription>
          </DialogHeader>

          {contexto}

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="base-titulo" className="text-[13px]">Título</Label>
              <Contador atual={f.titulo.length} maximo={TITULO_MAXIMO} />
            </div>
            <Input id="base-titulo" value={f.titulo} onChange={(e) => mudar({ titulo: e.target.value })} className="h-10 text-sm" placeholder="Ex.: Garantia da Orion" />
            <p className="text-2xs text-croqui-soft">
              chave <span className="font-croqui-num text-foreground">{chave || '—'}</span>
              {entrada ? ' (não muda)' : ' (sai do título)'}
              {chaveRepetida && <span className="ml-1 font-medium text-croqui-red-text">já existe: mude o título</span>}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="base-conteudo" className="text-[13px]">Conteúdo</Label>
              <Contador atual={f.conteudo.length} maximo={CONTEUDO_MAXIMO} />
            </div>
            <Textarea
              id="base-conteudo"
              value={f.conteudo}
              onChange={(e) => mudar({ conteudo: e.target.value })}
              rows={9}
              className="text-sm leading-relaxed"
              placeholder="De 2 a 6 linhas, no tom da Bruna, sem prometer o que ninguém prometeu."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="base-categoria" className="text-[13px]">Categoria</Label>
              {novaCategoria ? (
                <div className="flex gap-2">
                  <Input
                    id="base-categoria"
                    value={f.categoria}
                    onChange={(e) => mudar({ categoria: e.target.value })}
                    maxLength={CATEGORIA_MAXIMA}
                    placeholder="nome da categoria nova"
                    className="h-10 text-sm"
                    autoFocus
                  />
                  <Button type="button" variant="ghost" size="sm" className="h-10" onClick={() => { setNovaCategoria(false); mudar({ categoria: entrada?.categoria ?? '' }); }}>
                    Voltar
                  </Button>
                </div>
              ) : (
                <Select
                  value={f.categoria}
                  onValueChange={(v) => {
                    if (v === NOVA) { setNovaCategoria(true); mudar({ categoria: '' }); } else mudar({ categoria: v });
                  }}
                >
                  <SelectTrigger id="base-categoria" className="h-10" aria-label="Categoria"><SelectValue placeholder="Escolha a categoria" /></SelectTrigger>
                  <SelectContent>
                    {opcoesDeCategoria.map((c) => <SelectItem key={c} value={c}>{nomeDaCategoria(c)}</SelectItem>)}
                    <SelectSeparator />
                    <SelectItem value={NOVA}>Nova categoria…</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="base-regiao" className="text-[13px]">Região</Label>
              <Select value={f.region ?? SEM_PRACA} onValueChange={(v) => mudar({ region: v === SEM_PRACA ? null : v })}>
                <SelectTrigger id="base-regiao" className="h-10" aria-label="Região da entrada"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_PRACA}>Todas as regiões</SelectItem>
                  {regioes.map((r) => <SelectItem key={r} value={r}>{sigla(r)} · {nomeDaRegiao(r)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="base-palavras" className="text-[13px]">Palavras-chave</Label>
              <span className="font-croqui-num text-2xs tabular-nums text-croqui-soft">{f.palavras_chave.length}/{PALAVRAS_MAXIMAS}</span>
            </div>
            <Tags id="base-palavras" valor={f.palavras_chave} aoMudar={(v) => mudar({ palavras_chave: v })} maximo={PALAVRAS_MAXIMAS} />
            <p className="text-2xs text-croqui-soft">As formulações que os clientes usam. Termos genéricos (película, vidro, janela) não ajudam a achar.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="base-prioridade" className="text-[13px]">Prioridade <span className="font-normal text-croqui-soft">(menor vem antes)</span></Label>
              <Input
                id="base-prioridade"
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
              <Label htmlFor="base-confianca" className="text-[13px]">Confiança</Label>
              <Select value={f.confianca ?? SEM_CONFIANCA} onValueChange={(v) => mudar({ confianca: v === 'alta' || v === 'media' ? v : null })}>
                <SelectTrigger id="base-confianca" className="h-10" aria-label="Confiança"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">alta</SelectItem>
                  <SelectItem value="media">média</SelectItem>
                  <SelectItem value={SEM_CONFIANCA}>sem marcar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-h-10 items-end justify-between gap-3 sm:flex-col sm:items-start sm:justify-end">
              <Label htmlFor="base-ativo" className="text-[13px]">Ativa</Label>
              <Switch id="base-ativo" checked={f.ativo} onCheckedChange={(v) => mudar({ ativo: v })} aria-label="Entrada ativa" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="base-fonte" className="text-[13px]">Fonte <span className="font-normal text-croqui-soft">(de onde veio a informação)</span></Label>
              <Contador atual={(f.fonte ?? '').length} maximo={FONTE_MAXIMA} />
            </div>
            <Input id="base-fonte" value={f.fonte ?? ''} onChange={(e) => mudar({ fonte: e.target.value })} className="h-10 text-sm" placeholder="Ex.: dono da operação, 05/11" />
          </div>

          {erro && <p role="alert" className="text-[13px] text-destructive">{erro}</p>}

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={aoFechar} disabled={salvando}>Cancelar</Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {entrada ? 'Salvar alterações' : 'Criar entrada'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
