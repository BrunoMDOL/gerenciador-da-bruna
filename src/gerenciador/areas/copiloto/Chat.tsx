import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ListChecks, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Erro, Esqueleto, Pilula, Vazio } from '@/gerenciador/componentes';
import { nomeCurto, nomeDaRegiao } from '@/gerenciador/lib/formatos';
import type { Aplicador } from '@/gerenciador/lib/acoes';
import { Compositor } from './Compositor';
import { ListaDeItens, Pensando } from './ItensDaConversa';
import type { ContatoCurto } from './lib/consultas';
import type { ItemDaConversa } from './lib/conversa';
import { PERGUNTAS_DO_LEAD, PERGUNTAS_GERAIS } from './perguntas';
import { rota } from '@/gerenciador/lib/rotas';

interface ChatProps {
  sessaoId: number | null;
  titulo: string | null;
  /** O lead vinculado (da sessão ou de ?contato=); undefined enquanto carrega. */
  contato: ContatoCurto | null | undefined;
  contatoId: number | null;
  pendentes: number;
  /** O contador de sugestões pendentes não carregou. */
  pendentesErro: boolean;
  tentarPendentes: () => void;
  itens: ItemDaConversa[];
  carregando: boolean;
  erro: Error | null;
  tentarCarregar: () => void;
  /** A sessão da URL não existe (ou não é visível). */
  sessaoNaoEncontrada: boolean;
  respondendoAqui: boolean;
  bloqueio: string | null;
  perguntaInicial: string;
  quem: Aplicador;
  enviar: (texto: string) => void;
  cancelar: () => void;
  tentarDeNovo: () => void;
  aoMudarSugestao: () => void;
  aoVoltar: () => void;
  aoNovaConversa: () => void;
  className?: string;
}

function PerguntasProntas({ perguntas, aoEscolher }: { perguntas: readonly string[]; aoEscolher: (p: string) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2" aria-label="Perguntas prontas">
      {perguntas.map((p) => (
        <Button key={p} type="button" variant="outline" size="sm" className="h-10 whitespace-normal text-left" onClick={() => aoEscolher(p)}>
          {p}
        </Button>
      ))}
    </div>
  );
}

