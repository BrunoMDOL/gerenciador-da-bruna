import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CircleSlash, Loader2, SearchCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CartaoDeSugestao, Esqueleto } from '@/gerenciador/componentes';
import { dataHora, numero } from '@/gerenciador/lib/formatos';
import type { Aplicador } from '@/gerenciador/lib/acoes';
import { Markdown } from './Markdown';
import { CHAVES, lerSugestao } from './lib/consultas';
import type { ItemCopiloto, ItemDaConversa, ItemSugestao } from './lib/conversa';
import { explicarErro, type ErroDoCopiloto } from './lib/protocolo';
import { sugestaoDaPrevia } from './lib/sugestao';
import { rota } from '@/gerenciador/lib/rotas';

function BalaoDoGestor({ texto, em }: { texto: string; em: string | null }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%] rounded-md bg-bubble-human px-3.5 py-2.5 text-foreground sm:max-w-[72%]">
        <div className="flex items-baseline justify-between gap-3 text-2xs text-muted-foreground">
          <span className="font-medium">Você</span>
          {em && <span className="font-croqui-num tabular-nums">{dataHora(em)}</span>}
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm">{texto}</p>
      </div>
    </div>
  );
}

function BalaoDoCopiloto({ item }: { item: ItemCopiloto }) {
  return (
    <div className="flex justify-start">
      <div className="min-w-0 max-w-[94%] rounded-md border border-border bg-card px-3.5 py-2.5 sm:max-w-[82%]">
        <div className="flex items-center gap-1.5 text-2xs text-croqui-soft">
          <Sparkles className="h-3 w-3" strokeWidth={1.75} aria-hidden />
          <span className="font-medium text-foreground">Copiloto</span>
          {item.em && <span className="font-croqui-num tabular-nums">· {dataHora(item.em)}</span>}
        </div>
        <div className="mt-1">
          <Markdown texto={item.texto} />
          {item.emAndamento && <span aria-hidden className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-croqui-red align-text-bottom" />}
        </div>
        {item.modelo && (
          <p className="mt-2 border-t border-border/60 pt-1.5 text-2xs text-croqui-soft">
            <span className="font-croqui-num tabular-nums">{numero(item.tokensEntrada)} → {numero(item.tokensSaida)} tokens</span>
            {' · '}{item.modelo}
          </p>
        )}
      </div>
    </div>
  );
}

function LinhaDeFerramentas({ ferramentas }: { ferramentas: Array<{ nome: string; resumo: string | null }> }) {
  const comResumo = ferramentas.filter((f) => f.resumo);
  return (
    <div className="flex items-start gap-1.5 pl-1 text-2xs text-croqui-soft">
      <SearchCheck className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden />
      <div className="min-w-0">
        <span>consultou </span>
        <span className="font-medium text-foreground/80">{ferramentas.map((f) => f.nome).join(', ')}</span>
        {comResumo.length > 0 && (
          <ul className="mt-0.5 space-y-0.5">
            {comResumo.map((f, i) => <li key={i}>{f.resumo}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function CartaoAoVivo({ item, quem, aoMudar }: { item: ItemSugestao; quem: Aplicador; aoMudar: () => void }) {
  const linha = useQuery({ queryKey: CHAVES.sugestao(item.sugestaoId), queryFn: () => lerSugestao(item.sugestaoId) });
  if (linha.isLoading) {
    return (
      <div className="rounded-md border border-border bg-card p-4" aria-busy="true">
        <Esqueleto linhas={3} />
      </div>
    );
  }
  const sugestao = linha.data ?? sugestaoDaPrevia(item.previa);
  return (
    <div className="space-y-1.5">
      <CartaoDeSugestao sugestao={sugestao} quem={quem} mostrarOrigem aoMudar={() => { void linha.refetch(); aoMudar(); }} />
      {linha.isError && (
        <p className="flex flex-wrap items-center gap-2 text-2xs text-croqui-soft">
          <AlertTriangle className="h-3 w-3 text-warning" aria-hidden />
          Não deu para carregar os detalhes da sugestão: {(linha.error as Error).message}
          <button type="button" className="underline underline-offset-4" onClick={() => void linha.refetch()}>tentar de novo</button>
        </p>
      )}
    </div>
  );
}

const SEM_TENTAR: ReadonlyArray<ErroDoCopiloto['motivo']> = ['sem_chave', 'chave_invalida', 'desligado', 'sem_permissao', 'sem_login'];

interface AvisoDoCopilotoProps {
  erro: ErroDoCopiloto;
  tentar?: () => void;
  /** O fluxo parou antes do fim e a tela está conferindo se a função terminou de gravar a resposta. */
  aguardandoGravacao?: boolean;
}

/** O aviso de um turno que não andou. Cada motivo tem o seu texto e o seu caminho. */
export function AvisoDoCopiloto({ erro, tentar, aguardandoGravacao }: AvisoDoCopilotoProps) {
  const { pathname, search } = useLocation();
  if (erro.motivo === 'cancelado') {
    return (
      <p className="flex items-start gap-1.5 pl-1 text-2xs text-croqui-soft">
        <CircleSlash className="mt-px h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden />
        <span>Resposta cancelada</span>
        {aguardandoGravacao && <span>· se o copiloto terminar a resposta mesmo assim, ela aparece aqui</span>}
      </p>
    );
  }
  const { titulo, texto } = explicarErro(erro);
  // Configuração do dono (aviso, não erro). A chave recusada se troca nos segredos do Supabase, não no gerenciador: sem o botão.
  const configuracao = erro.motivo === 'sem_chave' || erro.motivo === 'desligado' || erro.motivo === 'chave_invalida';
  const levaAsConfiguracoes = erro.motivo === 'sem_chave' || erro.motivo === 'desligado';
  return (
    <div role="alert" className={cn('break-words rounded-md border bg-card px-4 py-3 text-[13px]', configuracao ? 'border-warning/60' : 'border-destructive/40')}>
      <p className={cn('flex items-center gap-2 font-medium', configuracao ? 'text-warning' : 'text-destructive')}>
        <AlertTriangle className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        {titulo}
      </p>
      {erro.motivo === 'sem_chave' ? (
        <p className="mt-1 text-croqui-soft">
          O copiloto precisa da chave da Anthropic (ANTHROPIC_API_KEY) nos segredos do projeto Supabase; veja{' '}
          <Link to={rota('/configuracoes/geral#pendencias')} className="text-foreground underline decoration-croqui-rule underline-offset-4 hover:decoration-foreground">
            Configurações › Geral › Pendências
          </Link>.
          {erro.message && erro.message !== 'ANTHROPIC_API_KEY ausente' && <span className="mt-1 block">A função respondeu: {erro.message}</span>}
        </p>
      ) : (
        <p className="mt-1 text-croqui-soft">{texto}</p>
      )}
      {aguardandoGravacao && (
        <p className="mt-1 flex items-center gap-1.5 text-croqui-soft">
          <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
          Conferindo se o copiloto terminou a resposta mesmo assim; se terminou, ela aparece aqui.
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {levaAsConfiguracoes && (
          <Button asChild size="sm" variant="outline">
            <Link to={rota('/configuracoes/geral')}>Abrir Configurações › Geral</Link>
          </Button>
        )}
        {erro.motivo === 'sem_login' && (
          <Button asChild size="sm" variant="outline">
            <Link to={`/auth?redirect=${encodeURIComponent(pathname + search)}`}>Entrar de novo</Link>
          </Button>
        )}
        {tentar && !SEM_TENTAR.includes(erro.motivo) && (
          <Button size="sm" variant="outline" onClick={tentar}>Tentar de novo</Button>
        )}
      </div>
    </div>
  );
}

export function Pensando({ texto = 'Pensando…' }: { texto?: string }) {
  return (
    <div className="flex items-center gap-2 pl-1 text-[13px] text-croqui-soft" role="status">
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      {texto}
    </div>
  );
}

interface ListaDeItensProps {
  itens: ItemDaConversa[];
  quem: Aplicador;
  aoMudarSugestao: () => void;
  tentarDeNovo: () => void;
}

/** A conversa desenhada: balões, linhas de consulta, cartões e avisos. */
export function ListaDeItens({ itens, quem, aoMudarSugestao, tentarDeNovo }: ListaDeItensProps) {
  return (
    <ol className="space-y-3 break-words [overflow-wrap:anywhere]" aria-label="Mensagens da conversa">
      {itens.map((item) => {
        switch (item.tipo) {
          case 'gestor':
            return <li key={item.chave}><BalaoDoGestor texto={item.texto} em={item.em} /></li>;
          case 'copiloto':
            return <li key={item.chave}><BalaoDoCopiloto item={item} /></li>;
          case 'ferramentas':
            return <li key={item.chave}><LinhaDeFerramentas ferramentas={item.ferramentas} /></li>;
          case 'sugestao':
            return <li key={item.chave} className="sm:max-w-[82%]"><CartaoAoVivo item={item} quem={quem} aoMudar={aoMudarSugestao} /></li>;
          case 'erro':
            return (
              <li key={item.chave} className="sm:max-w-[82%]">
                <AvisoDoCopiloto erro={item.erro} tentar={tentarDeNovo} aguardandoGravacao={item.aguardandoGravacao} />
              </li>
            );
          default:
            return null;
        }
      })}
    </ol>
  );
}
