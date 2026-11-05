// Dados dos testes da área Bairros foco. Os itens, as exceções, as posições
// (as do docs/bruna/regioes.json), as contagens de leads/agendados e os pedidos
// fora do foco foram copiados do banco de produção em 05/11/2026 (últimos 90
// dias). Os nomes dos leads das simulações são inventados.
import type {
  ItemDoFoco, MudancaNoHistorico, PainelDoFoco, ResultadoDoTeste, Simulacao,
} from './tipos';

const SINCRONIZADO = '2026-09-11T18:47:22.710528+00:00';

function item(campos: Partial<ItemDoFoco> & Pick<ItemDoFoco, 'nome'>): ItemDoFoco {
  return {
    tipo: 'bairro', so_se: [], nao_se: [], ordem: null, observacao: null,
    atualizado_em: SINCRONIZADO, atualizado_por_email: null,
    leads: 0, agendados: 0, ultimo_lead_em: null,
    ...campos,
  };
}

export const NAO_SE_DA_SAUDE = ['de saude', 'com saude', 'sua saude', 'minha saude', 'bosque da saude', 'plano de saude'];

export const ITENS_SP: ItemDoFoco[] = [
  item({ nome: 'Alto da Lapa', ordem: 1, leads: 11, agendados: 3, ultimo_lead_em: '2026-10-29 19:18:56.91347' }),
  item({ nome: 'Lapa', ordem: 2, leads: 25, agendados: 7, ultimo_lead_em: '2026-10-28 16:58:40.28347' }),
  item({ nome: 'Jardim Paulistano', ordem: 7, leads: 2, agendados: 2, ultimo_lead_em: '2026-10-27 13:24:56.913608' }),
  item({ nome: 'Pinheiros', ordem: 8, leads: 44, agendados: 19, ultimo_lead_em: '2026-11-04 03:41:47.477325' }),
  item({
    nome: 'Saúde', ordem: 9, nao_se: NAO_SE_DA_SAUDE, leads: 17, agendados: 7, ultimo_lead_em: '2026-11-03 20:02:35.16688',
    atualizado_em: '2026-11-05T13:40:22.118+00:00', atualizado_por_email: 'bruno@besserhome.com.br',
  }),
  item({ nome: 'Brooklin', ordem: 10, leads: 36, agendados: 12, ultimo_lead_em: '2026-10-31 16:00:06.74979' }),
  item({ nome: 'Gramado', ordem: 110, so_se: ['campinas'] }),
  item({
    nome: 'Vila Alpina', ordem: 138, so_se: ['valinhos'],
    observacao: 'É a Vila Alpina de Valinhos; a da zona leste de São Paulo não entra.',
  }),
  item({ nome: 'Barueri', ordem: 140 }),
  item({ nome: 'Santana de Parnaíba', ordem: 141 }),
  item({ tipo: 'cidade', nome: 'Barueri', ordem: 1, leads: 6, agendados: 1, ultimo_lead_em: '2026-10-15 03:35:48.143962' }),
  item({ tipo: 'cidade', nome: 'Santana de Parnaíba', ordem: 2, leads: 9, agendados: 2, ultimo_lead_em: '2026-11-02 17:52:03.216493' }),
];

