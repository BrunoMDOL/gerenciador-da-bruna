/**
 * /configuracoes/instrucoes: a lista com filtros, o aviso do nó,
 * criar (insert com origem gestor e quem criou), editar só o que mudou,
 * desativar e o histórico. Cada escrita audita.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Configuracoes from './Configuracoes';
import { CONFIGS, CONTATO_26634, GESTOR, HISTORICO_DA_INSTRUCAO_2, INSTRUCOES } from './testes/dados';
import { args, criarBancoFalso, falha, ok, tem, type Chamada } from './testes/banco';
import type { Instrucao } from '@/gerenciador/lib/tipos';
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

let instrucoes: Instrucao[] = [];
let erroDaLista: string | null = null;
/** A RLS recusou em silêncio: o update volta sem erro e sem linha. */
let updateSemLinha = false;
let banco: ReturnType<typeof criarBancoFalso>;

function montarBanco() {
  banco = criarBancoFalso({
    bruna_instrucoes: (c: Chamada) => {
      if (tem(c, 'insert')) return ok({ id: 5 });
      if (tem(c, 'update')) return ok(updateSemLinha ? [] : [{ id: args(c, 'eq')?.[1] }]);
      return erroDaLista ? falha(erroDaLista) : ok(instrucoes);
    },
    bruna_instrucoes_historico: () => ok(HISTORICO_DA_INSTRUCAO_2),
    contatos: () => ok([CONTATO_26634]),
    bruna_gestor_config: () => ok(CONFIGS),
    bruna_sugestoes: () => ok([]),
  });
  estado.from = banco.from;
}

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[rota('/configuracoes/instrucoes')]}>
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
  instrucoes = INSTRUCOES;
  erroDaLista = null;
  updateSemLinha = false;
  montarBanco();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { Element.prototype.scrollIntoView = scrollOriginal; });

