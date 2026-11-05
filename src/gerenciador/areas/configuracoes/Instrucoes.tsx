import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, History, Loader2, MessageSquarePlus, MessageSquareText, Pencil, Plus, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FaixaDeAbas } from '@/components/croqui/FaixaDeAbas';
import { cn } from '@/lib/utils';
import { Carregando, Erro, Painel, Pilula, Vazio, type TomDaPilula } from '@/gerenciador/componentes';
import { useGestor } from '@/gerenciador/lib/acesso';
import { dataHora, nomeCurto, nomeDaRegiao } from '@/gerenciador/lib/formatos';
import type { EscopoInstrucao, Instrucao } from '@/gerenciador/lib/tipos';
import { CHAVES, invalidarOutrasAreas } from './chaves';
import { AvisoDoNo } from './comum/AvisoDoNo';
import { Chip } from './comum/Chip';
import { SugestoesDaArea } from './comum/SugestoesDaArea';
import { plural } from './comum/texto';
import { GRUPOS_DE_REGIAO, NadaGravado, mensagemDeErro, rotuloDaRegiao, sigla } from './comum/util';
import { pendenciaDoNo, useConfigs } from './geral/dados';
import {
  alterarInstrucao, criarInstrucao, estadoDaInstrucao, lerContatos, listarInstrucoes, mudarAtiva, nomeDosTurnos,
  type EstadoDaInstrucao, type FormularioDeInstrucao,
} from './instrucoes/dados';
import { FormularioDeInstrucaoDialog } from './instrucoes/Formulario';
import { HistoricoDaInstrucaoDialog } from './instrucoes/Historico';
import { rotaDoLead } from './rotas';

type FiltroDeEscopo = 'todas' | EscopoInstrucao;
type FiltroDeEstado = 'ativas' | 'inativas' | 'todas';

const ESTADO: Record<EstadoDaInstrucao, { rotulo: string; tom: TomDaPilula; titulo: string }> = {
  viva: { rotulo: 'viva', tom: 'ok', titulo: 'ativa e dentro da vigência: a Bruna lê' },
  agendada: { rotulo: 'ainda não começou', tom: 'alerta', titulo: 'a vigência começa depois' },
  vencida: { rotulo: 'vencida', tom: 'suave', titulo: 'a vigência acabou: a Bruna não lê mais' },
  inativa: { rotulo: 'desativada', tom: 'suave', titulo: 'desativada: a Bruna não lê' },
};
const ORIGEM: Record<Instrucao['origem'], string> = { gestor: 'gestor', copiloto: 'copiloto', analise: 'análise' };

/**
 * /configuracoes/instrucoes: as orientações do gestor, a linha
 * ORIENTAÇÕES DO GESTOR do contexto. Cria e edita as globais e as de região;
 * as de um lead aparecem aqui e nascem na tela do lead.
 */
