/**
 * A visão geral lê sete fontes: bruna_gestor_metricas (duas vezes), a série
 * diária, os alertas, os erros, o resumo da régua, a config de pendências e as
 * quatro tabelas dos atalhos. Os dados abaixo são a forma real que o banco
 * devolveu em 05/11/2026, para prender a tela ao que a RPC entrega.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

type Op = [string, unknown[]];
interface ChamadaDeTabela { tabela: string; ops: Op[] }

const { rpc, tabela, chamadasDeTabela } = vi.hoisted(() => {
  const chamadasDeTabela: Array<{ tabela: string; ops: [string, unknown[]][] }> = [];
  const tabela = { responder: (_c: { tabela: string; ops: [string, unknown[]][] }): unknown => ({ data: null, error: null, count: null }) };
  return { rpc: vi.fn(), tabela, chamadasDeTabela };
});

vi.mock('@/gerenciador/lib/db', () => {
  class ErroDoBanco extends Error {
    constructor(message: string, public readonly detalhe?: unknown) { super(message); this.name = 'ErroDoBanco'; }
  }
  function periodoDosUltimos(dias: number, ate: Date = new Date()) {
    const de = new Date(ate.getTime() - dias * 86_400_000);
    return { de: de.toISOString(), ate: ate.toISOString(), dias };
  }
  function periodoAnterior(p: { de: string; dias: number }) {
    const ate = new Date(p.de);
    const de = new Date(ate.getTime() - p.dias * 86_400_000);
    return { de: de.toISOString(), ate: ate.toISOString(), dias: p.dias };
  }
  function construtor(nome: string) {
    const chamada = { tabela: nome, ops: [] as [string, unknown[]][] };
    const b: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'neq', 'is', 'lt', 'lte', 'gt', 'gte', 'or', 'in', 'order', 'limit', 'maybeSingle', 'single']) {
      b[m] = (...args: unknown[]) => { chamada.ops.push([m, args]); return b; };
    }
    b.then = (ok: (r: unknown) => unknown, falha?: (e: unknown) => unknown) => {
      chamadasDeTabela.push(chamada);
      return Promise.resolve().then(() => tabela.responder(chamada)).then(ok, falha);
    };
    return b;
  }
  return {
    db: { from: (nome: string) => construtor(nome) },
    rpc: (...args: unknown[]) => rpc(...args),
    periodoDosUltimos,
    periodoAnterior,
    ErroDoBanco,
  };
});

vi.mock('@/gerenciador/lib/acesso', () => ({
  useGestor: () => ({
    user: { id: 'c0ffee00-0000-4000-8000-000000000001', email: 'ia.besser@besserhome.com.br' },
    email: 'ia.besser@besserhome.com.br',
    loading: false,
    pode: true,
    papeis: ['admin'],
    signOut: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }));

import VisaoGeral from './VisaoGeral';
import { janelaDoPeriodo, lerDias, lerPendencias, periodoDaSerie } from './dados';
import { linhasDeErro, ordenarAlertas } from './calculos';
import { rota } from '@/gerenciador/lib/rotas';

// ---------------------------------------------------------------------------
// A forma real do banco (05/11/2026)
// ---------------------------------------------------------------------------
/**
 * O relógio dos testes fica parado no instante em que a série foi lida do
 * banco: 01:18 de 05/11/2026 em São Paulo. Assim "hoje", a data das análises
 * e o início da série não dependem do dia em que o teste roda.
 */
const AGORA = new Date('2026-11-05T04:18:07.482Z');

const METRICAS = {
  periodo: { de: '2026-10-29T03:15:37.376841+00:00', ate: '2026-11-05T03:15:37.376841+00:00' },
  novos: 595, atendidos: 693, responderam: 760,
  mensagens_bruna: 4005, mensagens_cliente: 3966, mensagens_atendente: 1015,
  convites: 42, agendados: 55, agendados_bruna: 42,
  chamados: 30, chamados_com_erro: 0, encaminhamentos: 312, encaminhamentos_com_erro: 0,
  toques_escada: 919, toques_pulados: 41, retornos_criados: 117, retornos_enviados: 81, retornos_cancelados: 36,
  fup90_envios: 1475, fup90_entregues: 1361, fup90_lidos: 644, fup90_respondidos: 83, programados_enviados: 21,
  revisoes: 0, revisoes_graves: 0, revisoes_sem_verificar: 0,
  duvidas: 119, duvidas_sem_acerto: 0, objecoes: 36, optouts: 5, silencios: 136, horarios_suspeitos: 116,
  tempo_resposta_mediano_s: 56.647224,
  por_regiao: {
    rj: { agendados: 3, atendidos: 81, responderam: 76 },
    sp: { agendados: 40, atendidos: 172, responderam: 175 },
    brasil: { agendados: 0, atendidos: 117, responderam: 139 },
    brasil2: { agendados: 0, atendidos: 129, responderam: 189 },
    goiania: { agendados: 12, atendidos: 193, responderam: 179 },
    pos_venda: { agendados: 0, atendidos: 1, responderam: 2 },
  },
};

const METRICAS_ANTERIORES = {
  periodo: { de: '2026-10-22T03:15:38.482037+00:00', ate: '2026-10-29T03:15:38.482037+00:00' },
  novos: 745, atendidos: 785, responderam: 874,
  mensagens_bruna: 4735, mensagens_cliente: 4600, mensagens_atendente: 1085,
  convites: 53, agendados: 36, agendados_bruna: 25,
  chamados: 36, chamados_com_erro: 0, encaminhamentos: 445, encaminhamentos_com_erro: 0,
  toques_escada: 1110, toques_pulados: 31, retornos_criados: 143, retornos_enviados: 80, retornos_cancelados: 38,
  fup90_envios: 1172, fup90_entregues: 1064, fup90_lidos: 530, fup90_respondidos: 76, programados_enviados: 104,
  revisoes: 0, revisoes_graves: 0, revisoes_sem_verificar: 0,
  duvidas: 120, duvidas_sem_acerto: 2, objecoes: 43, optouts: 10, silencios: 137, horarios_suspeitos: 121,
  tempo_resposta_mediano_s: 56.168065,
  por_regiao: {
    rj: { agendados: 3, atendidos: 108, responderam: 113 },
    sp: { agendados: 20, atendidos: 154, responderam: 158 },
    brasil: { agendados: 1, atendidos: 140, responderam: 168 },
    brasil2: { agendados: 0, atendidos: 162, responderam: 208 },
    goiania: { agendados: 12, atendidos: 220, responderam: 224 },
    pos_venda: { agendados: 0, atendidos: 1, responderam: 1 },
    arquitetos: { agendados: 0, atendidos: 0, responderam: 2 },
  },
};

/**
 * bruna_gestor_serie_diaria('2026-10-30 03:00+00', AGORA): da meia-noite de São
 * Paulo de seis dias atrás até agora, sete pontos, o último (hoje) em andamento.
 */
