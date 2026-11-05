import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, History, Loader2, RefreshCcw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Carregando, Erro, Painel, Pilula, Vazio } from '@/gerenciador/componentes';
import { useGestor } from '@/gerenciador/lib/acesso';
import { dataHora, nomeCurto, numero } from '@/gerenciador/lib/formatos';
import {
  GRUPOS_DE_ACOES, acoesDoGrupo, fraseDaAcao, grupoDaAcao, nomeDaEntidade, rotaDaEntidade, valorLegivel,
} from './auditoria/acoes';
import { POR_PAGINA, listarAuditoria, podeLerAuditoria, type LinhaDaAuditoria } from './auditoria/dados';
import { CHAVES } from './chaves';
import { lerContatos } from './instrucoes/dados';
import { rotaDoLead } from './rotas';

const PERIODOS: Array<{ valor: string; rotulo: string; dias: number | null }> = [
  { valor: '7', rotulo: 'Últimos 7 dias', dias: 7 },
  { valor: '30', rotulo: 'Últimos 30 dias', dias: 30 },
  { valor: '90', rotulo: 'Últimos 90 dias', dias: 90 },
  { valor: 'tudo', rotulo: 'Desde o começo', dias: null },
];
const TODAS = 'todas';
const LINK = 'underline decoration-croqui-rule underline-offset-4 hover:text-foreground hover:decoration-foreground';

/**
 * /configuracoes/auditoria: tudo o que o gerenciador mudou (audit_logs,
 * action gestor_*), com quem, quando, sobre o quê e os detalhes. Só leitura.
 */
