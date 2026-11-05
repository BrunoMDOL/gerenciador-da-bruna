import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { auditarGestor } from '@/gerenciador/lib/auditoria';
import type { CopilotoMensagem, CopilotoSessao } from '@/gerenciador/lib/tipos';
import { buscarFinalDoTurno, CHAVES, listarMensagens } from './lib/consultas';
import { conversarComCopiloto, ErroDoCopiloto, explicarErro, type SessaoDoEvento } from './lib/protocolo';
import {
  acrescentarErro, acrescentarFerramenta, acrescentarSugestao, acrescentarTexto, cartoesDoTurno, encerrarTurno,
  itemDoGestor, maiorId, marcarMensagemDoGestor, montarItens, turnoConcluidoNoHistorico, turnoDoEndereco, TURNO_VAZIO,
  type SugestaoDaVisita, type TurnoAoVivo,
} from './lib/conversa';

/**
 * Depois de um fluxo que parou sem "fim" (cancelado, cortado), por quanto
 * tempo a tela confere se a função terminou de gravar o turno. Cobre o tempo
 * de parede de uma edge function no plano Pro (400 s).
 */
const ESPERA_DA_GRAVACAO_MS = 7 * 60_000;
const INTERVALO_DA_ESPERA_MS = 5_000;

interface Opcoes {
  /** A sessão aberta (da URL); null numa conversa nova. */
  sessaoId: number | null;
  /** O lead vinculado (da sessão ou de ?contato=). */
  contatoId: number | null;
  userId: string | null;
  email: string | null;
  /** Chamado quando a função cria a sessão: a tela navega para ela sem perder o fluxo. */
  aoCriarSessao: (sessao: SessaoDoEvento) => void;
}

function juntarCartoes(atuais: SugestaoDaVisita[], novos: SugestaoDaVisita[]): SugestaoDaVisita[] {
  const ids = new Set(atuais.map((c) => c.previa.id));
  return [...atuais, ...novos.filter((c) => !ids.has(c.previa.id))];
}

/**
 * A conversa de uma sessão: o histórico do banco mais o turno ao vivo. O
 * estado do turno mora aqui (e não na tela do chat) para sobreviver à
 * navegação de /copiloto para /copiloto/<id> quando a sessão nasce.
 * O turno pertence ao endereço em que nasceu (a sessão; numa conversa nova, o
 * lead da URL): terminado, ele sai da tela quando o gestor sai dali.
 */
