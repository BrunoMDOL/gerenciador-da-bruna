/**
 * /configuracoes/geral: toda gravação lê o valor do banco agora, mescla
 * a mudança e grava a chave inteira com quem e quando; as pendências trocam só
 * o item. Auditoria gestor_config_alterada com o antes e o depois.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Configuracoes from './Configuracoes';
import { CONFIGS, PENDENCIAS } from './testes/dados';
import { args, criarBancoFalso, falha, ok, tem, type Chamada } from './testes/banco';
import { mesclarValor, trocarPendencia } from './geral/dados';

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

let erro: string | null = null;
/** A RLS recusou em silêncio: o update volta sem erro e sem linha. */
let updateSemLinha = false;
let banco: ReturnType<typeof criarBancoFalso>;
/** O valor "de agora" no banco: outra tela mudou o copiloto depois que esta carregou. */
const COPILOTO_NO_BANCO = { ativo: true, modelo: 'claude-opus-5-5', max_tokens: 8192, temperatura_extra: 'chave que a tela não conhece' };

function montarBanco() {
  banco = criarBancoFalso({
    bruna_gestor_config: (c: Chamada) => {
      if (tem(c, 'update')) return ok(updateSemLinha ? [] : [{ chave: args(c, 'eq')?.[1] }]);
      if (tem(c, 'maybeSingle')) {
        const chave = args(c, 'eq')?.[1];
        if (chave === 'copiloto') return ok({ valor: COPILOTO_NO_BANCO });
        return ok({ valor: CONFIGS.find((x) => x.chave === chave)?.valor });
      }
      return erro ? falha(erro) : ok(CONFIGS);
    },
  });
  estado.from = banco.from;
}

