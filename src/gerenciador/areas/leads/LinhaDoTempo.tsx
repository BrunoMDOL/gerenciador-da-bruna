import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Cota } from '@/components/croqui/Cota';
import { FaixaDeAbas } from '@/components/croqui/FaixaDeAbas';
import { Erro, Esqueleto, Vazio } from '@/gerenciador/componentes';
import { data, dataHora, hora, instante } from '@/gerenciador/lib/formatos';
import { cn } from '@/lib/utils';
import { LIMITE_DA_LINHA_DO_TEMPO, useLinhaDoTempo } from './dados';
import { detalheDoEvento, eventosParaMostrar, tituloDoEvento, type EventoNaTela } from './eventos';
import { rotuloDoDia } from './situacoes';
import { ESPERANDO, EVENTO, EVENTO_DESCONHECIDO, GRUPOS_DE_EVENTO, campoTexto, prometidoPor, type GrupoDeEvento } from './textos';

/**
 * Tudo o que aconteceu com o lead fora dos balões: régua, revisões, chamados,
 * encaminhamentos, objeções, consultas à base e as ações do painel, do mais
 * novo para o mais velho, com um ícone por tipo e o dia marcado. As mensagens
 * mandadas pelo painel não entram: estão na conversa.
 */
export function LinhaDoTempo({ contatoId }: { contatoId: number }) {
  const [limite, setLimite] = useState(LIMITE_DA_LINHA_DO_TEMPO);
  const consulta = useLinhaDoTempo(contatoId, limite);
  const [grupo, setGrupo] = useState<GrupoDeEvento | 'tudo'>('tudo');
  const visiveis = useMemo(() => eventosParaMostrar(consulta.data ?? []), [consulta.data]);
  const eventos = useMemo(() => {
    if (grupo === 'tudo') return visiveis;
    return visiveis.filter((e) => (EVENTO[e.tipo] ?? EVENTO_DESCONHECIDO).grupo === grupo);
  }, [visiveis, grupo]);

  if (consulta.isPending) return <div className="p-4"><Esqueleto linhas={6} /></div>;
  if (consulta.isError) return <div className="p-4"><Erro mensagem={consulta.error.message} tentar={() => consulta.refetch()} /></div>;

  const total = visiveis.length;
  // A RPC corta em p_limite contando também o que fica de fora da tela: página cheia = pode haver mais antigos.
  // Enquanto a próxima página chega, a anterior segue na tela e o botão fica girando.
  const podeHaverMais = consulta.isPlaceholderData || (consulta.data?.length ?? 0) >= limite;

  return (
    <div>
      <FaixaDeAbas ativa={grupo} className="border-b border-border px-1">
        {GRUPOS_DE_EVENTO.map((g) => (
          <button
            key={g.valor}
            type="button"
            aria-pressed={grupo === g.valor}
            aria-current={grupo === g.valor ? 'page' : undefined}
            onClick={() => setGrupo(g.valor)}
            className={cn(
              'relative flex h-10 shrink-0 items-center whitespace-nowrap px-3 text-[13px] transition-colors',
              grupo === g.valor ? 'font-semibold text-foreground' : 'font-medium text-croqui-soft hover:text-foreground',
            )}
          >
            {g.rotulo}
            {grupo === g.valor && <Cota tom="caneta" className="absolute inset-x-1 bottom-0 h-2" />}
          </button>
        ))}
      </FaixaDeAbas>

      {total === 0 ? (
        <Vazio Icone={History} titulo="Nada aconteceu fora da conversa" descricao="Quando a Bruna chamar alguém, prometer um retorno, mandar um toque ou receber uma revisão, aparece aqui." />
      ) : eventos.length === 0 ? (
        <Vazio Icone={History} titulo="Nada deste tipo" descricao="Escolha outro grupo ou volte para “Tudo”." />
      ) : (
        <ol className="px-4 py-3">
          {eventos.map((e, i) => {
            const dia = data(e.quando, true);
            const mostraDia = i === 0 || dia !== data(eventos[i - 1].quando, true);
            return (
              <li key={`${e.tipo}-${e.ref}-${e.quando}`}>
                {mostraDia && (
                  <div className={cn('flex items-center gap-3', i > 0 && 'mt-3')}>
                    <span className="font-croqui-num text-2xs font-medium uppercase tracking-[0.1em] tabular-nums text-croqui-soft">{rotuloDoDia(e.quando)}</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                )}
                <Evento evento={e} />
              </li>
            );
          })}
        </ol>
      )}
      {podeHaverMais && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2 text-2xs text-croqui-soft">
          <span>Mostrando os eventos mais recentes.</span>
          <Button variant="outline" size="sm" onClick={() => setLimite((l) => l + LIMITE_DA_LINHA_DO_TEMPO)} disabled={consulta.isFetching}>
            {consulta.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            Carregar mais antigos
          </Button>
        </div>
      )}
    </div>
  );
}

