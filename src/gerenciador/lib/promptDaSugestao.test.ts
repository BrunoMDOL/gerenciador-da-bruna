import { describe, expect, it } from 'vitest';
import { promptDaSugestao } from './promptDaSugestao';
import type { Sugestao } from './tipos';

const base: Sugestao = {
  id: 2, analise_id: 1, origem: 'analise', tipo: 'outro', titulo: 'Fazer a conferência rodar em todo turno (hoje pula 85%)',
  descricao: 'Investigar no n8n por que 1.578 de 1.861 respostas ficaram com a conferência pulada.',
  impacto: 'Hoje a rede de segurança cobre só 15% dos turnos.', prioridade: 'alta',
  evidencias: [{ nota: 'conferencias: pulado 1578, ok 244' }, { contato_id: 28958, trecho: 'Oi, Esland! Aqui é o Eric', nota: 'erro de identidade' }],
  acao: { tipo: 'manual', instrucoes: '1) No n8n, abrir o passo de conferência. 2) Corrigir.' },
  status: 'pendente', decidida_por_email: null, decidida_em: null, motivo_decisao: null, aplicada_em: null, aplicada_ref: null,
  criado_em: '2026-11-05T18:19:43+00:00',
};

describe('promptDaSugestao', () => {
  it('traz contexto, título, descrição, impacto, evidências e as instruções manuais', () => {
    const p = promptDaSugestao(base);
    expect(p).toContain('Sugestão #2: Fazer a conferência rodar em todo turno');
    expect(p).toContain('a análise semanal da Bruna (análise nº 1)');
    expect(p).toContain('bruna_sugestoes, id 2, status "pendente"');
    expect(p).toContain('Investigar no n8n por que 1.578');
    expect(p).toContain('Impacto esperado: Hoje a rede de segurança');
    expect(p).toContain('- conferencias: pulado 1578, ok 244');
    expect(p).toContain('- lead 28958 · “Oi, Esland! Aqui é o Eric” · erro de identidade');
    expect(p).toContain('não tem aplicação automática');
    expect(p).toContain('1) No n8n, abrir o passo de conferência.');
    expect(p).toContain('Não aplique nada sem eu pedir');
    expect(p).toContain('marque a sugestão 2 como aplicada');
  });

  it('com ação automática, inclui a descrição e o JSON da ação', () => {
    const p = promptDaSugestao({ ...base, id: 8, tipo: 'config', acao: { tipo: 'bairro_foco_salvar', region: 'sp', tipo_item: 'bairro', nome: 'Itaim', nao_se: ['itaim paulista'] } });
    expect(p).toContain('Ação automática prevista');
    expect(p).toContain('"tipo": "bairro_foco_salvar"');
    expect(p).toContain('"nome": "Itaim"');
  });

  it('registra a decisão quando a sugestão já foi decidida', () => {
    const p = promptDaSugestao({ ...base, status: 'rejeitada', decidida_por_email: 'bruno@besserhome.com.br', decidida_em: '2026-11-06T12:00:00+00:00', motivo_decisao: 'falso positivo' });
    expect(p).toContain('Decisão já registrada: rejeitada por bruno@besserhome.com.br');
    expect(p).toContain('Motivo: falso positivo');
  });
});
