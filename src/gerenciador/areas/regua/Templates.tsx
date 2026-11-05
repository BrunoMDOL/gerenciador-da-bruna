import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, FileText, Loader2, Plus, RefreshCw, Search, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Erro, Esqueleto, Painel, Pilula, Vazio } from '@/gerenciador/componentes';
import { dataHora, instante, numero, relativo } from '@/gerenciador/lib/formatos';
import { cn } from '@/lib/utils';
import { CriarTemplate } from './CriarTemplate';
import { useTemplates } from './dados';
import { useSincronizarTemplates } from './dadosDosTemplates';
import { CHIP, CHIP_ATIVO, CHIP_REPOUSO, NOTA, NUM } from './estilos';
import { botoesDoTemplate, cabecalhoDoTemplate, corpoDoTemplate, reprovadosSemExemplo, rodapeDoTemplate } from './templatesTexto';
import { nomeDaCategoria, textoDaQualidade, textoDaReprovacao, textoDoStatusDoTemplate } from './textos';
import type { TemplateDaMeta } from './tipos';

const PASSO = 50;
const ORDEM_DOS_STATUS = ['APPROVED', 'PENDING', 'REJECTED', 'PAUSED', 'DISABLED', 'IN_APPEAL'];

function MarcaDoStatus({ status }: { status: string | null }) {
  const texto = textoDoStatusDoTemplate(status);
  if (status === 'APPROVED') {
    return <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />{texto}</span>;
  }
  if (status === 'PENDING' || status === 'IN_APPEAL') {
    return <span className="inline-flex items-center gap-1 text-warning"><Clock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />{texto}</span>;
  }
  return <span className="inline-flex items-center gap-1 text-croqui-red-text"><XCircle className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />{texto}</span>;
}

function Corpo({ t }: { t: TemplateDaMeta }) {
  const [aberto, setAberto] = useState(false);
  const corpo = corpoDoTemplate(t.components);
  const cabecalho = cabecalhoDoTemplate(t.components);
  const rodape = rodapeDoTemplate(t.components);
  const botoes = botoesDoTemplate(t.components);
  if (!corpo) return <p className="text-2xs text-croqui-soft">sem corpo de texto</p>;
  return (
    <div className="min-w-0">
      <p className={cn('text-[13px] text-croqui-soft', aberto ? 'whitespace-pre-line' : 'line-clamp-2')}>{aberto ? corpo : corpo.replace(/\s*\n+\s*/g, ' ')}</p>
      {aberto && (cabecalho || rodape || botoes.length > 0) && (
        <p className="mt-1 text-2xs text-croqui-soft">
          {cabecalho && <>cabeçalho: {cabecalho}</>}
          {rodape && <>{cabecalho ? ' · ' : ''}rodapé: {rodape}</>}
          {botoes.length > 0 && <>{cabecalho || rodape ? ' · ' : ''}botões: {botoes.join(', ')}</>}
        </p>
      )}
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="mt-0.5 min-h-[32px] rounded-sm text-2xs text-croqui-soft underline decoration-croqui-rule underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {aberto ? 'ver menos' : 'ver o texto todo'}
      </button>
    </div>
  );
}

function Marcas({ t }: { t: TemplateDaMeta }) {
  const reprovacao = textoDaReprovacao(t.rejected_reason);
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {t.is_followup && <Pilula tom="tinta" titulo="Conta como follow-up no relatório e no teto de toques da FUP90">follow-up</Pilula>}
      {t.status === 'REJECTED' && reprovacao && <span className="text-2xs text-croqui-red-text">motivo: {reprovacao}</span>}
    </span>
  );
}

/**
 * /regua/templates: o espelho dos templates da Meta (tabela templates),
 * com filtro por status e categoria, busca, o sync e a criação.
 */