function Evento({ evento: e }: { evento: EventoNaTela }) {
  const desenho = EVENTO[e.tipo] ?? EVENTO_DESCONHECIDO;
  const { Icone } = desenho;
  const extra = e.extra ?? {};
  const titulo = tituloDoEvento(e);
  const detalhe = detalheDoEvento(e);
  const linhas: string[] = [];
  if (e.tipo === 'revisao' && campoTexto(extra, 'na_proxima')) linhas.push(`Na próxima: ${campoTexto(extra, 'na_proxima')}`);
  if (e.tipo === 'retorno') {
    const quem = campoTexto(extra, 'quem_prometeu');
    const esperando = campoTexto(extra, 'esperando');
    const partes = [quem ? prometidoPor(quem) : null, esperando ? `esperando ${ESPERANDO[esperando] ?? esperando}` : null, extra.data_do_cliente === true ? 'data dada pelo cliente' : null].filter(Boolean);
    if (partes.length) linhas.push(partes.join(' · '));
  }
  if ((e.tipo === 'instrucao' || e.tipo === 'programado') && campoTexto(extra, 'por')) linhas.push(`por ${campoTexto(extra, 'por')}`);
  if (e.tipo === 'instrucao' && extra.ativa === false) linhas.push('desativada');
  if (e.tipo === 'encaminhamento' && campoTexto(extra, 'enviado_em')) linhas.push(`aviso enviado ${hora(campoTexto(extra, 'enviado_em'))}`);
  // O autor vem da auditoria do gerenciador que repetia este evento e saiu da lista.
  if (e.autor && !campoTexto(extra, 'por')) linhas.push(`por ${e.autor}, no gerenciador`);
  const quando = instante(e.quando);

  return (
    <article className="flex gap-3 border-b border-border py-2.5 last:border-b-0" aria-label={titulo}>
      <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-border bg-card', desenho.caneta ? 'text-croqui-red-text' : 'text-foreground')} aria-hidden>
        <Icone className="h-3.5 w-3.5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className={cn('text-sm font-medium leading-snug', desenho.caneta ? 'text-croqui-red-text' : 'text-foreground')}>{titulo}</p>
          <time dateTime={quando?.toISOString()} title={dataHora(e.quando)} className="shrink-0 font-croqui-num text-2xs tabular-nums text-croqui-soft">{hora(e.quando)}</time>
        </div>
        {detalhe && <p className="mt-0.5 whitespace-pre-line break-words text-[13px] leading-relaxed text-croqui-soft">{detalhe}</p>}
        {linhas.map((l) => <p key={l} className="mt-0.5 text-2xs text-croqui-soft">{l}</p>)}
        {desenho.rota && (
          <Link to={desenho.rota} className="mt-1 inline-flex items-center gap-1 text-2xs text-croqui-soft underline decoration-croqui-rule underline-offset-4 hover:text-foreground hover:decoration-foreground">
            abrir na área <ArrowUpRight className="h-3 w-3" strokeWidth={1.75} aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}