function renderizar(url = '/configuracoes/geral') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/configuracoes/*" element={<Configuracoes />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const scrollOriginal = Element.prototype.scrollIntoView;
beforeEach(() => {
  vi.clearAllMocks();
  erro = null;
  updateSemLinha = false;
  montarBanco();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { Element.prototype.scrollIntoView = scrollOriginal; });

describe('mesclar e trocar a pendência (puro)', () => {
  it('mesclarValor mantém as chaves que a tela não conhece', () => {
    expect(mesclarValor(COPILOTO_NO_BANCO, { modelo: 'claude-haiku-5-5' })).toEqual({ ...COPILOTO_NO_BANCO, modelo: 'claude-haiku-5-5' });
    expect(mesclarValor(null, { ativo: false })).toEqual({ ativo: false });
  });

  it('trocarPendencia devolve a lista inteira com só o item trocado', () => {
    const nova = trocarPendencia(PENDENCIAS, 'anthropic_api_key', true);
    expect(nova).toEqual([PENDENCIAS[0], { ...PENDENCIAS[1], resolvida: true }]);
    expect(() => trocarPendencia(PENDENCIAS, 'nao_existe', true)).toThrow('não está mais na lista');
  });
});

describe('geral', () => {
  it('mostra copiloto, análise, régua e pendências com os valores do banco', async () => {
    renderizar();
    expect(await screen.findByRole('combobox', { name: 'Modelo do copiloto' })).toHaveTextContent('Claude Opus 5.5');
    expect(screen.getByLabelText('Teto por resposta (tokens)')).toHaveValue(8192);
    expect(screen.getByRole('switch', { name: 'Copiloto ligado' })).toBeChecked();
    expect(screen.getByText(/Roda sozinha toda/)).toHaveTextContent('Roda sozinha toda segunda-feira às 06:00, horário de Brasília.');
    expect(screen.getByRole('link', { name: /Mudar a agenda em Análises/ })).toHaveAttribute('href', '/analises');
    expect(screen.getByText('Escada de 24 h').closest('li')).toHaveTextContent('rodando');
    expect(screen.getByRole('link', { name: /Pausar ou retomar em Régua/ })).toHaveAttribute('href', '/regua');
    expect(screen.getByText('2 em aberto de 2')).toBeInTheDocument();
    expect(screen.getByText('Configurar ANTHROPIC_API_KEY nos segredos do projeto Supabase')).toBeInTheDocument();
  });

  it('trocar o modelo do copiloto relê o banco, mescla e grava a chave inteira com quem e quando', async () => {
    renderizar();
    fireEvent.click(await screen.findByRole('combobox', { name: 'Modelo do copiloto' }));
    fireEvent.click(await screen.findByRole('option', { name: /Claude Sonnet 5\.5/ }));

    await waitFor(() => expect(banco.de('bruna_gestor_config', 'update')).toHaveLength(1));
    const [c] = banco.de('bruna_gestor_config', 'update');
    expect(args(c, 'update')?.[0]).toEqual({
      valor: { ...COPILOTO_NO_BANCO, modelo: 'claude-sonnet-5-5' },
      atualizado_em: expect.any(String),
      atualizado_por: 'bruno@besserhome.com.br',
    });
    expect(args(c, 'eq')).toEqual(['chave', 'copiloto']);
    expect(args(c, 'select')).toEqual(['chave']);
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith({
      acao: 'gestor_config_alterada',
      entidade: 'bruna_gestor_config',
      detalhes: { chave: 'copiloto', antes: COPILOTO_NO_BANCO, depois: { ...COPILOTO_NO_BANCO, modelo: 'claude-sonnet-5-5' }, campo: 'modelo' },
    }));
    expect(toast.success).toHaveBeenCalledWith('Modelo do copiloto trocado.');
  });

  it('o teto fora de 1.024–32.000 não grava', async () => {
    renderizar();
    const teto = await screen.findByLabelText('Teto por resposta (tokens)');
    fireEvent.change(teto, { target: { value: '64000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar teto' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Use um número inteiro de 1.024 a 32.000.');
    expect(banco.de('bruna_gestor_config', 'update')).toHaveLength(0);

    fireEvent.change(teto, { target: { value: '16000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar teto' }));
    await waitFor(() => expect(banco.de('bruna_gestor_config', 'update')).toHaveLength(1));
    expect((args(banco.de('bruna_gestor_config', 'update')[0], 'update')?.[0] as { valor: unknown }).valor).toEqual({ ...COPILOTO_NO_BANCO, max_tokens: 16000 });
  });

  it('marcar uma pendência como resolvida troca só aquele item da lista', async () => {
    renderizar();
    fireEvent.click(await screen.findByRole('switch', { name: 'Resolvida: Configurar ANTHROPIC_API_KEY nos segredos do projeto Supabase' }));
    await waitFor(() => expect(banco.de('bruna_gestor_config', 'update')).toHaveLength(1));
    const [c] = banco.de('bruna_gestor_config', 'update');
    expect(args(c, 'update')?.[0]).toEqual({
      valor: [PENDENCIAS[0], { ...PENDENCIAS[1], resolvida: true }],
      atualizado_em: expect.any(String),
      atualizado_por: 'bruno@besserhome.com.br',
    });
    expect(args(c, 'eq')).toEqual(['chave', 'pendencias']);
    await waitFor(() => expect(auditarGestor).toHaveBeenCalledWith(expect.objectContaining({
      acao: 'gestor_config_alterada',
      detalhes: expect.objectContaining({ chave: 'pendencias', codigo: 'anthropic_api_key', resolvida: true }),
    })));
  });

  it('o modelo da análise grava na chave analise sem mexer na agenda', async () => {
    renderizar();
    fireEvent.click(await screen.findByRole('combobox', { name: 'Modelo da análise' }));
    fireEvent.click(await screen.findByRole('option', { name: /Claude Haiku 5\.5/ }));
    await waitFor(() => expect(banco.de('bruna_gestor_config', 'update')).toHaveLength(1));
    const [c] = banco.de('bruna_gestor_config', 'update');
    expect((args(c, 'update')?.[0] as { valor: unknown }).valor).toEqual({ hora: 6, ativa: true, modelo: 'claude-haiku-5-5', dia_semana: 1 });
    expect(args(c, 'eq')).toEqual(['chave', 'analise']);
  });

  it('erro do banco aparece com a mensagem', async () => {
    erro = 'permission denied for table bruna_gestor_config';
    renderizar();
    expect(await screen.findByText('permission denied for table bruna_gestor_config')).toBeInTheDocument();
  });

  it('o seletor de modelo não cita preço: só a ordem, conferida na tabela de modelos', async () => {
    renderizar();
    fireEvent.click(await screen.findByRole('combobox', { name: 'Modelo do copiloto' }));
    expect(await screen.findByRole('option', { name: /Claude Sonnet 5\.5/ })).toHaveTextContent('Claude Sonnet 5.5 · mais barato que o Opus');
    expect(screen.getByRole('option', { name: /Claude Haiku 5\.5/ })).toHaveTextContent('o mais barato');
    for (const o of screen.getAllByRole('option')) expect(o.textContent).not.toMatch(/\d+\s*%|US\$|metade/);
  });

  it('update que não grava linha nenhuma (RLS em silêncio) vira erro e não audita', async () => {
    updateSemLinha = true;
    renderizar();
    fireEvent.click(await screen.findByRole('switch', { name: 'Copiloto ligado' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Nada foi gravado: a linha não existe mais ou você não tem permissão. Recarregue e confira.'));
    expect(auditarGestor).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('erro ao gravar vira toast com a mensagem do banco', async () => {
    renderizar();
    const pendencia = await screen.findByRole('switch', { name: /Resolvida: Subir o nó/ });
    banco = criarBancoFalso({
      bruna_gestor_config: (c: Chamada) => (tem(c, 'update') ? falha('new row violates row-level security policy') : tem(c, 'maybeSingle') ? ok({ valor: PENDENCIAS }) : ok(CONFIGS)),
    });
    estado.from = banco.from;
    fireEvent.click(pendencia);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('new row violates row-level security policy'));
    expect(within(document.body).getByText('2 em aberto de 2')).toBeInTheDocument();
  });
});