export const PAINEL_SP: PainelDoFoco = {
  region: 'sp',
  nome: 'São Paulo',
  oferece_consultoria: true,
  periodo: { dias: 90, de: '2026-08-07T14:00:00.000Z', ate: '2026-11-05T14:00:00.000Z' },
  itens: ITENS_SP,
  fora_do_foco: [
    { bairro: 'Centro', cidade: 'Osasco', leads: 24, agendados: 0, ultimo_em: '2026-10-30 09:35:12.673079', contato_exemplo: 28654 },
    { bairro: 'Santana', cidade: 'São Paulo', leads: 19, agendados: 2, ultimo_em: '2026-10-29 02:35:32.346278', contato_exemplo: 28597 },
    { bairro: 'Condomínio Horizontal (fechado)', cidade: 'Campinas', leads: 15, agendados: 1, ultimo_em: '2026-11-01 23:01:22.253983', contato_exemplo: 28733 },
    { bairro: 'Mooca', cidade: 'São Paulo', leads: 14, agendados: 1, ultimo_em: '2026-10-31 01:49:50.372672', contato_exemplo: 28681 },
    { bairro: 'Cotia', cidade: 'Cotia', leads: 9, agendados: 0, ultimo_em: '2026-08-30 14:19:28.023604', contato_exemplo: 25319 },
    { bairro: 'Vila Prudente', cidade: 'São Paulo', leads: 9, agendados: 1, ultimo_em: '2026-08-30 16:21:00.7194', contato_exemplo: 25327 },
    { bairro: 'Água Branca', cidade: 'São Paulo', leads: 8, agendados: 1, ultimo_em: '2026-10-08 22:14:23.02243', contato_exemplo: 27408 },
    { bairro: 'Cambuci', cidade: 'São Paulo', leads: 7, agendados: 1, ultimo_em: '2026-11-05 01:09:39.013655', contato_exemplo: 28914 },
    { bairro: 'Freguesia do Ó', cidade: 'São Paulo', leads: 6, agendados: 0, ultimo_em: '2026-10-31 13:34:58.734344', contato_exemplo: 28688 },
    { bairro: 'Itaquera', cidade: 'São Paulo', leads: 5, agendados: 0, ultimo_em: '2026-09-04 19:02:10.306942', contato_exemplo: 25502 },
    { bairro: 'Jabaquara', cidade: 'São Paulo', leads: 5, agendados: 1, ultimo_em: '2026-09-12 16:47:37.325624', contato_exemplo: 25871 },
    { bairro: 'Bosque da Saúde', cidade: 'São Paulo', leads: 5, agendados: 2, ultimo_em: '2026-09-23 19:40:30.742265', contato_exemplo: 26412 },
  ],
  com_bairro: 1369,
  no_foco: 751,
  sem_bairro: 1780,
};

export const PAINEL_RJ: PainelDoFoco = {
  region: 'rj',
  nome: 'Rio de Janeiro',
  oferece_consultoria: true,
  periodo: { dias: 90, de: '2026-08-07T14:00:00.000Z', ate: '2026-11-05T14:00:00.000Z' },
  itens: [
    item({ nome: 'Barra da Tijuca', ordem: 1, leads: 44, agendados: 13, ultimo_lead_em: '2026-11-04 12:24:24.536923', atualizado_em: '2026-09-11T18:47:23.317028+00:00' }),
    item({ nome: 'Joá', ordem: 2, leads: 1, agendados: 0, ultimo_lead_em: '2026-08-07 20:52:55.366657' }),
    item({ nome: 'Itanhangá', ordem: 3, leads: 4, agendados: 0, ultimo_lead_em: '2026-10-09 09:36:26.712186' }),
    item({ nome: 'Recreio dos Bandeirantes', ordem: 4, leads: 18, agendados: 5, ultimo_lead_em: '2026-10-02 01:18:44.510812' }),
    item({ nome: 'São Conrado', ordem: 5, leads: 7, agendados: 2, ultimo_lead_em: '2026-10-28 11:45:12.457762' }),
    item({ nome: 'Leblon', ordem: 6, leads: 4, agendados: 2, ultimo_lead_em: '2026-11-01 18:50:30.508269' }),
    item({ nome: 'Alto Leblon', ordem: 7 }),
    item({ nome: 'Jardim Pernambuco Leblon', ordem: 8 }),
    item({ nome: 'Ipanema', ordem: 9, leads: 11, agendados: 4, ultimo_lead_em: '2026-11-02 13:34:27.293947' }),
    item({ nome: 'Copacabana', ordem: 10, leads: 13, agendados: 4, ultimo_lead_em: '2026-10-14 01:42:00.928135' }),
    item({ nome: 'Lagoa', ordem: 11, leads: 7, agendados: 4, ultimo_lead_em: '2026-10-17 23:25:44.407648' }),
    item({ nome: 'Jardim Botânico', ordem: 12, leads: 5, agendados: 2, ultimo_lead_em: '2026-10-19 13:28:27.833251' }),
    item({ nome: 'Gávea', ordem: 13, leads: 3, agendados: 1, ultimo_lead_em: '2026-11-03 14:03:37.786397' }),
    item({ nome: 'Jardim Guanabara', ordem: 14 }),
  ],
  fora_do_foco: [
    { bairro: 'Campo Grande', cidade: 'Rio de Janeiro', leads: 26, agendados: 0, ultimo_em: '2026-10-28 20:56:44.483122', contato_exemplo: 28629 },
    { bairro: 'Tijuca', cidade: 'Rio de Janeiro', leads: 18, agendados: 0, ultimo_em: '2026-10-27 23:40:52.782568', contato_exemplo: 28572 },
    { bairro: 'Recreio', cidade: 'Rio de Janeiro', leads: 15, agendados: 2, ultimo_em: '2026-11-03 23:25:52.47284', contato_exemplo: 28841 },
    { bairro: 'Botafogo', cidade: 'Rio de Janeiro', leads: 12, agendados: 0, ultimo_em: '2026-10-26 23:58:23.897853', contato_exemplo: 28540 },
  ],
  com_bairro: 521,
  no_foco: 117,
  sem_bairro: 712,
};

