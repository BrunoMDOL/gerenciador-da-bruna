import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, History, Loader2, Plus, Power, PowerOff, Search, SearchX, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FaixaDeAbas } from '@/components/croqui/FaixaDeAbas';
import { cn } from '@/lib/utils';
import { Carregando, Erro, Painel, Pilula, Vazio } from '@/gerenciador/componentes';
import { data as dataCurta, dataHora, nomeDaRegiao } from '@/gerenciador/lib/formatos';
import type { EntradaDaBase } from '@/gerenciador/lib/tipos';
import { CHAVES, invalidarOutrasAreas } from './chaves';
import { Chip } from './comum/Chip';
import { ordenarRegioes, useRegioes } from './comum/regioes';
import { SugestoesDaArea } from './comum/SugestoesDaArea';
import { normalizar, plural } from './comum/texto';
import { NadaGravado, mensagemDeErro, sigla } from './comum/util';
import {
  ChaveRepetida, agruparDuvidas, alterarEntrada, buscarNaBase, casaComTermo, criarEntrada, descartarDuvidas, listarBase, listarDuvidas,
  mudarAtivo, nomeDaCategoria, resolverDuvidas, restaurarVersao, type FormularioDaBase, type GrupoDeDuvidas, type VersaoDaEntrada,
} from './base/dados';
import { Duvidas } from './base/Duvidas';
import { FormularioDaBaseDialog } from './base/Formulario';
import { HistoricoDaBaseDialog } from './base/Historico';

type FiltroDeEstado = 'ativas' | 'inativas' | 'todas';
const TODAS = 'todas';
const GERAL = '__geral__';
const REGIOES_PADRAO = ['sp', 'rj', 'goiania', 'brasil', 'brasil2', 'arquitetos'];

/**
 * /configuracoes/base: a base de conhecimento que a Bruna consulta.
 * Busca, filtros, criar e editar, desativar, o histórico de cada entrada com
 * "restaurar esta versão" e a fila das perguntas que a base não respondeu.
 */
