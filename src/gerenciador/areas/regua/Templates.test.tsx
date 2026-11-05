/**
 * /regua/templates: a lista com status, filtros e busca; o sync e a
 * criação pelas edge functions (mockadas no mesmo serviço que o painel usa).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Regua from './Regua';
import { CriarTemplate } from './CriarTemplate';
import { criarBanco, type ChamadaAoBanco } from './bancoDeTeste';
import { TEMPLATES } from './dadosDeTeste';
import type { ComponenteDoTemplate } from './tipos';

const { rpc, banco, auditarGestor, toast, whatsapp } = vi.hoisted(() => ({
  rpc: vi.fn(),
  banco: { atual: null as null | ReturnType<typeof import('./bancoDeTeste').criarBanco> },
  auditarGestor: vi.fn(async () => {}),
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
  whatsapp: { syncTemplates: vi.fn(), createTemplate: vi.fn() },
}));

vi.mock('@/gerenciador/lib/db', () => ({
  rpc,
  db: { from: (t: string) => banco.atual!.from(t) },
  periodoDosUltimos: (dias: number) => ({ de: new Date(Date.now() - dias * 86_400_000).toISOString(), ate: new Date().toISOString(), dias }),
  ErroDoBanco: class ErroDoBanco extends Error { constructor(m: string) { super(m); this.name = 'ErroDoBanco'; } },
}));
vi.mock('@/gerenciador/lib/acesso', () => ({
  useGestor: () => ({ user: { id: '7c1e0d2a-4b8f-4e55-9a51-2f0c3d4e5f60', email: 'bruno@besserhome.com.br' }, email: 'bruno@besserhome.com.br', loading: false, pode: true, papeis: ['admin'], signOut: vi.fn() }),
}));
vi.mock('@/gerenciador/lib/auditoria', () => ({ auditarGestor }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/services/whatsapp', () => whatsapp);

function renderizar(url = '/regua/templates') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/regua/*" element={<Regua />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

let lista = TEMPLATES;
/** O template recém-criado como o sync o traz da Meta (status e components). */
const criadoNaMeta: { status: string; components: ComponenteDoTemplate[] } = { status: 'PENDING', components: [] };

function responder(c: ChamadaAoBanco) {
  if (c.tabela === 'templates' && c.filtros.some((f) => f[0] === 'eq' && f[1] === 'name')) return { data: criadoNaMeta };
  if (c.tabela === 'templates') return { data: lista };
  return { data: [] };
}

function renderizarCriacao(extrasNaFuncao: boolean) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CriarTemplate aberto aoFechar={vi.fn()} nomesExistentes={TEMPLATES.map((t) => t.name)} extrasNaFuncao={extrasNaFuncao} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  lista = TEMPLATES;
  criadoNaMeta.status = 'PENDING';
  criadoNaMeta.components = [];
  banco.atual = criarBanco(responder);
  whatsapp.syncTemplates.mockResolvedValue({ synced: 216, deleted: 0 });
  whatsapp.createTemplate.mockResolvedValue({ success: true, template_id: '1187263544112398', status: 'PENDING', message: 'Template criado com sucesso! Aguardando aprovação da Meta.' });
});

const linhasDaTabela = () => within(screen.getByRole('table')).getAllByRole('row').slice(1);