export const PAINEL_GOIANIA: PainelDoFoco = {
  region: 'goiania',
  nome: 'Goiânia',
  oferece_consultoria: true,
  periodo: { dias: 90, de: '2026-08-07T14:00:00.000Z', ate: '2026-11-05T14:00:00.000Z' },
  itens: [
    item({ nome: 'Setor Marista', ordem: 1, leads: 48, agendados: 25, ultimo_lead_em: '2026-11-02 15:09:44.804661' }),
    item({ nome: 'Setor Bueno', ordem: 2, leads: 65, agendados: 20, ultimo_lead_em: '2026-11-04 13:18:30.654271' }),
    item({ nome: 'Setor Oeste', ordem: 3, leads: 37, agendados: 16, ultimo_lead_em: '2026-11-04 15:17:01.839325' }),
    item({ nome: 'Alto da Glória', ordem: 4, leads: 11, agendados: 4, ultimo_lead_em: '2026-10-24 10:55:21.017266' }),
    item({ nome: 'Setor Sul', ordem: 5, leads: 5, agendados: 3, ultimo_lead_em: '2026-10-22 11:30:53.843834' }),
    item({ nome: 'Jardim Goiás', ordem: 6, leads: 4, agendados: 4, ultimo_lead_em: '2026-10-22 16:23:02.59208' }),
  ],
  fora_do_foco: [
    { bairro: 'Parque Amazônia', cidade: 'Goiânia', leads: 21, agendados: 2, ultimo_em: '2026-11-02 11:03:20.538651', contato_exemplo: 28702 },
    { bairro: 'Jardim América', cidade: 'Goiânia', leads: 11, agendados: 1, ultimo_em: '2026-09-29 02:42:23.292983', contato_exemplo: 27180 },
  ],
  com_bairro: 706,
  no_foco: 249,
  sem_bairro: 1092,
};

export const PRACAS_DO_BANCO = [
  { region: 'goiania', nome: 'Goiânia', oferece_consultoria: true },
  { region: 'rj', nome: 'Rio de Janeiro', oferece_consultoria: true },
  { region: 'sp', nome: 'São Paulo', oferece_consultoria: true },
];

/** bruna_bairros_foco.select('region'): uma linha por item, como as contagens leem. */
export const LINHAS_DA_TABELA = [
  ...PAINEL_GOIANIA.itens.map(() => ({ region: 'goiania' })),
  ...PAINEL_RJ.itens.map(() => ({ region: 'rj' })),
  ...ITENS_SP.map(() => ({ region: 'sp' })),
];

export const PENDENCIAS = [
  {
    desde: '2026-11-05',
    texto: 'A linha ORIENTAÇÕES DO GESTOR (bruna_instrucoes) já sai do banco, mas só entra na mensagem do turno depois que o nó subir.',
    codigo: 'n8n_montar_contexto',
    titulo: 'Subir o nó "Montar contexto v3" ao n8n',
    resolvida: false,
  },
  {
    desde: '2026-11-05',
    texto: 'O copiloto (bruna-copiloto) e a análise semanal (bruna-analise) chamam a API da Anthropic com esse segredo.',
    codigo: 'anthropic_api_key',
    titulo: 'Configurar ANTHROPIC_API_KEY nos segredos do projeto Supabase',
    resolvida: false,
  },
];

export const TESTE_JD_PAULISTANO: ResultadoDoTeste = {
  foco: true, oferece_consultoria: true, nome: 'Jardim Paulistano', tipo: 'bairro',
  como: 'nucleo', alvo: 'jd paulistano', nucleo: 'paulistano', bloqueados: [],
};

