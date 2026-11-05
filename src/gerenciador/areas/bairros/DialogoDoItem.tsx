import { useEffect, useMemo, useRef, useState, type BaseSyntheticEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, Eye, Loader2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CampoDeTermos } from './CampoDeTermos';
import { EfeitoDaMudanca } from './EfeitoDaMudanca';
import { DIAS_DA_SIMULACAO, mensagemDeErro, useSimularMudanca, type AcoesDoFoco, type MudancaProposta } from './dados';
import {
  MOTIVO_MAXIMO, NOME_MAXIMO, NOME_MINIMO, OBSERVACAO_MAXIMA, TERMOS_MAXIMOS,
  assinaturaDoCasamento, colapsar, daPraca, doTipo, nadaMudouNoBanco, normalizar,
} from './regras';
import type { ItemDoFoco, Praca, Simulacao, TipoDoFoco } from './tipos';

/** O que abre o diálogo: criar (às vezes já com um nome, vindo dos pedidos fora do foco) ou editar um item. */
export type PedidoDeEdicao =
  | { modo: 'criar'; nomeSugerido?: string }
  | { modo: 'editar'; item: ItemDoFoco };

interface Valores {
  tipo: TipoDoFoco;
  nome: string;
  so_se: string[];
  nao_se: string[];
  observacao: string;
  /** '' = no fim da lista. */
  depois_de: string;
  motivo: string;
}

function esquemaDoItem(outros: Array<{ tipo: TipoDoFoco; nome: string }>, nomeDaPraca: string) {
  return z
    .object({
      tipo: z.enum(['bairro', 'cidade']),
      nome: z.string(),
      so_se: z.array(z.string()).max(TERMOS_MAXIMOS, `No máximo ${TERMOS_MAXIMOS} termos.`),
      nao_se: z.array(z.string()).max(TERMOS_MAXIMOS, `No máximo ${TERMOS_MAXIMOS} termos.`),
      observacao: z.string().max(OBSERVACAO_MAXIMA, `A observação passa de ${OBSERVACAO_MAXIMA} caracteres.`),
      depois_de: z.string(),
      motivo: z.string().max(MOTIVO_MAXIMO, `O motivo passa de ${MOTIVO_MAXIMO} caracteres.`),
    })
    .superRefine((v, ctx) => {
      const nome = colapsar(v.nome);
      const problema =
        nome.length < NOME_MINIMO ? `Escreva o nome com pelo menos ${NOME_MINIMO} letras.`
          : nome.length > NOME_MAXIMO ? `O nome passa de ${NOME_MAXIMO} caracteres.`
            : !normalizar(nome) ? 'O nome precisa ter letras ou números.'
              : outros.some((o) => o.tipo === v.tipo && normalizar(o.nome) === normalizar(nome))
                ? `${v.tipo === 'cidade' ? 'Essa cidade' : 'Esse bairro'} já está na lista ${daPraca(nomeDaPraca)}.`
                : null;
      if (problema) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nome'], message: problema });
    });
}

const TIPOS: Array<{ valor: TipoDoFoco; rotulo: string; descricao: string }> = [
  { valor: 'bairro', rotulo: 'Bairro', descricao: 'vale quando o cliente diz este bairro' },
  { valor: 'cidade', rotulo: 'Cidade inteira', descricao: 'a cidade basta; a Bruna não pergunta o bairro' },
];

type ListaDeTermos = 'so_se' | 'nao_se';
const ID_DOS_TERMOS: Record<ListaDeTermos, string> = { so_se: 'foco-so-se', nao_se: 'foco-nao-se' };
const TERMO_PENDENTE = 'Adicione ou apague o termo que ficou no campo.';

interface Props {
  praca: Praca;
  pedido: PedidoDeEdicao;
  /** Todos os itens da praça, para a posição e para não repetir nome. */
  itens: ItemDoFoco[];
  acoes: AcoesDoFoco;
  aoFechar: () => void;
}