describe('orientações', () => {
  it('lista as ativas com escopo, região, lead (com link), turnos, vigência e quem criou; avisa do nó', async () => {
    renderizar();
    expect(await screen.findByRole('heading', { name: 'Vila Andrade é bairro foco em SP' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Não oferecer consultoria até ele mandar a foto' })).toBeInTheDocument();
    // A desativada não aparece no filtro padrão (ativas).
    expect(screen.queryByRole('heading', { name: 'Sem emoji no primeiro contato' })).toBeNull();
    expect(screen.getByText('SP · São Paulo')).toBeInTheDocument();
    const lead = await screen.findByText('Lead 26634 · Reinaldo Staliano-DTAADV');
    expect(lead.closest('a')).toHaveAttribute('href', rota('/leads/26634'));
    expect(screen.getByText('vale em todos os turnos')).toBeInTheDocument();
    expect(screen.getByText('vale só na conversa')).toBeInTheDocument();
    expect(screen.getAllByText(/criada por bruno@besserhome\.com\.br/)).toHaveLength(2);
    expect(screen.getByText(/até 12\/11 18:00/)).toBeInTheDocument();
    // O aviso fixo, vindo da pendência n8n_montar_contexto.
    expect(await screen.findByText(/só entra na conversa depois que o nó “Montar contexto v3” subir ao n8n/)).toBeInTheDocument();
  });

  it('cria uma orientação global com origem gestor, quem criou e os três turnos, e audita', async () => {
    renderizar();
    await screen.findByRole('heading', { name: 'Vila Andrade é bairro foco em SP' });
    fireEvent.click(screen.getByRole('button', { name: 'Nova orientação' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nova orientação' });
    fireEvent.change(within(dialogo).getByLabelText('Título'), { target: { value: 'Responder todas as perguntas antes de perguntar' } });
    fireEvent.change(within(dialogo).getByLabelText('O que a Bruna deve fazer'), { target: { value: 'Quando o cliente fizer duas perguntas, responda as duas antes de qualquer pergunta sua.' } });
    expect(within(dialogo).getByText('47/120')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Criar orientação' }));

    await waitFor(() => expect(banco.de('bruna_instrucoes', 'insert')).toHaveLength(1));
    const [c] = banco.de('bruna_instrucoes', 'insert');
    expect(args(c, 'insert')?.[0]).toEqual({
      escopo: 'global',
      region: null,
      contato_id: null,
      titulo: 'Responder todas as perguntas antes de perguntar',
      texto: 'Quando o cliente fizer duas perguntas, responda as duas antes de qualquer pergunta sua.',
      aplica_em: ['conversa', 'toque', 'retorno'],
      prioridade: 100,
      vigencia_fim: null,
      origem: 'gestor',
      criado_por: GESTOR.id,
      criado_por_email: GESTOR.email,
    });
    expect(args(c, 'select')).toEqual(['id']);
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'gestor_instrucao_criada', entidade: 'bruna_instrucoes', entidadeId: 5,
      detalhes: expect.objectContaining({ escopo: 'global', titulo: 'Responder todas as perguntas antes de perguntar' }),
    })));
    expect(toast.success).toHaveBeenCalledWith('Orientação criada. Ela entra na conversa quando o nó do n8n subir.');
  });

  it('orientação por região exige a região', async () => {
    renderizar();
    await screen.findByRole('heading', { name: 'Vila Andrade é bairro foco em SP' });
    fireEvent.click(screen.getByRole('button', { name: 'Nova orientação' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nova orientação' });
    fireEvent.click(within(dialogo).getByLabelText('Uma região'));
    fireEvent.change(within(dialogo).getByLabelText('Título'), { target: { value: 'Grade de sábado' } });
    fireEvent.change(within(dialogo).getByLabelText('O que a Bruna deve fazer'), { target: { value: 'Não ofereça sábado.' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Criar orientação' }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Escolha a região.');
    expect(banco.de('bruna_instrucoes', 'insert')).toHaveLength(0);
  });

  it('editar grava só o que mudou e audita como alterada', async () => {
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar “Vila Andrade é bairro foco em SP”' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Editar orientação' });
    fireEvent.change(within(dialogo).getByLabelText('O que a Bruna deve fazer'), { target: { value: 'Vila Andrade tem consultoria: ofereça a visita.' } });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(banco.de('bruna_instrucoes', 'update')).toHaveLength(1));
    const [c] = banco.de('bruna_instrucoes', 'update');
    expect(args(c, 'update')?.[0]).toEqual({ texto: 'Vila Andrade tem consultoria: ofereça a visita.' });
    expect(args(c, 'eq')).toEqual(['id', 3]);
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'gestor_instrucao_alterada', entidadeId: 3, detalhes: expect.objectContaining({ campos: ['texto'] }),
    })));
  });

  it('desativar grava ativa false e audita', async () => {
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: 'Desativar “Vila Andrade é bairro foco em SP”' }));
    await waitFor(() => expect(banco.de('bruna_instrucoes', 'update')).toHaveLength(1));
    const [c] = banco.de('bruna_instrucoes', 'update');
    expect(args(c, 'update')?.[0]).toEqual({ ativa: false });
    expect(args(c, 'eq')).toEqual(['id', 3]);
    // O select depois do update é o que mostra se a linha foi gravada.
    expect(args(c, 'select')).toEqual(['id']);
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({ acao: 'gestor_instrucao_desativada', entidadeId: 3 })));
    expect(toast.success).toHaveBeenCalledWith('Orientação desativada. A Bruna deixa de ler.');
  });

  it('update que não grava linha nenhuma (RLS em silêncio) vira erro, não audita e recarrega a lista', async () => {
    updateSemLinha = true;
    renderizar();
    fireEvent.click(await screen.findByRole('button', { name: 'Desativar “Vila Andrade é bairro foco em SP”' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Nada foi gravado: a linha não existe mais ou você não tem permissão. Recarregue e confira.'));
    expect(toast.success).not.toHaveBeenCalled();
    expect(auditarGestor).not.toHaveBeenCalled();
    // A lista é lida de novo (a primeira leitura, mais a de depois do erro).
    await waitFor(() => expect(banco.chamadas.filter((c) => c.tabela === 'bruna_instrucoes' && !tem(c, 'update'))).toHaveLength(2));
  });

  it('o histórico mostra quem mudou o quê', async () => {
    renderizar();
    await screen.findByRole('heading', { name: 'Vila Andrade é bairro foco em SP' });
    fireEvent.click(screen.getByRole('button', { name: 'Desativadas' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Histórico de “Sem emoji no primeiro contato”' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Histórico de “Sem emoji no primeiro contato”' });
    expect(await within(dialogo).findByText('alterada')).toBeInTheDocument();
    expect(within(dialogo).getByText('criada')).toBeInTheDocument();
    expect(within(dialogo).getByText('sim')).toHaveClass('line-through');
    expect(within(dialogo).getByText('não')).toBeInTheDocument();
    expect(banco.de('bruna_instrucoes_historico').length).toBe(1);
  });

  it('sem nenhuma orientação, diz o que fazer', async () => {
    instrucoes = [];
    renderizar();
    expect(await screen.findByText('Nenhuma orientação escrita ainda')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Nova orientação' }).length).toBeGreaterThan(0);
  });

  it('erro do banco aparece com a mensagem', async () => {
    erroDaLista = 'permission denied for table bruna_instrucoes';
    renderizar();
    expect(await screen.findByText('permission denied for table bruna_instrucoes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });
});