export const TESTE_BOSQUE_DA_SAUDE: ResultadoDoTeste = {
  foco: false, oferece_consultoria: true, nome: null, tipo: null,
  como: null, alvo: 'bosque da saude', nucleo: 'bosque da saude',
  bloqueados: [{ nome: 'Saúde', motivo: 'nao_se', termo: 'bosque da saude' }],
};

export const SIMULACAO_BOSQUE_DA_SAUDE: Simulacao = {
  candidatos: 9,
  avaliados: 9,
  parcial: false,
  passam_a_foco: 5,
  deixam_foco: 0,
  trocam_nome: 0,
  mudam: [
    { contato_id: 26412, nome: 'Marina Couto', bairro: 'Bosque da Saúde', cidade: 'São Paulo', criado_em: '2026-09-23 19:40:30.742265', antes: { foco: false, nome: null }, depois: { foco: true, nome: 'Bosque da Saúde' } },
    { contato_id: 26118, nome: 'Ricardo Hasegawa', bairro: 'Bosque da Saude', cidade: 'São Paulo', criado_em: '2026-09-15 10:12:04.118221', antes: { foco: false, nome: null }, depois: { foco: true, nome: 'Bosque da Saúde' } },
    { contato_id: 25960, nome: 'Patrícia Lemos', bairro: 'bosque da saúde', cidade: null, criado_em: '2026-09-09 21:33:47.501876', antes: { foco: false, nome: null }, depois: { foco: true, nome: 'Bosque da Saúde' } },
    { contato_id: 25544, nome: 'Eduardo Fagundes', bairro: 'Bosque da Saúde', cidade: 'São Paulo', criado_em: '2026-08-21 08:47:19.993012', antes: { foco: false, nome: null }, depois: { foco: true, nome: 'Bosque da Saúde' } },
    { contato_id: 24871, nome: null, bairro: 'Bosque da Saúde', cidade: 'São Paulo', criado_em: '2026-07-30 16:05:58.200417', antes: { foco: false, nome: null }, depois: { foco: true, nome: 'Bosque da Saúde' } },
  ],
};

export const SIMULACAO_SEM_EFEITO: Simulacao = { candidatos: 3, avaliados: 3, parcial: false, passam_a_foco: 0, deixam_foco: 0, trocam_nome: 0, mudam: [] };

/**
 * Pôr "Vila" (o nome genérico, por engano) na lista de SP. Em 05/11, 375
 * leads de SP dos últimos 180 dias tinham "vila" como palavra no bairro; o
 * banco confere os 300 mais recentes, e 105 deles passariam a foco (os outros
 * 195 já caíam num item mais comprido, como Vila Mariana). Os bairros abaixo
 * são os mais comuns entre esses 105; os leads aparecem sem nome.
 */
const BAIRROS_COM_VILA: Array<[string, string | null]> = [
  ['Vila Prudente', null], ['Vila Prudente', 'São Paulo'], ['Vila Maria', 'São Paulo'], ['Vila Anastácio', null],
  ['Vila Progredior', null], ['Vila Yara', 'Osasco'], ['Vila Carrão', 'São Paulo'], ['Vila Ema', 'São Paulo'],
  ['Vila Gumercindo', 'São Paulo'], ['Vila Matilde', null], ['Vila dos Remédios', 'São Paulo'], ['Vila Santa Catarina', 'São Paulo'],
];

export const SIMULACAO_VILA: Simulacao = {
  candidatos: 375,
  avaliados: 300,
  parcial: true,
  passam_a_foco: 105,
  deixam_foco: 0,
  trocam_nome: 0,
  // O banco devolve até 100 dos que mudam, os mais recentes primeiro.
  mudam: Array.from({ length: 100 }, (_, i) => {
    const [bairro, cidade] = BAIRROS_COM_VILA[i % BAIRROS_COM_VILA.length];
    return {
      contato_id: 28960 - i * 7,
      nome: null,
      bairro,
      cidade,
      criado_em: new Date(Date.UTC(2026, 10, 5, 3) - i * 25 * 3_600_000).toISOString().replace('T', ' ').replace('Z', ''),
      antes: { foco: false, nome: null },
      depois: { foco: true, nome: 'Vila' },
    };
  }),
};

