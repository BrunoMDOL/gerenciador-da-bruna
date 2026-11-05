import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGestor } from '@/gerenciador/lib/acesso';
import type { Aplicador } from '@/gerenciador/lib/acoes';
import { Chat } from './Chat';
import { ListaDeSessoes } from './ListaDeSessoes';
import { CHAVES, contarSugestoesPendentes, lerContato, lerContatos, lerSessao, listarSessoes } from './lib/consultas';
import type { SessaoDoEvento } from './lib/protocolo';
import { useConversa } from './useConversa';
import { rota } from '@/gerenciador/lib/rotas';

function lerId(valor: string | null | undefined): number | null {
  if (valor == null || valor === '') return null;
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * /copiloto e /copiloto/:sessaoId: o chat do gestor com o
 * copiloto. À esquerda, as conversas dele; à direita, a conversa aberta. No
 * celular é uma tela de cada vez: /copiloto é a lista; uma sessão, a
 * conversa nova (?nova=1) e os atalhos abaixo são o chat. ?contato=<id> abre
 * uma conversa nova já ligada ao lead; ?pergunta=<texto> preenche a caixa.
 */
export default function Copiloto() {
  const { sessaoId: parametro } = useParams();
  const [busca] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, email } = useGestor();
  const userId = user?.id ?? null;

  const sessaoId = lerId(parametro);
  const contatoDaUrl = lerId(busca.get('contato'));
  const perguntaDaUrl = busca.get('pergunta')?.trim() ?? '';
  const novaDaUrl = busca.get('nova') === '1';

  const sessoes = useQuery({
    queryKey: CHAVES.sessoes(userId),
    queryFn: () => listarSessoes(userId as string),
    enabled: userId != null,
  });
  const sessao = useQuery({
    queryKey: CHAVES.sessao(sessaoId),
    queryFn: () => lerSessao(sessaoId as number),
    enabled: sessaoId != null,
  });
  const contatoId = sessaoId != null ? (sessao.data?.contato_id ?? contatoDaUrl) : contatoDaUrl;
  const contato = useQuery({
    queryKey: CHAVES.contato(contatoId),
    queryFn: () => lerContato(contatoId as number),
    enabled: contatoId != null,
  });
  const pendentes = useQuery({ queryKey: CHAVES.pendentes, queryFn: contarSugestoesPendentes });

  const idsDosLeads = useMemo(
    () => Array.from(new Set((sessoes.data ?? []).map((s) => s.contato_id).filter((id): id is number => id != null))).sort((a, b) => a - b),
    [sessoes.data],
  );
  const contatos = useQuery({
    queryKey: CHAVES.contatos(idsDosLeads),
    queryFn: () => lerContatos(idsDosLeads),
    enabled: idsDosLeads.length > 0,
  });

  const aoCriarSessao = useCallback((s: SessaoDoEvento) => {
    navigate(rota(`/copiloto/${s.id}`), { replace: true });
  }, [navigate]);

  const conversa = useConversa({ sessaoId, contatoId, userId, email, aoCriarSessao });

  // No celular, a URL diz a tela: voltar a /copiloto (pelo menu do
  // gerenciador, pelo voltar do navegador) mostra a lista de novo.
  const querChat = sessaoId != null || contatoDaUrl != null || perguntaDaUrl !== '' || novaDaUrl;
  const [tela, setTela] = useState<'lista' | 'chat'>(() => (querChat ? 'chat' : 'lista'));
  useEffect(() => {
    setTela(querChat ? 'chat' : 'lista');
  }, [querChat]);

  const quem = useMemo<Aplicador>(() => ({ email, userId }), [email, userId]);

  const novaConversa = () => {
    conversa.descartarTurno();
    setTela('chat');
    if (sessaoId != null || busca.toString() !== 'nova=1') navigate(rota('/copiloto?nova=1'));
  };

  const deOutroGestor = Boolean(sessao.data && userId && sessao.data.criado_por !== userId);
  const bloqueio = deOutroGestor
    ? 'Esta conversa é de outro gestor: dá para ler, não para continuar.'
    : conversa.emAndamento && !conversa.emAndamentoAqui
      ? 'O copiloto ainda está respondendo em outra conversa.'
      : null;

  const aoMudarSugestao = () => {
    void queryClient.invalidateQueries({ queryKey: CHAVES.pendentes });
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] overflow-hidden lg:h-dvh">
      <ListaDeSessoes
        sessoes={sessoes.data}
        carregando={sessoes.isLoading}
        erro={sessoes.error as Error | null}
        tentar={() => void sessoes.refetch()}
        contatos={contatos.data ?? {}}
        sessaoAtiva={sessaoId}
        sessaoEmAndamento={conversa.sessaoEmAndamento}
        aoNovaConversa={novaConversa}
        aoEscolher={() => setTela('chat')}
        className={tela === 'lista' ? 'flex' : 'hidden md:flex'}
      />
      <Chat
        key={sessaoId ?? 'nova'}
        sessaoId={sessaoId}
        titulo={sessao.data?.titulo ?? null}
        contato={contatoId == null ? null : contato.data}
        contatoId={contatoId}
        pendentes={pendentes.data ?? 0}
        pendentesErro={pendentes.isError}
        tentarPendentes={() => void pendentes.refetch()}
        itens={conversa.itens}
        carregando={sessaoId != null && conversa.itens.length === 0 && (sessao.isLoading || conversa.historico.isLoading)}
        erro={(sessao.error as Error | null) ?? (conversa.historico.error as Error | null)}
        tentarCarregar={() => { void sessao.refetch(); void conversa.historico.refetch(); }}
        sessaoNaoEncontrada={sessaoId != null && sessao.isSuccess && sessao.data == null && conversa.itens.length === 0}
        respondendoAqui={conversa.emAndamentoAqui}
        bloqueio={bloqueio}
        perguntaInicial={perguntaDaUrl}
        quem={quem}
        enviar={(texto) => void conversa.enviar(texto)}
        cancelar={conversa.cancelar}
        tentarDeNovo={conversa.tentarDeNovo}
        aoMudarSugestao={aoMudarSugestao}
        aoVoltar={() => setTela('lista')}
        aoNovaConversa={novaConversa}
        className={tela === 'chat' ? 'flex' : 'hidden md:flex'}
      />
    </div>
  );
}