/** A coluna do chat: cabeçalho com o lead, as mensagens e a caixa fixa embaixo. */
export function Chat({
  sessaoId, titulo, contato, contatoId, pendentes, pendentesErro, tentarPendentes, itens, carregando, erro, tentarCarregar, sessaoNaoEncontrada,
  respondendoAqui, bloqueio, perguntaInicial, quem, enviar, cancelar, tentarDeNovo, aoMudarSugestao, aoVoltar, aoNovaConversa, className,
}: ChatProps) {
  const rolagem = useRef<HTMLDivElement>(null);
  const presoAoFim = useRef(true);
  const ultimoItem = itens[itens.length - 1];
  const assinatura = `${itens.length}:${ultimoItem && 'texto' in ultimoItem ? ultimoItem.texto.length : 0}:${respondendoAqui ? 1 : 0}`;

  // Acompanha a resposta enquanto o gestor está no fim; se ele subiu para ler, não puxa.
  useEffect(() => {
    const el = rolagem.current;
    if (el && presoAoFim.current) el.scrollTop = el.scrollHeight;
  }, [assinatura]);

  const aoRolar = () => {
    const el = rolagem.current;
    if (!el) return;
    presoAoFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const mandar = (texto: string) => {
    presoAoFim.current = true;
    enviar(texto);
  };

  const nomeDoLead = contato ? nomeCurto(contato.user_name, contato.user_number) : contatoId != null ? `lead ${contatoId}` : null;
  const tituloDaTela = titulo?.trim() || (contatoId != null ? 'Nova conversa sobre o lead' : 'Nova conversa');
  const vazio = !carregando && !erro && !sessaoNaoEncontrada && itens.length === 0;

  return (
    <section className={cn('h-full min-w-0 flex-1 flex-col bg-background', className)} aria-label="Conversa com o copiloto">
      <header className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-card px-4 py-2">
        <Button variant="ghost" size="icon" className="-ml-2 h-10 w-10 md:hidden" onClick={aoVoltar} aria-label="Voltar à lista de conversas">
          <ArrowLeft strokeWidth={1.75} aria-hidden />
        </Button>
        <Sparkles className="hidden h-4 w-4 text-foreground md:block" strokeWidth={1.75} aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold leading-tight text-foreground">{tituloDaTela}</h2>
          {contatoId != null && (
            <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-croqui-soft">
              <User className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              <Link
                to={rota(`/leads/${contatoId}`)}
                className="truncate text-foreground underline decoration-croqui-rule underline-offset-4 hover:decoration-foreground"
              >
                {nomeDoLead ?? `lead ${contatoId}`}
              </Link>
              {contato && <Pilula tom="tinta">{nomeDaRegiao(contato.region)}</Pilula>}
            </p>
          )}
        </div>
        {pendentesErro && (
          <p className="flex items-center gap-1 text-[13px] text-croqui-soft">
            <AlertTriangle className="h-4 w-4 shrink-0 text-warning" strokeWidth={1.75} aria-hidden />
            <span>Contador de sugestões indisponível</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 px-2 text-foreground underline decoration-croqui-rule underline-offset-4 hover:decoration-foreground"
              onClick={tentarPendentes}
              aria-label="Recarregar o contador de sugestões"
            >
              Recarregar
            </Button>
          </p>
        )}
        {!pendentesErro && pendentes > 0 && (
          <Link
            to={rota('/analises?aba=sugestoes')}
            className="inline-flex h-9 items-center gap-1.5 text-[13px] text-foreground underline decoration-croqui-rule underline-offset-4 hover:decoration-foreground"
          >
            <ListChecks className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
            {/* No celular, "2 pendentes" (o leitor de tela ouve a frase inteira): o título e o lead ficam com o espaço. */}
            <span className="whitespace-nowrap">
              <span className="font-croqui-num font-semibold tabular-nums">{pendentes}</span>{' '}
              <span className="sr-only sm:not-sr-only">{pendentes === 1 ? 'sugestão do copiloto ' : 'sugestões do copiloto '}</span>
              {pendentes === 1 ? 'pendente' : 'pendentes'}
            </span>
          </Link>
        )}
      </header>

      <div ref={rolagem} onScroll={aoRolar} className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite" aria-busy={respondendoAqui}>
        {sessaoNaoEncontrada && (
          <Vazio
            titulo="Conversa não encontrada"
            descricao="Esta conversa não existe ou não está disponível para o seu login."
            acao={<Button variant="outline" onClick={aoNovaConversa}>Nova conversa</Button>}
          />
        )}
        {!sessaoNaoEncontrada && carregando && (
          <div className="mx-auto max-w-2xl space-y-4" role="status" aria-label="Carregando a conversa">
            <Esqueleto linhas={2} className="ml-auto w-2/3" />
            <Esqueleto linhas={4} className="w-5/6" />
            <Esqueleto linhas={3} className="w-4/6" />
          </div>
        )}
        {!sessaoNaoEncontrada && !carregando && erro && <Erro mensagem={erro.message} tentar={tentarCarregar} />}
        {vazio && (
          <Vazio
            Icone={Sparkles}
            titulo={nomeDoLead ? `Pergunte sobre ${nomeDoLead}` : 'Pergunte ao copiloto'}
            descricao="O copiloto lê as conversas, o estado dos leads, as métricas, a régua e o núcleo; aponta erros e propõe mudanças. Nada é aplicado sem você aprovar o cartão."
            acao={<PerguntasProntas perguntas={contatoId != null ? PERGUNTAS_DO_LEAD : PERGUNTAS_GERAIS} aoEscolher={mandar} />}
            className="h-full min-h-[40vh]"
          />
        )}
        {itens.length > 0 && (
          <div className="mx-auto max-w-3xl">
            <ListaDeItens itens={itens} quem={quem} aoMudarSugestao={aoMudarSugestao} tentarDeNovo={tentarDeNovo} />
            {respondendoAqui && !(ultimoItem?.tipo === 'copiloto' && ultimoItem.emAndamento) && (
              <div className="mt-3"><Pensando texto={ultimoItem?.tipo === 'ferramentas' ? 'Lendo o que encontrou…' : 'Pensando…'} /></div>
            )}
          </div>
        )}
      </div>

      <Compositor
        valorInicial={perguntaInicial}
        aoEnviar={mandar}
        aoCancelar={cancelar}
        respondendoAqui={respondendoAqui}
        bloqueio={bloqueio}
        autoFoco={Boolean(perguntaInicial) || (sessaoId == null && typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches)}
      />
    </section>
  );
}