export default function Auditoria() {
  const { papeis, email } = useGestor();
  const [filtro, setFiltro] = useState<string>(TODAS);
  const [periodo, setPeriodo] = useState('30');
  const dias = PERIODOS.find((p) => p.valor === periodo)?.dias ?? null;
  const chaveDoFiltro = filtro === TODAS ? '' : filtro;

  const q = useInfiniteQuery({
    queryKey: CHAVES.auditoria(chaveDoFiltro, dias),
    queryFn: ({ pageParam }) => listarAuditoria(chaveDoFiltro, dias, pageParam),
    initialPageParam: 0,
    getNextPageParam: (ultima, todas) => (ultima.linhas.length === POR_PAGINA ? todas.length : undefined),
  });
  const linhas = useMemo(() => (q.data?.pages ?? []).flatMap((p) => p.linhas), [q.data]);
  const total = q.data?.pages[0]?.total ?? null;

  const ids = useMemo(() => [...new Set(linhas.map((l) => l.contato_id).filter((x): x is number => x != null))].sort((a, b) => a - b), [linhas]);
  const contatos = useQuery({ queryKey: CHAVES.contatos(ids), queryFn: () => lerContatos(ids), enabled: ids.length > 0 });
  const nomeDoLead = (id: number) => {
    const c = (contatos.data ?? []).find((x) => x.id === id);
    return c ? nomeCurto(c.user_name, c.user_number) : null;
  };

  const leRestrito = !podeLerAuditoria(papeis ?? [], email);
  const faltam = total != null ? Math.max(0, total - linhas.length) : null;

  return (
    <div className="space-y-4">
      {leRestrito && (
        <p role="status" className="flex items-start gap-2 rounded-md border border-warning/60 bg-card px-4 py-3 text-[13px] leading-relaxed text-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={1.75} aria-hidden />
          A leitura de audit_logs no banco é só de admin e diretoria. Com o papel bruna_gestor sozinho, esta lista vem vazia mesmo quando há registros.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="h-10 w-full sm:h-9 sm:w-72" aria-label="Filtrar por ação"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-96">
            <SelectItem value={TODAS}>Todas as ações</SelectItem>
            {GRUPOS_DE_ACOES.map((g) => (
              <SelectGroup key={g.id}>
                <SelectLabel className="text-2xs uppercase tracking-[0.1em] text-croqui-soft">{g.rotulo}</SelectLabel>
                <SelectItem value={`grupo:${g.id}`}>Tudo de {g.rotulo.toLowerCase()}</SelectItem>
                {acoesDoGrupo(g).map((a) => <SelectItem key={a} value={`acao:${a}`} className="pl-10">{fraseDaAcao(a)}</SelectItem>)}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="h-10 w-full sm:h-9 sm:w-48" aria-label="Período"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIODOS.map((p) => <SelectItem key={p.valor} value={p.valor}>{p.rotulo}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="sm:ml-auto" onClick={() => void q.refetch()} disabled={q.isFetching}>
          {q.isFetching && !q.isFetchingNextPage ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCcw className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
          Atualizar
        </Button>
      </div>

      <Painel
        semRecheio
        titulo={q.isPending ? 'Registro' : total != null ? `${numero(total)} ${total === 1 ? 'registro' : 'registros'}` : `${numero(linhas.length)} registros`}
        nota="horário de Brasília, o mais novo primeiro"
      >
        {q.isPending ? (
          <Carregando texto="Lendo a auditoria" />
        ) : q.isError && !q.data ? (
          <div className="p-4"><Erro mensagem={q.error.message} tentar={() => void q.refetch()} /></div>
        ) : linhas.length === 0 ? (
          <Vazio
            Icone={History}
            titulo={filtro === TODAS && dias == null ? 'Nada registrado ainda' : 'Nada registrado com esse filtro'}
            descricao={filtro === TODAS && dias == null
              ? 'Toda ação do gerenciador (orientação, base, núcleo, revisão, régua, configuração) vira uma linha aqui, com quem fez e quando.'
              : 'Troque a ação ou aumente o período.'}
            acao={filtro !== TODAS || dias != null ? <Button variant="outline" size="sm" onClick={() => { setFiltro(TODAS); setPeriodo('tudo'); }}>Ver tudo</Button> : undefined}
          />
        ) : (
          <>
            <ul className="divide-y divide-border">
              {linhas.map((l) => <Linha key={l.id} l={l} nomeDoLead={nomeDoLead} />)}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5">
              <p className="text-2xs text-croqui-soft">
                Mostrando <span className="font-croqui-num tabular-nums text-foreground">{numero(linhas.length)}</span>
                {total != null ? <> de <span className="font-croqui-num tabular-nums text-foreground">{numero(total)}</span></> : null}
                {faltam ? <> · faltam <span className="font-croqui-num tabular-nums">{numero(faltam)}</span></> : null}
              </p>
              {q.hasNextPage && (
                <Button variant="outline" size="sm" onClick={() => void q.fetchNextPage()} disabled={q.isFetchingNextPage}>
                  {q.isFetchingNextPage ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                  Mostrar mais {POR_PAGINA}
                </Button>
              )}
            </div>
          </>
        )}
      </Painel>
    </div>
  );
}

function Linha({ l, nomeDoLead }: { l: LinhaDaAuditoria; nomeDoLead: (id: number) => string | null }) {
  const [aberta, setAberta] = useState(false);
  const grupo = grupoDaAcao(l.action);
  const entidade = nomeDaEntidade(l.entity_type);
  const rota = rotaDaEntidade(l.entity_type, l.entity_id);
  const detalhes = l.details && typeof l.details === 'object' ? Object.entries(l.details) : [];
  const resumo = typeof l.details?.titulo === 'string' ? l.details.titulo : typeof l.details?.chave === 'string' ? l.details.chave : null;
  const lead = l.contato_id != null ? nomeDoLead(l.contato_id) : null;

  return (
    <li className="px-4 py-3">
      <div className="grid gap-x-4 gap-y-1 md:grid-cols-[8.5rem_minmax(0,1fr)_auto]">
        <p className="font-croqui-num text-[13px] tabular-nums text-croqui-soft">{dataHora(l.created_at)}</p>
        <div className="min-w-0">
          <p className="text-sm text-foreground">
            <span className="font-medium">{l.actor_email ?? 'sistema'}</span> {fraseDaAcao(l.action)}
            {resumo ? <span className="text-croqui-soft">: “{resumo}”</span> : null}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-croqui-soft">
            {grupo && <Pilula tom="suave">{grupo.rotulo}</Pilula>}
            {entidade && (
              rota
                ? <Link to={rota} className={LINK}>{entidade}{l.entity_id != null ? ` nº ${l.entity_id}` : ''}</Link>
                : <span>{entidade}{l.entity_id != null ? ` nº ${l.entity_id}` : ''}</span>
            )}
            {l.contato_id != null && (
              <Link to={rotaDoLead(l.contato_id)} className={LINK}>lead {l.contato_id}{lead ? ` · ${lead}` : ''}</Link>
            )}
            <span className="font-croqui-num">{l.action}</span>
          </p>
        </div>
        {detalhes.length > 0 && (
          <button
            type="button"
            onClick={() => setAberta((a) => !a)}
            aria-expanded={aberta}
            className="inline-flex h-9 items-center gap-1 justify-self-start rounded-sm px-2 text-[13px] text-croqui-soft hover:bg-accent hover:text-foreground md:justify-self-end"
          >
            {aberta ? <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> : <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
            Detalhes
          </button>
        )}
      </div>
      {aberta && (
        <dl className={cn('mt-2 grid gap-x-4 gap-y-1 rounded-sm border border-border bg-background px-3 py-2 text-[13px] md:ml-[9.5rem] md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]')}>
          {detalhes.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-croqui-num text-2xs uppercase tracking-[0.08em] text-croqui-soft">{k.replace(/_/g, ' ')}</dt>
              <dd className="min-w-0 whitespace-pre-wrap break-words text-foreground/90">{valorLegivel(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}