const SERIE = [
  { dia: '2026-10-30', novos: 82, atendidos: 128, responderam: 151, agendados: 8, agendados_bruna: 7, chamados: 2, encaminhamentos: 41, toques: 135, retornos_enviados: 14, fup90_envios: 247, revisoes: 0 },
  { dia: '2026-10-31', novos: 62, atendidos: 96, responderam: 92, agendados: 5, agendados_bruna: 5, chamados: 5, encaminhamentos: 25, toques: 72, retornos_enviados: 11, fup90_envios: 167, revisoes: 0 },
  { dia: '2026-11-01', novos: 62, atendidos: 81, responderam: 75, agendados: 0, agendados_bruna: 0, chamados: 1, encaminhamentos: 8, toques: 89, retornos_enviados: 4, fup90_envios: 214, revisoes: 0 },
  { dia: '2026-11-02', novos: 111, atendidos: 146, responderam: 138, agendados: 3, agendados_bruna: 3, chamados: 3, encaminhamentos: 42, toques: 172, retornos_enviados: 17, fup90_envios: 175, revisoes: 0 },
  { dia: '2026-11-03', novos: 112, atendidos: 171, responderam: 193, agendados: 15, agendados_bruna: 8, chamados: 8, encaminhamentos: 97, toques: 150, retornos_enviados: 10, fup90_envios: 227, revisoes: 0 },
  { dia: '2026-11-04', novos: 87, atendidos: 146, responderam: 165, agendados: 18, agendados_bruna: 15, chamados: 4, encaminhamentos: 78, toques: 149, retornos_enviados: 11, fup90_envios: 210, revisoes: 0 },
  { dia: '2026-11-05', novos: 1, atendidos: 1, responderam: 1, agendados: 1, agendados_bruna: 1, chamados: 0, encaminhamentos: 0, toques: 0, retornos_enviados: 0, fup90_envios: 0, revisoes: 0 },
];

const ALERTAS = [
  { acao: 'responder em Configurações › Base', chave: 'duvidas_sem_resposta', titulo: '2 pergunta(s) de clientes que a base não respondeu', detalhe: 'Perguntas distintas sem entrada na base de conhecimento (últimos 14 dias).', gravidade: 'media' },
  { acao: 'ver em Régua › Templates', chave: 'templates_reprovados', titulo: '6 template(s) reprovado(s) pela Meta', detalhe: 'calc_automacao, follow_up_leads_antigos, followup_leads_antigos, representante, teste1, teste2', gravidade: 'leve' },
];

/** As outras formas que a RPC produz (mesmo jsonb_build_object, outras uniões). */
const ALERTA_GRAVE = { acao: 'olhar os leads em Leads › com chamado', chave: 'chamados_com_erro', titulo: '2 chamado(s) ao atendimento que não saíram (7 dias)', detalhe: 'A Bruna disse que chamaria alguém e o aviso não saiu.', gravidade: 'grave' };
const ALERTA_REGUA_PAUSADA = { acao: 'retomar em Régua', chave: 'regua_pausada', titulo: 'Régua pausada pelo gestor', detalhe: 'escada de 24 h · Feriado em SP', gravidade: 'media' };

const ERROS = {
  conferencias: [{ n: 1550, acao: 'pulado', conferido: false }, { n: 243, acao: 'ok', conferido: true }, { n: 32, acao: 'retorno_silencioso', conferido: true }, { n: 8, acao: 'refazer', conferido: true }],
  objecoes_por_tipo: [{ n: 11, tipo: 'fora_do_escopo' }, { n: 8, tipo: 'sem_interesse' }, { n: 4, tipo: 'preco' }, { n: 3, tipo: 'fora_do_orcamento' }, { n: 3, tipo: 'imovel_nao_e_dele' }, { n: 3, tipo: 'ja_resolveu' }, { n: 2, tipo: 'financeiro_apertado' }, { n: 1, tipo: 'saude_ou_luto' }, { n: 1, tipo: 'so_ano_que_vem' }],
  revisoes_por_tipo: [],
  revisoes_recentes: [],
  duvidas_sem_acerto: [],
  horarios_suspeitos: [{ n: 81, veredito: 'nao_verificado' }, { n: 33, veredito: 'nao_corta' }, { n: 2, veredito: 'bloqueado' }],
  revisoes_por_regiao: {},
  base_mais_consultada: [{ n: 11, chave: 'empresa_de_onde_somos' }, { n: 10, chave: 'peliculas_visao_geral' }, { n: 10, chave: 'parcerias_arquitetos_rt_curso' }],
  chamados_por_assunto: [{ n: 15, assunto: 'geral', com_erro: 0 }, { n: 10, assunto: 'duvida', com_erro: 0 }, { n: 4, assunto: 'reclamacao', com_erro: 0 }, { n: 1, assunto: 'pos_venda', com_erro: 0 }],
  templates_descartados: [
    { lidos: 32, template: 'fup90_v2_03_vidro_comum', descartados: 81, registrados: 185 },
    { lidos: 62, template: 'fup90_v2_07_foto_medidas', descartados: 80, registrados: 207 },
    { lidos: 75, template: 'fup90_v2_05_uv_moveis', descartados: 62, registrados: 252 },
    { lidos: 28, template: 'fup90_v2_08_momento', descartados: 60, registrados: 146 },
    { lidos: 112, template: 'fup90_v2_10_calculadora', descartados: 31, registrados: 291 },
    { lidos: 142, template: 'fup90_v2_02_uma_palavra', descartados: 18, registrados: 313 },
    { lidos: 160, template: 'fup90_v2_01_retomada', descartados: 17, registrados: 330 },
    { lidos: 83, template: 'antesverao', descartados: 10, registrados: 165 },
    { lidos: 32, template: 'fup90_v2_04_credibilidade', descartados: 6, registrados: 93 },
    { lidos: 10, template: 'pablo_calor_orcamento_aberto', descartados: 4, registrados: 33 },
    { lidos: 34, template: 'boa_vindas_formulario_2', descartados: 2, registrados: 62 },
    { lidos: 25, template: 'bruna_retorno_combinado', descartados: 2, registrados: 45 },
    { lidos: 17, template: 'boa_tarde', descartados: 2, registrados: 25 },
    { lidos: 14, template: 'naorespondeu2', descartados: 2, registrados: 25 },
    { lidos: 44, template: 'naorespondeu3', descartados: 1, registrados: 68 },
  ],
  encaminhamentos_com_erro: [],
};