export default function Base() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: CHAVES.base, queryFn: listarBase });
  const regioes = useRegioes();
  const duvidas = useQuery({ queryKey: CHAVES.duvidas, queryFn: () => listarDuvidas() });

  const [texto, setTexto] = useState('');
  const [termo, setTermo] = useState('');
  const [categoria, setCategoria] = useState(TODAS);
  const [regiao, setRegiao] = useState(TODAS);
  const [estado, setEstado] = useState<FiltroDeEstado>('ativas');
  const [editando, setEditando] = useState<EntradaDaBase | 'nova' | null>(null);
  const [respondendo, setRespondendo] = useState<GrupoDeDuvidas | null>(null);
  const [historico, setHistorico] = useState<EntradaDaBase | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setTermo(texto.trim()), 300);
    return () => clearTimeout(t);
  }, [texto]);

  const busca = useQuery({ queryKey: CHAVES.buscaNaBase(termo), queryFn: () => buscarNaBase(termo), enabled: termo.length >= 2 });

  const entradas = useMemo(() => q.data ?? [], [q.data]);
  const categorias = useMemo(() => [...new Set(entradas.map((e) => e.categoria))].sort(), [entradas]);
  const chaves = useMemo(() => new Set(entradas.map((e) => e.chave)), [entradas]);
  const regioesDaBase = useMemo(
    () => (regioes.data?.length ? ordenarRegioes(regioes.data).map((r) => r.region) : REGIOES_PADRAO),
    [regioes.data],
  );
  const grupos = useMemo(() => agruparDuvidas(duvidas.data ?? []), [duvidas.data]);

  const filtradas = useMemo(() => {
    const porFts = new Set(busca.data ?? []);
    const t = normalizar(termo);
    const lista = entradas.filter((e) =>
      (estado === 'todas' || (estado === 'ativas' ? e.ativo : !e.ativo))
      && (categoria === TODAS || e.categoria === categoria)
      && (regiao === TODAS || (regiao === GERAL ? e.region == null : e.region === regiao))
      && (termo.length < 2 || porFts.has(e.id) || casaComTermo(e, termo)));
    if (termo.length < 2) return lista;
    // Quem tem o termo no título vem primeiro; depois quem o banco achou; depois o resto.
    const peso = (e: EntradaDaBase) => (normalizar(e.titulo).includes(t) ? 0 : porFts.has(e.id) ? 1 : 2);
    return [...lista].sort((a, b) => peso(a) - peso(b));
  }, [entradas, estado, categoria, regiao, termo, busca.data]);

  const recarregar = () => {
    void qc.invalidateQueries({ queryKey: CHAVES.base });
    invalidarOutrasAreas(qc, 'base');
  };
  const falhou = (e: unknown) => {
    toast.error(mensagemDeErro(e));
    // A linha sumiu ou a RLS recusou: a lista na tela já não é a do banco.
    if (e instanceof NadaGravado) recarregar();
  };

  const salvar = useMutation({
    mutationFn: async ({ antes, f }: { antes: EntradaDaBase | null; f: FormularioDaBase }) => {
      if (antes) return { mudou: await alterarEntrada(antes, f), chave: antes.chave };
      const criada = await criarEntrada(f);
      return { mudou: true, chave: criada.chave };
    },
    onSuccess: ({ mudou }, { antes }) => {
      toast[mudou ? 'success' : 'message'](!mudou ? 'Nada mudou na entrada.' : antes ? 'Entrada alterada. Vale na próxima consulta da Bruna.' : 'Entrada criada. A Bruna já acha na próxima consulta.');
      setEditando(null);
      recarregar();
    },
    // A ChaveRepetida já traz a frase para o toast; NadaGravado recarrega a lista.
    onError: falhou,
  });

  const responder = useMutation({
    mutationFn: async ({ grupo, f }: { grupo: GrupoDeDuvidas; f: FormularioDaBase }) => {
      const criada = await criarEntrada(f, { duvidas: grupo.ids, pergunta: grupo.pergunta.slice(0, 300) });
      try {
        await resolverDuvidas(grupo.ids, criada.chave, f.conteudo.trim());
      } catch (e) {
        throw new Error(`A entrada “${f.titulo.trim()}” foi criada, mas a pergunta não saiu da fila: ${mensagemDeErro(e)}`);
      }
      return criada;
    },
    onSuccess: () => {
      toast.success('Entrada criada e pergunta respondida. A Bruna já acha na próxima consulta.');
      setRespondendo(null);
      recarregar();
      void qc.invalidateQueries({ queryKey: CHAVES.duvidas });
    },
    onError: (e) => {
      toast.error(e instanceof ChaveRepetida ? e.message : mensagemDeErro(e));
      recarregar();
      void qc.invalidateQueries({ queryKey: CHAVES.duvidas });
    },
  });

  const descartar = useMutation({
    mutationFn: (g: GrupoDeDuvidas) => descartarDuvidas(g),
    onSuccess: () => { toast.success('Pergunta tirada da fila.'); void qc.invalidateQueries({ queryKey: CHAVES.duvidas }); invalidarOutrasAreas(qc, 'base'); },
    onError: (e) => { falhou(e); if (e instanceof NadaGravado) void qc.invalidateQueries({ queryKey: CHAVES.duvidas }); },
  });

  const ativar = useMutation({
    mutationFn: ({ e, ativo }: { e: EntradaDaBase; ativo: boolean }) => mudarAtivo(e, ativo),
    onSuccess: (_r, { ativo }) => { toast.success(ativo ? 'Entrada reativada.' : 'Entrada desativada. A Bruna deixa de achar.'); recarregar(); },
    onError: falhou,
  });

  const restaurar = useMutation({
    mutationFn: ({ e, v }: { e: EntradaDaBase; v: VersaoDaEntrada }) => restaurarVersao(e, v),
    onSuccess: (_r, { e }) => {
      toast.success('Versão restaurada. A Bruna lê assim na próxima consulta.');
      void qc.invalidateQueries({ queryKey: CHAVES.historicoDaBase(e.id) });
      setHistorico(null);
      recarregar();
    },
    onError: falhou,
  });

  const novaEntrada = (
    <Button onClick={() => setEditando('nova')}>
      <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Nova entrada
    </Button>
  );
  const limparFiltros = () => { setTexto(''); setTermo(''); setCategoria(TODAS); setRegiao(TODAS); setEstado('todas'); };
  const ativas = entradas.filter((e) => e.ativo).length;

  return (
    <div className="space-y-5">
      <SugestoesDaArea tipo="base" recarregar={CHAVES.base} />
      <Duvidas
        grupos={grupos}
        erro={duvidas.isError && !duvidas.data ? duvidas.error.message : null}
        tentarDeNovo={() => void duvidas.refetch()}
        descartando={descartar.isPending ? descartar.variables?.chave ?? null : null}
        aoResponder={setRespondendo}
        aoDescartar={(g) => descartar.mutateAsync(g)}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-croqui-soft" strokeWidth={1.75} aria-hidden />
            <Input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar por título, palavra-chave ou trecho"
              aria-label="Buscar na base"
              className="h-10 pl-9 pr-9 text-sm sm:h-9"
            />
            {texto && (
              <button
                type="button"
                aria-label="Limpar a busca"
                onClick={() => { setTexto(''); setTermo(''); }}
                className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-croqui-soft hover:text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              </button>
            )}
          </div>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="h-10 w-full sm:h-9 sm:w-44" aria-label="Filtrar por categoria"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todas as categorias</SelectItem>
              {categorias.map((c) => <SelectItem key={c} value={c}>{nomeDaCategoria(c)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={regiao} onValueChange={setRegiao}>
            <SelectTrigger className="h-10 w-full sm:h-9 sm:w-48" aria-label="Filtrar por região"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Qualquer região</SelectItem>
              <SelectItem value={GERAL}>Só as gerais (sem região)</SelectItem>
              {regioesDaBase.map((r) => <SelectItem key={r} value={r}>{sigla(r)} · {nomeDaRegiao(r)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <FaixaDeAbas ativa={estado}>
            <Chip ativo={estado === 'ativas'} onClick={() => setEstado('ativas')} contagem={ativas}>Ativas</Chip>
            <Chip ativo={estado === 'inativas'} onClick={() => setEstado('inativas')} contagem={entradas.length - ativas}>Desativadas</Chip>
            <Chip ativo={estado === 'todas'} onClick={() => setEstado('todas')} contagem={entradas.length}>Todas</Chip>
          </FaixaDeAbas>
          <div className="shrink-0">{novaEntrada}</div>
        </div>
      </div>

      <Painel
        semRecheio
        titulo={q.isPending ? 'Entradas' : plural(filtradas.length, 'entrada', 'entradas')}
        nota={termo.length >= 2 ? (busca.isFetching ? 'buscando no banco…' : `com “${termo}”`) : 'por categoria, prioridade e título'}
      >
        {q.isPending ? (
          <Carregando texto="Carregando a base" />
        ) : q.isError && !q.data ? (
          <div className="p-4"><Erro mensagem={q.error.message} tentar={() => void q.refetch()} /></div>
        ) : entradas.length === 0 ? (
          <Vazio
            Icone={BookOpen}
            titulo="A base está vazia"
            descricao="Crie a primeira entrada: uma resposta curta, no tom da Bruna, para uma pergunta que os clientes fazem. A tool consultar_base passa a achar na hora."
            acao={novaEntrada}
          />
        ) : filtradas.length === 0 ? (
          <Vazio
            Icone={SearchX}
            titulo="Nada na base com essa busca"
            descricao={busca.isError ? `A busca do banco falhou (${busca.error.message}); o filtro por trecho continua valendo.` : 'Tente outra palavra, tire um filtro, ou crie a entrada que falta.'}
            acao={<div className="flex flex-wrap justify-center gap-2"><Button variant="outline" size="sm" onClick={limparFiltros}>Limpar busca e filtros</Button>{novaEntrada}</div>}
          />
        ) : (
          <>
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="border-b border-border text-left text-2xs font-medium uppercase tracking-[0.1em] text-croqui-soft">
                  <th scope="col" className="px-4 py-2.5 font-medium">Entrada</th>
                  <th scope="col" className="px-2 py-2.5 font-medium">Categoria</th>
                  <th scope="col" className="px-2 py-2.5 font-medium">Região</th>
                  <th scope="col" className="px-2 py-2.5 text-right font-medium">Prioridade</th>
                  <th scope="col" className="px-2 py-2.5 font-medium">Confiança</th>
                  <th scope="col" className="px-2 py-2.5 font-medium">Atualizada</th>
                  <th scope="col" className="px-4 py-2.5"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((e) => (
                  <tr key={e.id} className={cn('border-b border-border align-top last:border-b-0 hover:bg-accent/60', !e.ativo && 'text-croqui-soft')}>
                    <td className="max-w-[30rem] px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => setEditando(e)}
                        className={cn('text-left font-medium underline decoration-croqui-rule underline-offset-4 hover:decoration-foreground', e.ativo ? 'text-foreground' : 'text-croqui-soft')}
                      >
                        {e.titulo}
                      </button>
                      <p className="mt-0.5 line-clamp-2 text-[13px] text-croqui-soft">{e.conteudo}</p>
                      <p className="mt-0.5 font-croqui-num text-2xs text-croqui-soft">{e.chave}{!e.ativo && ' · desativada'}</p>
                    </td>
                    <td className="px-2 py-2.5 text-[13px]">{nomeDaCategoria(e.categoria)}</td>
                    <td className="px-2 py-2.5 text-[13px]" title={e.region ? nomeDaRegiao(e.region) : 'vale para todas'}>
                      {e.region ? <span className="font-semibold tracking-[0.08em]">{sigla(e.region)}</span> : <span className="text-croqui-soft">todas</span>}
                    </td>
                    <td className="px-2 py-2.5 text-right font-croqui-num tabular-nums">{e.prioridade}</td>
                    <td className="px-2 py-2.5"><Confianca valor={e.confianca} /></td>
                    <td className="whitespace-nowrap px-2 py-2.5 font-croqui-num text-[13px] tabular-nums text-croqui-soft" title={dataHora(e.atualizado_em)}>{dataCurta(e.atualizado_em, true)}</td>
                    <td className="px-4 py-2.5">
                      <AcoesDaEntrada e={e} ocupada={ativar.isPending && ativar.variables?.e.id === e.id} aoHistorico={() => setHistorico(e)} aoAtivar={(ativo) => ativar.mutate({ e, ativo })} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="divide-y divide-border md:hidden">
              {filtradas.map((e) => (
                <li key={e.id} className="px-4 py-3">
                  <button type="button" onClick={() => setEditando(e)} className={cn('text-left text-[15px] font-medium underline decoration-croqui-rule underline-offset-4', !e.ativo && 'text-croqui-soft')}>
                    {e.titulo}
                  </button>
                  <p className="mt-1 line-clamp-3 text-[13px] text-croqui-soft">{e.conteudo}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-croqui-soft">
                    <span className="text-foreground">{nomeDaCategoria(e.categoria)}</span>
                    {e.region
                      ? <span className="font-semibold tracking-[0.08em] text-foreground" title={nomeDaRegiao(e.region)}>{sigla(e.region)}</span>
                      : <span>todas as regiões</span>}
                    <span>prioridade <span className="font-croqui-num tabular-nums text-foreground">{e.prioridade}</span></span>
                    <Confianca valor={e.confianca} />
                    <span className="font-croqui-num tabular-nums">{dataCurta(e.atualizado_em, true)}</span>
                    {!e.ativo && <Pilula tom="suave">desativada</Pilula>}
                  </p>
                  <div className="mt-2">
                    <AcoesDaEntrada e={e} ocupada={ativar.isPending && ativar.variables?.e.id === e.id} aoHistorico={() => setHistorico(e)} aoAtivar={(ativo) => ativar.mutate({ e, ativo })} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Painel>

      {editando && (
        <FormularioDaBaseDialog
          entrada={editando === 'nova' ? null : editando}
          categorias={categorias}
          regioes={regioesDaBase}
          chavesExistentes={chaves}
          salvando={salvar.isPending}
          aoFechar={() => setEditando(null)}
          aoSalvar={(f) => salvar.mutateAsync({ antes: editando === 'nova' ? null : editando, f })}
        />
      )}
      {respondendo && (
        <FormularioDaBaseDialog
          entrada={null}
          inicial={{ fonte: `pergunta de cliente (${respondendo.contatos.length ? `lead ${respondendo.contatos.slice(0, 3).join(', ')}` : 'sem lead'}), ${dataCurta(respondendo.ultima)}`, region: null }}
          contexto={
            <div className="rounded-sm border border-border bg-accent/50 px-3 py-2 text-[13px]">
              <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">Respondendo à pergunta ({respondendo.vezes} {respondendo.vezes === 1 ? 'vez' : 'vezes'})</p>
              {respondendo.exemplos.map((ex) => <p key={ex} className="mt-1 text-foreground">“{ex}”</p>)}
            </div>
          }
          categorias={categorias}
          regioes={regioesDaBase}
          chavesExistentes={chaves}
          salvando={responder.isPending}
          aoFechar={() => setRespondendo(null)}
          aoSalvar={(f) => responder.mutateAsync({ grupo: respondendo, f })}
        />
      )}
      {historico && (
        <HistoricoDaBaseDialog
          entrada={historico}
          restaurando={restaurar.isPending}
          aoRestaurar={(v) => restaurar.mutateAsync({ e: historico, v })}
          aoFechar={() => setHistorico(null)}
        />
      )}
    </div>
  );
}

function Confianca({ valor }: { valor: string | null }) {
  if (valor === 'alta') return <Pilula tom="tinta">alta</Pilula>;
  if (valor === 'media') return <Pilula tom="alerta">média</Pilula>;
  return <span className="text-2xs text-croqui-soft">—</span>;
}

function AcoesDaEntrada({ e, ocupada, aoHistorico, aoAtivar }: { e: EntradaDaBase; ocupada: boolean; aoHistorico: () => void; aoAtivar: (ativo: boolean) => void }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button size="sm" variant="ghost" className="h-9 px-2" onClick={aoHistorico} aria-label={`Histórico de “${e.titulo}”`}>
        <History className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> <span className="md:sr-only lg:not-sr-only">Histórico</span>
      </Button>
      <Button size="sm" variant="ghost" className="h-9 px-2" disabled={ocupada} onClick={() => aoAtivar(!e.ativo)} aria-label={e.ativo ? `Desativar “${e.titulo}”` : `Reativar “${e.titulo}”`}>
        {ocupada ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : e.ativo ? <PowerOff className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> : <Power className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
        <span className="md:sr-only lg:not-sr-only">{e.ativo ? 'Desativar' : 'Reativar'}</span>
      </Button>
    </div>
  );
}