export function useConversa({ sessaoId, contatoId, userId, email, aoCriarSessao }: Opcoes) {
  const queryClient = useQueryClient();
  const [turno, setTurno] = useState<TurnoAoVivo>(TURNO_VAZIO);
  const [sugestoesDaVisita, setSugestoesDaVisita] = useState<SugestaoDaVisita[]>([]);
  const turnoRef = useRef(turno);
  useEffect(() => { turnoRef.current = turno; }, [turno]);
  const enderecoRef = useRef({ sessaoId, contatoId });
  useEffect(() => { enderecoRef.current = { sessaoId, contatoId }; }, [sessaoId, contatoId]);
  const aoCriarRef = useRef(aoCriarSessao);
  useEffect(() => { aoCriarRef.current = aoCriarSessao; }, [aoCriarSessao]);
  const controlador = useRef<AbortController | null>(null);
  useEffect(() => () => { controlador.current?.abort(); }, []);

  const historicoQuery = useQuery({
    queryKey: CHAVES.mensagens(sessaoId),
    queryFn: () => listarMensagens(sessaoId as number),
    enabled: sessaoId != null,
  });
  const historico = useMemo<CopilotoMensagem[]>(
    () => (sessaoId != null ? historicoQuery.data ?? [] : []),
    [sessaoId, historicoQuery.data],
  );

  /**
   * Tira da tela o turno que já terminou (nunca o que está respondendo). Os
   * cartões dele vão para a lista da visita, ancorados no histórico da sessão
   * dele (do cache, porque a tela pode já estar em outra sessão).
   */
  const descartarTurno = useCallback(() => {
    const t = turnoRef.current;
    if (t.emAndamento || t === TURNO_VAZIO) return;
    if (t.sessaoId != null && t.itens.some((i) => i.tipo === 'sugestao')) {
      const gravado = queryClient.getQueryData<CopilotoMensagem[]>(CHAVES.mensagens(t.sessaoId)) ?? [];
      const cartoes = cartoesDoTurno(t, gravado);
      setSugestoesDaVisita((atuais) => juntarCartoes(atuais, cartoes));
    }
    turnoRef.current = TURNO_VAZIO;
    setTurno(TURNO_VAZIO);
  }, [queryClient]);

  // Saiu do endereço do turno (outra sessão, outro lead, conversa nova): o turno terminado sai da tela.
  useEffect(() => {
    const t = turnoRef.current;
    if (t.itens.length > 0 && !t.emAndamento && !turnoDoEndereco(t, sessaoId, contatoId)) descartarTurno();
  }, [sessaoId, contatoId, descartarTurno]);

  // Quando o histórico já traz a mensagem final do turno, o turno vira histórico.
  const concluido = turnoDoEndereco(turno, sessaoId, contatoId) && turnoConcluidoNoHistorico(turno, historico);
  useEffect(() => {
    if (concluido) descartarTurno();
  }, [concluido, descartarTurno]);

  // O fluxo parou sem "fim" depois de a função gravar a pergunta: ela pode seguir
  // o turno sozinha. A tela confere de tempos em tempos se a mensagem final
  // (a que leva o modelo) apareceu; aparecendo, segue o mesmo caminho do "fim".
  const esperandoGravacao = turno.aguardaGravacaoAte != null && turno.sessaoId != null && turno.corte != null
    && turno.fimId == null && !turno.emAndamento;
  const finalDoTurno = useQuery({
    queryKey: CHAVES.finalDoTurno(turno.sessaoId, turno.corte),
    queryFn: () => buscarFinalDoTurno(turno.sessaoId as number, turno.corte as number),
    enabled: esperandoGravacao,
    refetchInterval: (q) => (q.state.data == null ? INTERVALO_DA_ESPERA_MS : false),
  });
  const finalAchado = esperandoGravacao ? finalDoTurno.data ?? null : null;
  useEffect(() => {
    if (finalAchado == null) return;
    const s = turnoRef.current.sessaoId;
    setTurno((t) => (t.aguardaGravacaoAte != null && t.fimId == null && !t.emAndamento ? { ...t, fimId: finalAchado, aguardaGravacaoAte: null } : t));
    if (s != null) void queryClient.invalidateQueries({ queryKey: CHAVES.mensagens(s) });
  }, [finalAchado, queryClient]);
  // Passou o prazo sem a mensagem final: a tela para de conferir e o turno fica como está.
  useEffect(() => {
    const ate = turno.aguardaGravacaoAte;
    if (ate == null) return;
    const espera = setTimeout(() => {
      setTurno((t) => (t.aguardaGravacaoAte === ate ? { ...t, aguardaGravacaoAte: null } : t));
    }, Math.max(0, ate - Date.now()));
    return () => clearTimeout(espera);
  }, [turno.aguardaGravacaoAte]);

  const itens = useMemo(
    () => montarItens(historico, turno, sessaoId, contatoId, sugestoesDaVisita),
    [historico, turno, sessaoId, contatoId, sugestoesDaVisita],
  );

  const enviar = useCallback(async (pergunta: string) => {
    const texto = pergunta.trim();
    if (!texto) return;
    if (turnoRef.current.emAndamento) {
      toast.error('Espere o copiloto terminar a resposta.');
      return;
    }
    const sessaoAlvo = sessaoId;
    const contatoDoTurno = contatoId;
    // O que já está no cache é de antes do turno. Sem cache (o histórico ainda
    // carregando), o corte fica em aberto até o evento "usuario" acertá-lo.
    const emCache = sessaoAlvo != null ? queryClient.getQueryData<CopilotoMensagem[]>(CHAVES.mensagens(sessaoAlvo)) : [];
    const corte = emCache ? maiorId(emCache) : null;

    // Um turno anterior que não virou histórico (erro, cancelamento) sai da tela; os cartões dele ficam na visita.
    descartarTurno();

    const agora = new Date().toISOString();
    const inicial: TurnoAoVivo = {
      ...TURNO_VAZIO,
      sessaoId: sessaoAlvo, contatoId: contatoDoTurno, corte, itens: [itemDoGestor(texto, agora)], emAndamento: true, ultimaPergunta: texto,
    };
    turnoRef.current = inicial;
    setTurno(inicial);

    controlador.current?.abort();
    const controle = new AbortController();
    controlador.current = controle;
    let sessaoDoTurno = sessaoAlvo;
    /** Veio "fim" ou "erro": o turno acabou para a função também. */
    let terminou = false;
    /** Veio "usuario": a função gravou a pergunta e está no turno. */
    let perguntaGravada = false;

    const avisar = (erro: ErroDoCopiloto) => {
      const { titulo, texto: detalhe } = explicarErro(erro);
      toast.error(titulo, { description: detalhe });
    };
    const falhar = (erro: ErroDoCopiloto) => {
      setTurno((t) => ({ ...t, emAndamento: false, itens: acrescentarErro(t.itens, erro) }));
      if (erro.motivo !== 'cancelado') avisar(erro);
    };

    try {
      await conversarComCopiloto({ sessao_id: sessaoAlvo, texto, contato_id: contatoDoTurno }, (evento) => {
        switch (evento.tipo) {
          case 'sessao': {
            const s = evento.dados;
            sessaoDoTurno = s.id;
            setTurno((t) => ({ ...t, sessaoId: s.id }));
            if (sessaoAlvo == null) {
              queryClient.setQueryData<CopilotoSessao | null>(CHAVES.sessao(s.id), (atual) => atual ?? {
                id: s.id, titulo: s.titulo, contato_id: s.contato_id, criado_por: userId ?? '',
                criado_por_email: email, criado_em: agora, atualizado_em: agora,
              });
              // Só leva o gestor para a sessão nova se ele continua na conversa em que perguntou.
              const aqui = enderecoRef.current;
              if (aqui.sessaoId == null && aqui.contatoId === contatoDoTurno) aoCriarRef.current(s);
            }
            void queryClient.invalidateQueries({ queryKey: CHAVES.sessoes(userId) });
            void auditarGestor({
              acao: 'gestor_copiloto_pergunta',
              entidade: 'bruna_copiloto_sessoes',
              entidadeId: s.id,
              contatoId: s.contato_id ?? contatoDoTurno ?? null,
              detalhes: { chars: texto.length },
            });
            break;
          }
          case 'usuario': {
            perguntaGravada = true;
            const id = evento.dados.mensagem_id;
            setTurno((t) => ({
              ...t,
              // A pergunta acabou de ser gravada: tudo o que é deste turno tem id a partir dela.
              corte: typeof id === 'number' && Number.isFinite(id) ? id - 1 : t.corte,
              itens: marcarMensagemDoGestor(t.itens, id),
            }));
            break;
          }
          case 'texto':
            setTurno((t) => ({ ...t, itens: acrescentarTexto(t.itens, evento.dados.delta) }));
            break;
          case 'ferramenta':
            setTurno((t) => ({ ...t, itens: acrescentarFerramenta(t.itens, evento.dados) }));
            break;
          case 'sugestao':
            setTurno((t) => ({ ...t, itens: acrescentarSugestao(t.itens, evento.dados) }));
            void queryClient.invalidateQueries({ queryKey: CHAVES.pendentes });
            break;
          case 'fim':
            terminou = true;
            setTurno((t) => ({ ...t, emAndamento: false, fimId: evento.dados.mensagem_id, itens: encerrarTurno(t.itens, evento.dados) }));
            break;
          case 'erro':
            terminou = true;
            falhar(new ErroDoCopiloto('fluxo', evento.dados.mensagem));
            break;
        }
      }, controle.signal);
      if (!terminou) falhar(new ErroDoCopiloto('fluxo', 'o copiloto fechou a resposta antes do fim'));
    } catch (e) {
      // Depois do "fim" ou do "erro" o turno já acabou: o que vier do fluxo não muda nada.
      if (!terminou) falhar(e instanceof ErroDoCopiloto ? e : new ErroDoCopiloto('rede', e instanceof Error ? e.message : String(e)));
    } finally {
      if (controlador.current === controle) controlador.current = null;
      if (!terminou && perguntaGravada && sessaoDoTurno != null) {
        // Cancelado ou cortado depois de a função gravar a pergunta: ela pode
        // terminar o turno mesmo assim. A tela confere até o prazo.
        const ate = Date.now() + ESPERA_DA_GRAVACAO_MS;
        setTurno((t) => (t.emAndamento || t.fimId != null ? t : { ...t, aguardaGravacaoAte: ate }));
      }
      if (sessaoDoTurno != null) {
        void queryClient.invalidateQueries({ queryKey: CHAVES.mensagens(sessaoDoTurno) });
        void queryClient.invalidateQueries({ queryKey: CHAVES.sessao(sessaoDoTurno) });
      }
      void queryClient.invalidateQueries({ queryKey: CHAVES.sessoes(userId) });
      void queryClient.invalidateQueries({ queryKey: CHAVES.pendentes });
    }
  }, [sessaoId, contatoId, userId, email, queryClient, descartarTurno]);

  const cancelar = useCallback(() => { controlador.current?.abort(); }, []);

  const tentarDeNovo = useCallback(() => {
    const pergunta = turnoRef.current.ultimaPergunta;
    if (pergunta) void enviar(pergunta);
  }, [enviar]);

  return {
    itens,
    historico: historicoQuery,
    /** Há um turno em andamento em qualquer sessão. */
    emAndamento: turno.emAndamento,
    /** O turno em andamento é desta tela (mostra "pensando" aqui). */
    emAndamentoAqui: turno.emAndamento && turnoDoEndereco(turno, sessaoId, contatoId),
    /** A sessão que está respondendo, para a lista marcar. */
    sessaoEmAndamento: turno.emAndamento ? turno.sessaoId : null,
    enviar,
    cancelar,
    tentarDeNovo,
    /** Limpa o turno terminado da tela (a "Nova conversa" chama). */
    descartarTurno,
  };
}