const REGUA = {
  fup90: [
    { lidos: 160, toque: 1, envios: 319, falhas: 6, template: 'fup90_v2_01_retomada', entregues: 300, respondidos: 37 },
    { lidos: 142, toque: 2, envios: 295, falhas: 0, template: 'fup90_v2_02_uma_palavra', entregues: 281, respondidos: 20 },
    { lidos: 113, toque: 3, envios: 261, falhas: 0, template: 'fup90_v2_10_calculadora', entregues: 246, respondidos: 11 },
    { lidos: 75, toque: 4, envios: 193, falhas: 3, template: 'fup90_v2_05_uv_moveis', entregues: 171, respondidos: 7 },
    { lidos: 28, toque: 5, envios: 87, falhas: 0, template: 'fup90_v2_08_momento', entregues: 78, respondidos: 4 },
    { lidos: 32, toque: 6, envios: 104, falhas: 0, template: 'fup90_v2_03_vidro_comum', entregues: 93, respondidos: 2 },
    { lidos: 32, toque: 7, envios: 87, falhas: 0, template: 'fup90_v2_04_credibilidade', entregues: 81, respondidos: 0 },
    { lidos: 62, toque: 8, envios: 129, falhas: 2, template: 'fup90_v2_07_foto_medidas', entregues: 111, respondidos: 2 },
  ],
  escada: [
    { etapa: 'agendamento', toque: 0, pulados: 1, enviados: 38, agendou_7d: 13, respondeu_24h: 21 },
    { etapa: 'agendamento', toque: 1, pulados: 1, enviados: 29, agendou_7d: 8, respondeu_24h: 12 },
    { etapa: 'agendamento', toque: 2, pulados: 1, enviados: 19, agendou_7d: 2, respondeu_24h: 4 },
    { etapa: 'bairro', toque: 0, pulados: 2, enviados: 50, agendou_7d: 2, respondeu_24h: 21 },
    { etapa: 'bairro', toque: 1, pulados: 2, enviados: 42, agendou_7d: 1, respondeu_24h: 9 },
    { etapa: 'bairro', toque: 2, pulados: 1, enviados: 37, agendou_7d: 1, respondeu_24h: 2 },
    { etapa: 'foto', toque: 0, pulados: 3, enviados: 31, agendou_7d: 0, respondeu_24h: 16 },
    { etapa: 'foto', toque: 1, pulados: 1, enviados: 28, agendou_7d: 0, respondeu_24h: 7 },
    { etapa: 'foto', toque: 2, pulados: 2, enviados: 26, agendou_7d: 0, respondeu_24h: 5 },
    { etapa: 'geral', toque: 0, pulados: 11, enviados: 72, agendou_7d: 9, respondeu_24h: 40 },
    { etapa: 'geral', toque: 1, pulados: 8, enviados: 55, agendou_7d: 3, respondeu_24h: 15 },
    { etapa: 'geral', toque: 2, pulados: 8, enviados: 45, agendou_7d: 3, respondeu_24h: 8 },
    { etapa: 'objetivo', toque: 0, pulados: 0, enviados: 149, agendou_7d: 8, respondeu_24h: 39 },
    { etapa: 'objetivo', toque: 1, pulados: 0, enviados: 156, agendou_7d: 3, respondeu_24h: 28 },
    { etapa: 'objetivo', toque: 2, pulados: 0, enviados: 142, agendou_7d: 3, respondeu_24h: 10 },
  ],
  kanban: [
    { nome: 'Follow-up', leads: 12, region: 'brasil', position: 11 },
    { nome: 'Follow-up', leads: 22, region: 'brasil2', position: 0 },
    { nome: 'Follow-up', leads: 52, region: 'goiania', position: 4 },
    { nome: 'Follow-up', leads: 185, region: 'rj', position: 3 },
    { nome: 'Follow-up', leads: 339, region: 'sp', position: 6 },
  ],
  pausas: { motivo: null, pausado_em: null, pausado_por: null, escada_pausada: false, retornos_pausados: false },
  campanha: {
    id: 1, nome: 'Follow-up longo prazo 90 dias', slug: 'fup90-v1', ativa: true, versao: 1, regioes: ['sp', 'rj', 'goiania'],
    hora_fim: '20:00:00', created_at: '2026-07-30T19:22:56.559727+00:00', jitter_min: 60, updated_at: '2026-09-17T14:45:16.742526+00:00',
    hora_inicio: '08:00:00', hora_overflow: '12:20:00', tags_pausantes: [9, 20, 42, 43, 44, 45, 46, 47, 48, 50, 824, 825, 826],
    janela_max_dias: 365, envia_fim_semana: true, janela_min_horas: 24, limite_envio_dia: 2000, tags_bloqueantes: [2, 7, 9, 17, 42, 43, 44, 45, 48, 50, 825],
    jitter_janela_min: 20, teto_toques_total: 12, intervalo_min_horas: 20, limite_inscricao_dia: 600,
  },
  retornos: {
    criados: 117, enviados: 81, pendentes: 131, respondeu_24h: 24, por_quem_prometeu: { bruna: 97, cliente: 20 },
    cancelados_por_motivo: { ja_agendou_visita: 2, material_recebido: 11, pausa_saude_ou_luto: 1, cliente_respondeu_antes: 3, pausa_imovel_nao_e_dele: 1, cliente_pediu_para_parar: 1, cliente_avisaria_sem_data: 5, objecao_fora_do_orcamento: 1, contato_fora_do_atendimento: 11 },
  },
  programados: { enviado: 21 },
  kanban_config: null,
  fup90_inscricoes: { ativa: 1118, pausada: 82, encerrada_rep: 3, encerrada_manual: 435, encerrada_optout: 94, encerrada_perdida: 39, encerrada_agendada: 1, encerrada_completa: 7236, encerrada_invalida: 346, encerrada_resposta: 512 },
};

const PENDENCIAS = [
  { desde: '2026-11-05', texto: 'A linha ORIENTAÇÕES DO GESTOR (bruna_instrucoes) já sai do banco, mas só entra na mensagem do turno depois que o nó subir: node docs/bruna/subir-contexto-nos-tres.mjs --base docs/bruna/montar-contexto.producao.js --gravar (precisa de N8N_API_KEY).', codigo: 'n8n_montar_contexto', titulo: 'Subir o nó "Montar contexto v3" ao n8n', resolvida: false },
  { desde: '2026-11-05', texto: 'O copiloto (bruna-copiloto) e a análise semanal (bruna-analise) chamam a API da Anthropic com esse segredo. Sem ele, as duas respondem 503.', codigo: 'anthropic_api_key', titulo: 'Configurar ANTHROPIC_API_KEY nos segredos do projeto Supabase', resolvida: false },
];

const PROMPT_ATUAL = { id: 1, numero: 1, status: 'publicada', publicada_em: '2026-11-05T02:38:54.58434+00:00', nota: 'Núcleo que está no ar em 04/11/2026: docs/bruna/prompt-nucleo-v3.md no commit 65de036 (main). Registrado pelo gerenciador.' };

/** Ainda não há análise no banco; esta segue o schema de bruna_analises. */
const ANALISE = { id: 1, tipo: 'semanal', status: 'concluida', criado_em: '2026-11-03T09:00:00+00:00', concluida_em: '2026-11-03T09:04:12+00:00', erro: null };

// ---------------------------------------------------------------------------
// Respostas
// ---------------------------------------------------------------------------
function respostaDasRpcs(sobrescrever: Record<string, unknown> = {}) {
  return (nome: string, args?: Record<string, unknown>) => {
    if (nome in sobrescrever) {
      const v = sobrescrever[nome];
      return v instanceof Error ? Promise.reject(v) : Promise.resolve(v);
    }
    switch (nome) {
      case 'bruna_gestor_metricas': {
        // A chamada do período corrente termina agora; a do anterior termina `dias` atrás.
        const ate = new Date(String(args?.p_ate)).getTime();
        return Promise.resolve(Math.abs(Date.now() - ate) < 60_000 ? METRICAS : METRICAS_ANTERIORES);
      }
      case 'bruna_gestor_serie_diaria': return Promise.resolve(SERIE);
      case 'bruna_gestor_alertas': return Promise.resolve(ALERTAS);
      case 'bruna_gestor_erros': return Promise.resolve(ERROS);
      case 'bruna_gestor_regua_resumo': return Promise.resolve(REGUA);
      case 'bruna_gestor_pausar_regua': return Promise.resolve({ ...REGUA.pausas });
      default: return Promise.reject(new Error(`rpc inesperada no teste: ${nome}`));
    }
  };
}

function respostaDasTabelas(sobrescrever: Record<string, unknown> = {}) {
  return (c: ChamadaDeTabela): unknown => {
    if (c.tabela in sobrescrever) return sobrescrever[c.tabela];
    switch (c.tabela) {
      case 'bruna_gestor_config': return { data: { valor: PENDENCIAS }, error: null };
      case 'bruna_analises': return { data: null, error: null };
      case 'bruna_sugestoes': return { data: null, error: null, count: 0 };
      case 'bruna_prompt_atual': return { data: PROMPT_ATUAL, error: null };
      case 'bruna_instrucoes': return { data: null, error: null, count: 0 };
      case 'bruna_followups': return { data: null, error: null, count: 12 };
      default: return { data: null, error: { message: `tabela inesperada no teste: ${c.tabela}` } };
    }
  };
}

