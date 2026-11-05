import { describe, it, expect } from 'vitest';
import { rotaDeLeads, rotaDoAlerta, rotaDoCopiloto, rotaDoLead } from './rotas';
import { rota } from '@/gerenciador/lib/rotas';

describe('rotas da visão geral', () => {
  it('leva cada alerta de bruna_gestor_alertas para onde ele se resolve', () => {
    expect(rotaDoAlerta({ chave: 'agenda_rj' })).toBe(rota('/configuracoes/regioes'));
    expect(rotaDoAlerta({ chave: 'fila_fup90' })).toBe(rota('/regua/fup90'));
    expect(rotaDoAlerta({ chave: 'fup90_inativa' })).toBe(rota('/regua/fup90'));
    expect(rotaDoAlerta({ chave: 'regua_pausada' })).toBe(rota('/regua'));
    expect(rotaDoAlerta({ chave: 'templates_reprovados' })).toBe(rota('/regua'));
    expect(rotaDoAlerta({ chave: 'revisoes_pendentes' })).toBe(rota('/leads?filtro=com_revisao'));
    expect(rotaDoAlerta({ chave: 'chamados_com_erro' })).toBe(rota('/leads?filtro=com_chamado'));
    expect(rotaDoAlerta({ chave: 'retornos_falhando' })).toBe(rota('/leads?filtro=retorno_pendente'));
    expect(rotaDoAlerta({ chave: 'encaminhamentos_com_erro' })).toBe(rota('/leads'));
    expect(rotaDoAlerta({ chave: 'duvidas_sem_resposta' })).toBe(rota('/configuracoes/base'));
    expect(rotaDoAlerta({ chave: 'sugestoes_pendentes' })).toBe(rota('/analises'));
  });

  it('um alerta de lead abre o lead; um alerta desconhecido cai em Leads', () => {
    expect(rotaDoAlerta({ chave: 'lead_26634' })).toBe(rota('/leads/26634'));
    expect(rotaDoAlerta({ chave: 'coisa_nova' })).toBe(rota('/leads'));
    expect(rotaDoAlerta({ chave: '' })).toBe(rota('/leads'));
  });

  it('monta os filtros de leads, o lead e a pergunta do copiloto', () => {
    expect(rotaDeLeads()).toBe(rota('/leads'));
    expect(rotaDeLeads({ filtro: 'agendados' })).toBe(rota('/leads?filtro=agendados'));
    expect(rotaDeLeads({ region: 'goiania' })).toBe(rota('/leads?region=goiania'));
    expect(rotaDoLead(26634)).toBe(rota('/leads/26634'));
    expect(rotaDoCopiloto('O que a Bruna mais errou esta semana?')).toBe(rota('/copiloto?pergunta=O+que+a+Bruna+mais+errou+esta+semana%3F'));
  });
});