export const SIMULACAO_REMOVER_VILA_ALPINA: Simulacao = {
  candidatos: 4,
  avaliados: 4,
  parcial: false,
  passam_a_foco: 0,
  deixam_foco: 1,
  trocam_nome: 0,
  mudam: [
    { contato_id: 26990, nome: 'Silvia Arantes', bairro: 'Vila Alpina', cidade: 'Valinhos', criado_em: '2026-08-14 11:02:51.330147', antes: { foco: true, nome: 'Vila Alpina' }, depois: { foco: false, nome: null } },
  ],
};

const GESTOR = 'e5c6a1d2-0b4f-4f1e-9c3a-7d8e9f0a1b2c';

export const HISTORICO_DO_GESTOR: MudancaNoHistorico[] = [
  {
    id: 9014, region: 'sp', tipo: 'bairro', nome: 'Saúde', acao: 'alterado',
    antes: { tipo: 'bairro', nome: 'Saúde', so_se: [], nao_se: NAO_SE_DA_SAUDE.slice(0, 5), ordem: 9, observacao: null },
    depois: { tipo: 'bairro', nome: 'Saúde', so_se: [], nao_se: NAO_SE_DA_SAUDE, ordem: 9, observacao: null },
    motivo: 'Lead que falou de plano de saúde estava virando foco', origem: 'gestor', feito_por: GESTOR,
    feito_por_email: 'bruno@besserhome.com.br', feito_em: '2026-11-05T13:40:22.118+00:00', desfeito_em: null, desfeito_por_email: null,
  },
  {
    id: 9013, region: 'sp', tipo: 'bairro', nome: 'Vila Ida', acao: 'removido',
    antes: { tipo: 'bairro', nome: 'Vila Ida', so_se: [], nao_se: [], ordem: 66, observacao: null },
    depois: null,
    motivo: 'O representante deixou de atender a Vila Ida', origem: 'gestor', feito_por: GESTOR,
    feito_por_email: 'bruno@besserhome.com.br', feito_em: '2026-11-05T13:05:44.020+00:00', desfeito_em: null, desfeito_por_email: null,
  },
  {
    // O desfazer da 9011 também entra no histórico.
    id: 9012, region: 'sp', tipo: 'bairro', nome: 'Bosque da Saúde', acao: 'removido',
    antes: { tipo: 'bairro', nome: 'Bosque da Saúde', so_se: [], nao_se: [], ordem: 10, observacao: 'Pedido frequente; fica colado na Saúde' },
    depois: null,
    motivo: null, origem: 'gestor', feito_por: GESTOR,
    feito_por_email: 'bruno@besserhome.com.br', feito_em: '2026-11-05T12:59:31.540+00:00', desfeito_em: null, desfeito_por_email: null,
  },
  {
    id: 9011, region: 'sp', tipo: 'bairro', nome: 'Bosque da Saúde', acao: 'criado',
    antes: null,
    depois: { tipo: 'bairro', nome: 'Bosque da Saúde', so_se: [], nao_se: [], ordem: 10, observacao: 'Pedido frequente; fica colado na Saúde' },
    motivo: '5 pedidos em 90 dias', origem: 'gestor', feito_por: GESTOR,
    feito_por_email: 'bruno@besserhome.com.br', feito_em: '2026-11-05T12:58:10.402+00:00',
    desfeito_em: '2026-11-05T12:59:31.540+00:00', desfeito_por_email: 'bruno@besserhome.com.br',
  },
];

export const SINCRONIZACAO_VILA_ANDRADE: MudancaNoHistorico = {
  id: 8204, region: 'sp', tipo: 'bairro', nome: 'Vila Andrade', acao: 'criado',
  antes: null,
  depois: { tipo: 'bairro', nome: 'Vila Andrade', so_se: [], nao_se: [], ordem: 62, observacao: null },
  motivo: null, origem: 'sistema', feito_por: null, feito_por_email: null,
  feito_em: '2026-10-08T18:57:10.709329+00:00', desfeito_em: null, desfeito_por_email: null,
};

export const HISTORICO_COM_SINCRONIZACOES: MudancaNoHistorico[] = [...HISTORICO_DO_GESTOR, SINCRONIZACAO_VILA_ANDRADE];
