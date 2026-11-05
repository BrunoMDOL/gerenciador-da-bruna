import { describe, it, expect } from 'vitest';
import { rotaDeLeads, rotaDoAlerta, rotaDoCopiloto, rotaDoLead } from './rotas';

describe('rotas da visão geral', () => {
  it('leva cada alerta de bruna_gestor_alertas para onde ele se resolve', () => {
    expect(rotaDoAlerta({ chave: 'agenda_rj' })).toBe('/configuracoes/regioes');
    expect(rotaDoAlerta({ chave: 'fila_fup90' })).toBe('/regua/fup90');
    expect(rotaDoAlerta({ chave: 'fup90_inativa' })).toBe('/regua/fup90');
    expect(rotaDoAlerta({ chave: 'regua_pausada' })).toBe('/regua');
    expect(rotaDoAlerta({ chave: 'templates_reprovados' })).toBe('/regua');
    expect(rotaDoAlerta({ chave: 'revisoes_pendentes' })).toBe('/leads?filtro=com_revisao');
    expect(rotaDoAlerta({ chave: 'chamados_com_erro' })).toBe('/leads?filtro=com_chamado');
    expect(rotaDoAlerta({ chave: 'retornos_falhando' })).toBe('/leads?filtro=retorno_pendente');
    expect(rotaDoAlerta({ chave: 'encaminhamentos_com_erro' })).toBe('/leads');
    expect(rotaDoAlerta({ chave: 'duvidas_sem_resposta' })).toBe('/configuracoes/base');
    expect(rotaDoAlerta({ chave: 'sugestoes_pendentes' })).toBe('/analises');
  });

  it('um alerta de lead abre o lead; um alerta desconhecido cai em Leads', () => {
    expect(rotaDoAlerta({ chave: 'lead_26634' })).toBe('/leads/26634');
    expect(rotaDoAlerta({ chave: 'coisa_nova' })).toBe('/leads');
    expect(rotaDoAlerta({ chave: '' })).toBe('/leads');
  });

  it('monta os filtros de leads, o lead e a pergunta do copiloto', () => {
    expect(rotaDeLeads()).toBe('/leads');
    expect(rotaDeLeads({ filtro: 'agendados' })).toBe('/leads?filtro=agendados');
    expect(rotaDeLeads({ region: 'goiania' })).toBe('/leads?region=goiania');
    expect(rotaDoLead(26634)).toBe('/leads/26634');
    expect(rotaDoCopiloto('O que a Bruna mais errou esta semana?')).toBe('/copiloto?pergunta=O+que+a+Bruna+mais+errou+esta+semana%3F');
  });
});