/**
 * Adicionar ou editar um item da lista. Mudar tipo, nome ou exceções muda
 * quem é foco, então o Salvar só aparece depois de "Ver o efeito", que pede
 * ao banco a simulação nos leads recentes (nada fica gravado nela).
 */
export function DialogoDoItem({ praca, pedido, itens, acoes, aoFechar }: Props) {
  const original = pedido.modo === 'editar' ? pedido.item : null;
  const outros = useMemo(
    () => itens.filter((i) => !(original && i.tipo === original.tipo && i.nome === original.nome)),
    [itens, original],
  );
  const esquema = useMemo(() => esquemaDoItem(outros, praca.nome), [outros, praca.nome]);
  const form = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      tipo: original?.tipo ?? 'bairro',
      nome: original?.nome ?? colapsar(pedido.modo === 'criar' ? pedido.nomeSugerido : ''),
      so_se: original?.so_se ?? [],
      nao_se: original?.nao_se ?? [],
      observacao: original?.observacao ?? '',
      depois_de: '',
      motivo: '',
    },
  });
  const { errors } = form.formState;

  const simular = useSimularMudanca(praca.region);
  const [simulacao, setSimulacao] = useState<{ assinatura: string; resultado: Simulacao } | null>(null);
  const [falhouPara, setFalhouPara] = useState<string | null>(null);
  const [erroDaSimulacao, setErroDaSimulacao] = useState<string | null>(null);
  const [erroAoSalvar, setErroAoSalvar] = useState<string | null>(null);
  const [avisos, setAvisos] = useState<string[] | null>(null);
  // Texto que ficou num campo de exceções sem virar termo (repetido, longo
  // demais): ver o efeito ou salvar sem ele mudaria a regra em silêncio.
  const [pendentes, setPendentes] = useState<Record<ListaDeTermos, boolean>>({ so_se: false, nao_se: false });
  const [cobrarPendente, setCobrarPendente] = useState(false);
  const marcarPendente = (campo: ListaDeTermos) => (pendente: boolean) => {
    setPendentes((p) => (p[campo] === pendente ? p : { ...p, [campo]: pendente }));
  };
  const campoPendente: ListaDeTermos | null = pendentes.so_se ? 'so_se' : pendentes.nao_se ? 'nao_se' : null;
  useEffect(() => { if (!campoPendente) setCobrarPendente(false); }, [campoPendente]);
  const erroDosTermos = (campo: ListaDeTermos, erro: string | undefined) => (cobrarPendente && pendentes[campo] ? TERMO_PENDENTE : erro);
  /** true quando sobrou texto num campo de exceções: avisa no campo e leva o foco até ele. */
  const barrarPendente = (): boolean => {
    if (!campoPendente) return false;
    setCobrarPendente(true);
    document.getElementById(ID_DOS_TERMOS[campoPendente])?.focus();
    return true;
  };
  // O efeito aparece no fim do formulário: quando chega, o corpo do diálogo
  // (e só ele: scrollIntoView rolaria também a moldura) rola até ele.
  const corpoRef = useRef<HTMLDivElement>(null);
  const efeitoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const corpo = corpoRef.current;
    const efeito = efeitoRef.current;
    if (!simulacao || !corpo || !efeito || typeof corpo.scrollTo !== 'function') return;
    const topo = efeito.getBoundingClientRect().top - corpo.getBoundingClientRect().top + corpo.scrollTop - 8;
    corpo.scrollTo({ top: Math.max(0, topo), behavior: 'smooth' });
  }, [simulacao]);

  const valores = form.watch();
  const assinatura = assinaturaDoCasamento(valores);
  const mudaOCasamento = !original || assinatura !== assinaturaDoCasamento(original);
  const efeitoVisto = simulacao?.assinatura === assinatura;
  const simulacaoVencida = Boolean(simulacao) && !efeitoVisto;
  const semEfeitoPorFalha = falhouPara === assinatura;
  const observacaoMudou = (valores.observacao.trim() || null) !== (original?.observacao?.trim() || null);
  const nadaMudou = Boolean(original) && !mudaOCasamento && !observacaoMudou;
  const podeSalvar = !nadaMudou && (!mudaOCasamento || efeitoVisto || semEfeitoPorFalha);
  const ocupado = simular.isPending || acoes.salvar.isPending;
  const posicoes = doTipo(outros, valores.tipo);

  const proposta = (v: Valores): MudancaProposta => ({
    tipo: v.tipo,
    nome: colapsar(v.nome),
    soSe: v.so_se,
    naoSe: v.nao_se,
    nomeOriginal: original?.nome ?? null,
    tipoOriginal: original?.tipo ?? null,
  });

  const simularOEfeito = form.handleSubmit(async (v) => {
    if (!mudaOCasamento) return;
    const a = assinaturaDoCasamento(v);
    setErroDaSimulacao(null);
    try {
      const resultado = await simular.mutateAsync(proposta(v));
      setSimulacao({ assinatura: a, resultado });
      setFalhouPara(null);
    } catch (e) {
      const m = mensagemDeErro(e);
      setErroDaSimulacao(m);
      setFalhouPara(a);
      toast.error(m);
    }
  });
  const verEfeito = (e?: BaseSyntheticEvent) => {
    if (barrarPendente()) {
      e?.preventDefault();
      return;
    }
    void simularOEfeito(e);
  };

  const gravar = form.handleSubmit(async (v) => {
    if (!podeSalvar) return;
    setErroAoSalvar(null);
    try {
      const r = await acoes.salvar.mutateAsync({
        ...proposta(v),
        observacao: v.observacao.trim() || null,
        depoisDe: original ? null : v.depois_de || null,
        motivo: v.motivo.trim() || null,
      });
      // O banco achou o item igual ao gravado: nada a avisar aqui (o toast
      // diz que nada mudou e a lista recarrega).
      if (nadaMudouNoBanco(r)) {
        aoFechar();
        return;
      }
      const lista = (r?.avisos ?? []).filter((a) => typeof a === 'string' && a.trim());
      if (lista.length) setAvisos(lista);
      else aoFechar();
    } catch (e) {
      // o toast do erro já saiu na ação; aqui ele fica escrito no diálogo
      setErroAoSalvar(mensagemDeErro(e));
    }
  });
  const salvar = () => {
    if (barrarPendente()) return;
    void gravar();
  };

  const fechar = (aberto: boolean) => { if (!aberto && !ocupado) aoFechar(); };

  if (avisos) {
    return (
      <Dialog open onOpenChange={fechar}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Salvo, com {avisos.length === 1 ? 'um aviso' : `${avisos.length} avisos`}</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-croqui-soft">
              A mudança já vale. Confira o que o banco apontou.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {avisos.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-foreground">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" strokeWidth={1.75} aria-hidden />
                <span>{a}</span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button type="button" onClick={aoFechar}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={fechar}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <form onSubmit={verEfeito} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="px-6 pb-4 pr-12 pt-6">
            <DialogTitle className="text-base">{original ? `Editar ${original.nome}` : `Adicionar à lista ${daPraca(praca.nome)}`}</DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-croqui-soft">
              {original
                ? 'Mudar o tipo, o nome ou as exceções muda quem é foco. Antes de salvar, veja o efeito nos leads recentes.'
                : 'Quem disser este lugar recebe o convite para a consultoria; fora da lista, a Bruna segue pelo fluxo da foto. Antes de salvar, veja o efeito nos leads recentes.'}
            </DialogDescription>
          </DialogHeader>

          <div ref={corpoRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-5">
            <Controller
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <EscolhaDoTipo
                  valor={field.value}
                  aoEscolher={(t) => { field.onChange(t); form.setValue('depois_de', ''); }}
                />
              )}
            />

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="foco-nome" className="text-[13px]">Nome</Label>
                <Contador atual={colapsar(valores.nome).length} maximo={NOME_MAXIMO} />
              </div>
              <Input
                id="foco-nome"
                {...form.register('nome')}
                maxLength={NOME_MAXIMO + 20}
                placeholder={valores.tipo === 'cidade' ? 'Ex.: Santana de Parnaíba' : 'Ex.: Vila Mariana'}
                aria-invalid={errors.nome ? true : undefined}
                aria-describedby={errors.nome ? 'foco-nome-erro' : undefined}
                className="h-10 text-sm sm:h-9"
                autoFocus
              />
              {errors.nome?.message && <p id="foco-nome-erro" role="alert" className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>

            <Controller
              control={form.control}
              name="so_se"
              render={({ field }) => (
                <CampoDeTermos
                  id="foco-so-se"
                  rotulo="Só vale se a cidade for"
                  ajuda="Vazio vale em toda a praça. Use para nome que existe em mais de uma cidade: a Vila Alpina daqui é só a de Valinhos."
                  placeholder="Ex.: Valinhos"
                  valor={field.value}
                  aoMudar={field.onChange}
                  aoPendente={marcarPendente('so_se')}
                  erro={erroDosTermos('so_se', errors.so_se?.message)}
                />
              )}
            />

            <Controller
              control={form.control}
              name="nao_se"
              render={({ field }) => (
                <CampoDeTermos
                  id="foco-nao-se"
                  rotulo="Não vale quando o cliente escrever"
                  ajuda="Trechos que contêm o nome mas são outro lugar ou outra coisa: “bosque da saude” não é o bairro Saúde, “plano de saude” nem é bairro."
                  placeholder="Ex.: bosque da saude"
                  valor={field.value}
                  aoMudar={field.onChange}
                  aoPendente={marcarPendente('nao_se')}
                  erro={erroDosTermos('nao_se', errors.nao_se?.message)}
                />
              )}
            />

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="foco-observacao" className="text-[13px]">Observação <span className="font-normal text-croqui-soft">(opcional; só o gerenciador vê)</span></Label>
                <Contador atual={valores.observacao.length} maximo={OBSERVACAO_MAXIMA} />
              </div>
              <Textarea
                id="foco-observacao"
                {...form.register('observacao')}
                maxLength={OBSERVACAO_MAXIMA}
                rows={2}
                placeholder="Ex.: condomínio fechado; o representante atende desde out/26"
                className="text-sm"
              />
              {errors.observacao?.message && <p role="alert" className="text-xs text-destructive">{errors.observacao.message}</p>}
            </div>

            {!original && (
              <div className="space-y-1.5">
                <Label htmlFor="foco-posicao" className="text-[13px]">Posição na lista</Label>
                <select
                  id="foco-posicao"
                  {...form.register('depois_de')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-9"
                >
                  <option value="">No fim da lista</option>
                  {posicoes.map((i) => <option key={i.nome} value={i.nome}>Depois de {i.nome}</option>)}
                </select>
                <p className="text-xs text-croqui-soft">A posição muda só a ordem da lista que a Bruna lê e do arquivo exportado.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="foco-motivo" className="text-[13px]">Motivo da mudança <span className="font-normal text-croqui-soft">(opcional; vai para o histórico)</span></Label>
              <Input
                id="foco-motivo"
                {...form.register('motivo')}
                maxLength={MOTIVO_MAXIMO}
                placeholder="Ex.: o representante passou a atender o bairro"
                className="h-10 text-sm sm:h-9"
              />
            </div>

            {efeitoVisto && simulacao && (
              <div ref={efeitoRef}>
                <EfeitoDaMudanca simulacao={simulacao.resultado} dias={DIAS_DA_SIMULACAO} />
              </div>
            )}
            {simulacaoVencida && !semEfeitoPorFalha && (
              <p className="text-[13px] text-croqui-soft">Você mudou o tipo, o nome ou as exceções depois de ver o efeito. Veja de novo antes de salvar.</p>
            )}
            {original && !mudaOCasamento && !nadaMudou && (
              <p className="text-[13px] text-croqui-soft">Só a observação mudou: nenhum lead muda de situação.</p>
            )}
            {erroDaSimulacao && semEfeitoPorFalha && (
              <p role="alert" className="flex items-start gap-2 text-[13px] text-destructive">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                <span>Não deu para ver o efeito: {erroDaSimulacao}</span>
              </p>
            )}
            {erroAoSalvar && (
              <p role="alert" className="flex items-start gap-2 text-[13px] text-destructive">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                <span>Não salvou: {erroAoSalvar}</span>
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 border-t border-border px-6 py-3">
            <Button type="button" variant="ghost" onClick={aoFechar} disabled={ocupado}>Cancelar</Button>
            {nadaMudou ? (
              <Button type="button" disabled>Nada mudou ainda</Button>
            ) : podeSalvar ? (
              <>
                {semEfeitoPorFalha && (
                  <Button type="submit" variant="outline" disabled={ocupado}>
                    {simular.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
                    Ver o efeito de novo
                  </Button>
                )}
                <Button type="button" onClick={salvar} disabled={ocupado}>
                  {acoes.salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
                  {semEfeitoPorFalha ? 'Salvar sem ver o efeito' : 'Salvar'}
                </Button>
              </>
            ) : (
              <Button type="submit" disabled={ocupado}>
                {simular.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Eye className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
                {simular.isPending ? 'Vendo o efeito…' : 'Ver o efeito'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Bairro ou cidade inteira: dois botões de rádio, com as setas trocando a escolha. */
function EscolhaDoTipo({ valor, aoEscolher }: { valor: TipoDoFoco; aoEscolher: (t: TipoDoFoco) => void }) {
  const botoes = useRef<Array<HTMLButtonElement | null>>([]);
  const escolherPelaSeta = (indice: number) => {
    const proximo = (indice + 1) % TIPOS.length;
    aoEscolher(TIPOS[proximo].valor);
    botoes.current[proximo]?.focus();
  };
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-[13px] font-medium">Tipo</legend>
      <div role="radiogroup" aria-label="Tipo" className="grid gap-2 sm:grid-cols-2">
        {TIPOS.map((t, i) => {
          const marcado = valor === t.valor;
          return (
            <button
              key={t.valor}
              ref={(el) => { botoes.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={marcado}
              tabIndex={marcado ? 0 : -1}
              onClick={() => aoEscolher(t.valor)}
              onKeyDown={(e) => {
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                  e.preventDefault();
                  escolherPelaSeta(i);
                }
              }}
              className={cn(
                'flex min-h-10 items-start gap-2 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                marcado ? 'border-foreground' : 'border-border hover:border-croqui-soft',
              )}
            >
              <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border', marcado ? 'border-foreground bg-foreground text-background' : 'border-croqui-soft')} aria-hidden>
                {marcado && <Check className="h-3 w-3" strokeWidth={2.5} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{t.rotulo}</span>
                <span className="block text-2xs leading-snug text-croqui-soft">{t.descricao}</span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * Quantos caracteres há e o máximo. Não é anunciado a cada tecla: o leitor de
 * tela só ouve quando o texto passa do máximo.
 */
function Contador({ atual, maximo }: { atual: number; maximo: number }) {
  const passou = atual > maximo;
  return (
    <span className={cn('font-croqui-num text-2xs tabular-nums', passou ? 'text-croqui-red-text' : 'text-croqui-soft')}>
      {atual}/{maximo}
      <span role="status" className="sr-only">{passou ? `Passou de ${maximo} caracteres.` : ''}</span>
    </span>
  );
}
