import { descreverAcao, lerAcao } from './acoes';
import { dataHora } from './formatos';
import type { Sugestao } from './tipos';

const NOME_DO_TIPO: Record<Sugestao['tipo'], string> = {
  nucleo: 'núcleo (prompt da Bruna)', instrucao: 'orientação do gestor', base: 'base de conhecimento', regua: 'régua de follow-ups',
  template: 'template da Meta', config: 'configuração', lead: 'um lead específico', outro: 'outro',
};

const ORIGEM: Record<Sugestao['origem'], string> = {
  analise: 'a análise semanal da Bruna', copiloto: 'o copiloto do gerenciador', gestor: 'o gestor',
};

/**
 * O texto que o gestor cola numa sessão do Claude Code (nos repositórios
 * bruna-s-chat-hub e gerenciador-da-bruna) para entender e, se quiser,
 * executar uma sugestão. Tem tudo o que o cartão mostra, mais o contexto que a
 * sessão precisa para achar as coisas: de onde a sugestão veio, onde está
 * gravada e o que se espera como resposta. Quem tem ação automática é
 * aplicada pelo próprio cartão; o prompt serve sobretudo para as manuais, que
 * dependem de investigar n8n, banco ou código.
 */
export function promptDaSugestao(s: Sugestao): string {
  const acao = lerAcao(s.acao);
  const descricaoDaAcao = descreverAcao(s.acao);
  const evidencias = (s.evidencias ?? []).map((ev) => {
    const partes = [
      ev.contato_id ? `lead ${ev.contato_id}` : null,
      ev.trecho ? `“${ev.trecho}”` : null,
      ev.nota ?? null,
    ].filter(Boolean);
    return partes.length ? `- ${partes.join(' · ')}` : null;
  }).filter(Boolean) as string[];

  const origem = `${ORIGEM[s.origem]}${s.analise_id ? ` (análise nº ${s.analise_id})` : ''}`;
  const linhas: string[] = [
    `Contexto: sou o gestor da Bruna, a SDR de WhatsApp da Besser Home (n8n + Supabase, projeto tcluzvtubvctkrnychwy). O Gerenciador da Bruna (repositórios BrunoMDOL/bruna-s-chat-hub, onde ficam o banco, as edge functions e o contexto da Bruna em docs/bruna, e BrunoMDOL/gerenciador-da-bruna, a interface) registrou a sugestão abaixo, feita por ${origem}, em ${dataHora(s.criado_em)}. Ela está gravada em public.bruna_sugestoes, id ${s.id}, status "${s.status}".`,
    '',
    `Sugestão #${s.id}: ${s.titulo}`,
    `Tipo: ${NOME_DO_TIPO[s.tipo]}. Prioridade: ${s.prioridade}.`,
    '',
    'Descrição:',
    s.descricao,
  ];
  if (s.impacto) linhas.push('', `Impacto esperado: ${s.impacto}`);
  if (evidencias.length) linhas.push('', 'Evidências:', ...evidencias);
  if (acao?.tipo === 'manual') {
    linhas.push('', 'Ela não tem aplicação automática. O que foi proposto fazer à mão:', acao.instrucoes || '(sem instruções)');
  } else if (acao) {
    linhas.push('', `Ação automática prevista (formato AcaoSugerida de src/gerenciador/lib/acoes.ts): ${descricaoDaAcao ?? acao.tipo}`, JSON.stringify(acao, null, 2));
  } else {
    linhas.push('', 'Ela não tem ação definida.');
  }
  if (s.status !== 'pendente') {
    linhas.push('', `Decisão já registrada: ${s.status}${s.decidida_por_email ? ` por ${s.decidida_por_email}` : ''}${s.decidida_em ? ` em ${dataHora(s.decidida_em)}` : ''}${s.motivo_decisao ? `. Motivo: ${s.motivo_decisao}` : ''}${s.aplicada_ref ? `. Referência: ${s.aplicada_ref}` : ''}.`);
  }
  linhas.push(
    '',
    'O que eu quero de você:',
    '1. Explique em português simples o que essa sugestão quer dizer e por que importa para o atendimento da Bruna.',
    '2. Confira se ela procede: olhe o banco (só leitura), os workflows do n8n ou o código, conforme o caso, e me diga o que encontrou, com evidência.',
    '3. Diga o que seria preciso fazer, passo a passo, e o risco de cada passo. Não aplique nada sem eu pedir.',
    `4. Quando eu aprovar, faça e depois marque a sugestão ${s.id} como aplicada em bruna_sugestoes (ou me diga para marcar na tela do Gerenciador).`,
  );
  return linhas.join('\n');
}