function Local() {
  const l = useLocation();
  return <p data-testid="local">{l.pathname}{l.search}</p>;
}

function renderizar(url = rota('/?dias=7')) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
  const tela = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={rota('/')} element={<><VisaoGeral /><Local /></>} />
          <Route path="*" element={<Local />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...tela, qc };
}

/** O painel de um bloco da tela, achado pelo título. */
function painel(titulo: string): HTMLElement {
  return screen.getByRole('heading', { name: titulo }).closest('section') as HTMLElement;
}

/** Espera uma consulta da visão geral chegar e deixa o React desenhar o resultado. */
async function esperarConsulta(qc: QueryClient, chave: readonly unknown[]) {
  await waitFor(() => expect(qc.getQueryState(chave)?.status).toBe('success'));
  await act(async () => { await new Promise((ok) => setTimeout(ok, 0)); });
}

/** A Medida é um botão (leva à lista); o rótulo pode repetir em tabelas, o botão não. */
function medida(rotulo: string): HTMLElement {
  const rotulos = screen.getAllByText(rotulo).filter((el) => el.parentElement?.tagName === 'BUTTON');
  if (rotulos.length !== 1) throw new Error(`esperava uma Medida "${rotulo}", achei ${rotulos.length}`);
  return rotulos[0].parentElement as HTMLElement;
}
/** O número grande da Medida: rótulo -> irmão seguinte. */
function valorDaMedida(rotulo: string): string {
  return medida(rotulo).querySelector('.text-\\[30px\\]')?.textContent ?? '';
}
function diasDoPeriodo(args: unknown): number {
  const a = args as { p_de: string; p_ate: string };
  return (new Date(a.p_ate).getTime() - new Date(a.p_de).getTime()) / 86_400_000;
}
function chamadas(nome: string) {
  return rpc.mock.calls.filter(([n]) => n === nome);
}