export default function Instrucoes() {
  const { user, email } = useGestor();
  const qc = useQueryClient();
  const configs = useConfigs();
  const q = useQuery({ queryKey: CHAVES.instrucoes, queryFn: listarInstrucoes });
  const [escopo, setEscopo] = useState<FiltroDeEscopo>('todas');
  const [region, setRegion] = useState<string>('todas');
  const [estado, setEstado] = useState<FiltroDeEstado>('ativas');
  const [editando, setEditando] = useState<Instrucao | 'nova' | null>(null);
  const [historico, setHistorico] = useState<Instrucao | null>(null);

  const todas = useMemo(() => q.data ?? [], [q.data]);
  const idsDosLeads = useMemo(
    () => [...new Set(todas.filter((i) => i.contato_id != null).map((i) => i.contato_id as number))].sort((a, b) => a - b),
    [todas],
  );
  const contatos = useQuery({ queryKey: CHAVES.contatos(idsDosLeads), queryFn: () => lerContatos(idsDosLeads), enabled: idsDosLeads.length > 0 });
  const contatoPorId = useMemo(() => new Map((contatos.data ?? []).map((c) => [c.id, c])), [contatos.data]);

  const regiaoDe = (i: Instrucao) => i.region ?? (i.contato_id != null ? contatoPorId.get(i.contato_id)?.region ?? null : null);
  const passaNoEstado = (i: Instrucao) => (estado === 'todas' ? true : estado === 'ativas' ? i.ativa : !i.ativa);
  const passaNaRegiao = (i: Instrucao) => region === 'todas' || regiaoDe(i) === region;
  const base = todas.filter((i) => passaNoEstado(i) && passaNaRegiao(i));
  const contagem: Record<FiltroDeEscopo, number> = {
    todas: base.length,
    global: base.filter((i) => i.escopo === 'global').length,
    region: base.filter((i) => i.escopo === 'region').length,
    contato: base.filter((i) => i.escopo === 'contato').length,
  };
  const visiveis = escopo === 'todas' ? base : base.filter((i) => i.escopo === escopo);
  const noAguardo = Boolean(pendenciaDoNo(configs.data));

  const recarregar = () => {
    void qc.invalidateQueries({ queryKey: CHAVES.instrucoes });
    invalidarOutrasAreas(qc, 'instrucoes');
  };
  const falhou = (e: unknown) => {
    toast.error(mensagemDeErro(e));
    // A linha sumiu ou a RLS recusou: a lista na tela já não é a do banco.
    if (e instanceof NadaGravado) recarregar();
  };

  const salvar = useMutation({
    mutationFn: async ({ antes, f }: { antes: Instrucao | null; f: FormularioDeInstrucao }) =>
      (antes ? alterarInstrucao(antes, f) : criarInstrucao(f, { userId: user?.id ?? null, email }).then(() => true)),
    onSuccess: (mudou, { antes }) => {
      if (!mudou) toast.message('Nada mudou na orientação.');
      else if (antes) toast.success('Orientação alterada.');
      else toast.success(noAguardo ? 'Orientação criada. Ela entra na conversa quando o nó do n8n subir.' : 'Orientação criada. A Bruna lê a partir do próximo turno.');
      setEditando(null);
      recarregar();
    },
    onError: falhou,
  });

  const ativar = useMutation({
    mutationFn: ({ i, ativa }: { i: Instrucao; ativa: boolean }) => mudarAtiva(i, ativa),
    onSuccess: (_r, { ativa }) => { toast.success(ativa ? 'Orientação reativada.' : 'Orientação desativada. A Bruna deixa de ler.'); recarregar(); },
    onError: falhou,
  });

  const nomeDoLead = (id: number | null) => {
    if (id == null) return null;
    const c = contatoPorId.get(id);
    return c ? nomeCurto(c.user_name, c.user_number) : null;
  };

  const novaOrientacao = (
    <Button onClick={() => setEditando('nova')}>
      <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Nova orientação
    </Button>
  );

  return (
    <div className="space-y-5">
      <AvisoDoNo />
      <SugestoesDaArea tipo="instrucao" recarregar={CHAVES.instrucoes} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <FaixaDeAbas ativa={escopo} className="border-b border-border sm:border-b-0">
            <Chip ativo={escopo === 'todas'} onClick={() => setEscopo('todas')} contagem={contagem.todas}>Todas</Chip>
            <Chip ativo={escopo === 'global'} onClick={() => setEscopo('global')} contagem={contagem.global}>Globais</Chip>
            <Chip ativo={escopo === 'region'} onClick={() => setEscopo('region')} contagem={contagem.region}>Por região</Chip>
            <Chip ativo={escopo === 'contato'} onClick={() => setEscopo('contato')} contagem={contagem.contato}>De um lead</Chip>
          </FaixaDeAbas>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="h-10 w-full sm:h-9 sm:w-52" aria-label="Filtrar por região"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as regiões</SelectItem>
              {GRUPOS_DE_REGIAO.map((g) => (
                <SelectGroup key={g.rotulo}>
                  <SelectLabel className="text-2xs uppercase tracking-[0.1em] text-croqui-soft">{g.rotulo}</SelectLabel>
                  {g.regioes.map((r) => <SelectItem key={r} value={r}>{sigla(r)} · {nomeDaRegiao(r)}</SelectItem>)}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <FaixaDeAbas ativa={estado}>
            <Chip ativo={estado === 'ativas'} onClick={() => setEstado('ativas')}>Ativas</Chip>
            <Chip ativo={estado === 'inativas'} onClick={() => setEstado('inativas')}>Desativadas</Chip>
            <Chip ativo={estado === 'todas'} onClick={() => setEstado('todas')}>Todas</Chip>
          </FaixaDeAbas>
        </div>
        <div className="shrink-0">{novaOrientacao}</div>
      </div>

      {q.isPending ? (
        <Carregando texto="Carregando as orientações" />
      ) : q.isError && !q.data ? (
        <Erro mensagem={q.error.message} tentar={() => void q.refetch()} />
      ) : todas.length === 0 ? (
        <Painel>
          <Vazio
            Icone={MessageSquarePlus}
            titulo="Nenhuma orientação escrita ainda"
            descricao="Escreva uma orientação para todas as conversas ou para uma região quando quiser mudar um jeito de a Bruna agir sem mexer no núcleo. As de um lead só se escrevem na tela do lead, em Leads."
            acao={novaOrientacao}
          />
        </Painel>
      ) : visiveis.length === 0 ? (
        <Painel>
          <Vazio
            Icone={MessageSquareText}
            titulo="Nenhuma orientação com esses filtros"
            descricao="Troque o escopo, a região ou o estado para ver as outras."
            acao={<Button variant="outline" size="sm" onClick={() => { setEscopo('todas'); setRegion('todas'); setEstado('todas'); }}>Ver todas</Button>}
          />
        </Painel>
      ) : (
        <section aria-label="Orientações">
          <p className="mb-2 text-2xs text-croqui-soft">{plural(visiveis.length, 'orientação', 'orientações')} · globais primeiro, depois as de região e as de um lead</p>
          <ul className="grid gap-3 xl:grid-cols-2">
            {visiveis.map((i) => {
              const e = ESTADO[estadoDaInstrucao(i)];
              const ocupada = ativar.isPending && ativar.variables?.i.id === i.id;
              const lead = nomeDoLead(i.contato_id);
              return (
                <li key={i.id}>
                  <article aria-labelledby={`instrucao-${i.id}`} className={cn('h-full rounded-md border border-border bg-card p-4', !i.ativa && 'border-dashed')}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {i.escopo === 'global' && <Pilula tom="tinta">Todas as conversas</Pilula>}
                      {i.escopo === 'region' && <Pilula tom="tinta" titulo={nomeDaRegiao(i.region)}>{rotuloDaRegiao(i.region)}</Pilula>}
                      {i.escopo === 'contato' && i.contato_id != null && (
                        <Link to={rotaDoLead(i.contato_id)} className="inline-flex" title="Abrir o lead">
                          <Pilula tom="tinta">Lead {i.contato_id}{lead ? ` · ${lead}` : ''}</Pilula>
                        </Link>
                      )}
                      <Pilula tom={e.tom} titulo={e.titulo}>{e.rotulo}</Pilula>
                      <span className="text-2xs text-croqui-soft">vale {nomeDosTurnos(i.aplica_em)}</span>
                    </div>
                    <h3 id={`instrucao-${i.id}`} className={cn('mt-2 text-[15px] font-semibold leading-snug', i.ativa ? 'text-foreground' : 'text-croqui-soft')}>{i.titulo}</h3>
                    <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/90">{i.texto}</p>
                    <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-2xs text-croqui-soft">
                      <div><dt className="inline">prioridade </dt><dd className="inline font-croqui-num tabular-nums text-foreground">{i.prioridade}</dd></div>
                      <div>
                        <dt className="inline">vigência </dt>
                        <dd className="inline font-croqui-num tabular-nums">desde {dataHora(i.vigencia_inicio)} · {i.vigencia_fim ? `até ${dataHora(i.vigencia_fim)}` : 'sem prazo'}</dd>
                      </div>
                      <div><dt className="inline">origem </dt><dd className="inline">{ORIGEM[i.origem] ?? i.origem}{i.sugestao_id ? ` (sugestão nº ${i.sugestao_id})` : ''}</dd></div>
                      <div><dt className="sr-only">quem e quando</dt><dd className="inline">criada por {i.criado_por_email ?? 'sem e-mail'} em <span className="font-croqui-num tabular-nums">{dataHora(i.criado_em)}</span></dd></div>
                      {i.atualizado_em && i.atualizado_em !== i.criado_em && (
                        <div><dt className="inline">alterada </dt><dd className="inline font-croqui-num tabular-nums">{dataHora(i.atualizado_em)}</dd></div>
                      )}
                    </dl>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditando(i)} aria-label={`Editar “${i.titulo}”`}>
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={ocupada}
                        onClick={() => ativar.mutate({ i, ativa: !i.ativa })}
                        aria-label={i.ativa ? `Desativar “${i.titulo}”` : `Reativar “${i.titulo}”`}
                      >
                        {ocupada ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : i.ativa ? <PowerOff className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> : <Power className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
                        {i.ativa ? 'Desativar' : 'Reativar'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setHistorico(i)} aria-label={`Histórico de “${i.titulo}”`}>
                        <History className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Histórico
                      </Button>
                      {i.escopo === 'contato' && i.contato_id != null && (
                        <Link to={rotaDoLead(i.contato_id)} className="ml-auto inline-flex min-h-9 items-center gap-1 text-[13px] text-croqui-soft underline decoration-croqui-rule underline-offset-4 hover:text-foreground">
                          Abrir o lead <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                        </Link>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {editando && (
        <FormularioDeInstrucaoDialog
          instrucao={editando === 'nova' ? null : editando}
          nomeDoLead={editando === 'nova' ? null : nomeDoLead(editando.contato_id)}
          salvando={salvar.isPending}
          aoFechar={() => setEditando(null)}
          aoSalvar={(f) => salvar.mutateAsync({ antes: editando === 'nova' ? null : editando, f })}
        />
      )}
      {historico && <HistoricoDaInstrucaoDialog instrucao={historico} aoFechar={() => setHistorico(null)} />}
    </div>
  );
}