describe('templates', () => {
  it('lista os templates com status, motivo da reprovação e o corpo', async () => {
    renderizar();
    const tabela = await screen.findByRole('table');
    expect(linhasDaTabela()).toHaveLength(8);
    expect(within(tabela).getByText('calc_automacao')).toBeInTheDocument();
    expect(within(tabela).getByText('reprovado')).toBeInTheDocument();
    expect(within(tabela).getByText('motivo: formato inválido')).toBeInTheDocument();
    expect(within(tabela).getAllByText('aprovado')).toHaveLength(7);
    expect(within(tabela).getAllByText('follow-up')).toHaveLength(3);
    expect(within(tabela).getByText(/Com essa única palavra eu já te digo qual película resolve o seu caso/)).toBeInTheDocument();
    // Botões e rodapé aparecem ao abrir o texto todo.
    const vespera = within(tabela).getByText('pv_vespera').closest('tr')!;
    fireEvent.click(within(vespera).getByRole('button', { name: 'ver o texto todo' }));
    expect(within(vespera).getByText(/rodapé: Besser Home · Películas arquitetônicas/)).toBeInTheDocument();
    expect(within(vespera).getByText(/botões: Confirmado, Preciso remarcar/)).toBeInTheDocument();
    // A última sincronização é a do banco (04:25 UTC = 01:25 em Brasília).
    expect(screen.getByText(/Última sincronização/).textContent).toContain('05/11 01:25');
  });

  it('filtra por status, por categoria e pela busca', async () => {
    renderizar();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: /^reprovado 1$/ }));
    await waitFor(() => expect(linhasDaTabela()).toHaveLength(1));
    expect(within(screen.getByRole('table')).getByText('calc_automacao')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Todos 8$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Utilidade' }));
    await waitFor(() => expect(linhasDaTabela()).toHaveLength(1));
    expect(within(screen.getByRole('table')).getByText('pv_vespera')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Todas as categorias' }));
    fireEvent.change(screen.getByLabelText('Buscar template'), { target: { value: 'uma palavra' } });
    await waitFor(() => expect(linhasDaTabela()).toHaveLength(1));
    expect(within(screen.getByRole('table')).getByText('fup90_v2_02_uma_palavra')).toBeInTheDocument();
  });

  it('sincroniza com a Meta pela sync-templates e relê a tabela', async () => {
    renderizar();
    await screen.findByRole('table');
    const leiturasAntes = banco.atual!.doTipo('templates', 'select').length;
    fireEvent.click(screen.getByRole('button', { name: 'Sincronizar agora' }));
    await waitFor(() => expect(whatsapp.syncTemplates).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Templates sincronizados com a Meta: 216 na conta.'));
    await waitFor(() => expect(banco.atual!.doTipo('templates', 'select').length).toBeGreaterThan(leiturasAntes));
  });

  it('cria o template com o payload da create-template, sincroniza, mostra o status e audita', async () => {
    const corpo = 'Oi {{1}}, aqui é a Bruna, da Besser Home. Combinamos de falar hoje sobre a película dos seus vidros. Ainda faz sentido?';
    // A create-template no ar (versão 59) manda o exemplo: o sync traz o corpo com ele.
    criadoNaMeta.components = [{ type: 'BODY', text: corpo, example: { body_text: [['Mariana']] } }];
    renderizar();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Criar template' }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('Nome'), { target: { value: 'Retorno Combinado V3' } });
    expect(within(dialogo).getByLabelText('Nome')).toHaveValue('retorno_combinado_v3');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Utilidade' }));
    fireEvent.change(within(dialogo).getByLabelText('Corpo'), { target: { value: corpo } });
    // Com a função mandando o exemplo, nada de aviso para criar pelo WhatsApp Manager; rodapé e botões aparecem.
    expect(within(dialogo).queryByText(/ainda não manda o exemplo/)).not.toBeInTheDocument();
    expect(within(dialogo).queryByText(/Rodapé e botões ela ainda não envia/)).not.toBeInTheDocument();
    expect(within(dialogo).getByLabelText(/Rodapé/)).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('{{1}}'), { target: { value: 'Mariana' } });
    expect(within(dialogo).getByText(/Oi Mariana, aqui é a Bruna/)).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Enviar para a Meta' }));
    // Rodapé e botões em branco não vão no pedido.
    await waitFor(() => expect(whatsapp.createTemplate).toHaveBeenCalledWith({
      name: 'retorno_combinado_v3', category: 'UTILITY', language: 'pt_BR', body: corpo, examples: ['Mariana'],
    }));
    await waitFor(() => expect(whatsapp.syncTemplates).toHaveBeenCalled());
    expect(await within(dialogo).findByText(/foi enviado para a Meta/)).toBeInTheDocument();
    expect(within(dialogo).getByText('em análise')).toBeInTheDocument();
    // Depois do sync, a tela confere o que a Meta recebeu: veio tudo.
    expect(within(dialogo).queryByText(/A Meta recebeu o template sem/)).not.toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Template retorno_combinado_v3 enviado para a Meta. Status: em análise.');
    expect(toast.message).not.toHaveBeenCalled();
    expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'gestor_template_criado',
      entidade: 'templates',
      detalhes: expect.objectContaining({
        name: 'retorno_combinado_v3', category: 'UTILITY', language: 'pt_BR', meta_id: '1187263544112398', status: 'PENDING',
        exemplos: ['Mariana'], rodape: null, botoes: [], faltou_na_meta: [],
      }),
    }));
  });

  it('se a Meta guardar o template sem o exemplo que o pedido levava, avisa e audita o que faltou', async () => {
    const corpo = 'Oi {{1}}, aqui é a Bruna, da Besser Home. Combinamos de falar hoje sobre a película dos seus vidros. Ainda faz sentido?';
    // O sync traz o corpo sem o exemplo (por exemplo, a função no ar voltou à versão 58).
    criadoNaMeta.components = [{ type: 'BODY', text: corpo }];
    renderizar();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Criar template' }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('Nome'), { target: { value: 'retorno_combinado_v3' } });
    fireEvent.change(within(dialogo).getByLabelText('Corpo'), { target: { value: corpo } });
    fireEvent.change(within(dialogo).getByLabelText('{{1}}'), { target: { value: 'Mariana' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Enviar para a Meta' }));
    expect(await within(dialogo).findByText(/A Meta recebeu o template sem o exemplo das variáveis, e o pedido levava isso/)).toHaveTextContent(
      'A create-template manda isso desde a versão 59: confira se a versão no ar não voltou a uma anterior.',
    );
    expect(toast.message).toHaveBeenCalledWith('A Meta recebeu retorno_combinado_v3 sem o exemplo das variáveis.');
    expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'gestor_template_criado',
      detalhes: expect.objectContaining({ exemplos: ['Mariana'], faltou_na_meta: ['o exemplo das variáveis'] }),
    }));
  });

  it('com a função sem os extras (versão 58), avisa antes e esconde rodapé e botões', async () => {
    renderizarCriacao(false);
    const dialogo = await screen.findByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('Nome'), { target: { value: 'retorno_combinado_v3' } });
    fireEvent.change(within(dialogo).getByLabelText('Corpo'), { target: { value: 'Oi {{1}}, tudo bem?' } });
    expect(within(dialogo).getByText(/ainda não manda o exemplo para a Meta/)).toBeInTheDocument();
    expect(within(dialogo).queryByLabelText(/Rodapé/)).not.toBeInTheDocument();
    expect(within(dialogo).getByText(/Rodapé e botões ela ainda não envia/)).toBeInTheDocument();
  });

  it('pede o exemplo de cada variável antes de mandar', async () => {
    renderizar();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Criar template' }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('Nome'), { target: { value: 'retorno_horario' } });
    fireEvent.change(within(dialogo).getByLabelText('Corpo'), { target: { value: 'Oi {{1}}, combinamos às {{2}}. Ainda vale?' } });
    fireEvent.change(within(dialogo).getByLabelText('{{1}}'), { target: { value: 'Mariana' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Enviar para a Meta' }));
    const problemas = await within(dialogo).findByRole('alert');
    expect(within(problemas).getByText(/Dê um exemplo para \{\{2\}\}/)).toBeInTheDocument();
    expect(whatsapp.createTemplate).not.toHaveBeenCalled();
  });

  it('com a função mandando os extras: rodapé e botões entram na prévia e no pedido', async () => {
    const corpo = 'Oi {{1}}! Aqui é a Bruna, da Besser Home. Lembrei do seu orçamento, que ficou em aberto. Quer que eu retome de onde paramos?';
    criadoNaMeta.components = [
      { type: 'BODY', text: corpo, example: { body_text: [['Mariana']] } },
      { type: 'FOOTER', text: 'Besser Home · Películas arquitetônicas' },
      { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Quero retomar' }, { type: 'QUICK_REPLY', text: 'Ainda estou avaliando' }] },
    ];
    renderizarCriacao(true);
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).queryByText(/ainda não manda o exemplo/)).not.toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Nome'), { target: { value: 'retomada_orcamento_aberto' } });
    fireEvent.change(within(dialogo).getByLabelText('Corpo'), { target: { value: corpo } });
    fireEvent.change(within(dialogo).getByLabelText('{{1}}'), { target: { value: 'Mariana' } });
    fireEvent.change(within(dialogo).getByLabelText(/Rodapé/), { target: { value: 'Besser Home · Películas arquitetônicas' } });

    const adicionar = within(dialogo).getByRole('button', { name: 'Adicionar botão' });
    fireEvent.click(adicionar);
    fireEvent.click(adicionar);
    fireEvent.change(within(dialogo).getByLabelText('Botão 1'), { target: { value: 'Quero retomar' } });
    fireEvent.change(within(dialogo).getByLabelText('Botão 2'), { target: { value: 'Ainda estou avaliando de novo, obrigado' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Enviar para a Meta' }));
    expect(await within(dialogo).findByText('O botão 2 passa de 25 caracteres.')).toBeInTheDocument();
    expect(whatsapp.createTemplate).not.toHaveBeenCalled();

    fireEvent.change(within(dialogo).getByLabelText('Botão 2'), { target: { value: 'Ainda estou avaliando' } });
    fireEvent.click(adicionar);
    expect(adicionar).toBeDisabled();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Tirar o botão 3' }));
    const previa = within(dialogo).getByRole('list', { name: 'Botões na prévia' });
    expect(within(previa).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Quero retomar', 'Ainda estou avaliando']);

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Enviar para a Meta' }));
    await waitFor(() => expect(whatsapp.createTemplate).toHaveBeenCalledWith({
      name: 'retomada_orcamento_aberto', category: 'MARKETING', language: 'pt_BR', body: corpo, examples: ['Mariana'],
      footer: 'Besser Home · Películas arquitetônicas', buttons: [{ text: 'Quero retomar' }, { text: 'Ainda estou avaliando' }],
    }));
    expect(await within(dialogo).findByText(/foi enviado para a Meta/)).toBeInTheDocument();
    expect(within(dialogo).queryByText(/A Meta recebeu o template sem/)).not.toBeInTheDocument();
    expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'gestor_template_criado',
      detalhes: expect.objectContaining({ rodape: 'Besser Home · Películas arquitetônicas', botoes: ['Quero retomar', 'Ainda estou avaliando'], faltou_na_meta: [] }),
    }));
  });

  it('não manda para a Meta corpo com variável com nome nem nome repetido', async () => {
    renderizar();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Criar template' }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('Nome'), { target: { value: 'agendamento' } });
    fireEvent.change(within(dialogo).getByLabelText('Corpo'), { target: { value: 'Olá tudo bem?\n\nAqui é o {{representante}}' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Enviar para a Meta' }));
    const problemas = await within(dialogo).findByRole('alert');
    expect(within(problemas).getByText('Já existe um template com esse nome na conta.')).toBeInTheDocument();
    expect(within(problemas).getByText(/Variável só com número/)).toBeInTheDocument();
    expect(whatsapp.createTemplate).not.toHaveBeenCalled();
  });

  it('mostra o erro da Meta quando a criação falha', async () => {
    whatsapp.createTemplate.mockResolvedValueOnce({
      success: false,
      error: 'Já existe um template com este nome nesta conta',
      details: { error: { code: 100, message: 'Invalid parameter', error_user_msg: 'O corpo tem variáveis sem exemplo.' } },
    });
    renderizar();
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Criar template' }));
    const dialogo = await screen.findByRole('dialog');
    fireEvent.change(within(dialogo).getByLabelText('Nome'), { target: { value: 'teste_variavel' } });
    fireEvent.change(within(dialogo).getByLabelText('Corpo'), { target: { value: 'Oi {{1}}, tudo bem?' } });
    fireEvent.change(within(dialogo).getByLabelText('{{1}}'), { target: { value: 'Mariana' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Enviar para a Meta' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Não deu para criar o template: Já existe um template com este nome nesta conta (Meta: O corpo tem variáveis sem exemplo.)'));
    expect(whatsapp.syncTemplates).not.toHaveBeenCalled();
    expect(auditarGestor).not.toHaveBeenCalled();
  });

  it('mostra o vazio com o caminho do sync', async () => {
    lista = [];
    renderizar();
    expect(await screen.findByText('Nenhum template na tabela')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Sincronizar agora' })[1]);
    await waitFor(() => expect(whatsapp.syncTemplates).toHaveBeenCalled());
  });

  it('mostra o erro do banco', async () => {
    banco.atual = criarBanco(() => ({ error: { message: 'relation "templates" does not exist' } }));
    renderizar();
    expect(await screen.findByText('relation "templates" does not exist')).toBeInTheDocument();
  });
});