export default function Templates() {
  const q = useTemplates();
  const sincronizar = useSincronizarTemplates();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || null;
  const categoria = params.get('categoria') || null;
  const [busca, setBusca] = useState('');
  const [mostrar, setMostrar] = useState(PASSO);
  const [criando, setCriando] = useState(false);

  const todos = useMemo(() => q.data ?? [], [q.data]);
  const contagemPorStatus = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of todos) c[t.status ?? 'sem'] = (c[t.status ?? 'sem'] ?? 0) + 1;
    return c;
  }, [todos]);
  const statusPresentes = ORDEM_DOS_STATUS.filter((s) => contagemPorStatus[s]).concat(
    Object.keys(contagemPorStatus).filter((s) => !ORDEM_DOS_STATUS.includes(s)),
  );
  const categorias = [...new Set(todos.map((t) => t.category).filter(Boolean))].sort() as string[];
  const semExemplo = useMemo(() => reprovadosSemExemplo(todos), [todos]);
  const ultimoSync = useMemo(
    () => todos.reduce<string | null>((m, t) => {
      const d = instante(t.synced_at);
      return d && (!m || d.getTime() > (instante(m)?.getTime() ?? 0)) ? t.synced_at : m;
    }, null),
    [todos],
  );

  const termo = busca.trim().toLowerCase();
  const filtrados = todos.filter((t) =>
    (!status || (t.status ?? 'sem') === status) &&
    (!categoria || t.category === categoria) &&
    (!termo || t.name.toLowerCase().includes(termo) || (corpoDoTemplate(t.components) ?? '').toLowerCase().includes(termo)),
  );
  const visiveis = filtrados.slice(0, mostrar);

  const filtrar = (chave: 'status' | 'categoria', valor: string | null) => {
    const p = new URLSearchParams(params);
    if (valor) p.set(chave, valor);
    else p.delete(chave);
    setParams(p, { replace: true });
    setMostrar(PASSO);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className={NOTA}>
          A Meta aprova em até 24 h, e só template <span className="font-medium text-foreground">aprovado</span> pode ser usado na régua, na FUP90
          e no painel. O banco sincroniza sozinho de hora em hora e recebe da Meta a mudança de status; o botão puxa tudo agora.
          {ultimoSync && <> Última sincronização: <span className={cn(NUM, 'text-foreground')}>{dataHora(ultimoSync)}</span> <span className="whitespace-nowrap">({relativo(ultimoSync)}).</span></>}
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" onClick={() => sincronizar.mutate()} disabled={sincronizar.isPending}>
            {sincronizar.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden />}
            Sincronizar agora
          </Button>
          <Button onClick={() => setCriando(true)}>
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Criar template
          </Button>
        </div>
      </div>

      <Painel titulo="Templates da conta" nota={q.data ? `${numero(filtrados.length)} de ${numero(todos.length)}` : undefined} semRecheio>
        {q.isPending ? (
          <Esqueleto linhas={8} className="p-4" />
        ) : q.isError ? (
          <div className="p-4"><Erro mensagem={q.error.message} tentar={() => void q.refetch()} /></div>
        ) : todos.length === 0 ? (
          <Vazio
            Icone={FileText}
            titulo="Nenhum template na tabela"
            descricao="Puxe os templates da conta da Meta com Sincronizar agora, ou crie o primeiro."
            acao={<Button variant="outline" onClick={() => sincronizar.mutate()} disabled={sincronizar.isPending}>Sincronizar agora</Button>}
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-croqui-soft" strokeWidth={1.75} aria-hidden />
                <Input
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setMostrar(PASSO); }}
                  placeholder="Buscar pelo nome ou pelo texto"
                  aria-label="Buscar template"
                  className="h-10 pl-9"
                />
              </div>
              <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-1.5">
                <button type="button" aria-pressed={!status} onClick={() => filtrar('status', null)} className={cn(CHIP, !status ? CHIP_ATIVO : CHIP_REPOUSO)}>
                  Todos <span className={NUM}>{numero(todos.length)}</span>
                </button>
                {statusPresentes.map((s) => (
                  <button key={s} type="button" aria-pressed={status === s} onClick={() => filtrar('status', s)} className={cn(CHIP, status === s ? CHIP_ATIVO : CHIP_REPOUSO)}>
                    {textoDoStatusDoTemplate(s === 'sem' ? null : s)} <span className={NUM}>{numero(contagemPorStatus[s])}</span>
                  </button>
                ))}
              </div>
              {categorias.length > 1 && (
                <div role="group" aria-label="Filtrar por categoria" className="flex flex-wrap gap-1.5">
                  <button type="button" aria-pressed={!categoria} onClick={() => filtrar('categoria', null)} className={cn(CHIP, !categoria ? CHIP_ATIVO : CHIP_REPOUSO)}>
                    Todas as categorias
                  </button>
                  {categorias.map((c) => (
                    <button key={c} type="button" aria-pressed={categoria === c} onClick={() => filtrar('categoria', c)} className={cn(CHIP, categoria === c ? CHIP_ATIVO : CHIP_REPOUSO)}>
                      {nomeDaCategoria(c)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {filtrados.length === 0 ? (
              <Vazio
                Icone={Search}
                titulo="Nenhum template com esse filtro"
                descricao="Troque o status, a categoria ou o texto da busca."
                acao={<Button variant="outline" onClick={() => { setBusca(''); setParams(new URLSearchParams(), { replace: true }); }}>Limpar filtros</Button>}
              />
            ) : (
              <>
                <table className="hidden w-full text-[13px] lg:table">
                  <thead>
                    <tr className="border-b border-border text-left text-2xs uppercase tracking-[0.1em] text-croqui-soft">
                      <th scope="col" className="px-4 py-2 font-medium">Template</th>
                      <th scope="col" className="px-2 py-2 font-medium">Categoria</th>
                      <th scope="col" className="px-2 py-2 font-medium">Status</th>
                      <th scope="col" className="px-2 py-2 font-medium">Qualidade</th>
                      <th scope="col" className="px-4 py-2 text-right font-medium">Sincronizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((t) => (
                      <tr key={t.id} className="border-b border-border align-top last:border-0">
                        <td className="max-w-[560px] px-4 py-2.5">
                          <p className={cn(NUM, 'font-medium text-foreground')}>
                            {t.name} <span className="font-normal text-croqui-soft">· {t.language ?? '—'}</span>
                          </p>
                          <Marcas t={t} />
                          <Corpo t={t} />
                        </td>
                        <td className="px-2 py-2.5">{nomeDaCategoria(t.category)}</td>
                        <td className="whitespace-nowrap px-2 py-2.5"><MarcaDoStatus status={t.status} /></td>
                        <td className="px-2 py-2.5 text-croqui-soft">{textoDaQualidade(t.quality_score)}</td>
                        <td className={cn(NUM, 'whitespace-nowrap px-4 py-2.5 text-right text-croqui-soft')}>{dataHora(t.synced_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <ul className="divide-y divide-border lg:hidden">
                  {visiveis.map((t) => (
                    <li key={t.id} className="space-y-1 px-4 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className={cn(NUM, 'min-w-0 break-all font-medium text-foreground')}>{t.name}</p>
                        <span className="text-[13px]"><MarcaDoStatus status={t.status} /></span>
                      </div>
                      <p className="text-2xs text-croqui-soft">
                        {nomeDaCategoria(t.category)} · {t.language ?? '—'} · qualidade {textoDaQualidade(t.quality_score)} · sincronizado {dataHora(t.synced_at)}
                      </p>
                      <Marcas t={t} />
                      <Corpo t={t} />
                    </li>
                  ))}
                </ul>
                {filtrados.length > visiveis.length && (
                  <div className="border-t border-border px-4 py-3">
                    <Button variant="outline" onClick={() => setMostrar((m) => m + PASSO)}>
                      Mostrar mais {Math.min(PASSO, filtrados.length - visiveis.length)} (faltam {numero(filtrados.length - visiveis.length)})
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Painel>

      <CriarTemplate aberto={criando} aoFechar={() => setCriando(false)} nomesExistentes={todos.map((t) => t.name)} reprovadosSemExemplo={semExemplo} />
    </div>
  );
}
