/**
 * /configuracoes/base: a lista com busca (tsvector + trecho), criar com
 * a chave gerada do título, restaurar uma versão do histórico, responder uma
 * pergunta da fila e os três estados.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Configuracoes from './Configuracoes';
import { DUVIDAS, ENTRADAS, HISTORICO_DA_ENTRADA_14, REGIOES } from './testes/dados';
import { args, criarBancoFalso, falha, ok, tem, type Chamada } from './testes/banco';
import type { EntradaDaBase } from '@/gerenciador/lib/tipos';
import { rota } from '@/gerenciador/lib/rotas';

const { rpc, auditarGestor, toast, estado } = vi.hoisted(() => ({
  rpc: vi.fn(),
  auditarGestor: vi.fn(async () => {}),
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
  estado: { from: ((t: string) => { throw new Error(`banco falso sem ${t}`); }) as (t: string) => unknown },
}));

vi.mock('@/gerenciador/lib/db', () => ({
  rpc,
  db: { from: (t: string) => estado.from(t) },
  ErroDoBanco: class ErroDoBanco extends Error { detalhe?: unknown; constructor(m: string, d?: unknown) { super(m); this.name = 'ErroDoBanco'; this.detalhe = d; } },
}));
vi.mock('@/gerenciador/lib/acesso', () => ({
  useGestor: () => ({
    user: { id: 'e5c6a1d2-0b4f-4f1e-9c3a-7d8e9f0a1b2c', email: 'bruno@besserhome.com.br' },
    email: 'bruno@besserhome.com.br', loading: false, pode: true, papeis: ['admin'], signOut: vi.fn(),
  }),
}));
vi.mock('@/gerenciador/lib/auditoria', () => ({ auditarGestor }));
vi.mock('sonner', () => ({ toast }));

let entradas: EntradaDaBase[] = [];
let erroDaLista: string | null = null;
let erroDasDuvidas: string | null = null;
let erroDasSugestoes: string | null = null;
let banco: ReturnType<typeof criarBancoFalso>;

function montarBanco() {
  banco = criarBancoFalso({
    bruna_conhecimento: (c: Chamada) => {
      if (tem(c, 'insert')) {
        const linha = args(c, 'insert')?.[0] as { chave: string };
        return ok({ id: 60, chave: linha.chave });
      }
      // O update devolve a linha gravada (.select('id')).
      if (tem(c, 'update')) return ok([{ id: args(c, 'eq')?.[1] }]);
      // A busca de texto do banco: o tsvector acha "alcool" na entrada 14.
      if (tem(c, 'textSearch')) return ok([{ id: 14 }]);
      return erroDaLista ? falha(erroDaLista) : ok(entradas);
    },
    bruna_conhecimento_historico: () => ok(HISTORICO_DA_ENTRADA_14),
    bruna_regioes: () => ok(REGIOES),
    bruna_duvidas: (c: Chamada) => {
      if (tem(c, 'update')) return ok(((args(c, 'in')?.[1] ?? []) as number[]).map((id) => ({ id })));
      return erroDasDuvidas ? falha(erroDasDuvidas) : ok(DUVIDAS);
    },
    bruna_sugestoes: () => (erroDasSugestoes ? falha(erroDasSugestoes) : ok([])),
  });
  estado.from = banco.from;
}

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[rota('/configuracoes/base')]}>
        <Routes>
          <Route path={rota('/configuracoes/*')} element={<Configuracoes />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const scrollOriginal = Element.prototype.scrollIntoView;
beforeEach(() => {
  vi.clearAllMocks();
  entradas = ENTRADAS;
  erroDaLista = null;
  erroDasDuvidas = null;
  erroDasSugestoes = null;
  montarBanco();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { Element.prototype.scrollIntoView = scrollOriginal; });

async function escolher(rotulo: string, opcao: string) {
  fireEvent.click(screen.getByRole('combobox', { name: rotulo }));
  fireEvent.click(await screen.findByRole('option', { name: opcao }));
}

describe('base de conhecimento', () => {
  it('lista as ativas com categoria, região, prioridade, confiança e data, e a fila das perguntas sem resposta', async () => {
    renderizar();
    const tabela = await screen.findByRole('table');
    expect(within(tabela).getByRole('button', { name: 'Limpeza e manutenção' })).toBeInTheDocument();
    expect(within(tabela).getByRole('button', { name: 'Pré-cadastro na portaria' })).toBeInTheDocument();
    // A desativada (de propósito) não aparece no filtro padrão.
    expect(within(tabela).queryByRole('button', { name: /Onde a Besser já aplicou em Goiânia/ })).toBeNull();
    expect(within(tabela).getByText('manutenção')).toBeInTheDocument();
    expect(within(tabela).getByText('40')).toBeInTheDocument();
    expect(within(tabela).getByText('14/10/2026')).toBeInTheDocument();
    expect(screen.getByText('2 entradas')).toBeInTheDocument();
    // A fila do dono.
    expect(screen.getByText('Perguntas que a base não respondeu')).toBeInTheDocument();
    expect(screen.getByText(/vantagens e desvantagens das películas para vidro em relação a pássaros/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'lead 27938' })).toHaveAttribute('href', rota('/leads/27938'));
  });

  it('a busca junta o que o tsvector acha com o trecho, sem ligar para acento', async () => {
    renderizar();
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Buscar na base'), { target: { value: 'álcool' } });
    await waitFor(() => expect(banco.de('bruna_conhecimento', 'textSearch')).toHaveLength(1));
    const [c] = banco.de('bruna_conhecimento', 'textSearch');
    expect(args(c, 'textSearch')).toEqual(['busca', 'álcool', { config: 'portuguese', type: 'websearch' }]);
    await waitFor(() => expect(screen.getByText('1 entrada')).toBeInTheDocument());
    expect(within(screen.getByRole('table')).getByRole('button', { name: 'Limpeza e manutenção' })).toBeInTheDocument();
  });

  it('cria uma entrada com a chave gerada do título e as palavras-chave normalizadas, e audita', async () => {
    renderizar();
    await screen.findByRole('table');
    fireEvent.click(screen.getAllByRole('button', { name: 'Nova entrada' })[0]);
    const dialogo = await screen.findByRole('dialog', { name: 'Nova entrada na base' });
    fireEvent.change(within(dialogo).getByLabelText('Título'), { target: { value: 'Garantia da Orion' } });
    expect(within(dialogo).getByText('garantia_da_orion')).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Conteúdo'), { target: { value: 'A linha Orion tem garantia de 10 anos contra descolamento e bolhas.' } });
    await escolher('Categoria', 'atendimento');
    const palavras = within(dialogo).getByLabelText('Palavras-chave');
    fireEvent.change(palavras, { target: { value: 'Garantia Orion' } });
    fireEvent.keyDown(palavras, { key: 'Enter' });
    expect(within(dialogo).getByText('garantia orion')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Criar entrada' }));

    await waitFor(() => expect(banco.de('bruna_conhecimento', 'insert')).toHaveLength(1));
    const [c] = banco.de('bruna_conhecimento', 'insert');
    expect(args(c, 'insert')?.[0]).toEqual({
      titulo: 'Garantia da Orion',
      conteudo: 'A linha Orion tem garantia de 10 anos contra descolamento e bolhas.',
      categoria: 'atendimento',
      region: null,
      palavras_chave: ['garantia orion'],
      prioridade: 100,
      ativo: true,
      fonte: null,
      confianca: 'alta',
      chave: 'garantia_da_orion',
    });
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'gestor_base_criada', entidade: 'bruna_conhecimento', entidadeId: 60,
      detalhes: expect.objectContaining({ chave: 'garantia_da_orion' }),
    })));
  });

  it('não deixa criar com a chave de uma entrada que já existe', async () => {
    renderizar();
    await screen.findByRole('table');
    fireEvent.click(screen.getAllByRole('button', { name: 'Nova entrada' })[0]);
    const dialogo = await screen.findByRole('dialog', { name: 'Nova entrada na base' });
    fireEvent.change(within(dialogo).getByLabelText('Título'), { target: { value: 'Limpeza e Manutenção' } });
    expect(within(dialogo).getByText('já existe: mude o título')).toBeInTheDocument();
    fireEvent.change(within(dialogo).getByLabelText('Conteúdo'), { target: { value: 'texto' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Criar entrada' }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('limpeza_e_manutencao');
    expect(banco.de('bruna_conhecimento', 'insert')).toHaveLength(0);
  });

  it('salvar sem mudar nada não grava, e as palavras-chave com acento que já estavam ficam como estão', async () => {
    entradas = [{ ...ENTRADAS[0], palavras_chave: ['película', 'catálogo', 'limpar'], fonte: 'f'.repeat(571) }, ENTRADAS[1]];
    renderizar();
    fireEvent.click(within(await screen.findByRole('table')).getByRole('button', { name: 'Limpeza e manutenção' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Editar “Limpeza e manutenção”' });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(toast.message).toHaveBeenCalledWith('Nada mudou na entrada.'));
    expect(banco.de('bruna_conhecimento', 'update')).toHaveLength(0);
  });

  it('restaura a versão de antes do histórico com os campos dela, depois de confirmar, e audita', async () => {
    renderizar();
    // A tabela (desktop) e a lista (celular) estão as duas no DOM; o CSS mostra uma.
    fireEvent.click(within(await screen.findByRole('table')).getByRole('button', { name: 'Histórico de “Limpeza e manutenção”' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Histórico de “Limpeza e manutenção”' });
    expect(await within(dialogo).findByText('é a de agora')).toBeInTheDocument();
    expect(within(dialogo).getByText('antes do histórico')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Restaurar esta versão' }));
    const confirmacao = await screen.findByRole('alertdialog');
    expect(confirmacao).toHaveTextContent('volta a ter conteúdo, prioridade');
    fireEvent.click(within(confirmacao).getByRole('button', { name: 'Restaurar' }));

    await waitFor(() => expect(banco.de('bruna_conhecimento', 'update')).toHaveLength(1));
    const [c] = banco.de('bruna_conhecimento', 'update');
    expect(args(c, 'update')?.[0]).toEqual({
      conteudo: 'A película só pode ser limpa depois de 30 dias da aplicação. Depois, pano úmido e só água.',
      prioridade: 50,
    });
    expect(args(c, 'eq')).toEqual(['id', 14]);
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'gestor_base_restaurada', entidadeId: 14,
      detalhes: expect.objectContaining({ historico_id: 7, lado: 'antes', campos: ['conteudo', 'prioridade'] }),
    })));
  });

  it('responder uma pergunta da fila cria a entrada e marca a pergunta com a chave', async () => {
    renderizar();
    await screen.findByRole('table');
    fireEvent.click(screen.getAllByRole('button', { name: 'Responder na base' })[0]);
    const dialogo = await screen.findByRole('dialog', { name: 'Nova entrada na base' });
    expect(within(dialogo).getByText(/Respondendo à pergunta/)).toBeInTheDocument();
    expect((within(dialogo).getByLabelText(/^Fonte/) as HTMLInputElement).value).toBe('pergunta de cliente (lead 27938), 27/10');
    fireEvent.change(within(dialogo).getByLabelText('Título'), { target: { value: 'Película e pássaros' } });
    fireEvent.change(within(dialogo).getByLabelText('Conteúdo'), { target: { value: 'A película não aumenta o risco de colisão de pássaros.' } });
    await escolher('Categoria', 'atendimento');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Criar entrada' }));

    await waitFor(() => expect(banco.de('bruna_duvidas', 'update')).toHaveLength(1));
    const [d] = banco.de('bruna_duvidas', 'update');
    expect(args(d, 'update')?.[0]).toEqual({
      resolvida_em: expect.any(String),
      resposta_dono: 'A película não aumenta o risco de colisão de pássaros.',
      virou_chave: 'pelicula_e_passaros',
    });
    expect(args(d, 'in')).toEqual(['id', [1101]]);
    expect(args(d, 'select')).toEqual(['id']);
    expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({ acao: 'gestor_base_criada', detalhes: expect.objectContaining({ duvidas: [1101] }) }));
  });

  it('"Não é da base" pede confirmação antes de tirar a pergunta da fila, e audita', async () => {
    renderizar();
    await screen.findByRole('table');
    const pergunta = DUVIDAS[0].pergunta;
    fireEvent.click(screen.getByRole('button', { name: `Tirar da fila: ${pergunta}` }));
    let confirmacao = await screen.findByRole('alertdialog');
    expect(confirmacao).toHaveTextContent(`“${pergunta}” (1 vez)`);
    expect(confirmacao).toHaveTextContent('não volta para esta lista');
    // Cancelar não grava nada.
    fireEvent.click(within(confirmacao).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(banco.de('bruna_duvidas', 'update')).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: `Tirar da fila: ${pergunta}` }));
    confirmacao = await screen.findByRole('alertdialog');
    fireEvent.click(within(confirmacao).getByRole('button', { name: 'Tirar da fila' }));
    await waitFor(() => expect(banco.de('bruna_duvidas', 'update')).toHaveLength(1));
    const [d] = banco.de('bruna_duvidas', 'update');
    expect(args(d, 'update')?.[0]).toEqual({ resolvida_em: expect.any(String), resposta_dono: 'descartada no gerenciador: não é assunto da base' });
    expect(args(d, 'in')).toEqual(['id', [1101]]);
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'gestor_base_duvida_descartada', entidade: 'bruna_duvidas', entidadeId: 1101, contatoId: 27938,
      detalhes: expect.objectContaining({ ids: [1101], vezes: 1 }),
    })));
    expect(toast.success).toHaveBeenCalledWith('Pergunta tirada da fila.');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  it('se a fila de perguntas ou as sugestões não carregam, o erro aparece no lugar delas, com o tentar de novo', async () => {
    erroDasDuvidas = 'permission denied for table bruna_duvidas';
    erroDasSugestoes = 'permission denied for table bruna_sugestoes';
    renderizar();
    await screen.findByRole('table');
    const fila = (await screen.findByText('permission denied for table bruna_duvidas')).closest('section')!;
    expect(within(fila).getByRole('heading', { name: 'Perguntas que a base não respondeu' })).toBeInTheDocument();
    const sugestoes = (await screen.findByText('permission denied for table bruna_sugestoes')).closest('section')!;
    expect(within(sugestoes).getByRole('heading', { name: 'Sugestões abertas' })).toBeInTheDocument();

    erroDasDuvidas = null;
    fireEvent.click(within(fila).getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText(/vantagens e desvantagens das películas para vidro/)).toBeInTheDocument();
  });

  it('base vazia diz como começar', async () => {
    entradas = [];
    renderizar();
    expect(await screen.findByText('A base está vazia')).toBeInTheDocument();
  });

  it('erro do banco aparece com a mensagem e o tentar de novo', async () => {
    erroDaLista = 'canceling statement due to statement timeout';
    renderizar();
    expect(await screen.findByText('canceling statement due to statement timeout')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});