beforeEach(() => {
  // Só o Date fica parado; os timers continuam reais (waitFor e react-query dependem deles).
  vi.setSystemTime(AGORA);
  rpc.mockReset();
  rpc.mockImplementation(respostaDasRpcs());
  tabela.responder = respostaDasTabelas();
  chamadasDeTabela.length = 0;
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Visão geral', () => {
  it('mostra as medidas do período com a variação contra o período anterior', async () => {
    renderizar();
    expect(screen.getByText('Como a Bruna está')).toBeInTheDocument();
    expect(screen.getByText(/Últimos 7 dias/)).toBeInTheDocument();

    await waitFor(() => expect(valorDaMedida('Leads atendidos')).toBe('693'));
    expect(screen.getByText('Variação contra os 7 dias anteriores.')).toBeInTheDocument();
    expect(valorDaMedida('Responderam')).toBe('760');
    expect(valorDaMedida('Agendados pela Bruna')).toBe('42');
    expect(valorDaMedida('Convites')).toBe('42');
    expect(valorDaMedida('Encaminhamentos')).toBe('312');
    expect(valorDaMedida('Chamados ao atendente')).toBe('30');
    expect(valorDaMedida('Revisões')).toBe('0');
    expect(valorDaMedida('Silêncios')).toBe('136');
    expect(valorDaMedida('Tempo de resposta')).toBe('57 s');
    expect(valorDaMedida('FUP90')).toBe('1.475');

    // 693 contra 785: queda com sinal e texto, nunca só cor.
    expect(within(medida('Leads atendidos')).getByText('−11,7%')).toBeInTheDocument();
    expect(within(medida('Agendados pela Bruna')).getByText('+68,0%')).toBeInTheDocument();
    expect(within(medida('Agendados pela Bruna')).getByText('6,1% dos atendidos · 55 no total')).toBeInTheDocument();
    // Silêncio não é bom nem ruim: a nota diz quanto era.
    expect(within(medida('Silêncios')).getByText(/era 137/)).toBeInTheDocument();
    expect(within(medida('FUP90')).getByText('83 responderam (5,6%)')).toBeInTheDocument();

    const metricas = chamadas('bruna_gestor_metricas');
    expect(metricas).toHaveLength(2);
    const [atual, anterior] = metricas.map(([, args]) => args as { p_de: string; p_ate: string });
    expect(diasDoPeriodo(atual)).toBeCloseTo(7, 5);
    expect(diasDoPeriodo(anterior)).toBeCloseTo(7, 5);
    expect(anterior.p_ate).toBe(atual.p_de);
    expect(chamadas('bruna_gestor_alertas')).toHaveLength(1);
    expect(chamadas('bruna_gestor_erros')).toHaveLength(1);
    expect(chamadas('bruna_gestor_regua_resumo')).toHaveLength(1);
    expect(chamadas('bruna_gestor_serie_diaria')).toHaveLength(1);
  });

  it('cada medida leva à lista de leads com o filtro coerente', async () => {
    renderizar();
    await waitFor(() => expect(valorDaMedida('Agendados pela Bruna')).toBe('42'));
    fireEvent.click(screen.getByText('Agendados pela Bruna'));
    expect(screen.getByTestId('local')).toHaveTextContent(rota('/leads?filtro=agendados'));
  });

  it('lista as praças com atendidos, responderam, agendados e taxa, cada uma levando aos leads da praça', async () => {
    renderizar();
    const sp = await screen.findByRole('link', { name: 'São Paulo' });
    expect(sp).toHaveAttribute('href', rota('/leads?region=sp'));
    const linha = sp.closest('tr') as HTMLElement;
    expect(within(linha).getByText('172')).toBeInTheDocument();
    expect(within(linha).getByText('175')).toBeInTheDocument();
    expect(within(linha).getByText('40')).toBeInTheDocument();
    expect(within(linha).getByText('23,3%')).toBeInTheDocument();

    // Brasil e Brasil 2 são funis de qualificação, ditos em texto.
    expect(within(screen.getByRole('link', { name: 'Brasil 2' }).closest('tr') as HTMLElement).getByText('funil')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Goiânia' })).toHaveAttribute('href', rota('/leads?region=goiania'));

    // Do maior para o menor: Goiânia (193) vem antes de São Paulo (172).
    const nomes = screen.getAllByRole('link', { name: /^(Goiânia|São Paulo|Rio de Janeiro|Brasil|Brasil 2|Pós-venda)$/ }).map((l) => l.textContent);
    expect(nomes.indexOf('Goiânia')).toBeLessThan(nomes.indexOf('São Paulo'));

    // A linha de total usa os números do período inteiro.
    const praca = screen.getByRole('heading', { name: 'Por praça' }).closest('section') as HTMLElement;
    const total = within(praca).getByRole('rowheader', { name: 'Total' }).closest('tr') as HTMLElement;
    expect(within(total).getByText('693')).toBeInTheDocument();
    expect(within(total).getByText('7,9%')).toBeInTheDocument();
  });

  it('região que a busca de leads não conhece (funil Arquitetos) aparece sem link', async () => {
    const comArquitetos = { ...METRICAS, por_regiao: { ...METRICAS.por_regiao, arquitetos: { agendados: 0, atendidos: 4, responderam: 3 } } };
    rpc.mockImplementation(respostaDasRpcs({ bruna_gestor_metricas: comArquitetos }));
    renderizar();
    await screen.findByRole('link', { name: 'São Paulo' });
    const praca = within(screen.getByRole('heading', { name: 'Por praça' }).closest('section') as HTMLElement);
    expect(praca.getByRole('rowheader', { name: 'Arquitetos' })).toBeInTheDocument();
    expect(praca.queryByRole('link', { name: 'Arquitetos' })).not.toBeInTheDocument();
    expect(praca.getByRole('link', { name: 'Pós-venda' })).toHaveAttribute('href', rota('/leads?region=pos_venda'));
  });

  it('ordena os alertas por gravidade, com marcador escrito e o link certo para cada tipo', async () => {
    rpc.mockImplementation(respostaDasRpcs({ bruna_gestor_alertas: [...ALERTAS, ALERTA_GRAVE] }));
    renderizar();
    expect(await screen.findByText('3 agora · 1 grave')).toBeInTheDocument();

    const links = screen.getAllByRole('link', { name: /que não saíram|não respondeu|reprovado\(s\)/ });
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveTextContent('2 chamado(s) ao atendimento que não saíram (7 dias)');
    expect(links[0]).toHaveTextContent('grave');
    expect(links[0]).toHaveAttribute('href', rota('/leads?filtro=com_chamado'));
    expect(links[1]).toHaveTextContent('média');
    expect(links[1]).toHaveAttribute('href', rota('/configuracoes/base'));
    expect(links[1]).toHaveTextContent('responder em Configurações › Base');
    expect(links[2]).toHaveTextContent('leve');
    expect(links[2]).toHaveAttribute('href', rota('/regua'));
  });

  it('desenha a série diária com os dias cheios e hoje, sem dia pela metade no começo, e repete os números em tabela', async () => {
    renderizar();
    await screen.findByText('Números dia a dia');

    // Começa à meia-noite de São Paulo de seis dias atrás (não em "agora menos 7 dias"),
    // para que a RPC devolva sete dias e o primeiro venha inteiro.
    expect(chamadas('bruna_gestor_serie_diaria')).toEqual([['bruna_gestor_serie_diaria', { p_de: '2026-10-30T03:00:00.000Z', p_ate: AGORA.toISOString() }]]);
    expect(within(painel('Dia a dia')).getByText('6 dias cheios e hoje, em andamento')).toBeInTheDocument();
    expect(screen.getByRole('img', {
      name: 'Gráfico de 7 dias, de 30/10 a hoje: atendidos e responderam por dia em linha, agendados em barra, 50 no total. Os números de cada dia estão na tabela abaixo.',
    })).toBeInTheDocument();

    const linha = screen.getByRole('rowheader', { name: '30/10' }).closest('tr') as HTMLElement;
    expect(within(linha).getByText('128')).toBeInTheDocument();
    expect(within(linha).getByText('151')).toBeInTheDocument();
    expect(within(linha).getByText('8')).toBeInTheDocument();
    expect(screen.queryByRole('rowheader', { name: '29/10' })).not.toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '05/11 (hoje)' })).toBeInTheDocument();

    // A última linha soma os dias: um lead atendido em três dias conta três vezes, e o rótulo diz isso.
    const soma = screen.getByRole('rowheader', { name: 'Soma dos dias' }).closest('tr') as HTMLElement;
    expect(within(soma).getByText('769')).toBeInTheDocument();
    expect(within(soma).getByText('815')).toBeInTheDocument();
    expect(within(soma).getByText('50')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Legenda' })).toHaveTextContent('atendidos');
  });

  it('conta os erros do período, do mais frequente ao menos, levando a quem resolve', async () => {
    renderizar();
    const descartes = await screen.findByText('Templates descartados pela Meta');
    const item = descartes.closest('a') as HTMLElement;
    expect(within(item).getByText('378')).toBeInTheDocument();
    expect(within(item).getByText('fup90_v2_03_vidro_comum: 81 de 185')).toBeInTheDocument();
    expect(item).toHaveAttribute('href', rota('/regua'));

    // Só o veredito 'bloqueado' é frase cortada; o detalhe fala da mesma coisa que o número.
    // 'nao_verificado' (81) passa pelo guarda e não é erro: não aparece nesta linha.
    const guarda = screen.getByText('Horários barrados pelo guarda da agenda').closest('a') as HTMLElement;
    expect(within(guarda).getByText('2')).toBeInTheDocument();
    expect(within(guarda).getByText('a frase foi cortada antes de sair')).toBeInTheDocument();
    expect(within(painel('Erros do período')).queryByText(/sem a agenda conferida/)).not.toBeInTheDocument();

    const itens = painel('Erros do período').querySelectorAll('li');
    expect(itens).toHaveLength(2);
    expect(itens[0]).toHaveTextContent('Templates descartados pela Meta');
    expect(screen.getByRole('link', { name: 'leads com revisão' })).toHaveAttribute('href', rota('/leads?filtro=com_revisao'));
  });

  it('erros do período: enquanto as métricas não chegam, só o esqueleto, sem a lista pela metade', async () => {
    // bruna_gestor_erros responde; bruna_gestor_metricas fica pendente.
    rpc.mockImplementation(respostaDasRpcs({ bruna_gestor_metricas: new Promise(() => {}) }));
    const { qc } = renderizar();
    await esperarConsulta(qc, ['gerenciador', 'visao-geral', 'erros', 7]);

    const erros = painel('Erros do período');
    expect(erros.querySelectorAll('li')).toHaveLength(0);
    expect(within(erros).queryByText('Templates descartados pela Meta')).not.toBeInTheDocument();
    expect(erros.querySelector('.border-dashed')).not.toBeNull();
  });

  it('resume a régua em três linhas com os totais da escada, dos retornos e do FUP90', async () => {
    renderizar();
    const escada = await screen.findByText('919 toques');
    expect(escada.closest('a')).toHaveAttribute('href', rota('/regua'));
    expect(screen.getByText('41 pulados · 25,8% responderam em 24 h')).toBeInTheDocument();

    const retornos = screen.getByText('131 pendentes').closest('a') as HTMLElement;
    expect(retornos).toHaveAttribute('href', rota('/leads?filtro=retorno_pendente'));
    expect(within(retornos).getByText('12 atrasados · 81 enviados no período')).toBeInTheDocument();

    const regua = screen.getByRole('heading', { name: 'Régua' }).closest('section') as HTMLElement;
    const fup = within(regua).getByText('ativa').closest('a') as HTMLElement;
    expect(fup).toHaveAttribute('href', rota('/regua/fup90'));
    expect(within(fup).getByText('1.475 envios · 83 responderam · 1.118 inscrições ativas')).toBeInTheDocument();

    // Os atrasados vêm de bruna_followups: vencidos, não cumpridos, não cancelados.
    const c = chamadasDeTabela.find((x) => x.tabela === 'bruna_followups') as ChamadaDeTabela;
    expect(c.ops).toEqual(expect.arrayContaining([['select', ['id', { count: 'exact', head: true }]], ['eq', ['cumprido', false]], ['is', ['cancelado_em', null]]]));
    expect((c.ops.find(([m]) => m === 'lt') as Op)[1][0]).toBe('quando');
  });

  it('mostra só as pendências não resolvidas em "Depende do dono" e some quando todas estão resolvidas', async () => {
    const primeira = renderizar();
    expect(await screen.findByText('Depende do dono')).toBeInTheDocument();
    expect(screen.getByText('Subir o nó "Montar contexto v3" ao n8n')).toBeInTheDocument();
    expect(screen.getByText('Configurar ANTHROPIC_API_KEY nos segredos do projeto Supabase')).toBeInTheDocument();
    expect(screen.getByText('2 pendências')).toBeInTheDocument();
    expect(screen.getAllByText('desde 05/11/2026')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Configurações › Geral' })).toHaveAttribute('href', rota('/configuracoes/geral'));
    const config = chamadasDeTabela.find((x) => x.tabela === 'bruna_gestor_config') as ChamadaDeTabela;
    expect(config.ops).toEqual(expect.arrayContaining([['select', ['valor']], ['eq', ['chave', 'pendencias']]]));
    primeira.unmount();

    chamadasDeTabela.length = 0;
    tabela.responder = respostaDasTabelas({ bruna_gestor_config: { data: { valor: PENDENCIAS.map((p) => ({ ...p, resolvida: true })) }, error: null } });
    renderizar();
    await waitFor(() => expect(chamadasDeTabela.some((x) => x.tabela === 'bruna_gestor_config')).toBe(true));
    await screen.findByText(/Nenhuma análise ainda/);
    expect(screen.queryByText('Depende do dono')).not.toBeInTheDocument();
  });

  it('atalhos: última análise, sugestões pendentes, perguntas ao copiloto e o núcleo publicado', async () => {
    tabela.responder = respostaDasTabelas({
      bruna_analises: { data: ANALISE, error: null },
      bruna_sugestoes: { data: null, error: null, count: 3 },
      bruna_instrucoes: { data: null, error: null, count: 2 },
    });
    renderizar();

    expect(await screen.findByText('concluída')).toBeInTheDocument();
    expect(screen.getByText('Última análise (semanal):')).toBeInTheDocument();
    expect(screen.getByText('03/11 06:04')).toBeInTheDocument();
    expect(screen.getByText(/sugestões esperando decisão/)).toHaveTextContent('3 sugestões esperando decisão');

    expect(screen.getByRole('link', { name: 'v1' })).toHaveAttribute('href', rota('/configuracoes/nucleo'));
    expect(screen.getByText('04/11 23:38')).toBeInTheDocument();
    expect(screen.getByText(/orientações ativas para a Bruna/)).toHaveTextContent('2 orientações ativas para a Bruna');

    expect(screen.getByRole('link', { name: /O que a Bruna mais errou esta semana\?/ })).toHaveAttribute('href', rota('/copiloto?pergunta=O+que+a+Bruna+mais+errou+esta+semana%3F'));
    expect(screen.getByRole('link', { name: /Quais leads agendados estão sem confirmação\?/ })).toHaveAttribute('href', rota('/copiloto?pergunta=Quais+leads+agendados+est%C3%A3o+sem+confirma%C3%A7%C3%A3o%3F'));
    expect(screen.getByRole('link', { name: /Resuma os chamados com erro/ })).toHaveAttribute('href', rota('/copiloto?pergunta=Resuma+os+chamados+com+erro'));

    const sugestoes = chamadasDeTabela.find((x) => x.tabela === 'bruna_sugestoes') as ChamadaDeTabela;
    expect(sugestoes.ops).toEqual(expect.arrayContaining([['select', ['id', { count: 'exact', head: true }]], ['eq', ['status', 'pendente']]]));
    // Orientação ativa é a que a Bruna lê agora (bruna_instrucoes_vivas): ativa, já começou e não terminou.
    const instrucoes = chamadasDeTabela.find((x) => x.tabela === 'bruna_instrucoes') as ChamadaDeTabela;
    const agora = AGORA.toISOString();
    expect(instrucoes.ops).toEqual([
      ['select', ['id', { count: 'exact', head: true }]],
      ['eq', ['ativa', true]],
      ['lte', ['vigencia_inicio', agora]],
      ['or', [`vigencia_fim.is.null,vigencia_fim.gt.${agora}`]],
    ]);
    const analises = chamadasDeTabela.find((x) => x.tabela === 'bruna_analises') as ChamadaDeTabela;
    expect(analises.ops).toEqual(expect.arrayContaining([['order', ['criado_em', { ascending: false }]], ['limit', [1]]]));
  });

  it('o número da versão do núcleo sai inteiro, sem separador de milhar', async () => {
    tabela.responder = respostaDasTabelas({ bruna_prompt_atual: { data: { ...PROMPT_ATUAL, numero: 1000 }, error: null } });
    renderizar();
    expect(await screen.findByRole('link', { name: 'v1000' })).toHaveAttribute('href', rota('/configuracoes/nucleo'));
    expect(screen.queryByText('v1.000')).not.toBeInTheDocument();
  });

  it('estado vazio: sem alertas, sem erros no período', async () => {
    rpc.mockImplementation(respostaDasRpcs({
      bruna_gestor_alertas: [],
      bruna_gestor_erros: { ...ERROS, horarios_suspeitos: [], templates_descartados: [] },
    }));
    renderizar();
    expect(await screen.findByText('Nada pede atenção agora')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver leads sem resposta' })).toHaveAttribute('href', rota('/leads?filtro=sem_resposta_24h'));
    expect(await screen.findByText('Sem erros no período')).toBeInTheDocument();
    expect(screen.getByText('nenhum agora')).toBeInTheDocument();
  });

  it('estado de erro: mostra a mensagem do banco e tenta de novo', async () => {
    rpc.mockImplementation(respostaDasRpcs({ bruna_gestor_metricas: new Error('permission denied for function bruna_gestor_metricas') }));
    const { qc } = renderizar();
    const erros = await screen.findAllByText('permission denied for function bruna_gestor_metricas');
    expect(erros.length).toBeGreaterThan(0);
    expect(screen.getAllByText('Não deu para carregar').length).toBeGreaterThan(0);
    // As outras fontes seguem no ar: o resumo da régua não depende das métricas.
    expect(await screen.findByText('919 toques')).toBeInTheDocument();
    // Os erros do período dependem das duas: com bruna_gestor_erros pronta e as métricas
    // em erro, o painel mostra só o aviso, sem a lista pela metade ao lado.
    await esperarConsulta(qc, ['gerenciador', 'visao-geral', 'erros', 7]);
    expect(within(painel('Erros do período')).getByText('permission denied for function bruna_gestor_metricas')).toBeInTheDocument();
    expect(painel('Erros do período').querySelectorAll('li')).toHaveLength(0);

    const antes = chamadas('bruna_gestor_metricas').length;
    rpc.mockImplementation(respostaDasRpcs());
    fireEvent.click(screen.getAllByRole('button', { name: 'Tentar de novo' })[0]);
    await waitFor(() => expect(valorDaMedida('Leads atendidos')).toBe('693'));
    expect(chamadas('bruna_gestor_metricas').length).toBeGreaterThan(antes);
  });

  it('guarda o período em ?dias= e refaz as consultas com o período novo', async () => {
    renderizar(rota('/?dias=30'));
    // Os cinco botões do seletor, nesta ordem, só o escolhido em tinta cheia.
    const seletor = within(screen.getByRole('group', { name: 'Período' }));
    expect(seletor.getAllByRole('button').map((b) => b.textContent)).toEqual(['Hoje', 'Ontem', '7 dias', '14 dias', '30 dias']);
    expect(seletor.getAllByRole('button').filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent)).toEqual(['30 dias']);
    expect(screen.getByRole('button', { name: '30 dias' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Últimos 30 dias/)).toBeInTheDocument();
    await waitFor(() => expect(chamadas('bruna_gestor_serie_diaria')).toHaveLength(1));
    // 30 dias = 29 dias cheios e hoje: a série começa à meia-noite de 07/10 em São Paulo.
    expect(chamadas('bruna_gestor_serie_diaria')[0][1]).toEqual({ p_de: '2026-10-07T03:00:00.000Z', p_ate: AGORA.toISOString() });
    expect(diasDoPeriodo(chamadas('bruna_gestor_metricas')[0][1])).toBeCloseTo(30, 5);

    fireEvent.click(screen.getByRole('button', { name: '14 dias' }));
    expect(screen.getByTestId('local')).toHaveTextContent(rota('/?dias=14'));
    expect(screen.getByRole('button', { name: '14 dias' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Últimos 14 dias/)).toBeInTheDocument();
    await waitFor(() => expect(chamadas('bruna_gestor_serie_diaria').some(([, a]) => (a as { p_de: string }).p_de === '2026-10-23T03:00:00.000Z')).toBe(true));
    await waitFor(() => expect(chamadas('bruna_gestor_erros').some(([, a]) => Math.round(diasDoPeriodo(a)) === 14)).toBe(true));
  });

  it('um ?dias= fora de hoje/ontem/7/14/30 cai em 7', () => {
    expect(lerDias('30')).toBe(30);
    expect(lerDias('hoje')).toBe('hoje');
    expect(lerDias('ontem')).toBe('ontem');
    expect(lerDias('9')).toBe(7);
    expect(lerDias('1')).toBe(7);
    expect(lerDias('Hoje')).toBe(7);
    expect(lerDias('anteontem')).toBe(7);
    expect(lerDias(null)).toBe(7);
    expect(lerDias('abc')).toBe(7);
  });

  it('?dias=hoje: da meia-noite de Brasília até agora, comparado com ontem até esta hora, e a série dos 7 dias com hoje em destaque', async () => {
    renderizar(rota('/?dias=hoje'));
    expect(screen.getByRole('button', { name: 'Hoje' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '7 dias' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Hoje (05/11, da meia-noite até agora), comparado com ontem até esta hora. Horário de Brasília.')).toBeInTheDocument();

    await waitFor(() => expect(valorDaMedida('Leads atendidos')).toBe('693'));
    const [atual, anterior] = chamadas('bruna_gestor_metricas').map(([, args]) => args);
    // 01:18 de 05/11 em São Paulo: hoje começou às 03:00Z; ontem até esta hora vai de 04/11 03:00Z até 24 h atrás.
    expect(atual).toEqual({ p_de: '2026-11-05T03:00:00.000Z', p_ate: AGORA.toISOString() });
    expect(anterior).toEqual({ p_de: '2026-11-04T03:00:00.000Z', p_ate: '2026-11-04T04:18:07.482Z' });
    expect(screen.getByText('Variação contra ontem até esta hora.')).toBeInTheDocument();
    // Erros e régua usam a mesma janela.
    await waitFor(() => expect(chamadas('bruna_gestor_erros')).toHaveLength(1));
    expect(chamadas('bruna_gestor_erros')[0][1]).toEqual({ p_de: '2026-11-05T03:00:00.000Z', p_ate: AGORA.toISOString() });
    await waitFor(() => expect(chamadas('bruna_gestor_regua_resumo')).toHaveLength(1));
    expect(chamadas('bruna_gestor_regua_resumo')[0][1]).toEqual({ p_de: '2026-11-05T03:00:00.000Z', p_ate: AGORA.toISOString() });

    // Um dia só não é série: os últimos 7 dias, com hoje em destaque.
    await screen.findByText('Números dia a dia');
    expect(chamadas('bruna_gestor_serie_diaria')).toEqual([['bruna_gestor_serie_diaria', { p_de: '2026-10-30T03:00:00.000Z', p_ate: AGORA.toISOString() }]]);
    expect(within(painel('Dia a dia')).getByText('série dos últimos 7 dias; o dia escolhido em destaque')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Hoje \(05\/11\) em destaque\./ })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '05/11 (hoje)' })).toHaveClass('text-croqui-red-text');
    expect(screen.getByRole('rowheader', { name: '04/11' })).not.toHaveClass('text-croqui-red-text');
  });

  it('?dias=ontem: o dia inteiro de ontem em Brasília, comparado com anteontem, e ontem em destaque na série', async () => {
    renderizar(rota('/?dias=ontem'));
    expect(screen.getByRole('button', { name: 'Ontem' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Ontem (04/11, o dia inteiro), comparado com anteontem. Horário de Brasília.')).toBeInTheDocument();

    await waitFor(() => expect(chamadas('bruna_gestor_metricas')).toHaveLength(2));
    const [atual, anterior] = chamadas('bruna_gestor_metricas').map(([, args]) => args);
    expect(atual).toEqual({ p_de: '2026-11-04T03:00:00.000Z', p_ate: '2026-11-05T03:00:00.000Z' });
    expect(anterior).toEqual({ p_de: '2026-11-03T03:00:00.000Z', p_ate: '2026-11-04T03:00:00.000Z' });
    expect(await screen.findByText('Variação contra anteontem.')).toBeInTheDocument();
    await waitFor(() => expect(chamadas('bruna_gestor_erros')).toHaveLength(1));
    expect(chamadas('bruna_gestor_erros')[0][1]).toEqual({ p_de: '2026-11-04T03:00:00.000Z', p_ate: '2026-11-05T03:00:00.000Z' });

    await screen.findByText('Números dia a dia');
    expect(chamadas('bruna_gestor_serie_diaria')[0][1]).toEqual({ p_de: '2026-10-30T03:00:00.000Z', p_ate: AGORA.toISOString() });
    expect(screen.getByRole('rowheader', { name: '04/11 (ontem)' })).toHaveClass('text-croqui-red-text');
    expect(screen.getByRole('rowheader', { name: '05/11 (hoje)' })).not.toHaveClass('text-croqui-red-text');

    // Trocar para Hoje guarda na URL e refaz as consultas.
    fireEvent.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(screen.getByTestId('local')).toHaveTextContent(rota('/?dias=hoje'));
    expect(screen.getByRole('button', { name: 'Hoje' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(chamadas('bruna_gestor_metricas').some(([, a]) => (a as { p_de: string }).p_de === '2026-11-05T03:00:00.000Z')).toBe(true));
  });

  it('régua pausada: alerta em caneta no topo, sem repetir na lista, e Retomar chama bruna_gestor_pausar_regua', async () => {
    const pausada = { ...REGUA, pausas: { escada_pausada: true, retornos_pausados: false, motivo: 'Feriado em SP', pausado_por: 'ia.besser@besserhome.com.br', pausado_em: '2026-11-04T12:00:00+00:00' } };
    rpc.mockImplementation(respostaDasRpcs({ bruna_gestor_regua_resumo: pausada, bruna_gestor_alertas: [ALERTA_REGUA_PAUSADA, ...ALERTAS] }));
    renderizar();

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Régua pausada: escada de 24 h');
    expect(alerta).toHaveTextContent('Feriado em SP · por ia.besser@besserhome.com.br');
    expect(within(alerta).getByRole('link', { name: 'Abrir Régua' })).toHaveAttribute('href', rota('/regua'));
    // O mesmo aviso que a RPC de alertas traz não aparece duas vezes.
    await screen.findByText('2 agora');
    expect(screen.queryByText('Régua pausada pelo gestor')).not.toBeInTheDocument();
    // E a linha da escada diz que está pausada.
    expect(screen.getByText('pausada')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retomar' }));
    expect(rpc).not.toHaveBeenCalledWith('bruna_gestor_pausar_regua', expect.anything());
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar retomada' }));

    await waitFor(() => expect(rpc).toHaveBeenCalledWith('bruna_gestor_pausar_regua', { p_escada: false, p_retornos: false, p_motivo: null }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    // A RPC audita por dentro: a tela não duplica a auditoria.
    expect(rpc).not.toHaveBeenCalledWith('bruna_gestor_auditar', expect.anything());
    // Depois de retomar, a régua e os alertas são lidos de novo.
    await waitFor(() => expect(chamadas('bruna_gestor_regua_resumo').length).toBeGreaterThan(1));
    await waitFor(() => expect(chamadas('bruna_gestor_alertas').length).toBeGreaterThan(1));
  });

  it('retomar com erro do banco avisa com a mensagem do banco', async () => {
    const pausada = { ...REGUA, pausas: { ...REGUA.pausas, retornos_pausados: true } };
    rpc.mockImplementation(respostaDasRpcs({ bruna_gestor_regua_resumo: pausada, bruna_gestor_pausar_regua: new Error('sem permissão para o gerenciador da Bruna') }));
    renderizar();
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Régua pausada: retornos prometidos');
    fireEvent.click(screen.getByRole('button', { name: 'Retomar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar retomada' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Não deu para retomar a régua: sem permissão para o gerenciador da Bruna'));
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('funções puras da visão geral', () => {
  it('lerPendencias aceita só a lista do banco e ignora o que não é pendência', () => {
    expect(lerPendencias(PENDENCIAS)).toHaveLength(2);
    expect(lerPendencias(PENDENCIAS)[0]).toMatchObject({ codigo: 'n8n_montar_contexto', resolvida: false, desde: '2026-11-05' });
    expect(lerPendencias({ codigo: 'x' })).toEqual([]);
    expect(lerPendencias(null)).toEqual([]);
    expect(lerPendencias([{ codigo: 'sem_titulo' }, 'texto solto', null])).toEqual([]);
  });

  it('linhasDeErro só conta o que a RPC trouxe, do mais frequente ao menos', () => {
    const linhas = linhasDeErro(ERROS as never, METRICAS as never);
    expect(linhas.map((l) => [l.chave, l.n])).toEqual([['descartes', 378], ['horarios', 2]]);

    const comRevisoes = linhasDeErro({ ...ERROS, revisoes_por_tipo: [{ tipo: 'horario_sem_tool', graves: 2, medias: 1, leves: 0, total: 3 }] } as never, { ...METRICAS, chamados_com_erro: 1, encaminhamentos_com_erro: 4, duvidas_sem_acerto: 5 } as never);
    expect(comRevisoes.map((l) => l.chave)).toEqual(['descartes', 'duvidas', 'encaminhamentos', 'revisao_horario_sem_tool', 'horarios', 'chamados']);
    const revisao = comRevisoes.find((l) => l.chave === 'revisao_horario_sem_tool');
    expect(revisao).toMatchObject({ rotulo: 'Revisão: horario sem tool', n: 3, detalhe: '2 graves', caneta: true, rota: rota('/leads?filtro=com_revisao') });
  });

  it('periodoDaSerie começa à meia-noite de São Paulo e conta hoje como um dos dias', () => {
    // O mesmo instante que o banco dá para (hoje − 6)::timestamp at time zone 'America/Sao_Paulo'.
    expect(periodoDaSerie(7, AGORA)).toEqual({ de: '2026-10-30T03:00:00.000Z', ate: '2026-11-05T04:18:07.482Z', dias: 7 });
    expect(periodoDaSerie(14, AGORA).de).toBe('2026-10-23T03:00:00.000Z');
    expect(periodoDaSerie(30, AGORA).de).toBe('2026-10-07T03:00:00.000Z');
    // 23h30 de 04/11 em São Paulo já é 05/11 em UTC, mas hoje ainda é 04/11.
    expect(periodoDaSerie(7, new Date('2026-11-05T02:30:00.000Z')).de).toBe('2026-10-29T03:00:00.000Z');
    // Hoje e ontem não são série: saem os últimos 7 dias.
    expect(periodoDaSerie('hoje', AGORA)).toEqual(periodoDaSerie(7, AGORA));
    expect(periodoDaSerie('ontem', AGORA)).toEqual(periodoDaSerie(7, AGORA));
  });

  it('janelaDoPeriodo calcula hoje e ontem em horário de Brasília, e a comparação de hoje com ontem até a mesma hora', () => {
    // 01:18 de 05/11 em São Paulo.
    expect(janelaDoPeriodo('hoje', AGORA)).toEqual({
      periodo: { de: '2026-11-05T03:00:00.000Z', ate: '2026-11-05T04:18:07.482Z', dias: 1 },
      anterior: { de: '2026-11-04T03:00:00.000Z', ate: '2026-11-04T04:18:07.482Z', dias: 1 },
      comparacao: 'ontem até esta hora',
      dia: '2026-11-05',
    });
    expect(janelaDoPeriodo('ontem', AGORA)).toEqual({
      periodo: { de: '2026-11-04T03:00:00.000Z', ate: '2026-11-05T03:00:00.000Z', dias: 1 },
      anterior: { de: '2026-11-03T03:00:00.000Z', ate: '2026-11-04T03:00:00.000Z', dias: 1 },
      comparacao: 'anteontem',
      dia: '2026-11-04',
    });
    // 23h30 de 04/11 em São Paulo já é 05/11 em UTC: hoje ainda é 04/11, e ontem é 03/11.
    const tarde = new Date('2026-11-05T02:30:00.000Z');
    expect(janelaDoPeriodo('hoje', tarde).periodo).toEqual({ de: '2026-11-04T03:00:00.000Z', ate: '2026-11-05T02:30:00.000Z', dias: 1 });
    expect(janelaDoPeriodo('hoje', tarde).anterior).toEqual({ de: '2026-11-03T03:00:00.000Z', ate: '2026-11-04T02:30:00.000Z', dias: 1 });
    expect(janelaDoPeriodo('hoje', tarde).dia).toBe('2026-11-04');
    expect(janelaDoPeriodo('ontem', tarde).periodo).toEqual({ de: '2026-11-03T03:00:00.000Z', ate: '2026-11-04T03:00:00.000Z', dias: 1 });
    expect(janelaDoPeriodo('ontem', tarde).dia).toBe('2026-11-03');
    // Virada de mês: 01/11 às 00:10 em São Paulo (03:10Z).
    const viradaDeMes = new Date('2026-11-01T03:10:00.000Z');
    expect(janelaDoPeriodo('ontem', viradaDeMes).periodo).toEqual({ de: '2026-10-31T03:00:00.000Z', ate: '2026-11-01T03:00:00.000Z', dias: 1 });
    expect(janelaDoPeriodo('ontem', viradaDeMes).anterior.de).toBe('2026-10-30T03:00:00.000Z');
    // 7/14/30 seguem a janela rolante até agora e a de mesmo tamanho logo antes.
    const sete = janelaDoPeriodo(7, AGORA);
    expect(sete).toMatchObject({ comparacao: 'os 7 dias anteriores', dia: null });
    expect(sete.periodo).toEqual({ de: '2026-10-29T04:18:07.482Z', ate: '2026-11-05T04:18:07.482Z', dias: 7 });
    expect(sete.anterior).toEqual({ de: '2026-10-22T04:18:07.482Z', ate: '2026-10-29T04:18:07.482Z', dias: 7 });
    expect(janelaDoPeriodo(30, AGORA).periodo.de).toBe('2026-10-06T04:18:07.482Z');
  });

  it('ordenarAlertas põe os graves primeiro e mantém a ordem da RPC dentro da gravidade', () => {
    const ordem = ordenarAlertas([...ALERTAS, ALERTA_GRAVE, ALERTA_REGUA_PAUSADA] as never).map((a) => a.chave);
    expect(ordem).toEqual(['chamados_com_erro', 'duvidas_sem_resposta', 'regua_pausada', 'templates_reprovados']);
  });
});
