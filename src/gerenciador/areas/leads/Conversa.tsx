import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpToLine, ChevronDown, ChevronUp, MessageSquareText, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageBubble } from '@/components/dashboard/MessageBubble';
import { useMessages } from '@/hooks/useMessages';
import { useNomesUsuarios } from '@/hooks/useNomesUsuarios';
import { Carregando, Erro, Vazio } from '@/gerenciador/componentes';
import { data, numero } from '@/gerenciador/lib/formatos';
import { cn } from '@/lib/utils';
import { rotuloDoDia } from './situacoes';
import { AUTOR, normalizar } from './textos';

const TERMO_MINIMO = 2;

/**
 * A conversa inteira do lead, com os balões do painel (Bruna, atendente e
 * cliente), separadores de dia, busca com realce e navegação entre as
 * ocorrências, e atalhos para o início e o fim. Aqui ninguém escreve para o
 * cliente: o gerenciador só lê.
 */
export function Conversa({ contatoId, className }: { contatoId: number; className?: string }) {
  const { messages, vereditos, loading, error, refetch } = useMessages(contatoId);
  const nomes = useNomesUsuarios();
  const [termo, setTermo] = useState('');
  const [atual, setAtual] = useState(0);
  const quadro = useRef<HTMLDivElement>(null);
  const elementos = useRef(new Map<number, HTMLDivElement>());

  const termoLimpo = normalizar(termo.trim());
  const buscando = termoLimpo.length >= TERMO_MINIMO;
  const ocorrencias = useMemo(() => {
    if (!buscando) return [] as number[];
    return messages.filter((m) => normalizar(m.content ?? '').includes(termoLimpo)).map((m) => m.id);
  }, [messages, termoLimpo, buscando]);
  const posicoes = useMemo(() => new Map(ocorrencias.map((id, i) => [id, i])), [ocorrencias]);

  useEffect(() => { setAtual(0); }, [termoLimpo]);

  // A ocorrência atual entra na vista.
  useEffect(() => {
    const id = ocorrencias[atual];
    if (id == null) return;
    const el = elementos.current.get(id);
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [atual, ocorrencias]);

  // Ao abrir, a conversa começa pelo fim; mensagem nova só puxa se o leitor já está perto do fim.
  const contagemAnterior = useRef(0);
  const leadAnterior = useRef<number | null>(null);
  useEffect(() => {
    const el = quadro.current;
    if (!el || loading) return;
    if (leadAnterior.current !== contatoId) {
      el.scrollTop = el.scrollHeight;
      leadAnterior.current = contatoId;
      contagemAnterior.current = messages.length;
      return;
    }
    if (messages.length > contagemAnterior.current) {
      const distanciaDoFim = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanciaDoFim < 160) el.scrollTop = el.scrollHeight;
    }
    contagemAnterior.current = messages.length;
  }, [messages, loading, contatoId]);

  const rolar = (para: 'inicio' | 'fim') => {
    const el = quadro.current;
    if (!el) return;
    const top = para === 'inicio' ? 0 : el.scrollHeight;
    if (typeof el.scrollTo === 'function') el.scrollTo({ top, behavior: 'smooth' }); else el.scrollTop = top;
  };
  const irPara = (passo: 1 | -1) => {
    const n = ocorrencias.length;
    if (!n) return;
    setAtual((a) => (a + passo + n) % n);
  };

  const mensagemAtual = buscando && ocorrencias.length ? messages.find((m) => m.id === ocorrencias[atual]) : undefined;

  return (
    <section className={cn('flex min-h-0 flex-col rounded-md border border-border bg-card', className)} aria-label="Conversa com o lead">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="text-[13.5px] font-semibold text-foreground">Conversa</h2>
          {!loading && !error && (
            <span className="truncate font-croqui-num text-2xs tabular-nums text-croqui-soft">
              {numero(messages.length)} {messages.length === 1 ? 'mensagem' : 'mensagens'}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-croqui-soft hover:text-foreground" aria-label="Ir para o início da conversa" title="Início" onClick={() => rolar('inicio')}>
            <ArrowUpToLine className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-croqui-soft hover:text-foreground" aria-label="Ir para o fim da conversa" title="Fim" onClick={() => rolar('fim')}>
            <ArrowDownToLine className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-croqui-soft" strokeWidth={1.75} aria-hidden />
          <Input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); irPara(e.shiftKey ? -1 : 1); } }}
            placeholder="Buscar na conversa"
            aria-label="Buscar na conversa"
            className="h-9 pl-8 pr-8 text-sm"
          />
          {termo && (
            <button type="button" aria-label="Limpar a busca na conversa" onClick={() => setTermo('')} className="absolute right-0.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-croqui-soft hover:text-foreground">
              <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
            </button>
          )}
        </div>
        {buscando && (
          <span className="shrink-0 font-croqui-num text-2xs tabular-nums text-croqui-soft" aria-live="polite">
            {ocorrencias.length ? `${atual + 1} de ${ocorrencias.length}` : 'nada encontrado'}
          </span>
        )}
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-croqui-soft hover:text-foreground" aria-label="Ocorrência anterior" disabled={ocorrencias.length < 2} onClick={() => irPara(-1)}>
          <ChevronUp className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-croqui-soft hover:text-foreground" aria-label="Próxima ocorrência" disabled={ocorrencias.length < 2} onClick={() => irPara(1)}>
          <ChevronDown className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </Button>
      </div>
      {mensagemAtual && (
        <p className="border-b border-border bg-accent/40 px-3 py-1.5 text-2xs text-croqui-soft">
          <span className="font-croqui-num tabular-nums">{data(mensagemAtual.created_at)}</span>
          {' · '}{AUTOR[mensagemAtual.sender_type] ?? mensagemAtual.sender_type}
          {' · '}<span className="text-foreground">{trecho(mensagemAtual.content, termoLimpo)}</span>
        </p>
      )}

      <div ref={quadro} className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4" data-testid="quadro-da-conversa">
        {loading ? (
          <Carregando texto="Carregando a conversa" />
        ) : error ? (
          <Erro mensagem={error} tentar={refetch} />
        ) : messages.length === 0 ? (
          <Vazio Icone={MessageSquareText} titulo="Nenhuma mensagem nesta conversa" descricao="O lead existe no funil, mas ninguém trocou mensagem com ele ainda." />
        ) : (
          messages.map((m, i) => {
            const chaveDoDia = data(m.created_at, true);
            const separador = i === 0 || chaveDoDia !== data(messages[i - 1].created_at, true);
            const posicao = posicoes.get(m.id);
            const marcada = posicao !== undefined;
            const ehAtual = marcada && posicao === atual;
            return (
              <div key={m.id}>
                {separador && <SeparadorDeDia quando={m.created_at} />}
                <div
                  ref={(el) => { if (el) elementos.current.set(m.id, el); else elementos.current.delete(m.id); }}
                  data-ocorrencia={ehAtual ? 'atual' : marcada ? 'sim' : undefined}
                  className={cn('rounded-md', marcada && 'ring-1 ring-croqui-red/50', ehAtual && 'ring-2 ring-croqui-red')}
                >
                  <MessageBubble
                    message={m}
                    veredito={m.meta_message_id ? vereditos[m.meta_message_id] : undefined}
                    nomeRemetente={m.enviado_por ? nomes.get(m.enviado_por) : undefined}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function SeparadorDeDia({ quando }: { quando: string }) {
  return (
    <div className="my-3 flex items-center gap-3" role="separator" aria-label={rotuloDoDia(quando)}>
      <span className="h-px flex-1 bg-border" />
      <span className="font-croqui-num text-2xs font-medium uppercase tracking-[0.1em] tabular-nums text-croqui-soft">{rotuloDoDia(quando)}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Um pedaço do texto em volta do termo encontrado, para a barra da busca. */
function trecho(conteudo: string | null, termo: string, largura = 48): string {
  const texto = conteudo ?? '';
  const i = normalizar(texto).indexOf(termo);
  if (i < 0) return texto.slice(0, largura * 2);
  const inicio = Math.max(0, i - largura);
  const fim = Math.min(texto.length, i + termo.length + largura);
  return `${inicio > 0 ? '…' : ''}${texto.slice(inicio, fim).replace(/\s+/g, ' ')}${fim < texto.length ? '…' : ''}`;
}
