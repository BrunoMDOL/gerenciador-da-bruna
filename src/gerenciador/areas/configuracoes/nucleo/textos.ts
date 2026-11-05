import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, CircleDot, CircleSlash, PencilLine } from 'lucide-react';
import type { TomDaPilula } from '@/gerenciador/componentes';
import type { PromptVersao } from '@/gerenciador/lib/tipos';
import { ROTAS } from '../rotas';
import { lerSecoes, secaoDaLinha } from './secoes';
import { blocosComContexto, diffDeLinhas, diffEmTexto } from './diff';

export const ESTADO_DA_VERSAO: Record<PromptVersao['status'], { rotulo: string; tom: TomDaPilula; Icone: LucideIcon; descricao: string }> = {
  rascunho: { rotulo: 'rascunho', tom: 'alerta', Icone: PencilLine, descricao: 'proposta ainda não aprovada' },
  aprovada: { rotulo: 'aprovada', tom: 'tinta', Icone: CheckCircle2, descricao: 'aprovada, ainda não está no ar' },
  publicada: { rotulo: 'publicada', tom: 'ok', Icone: CircleDot, descricao: 'marcada como no ar' },
  descartada: { rotulo: 'descartada', tom: 'suave', Icone: CircleSlash, descricao: 'fora de uso' },
};

export const ORIGEM_DA_VERSAO: Record<PromptVersao['origem'], string> = {
  repo: 'repositório',
  gestor: 'gestor',
  copiloto: 'copiloto',
  analise: 'análise',
  reversao: 'reversão',
};

/**
 * O pedido de revisão para o copiloto. Ele só lê o núcleo publicado
 * (nucleo_secoes, nucleo_trecho), então a pergunta leva o diff junto.
 */
export function perguntaDeRevisao(
  versao: { numero: number; nota: string | null; status: string },
  conteudo: string,
  base: { numero: number; conteudo: string } | null,
): string {
  const cabeca = `Revise a versão ${versao.numero} do núcleo da Bruna (${versao.status}${versao.nota ? `; nota: “${versao.nota}”` : ''}).`;
  if (!base || base.conteudo === conteudo) {
    return `${cabeca} Leia as seções com nucleo_secoes e nucleo_trecho e me diga: que regras se contradizem, que trechos estão confusos ou longos demais para a Bruna seguir, e o que você simplificaria. Cite as seções.`;
  }
  const diff = diffDeLinhas(base.conteudo, conteudo);
  const blocos = blocosComContexto(diff.linhas, 2);
  const secoes = lerSecoes(conteudo);
  const tocadas = new Set<string>();
  for (const l of diff.linhas) {
    if (l.tipo === 'igual') continue;
    const linha = l.b ?? l.a ?? 1;
    const s = secaoDaLinha(secoes, linha);
    if (s) tocadas.add(s.titulo);
  }
  const { texto, cortado } = diffEmTexto(blocos, 12_000);
  return [
    `${cabeca} Ela parte da versão ${base.numero} e muda ${diff.adicionadas} linha(s) que entram e ${diff.removidas} que saem${tocadas.size ? `, nas seções: ${[...tocadas].join('; ')}` : ''}.`,
    'O diff abaixo marca com "- " o que sai e com "+ " o que entra:',
    '',
    texto,
    cortado ? '\n(diff cortado; o resto está em Configurações › Núcleo)' : '',
    '',
    'Use nucleo_trecho para ler as seções publicadas em volta e me diga: o que melhora no atendimento, o que pode piorar, se a mudança briga com outra regra do núcleo e o que você ajustaria antes de publicar.',
  ].join('\n').trim();
}

export function rotaDaRevisao(pergunta: string): string {
  return `${ROTAS.copiloto}?pergunta=${encodeURIComponent(pergunta)}`;
}

/** Quanto mudou em caracteres: "+120", "−34", "igual". */
export function variacaoDeTamanho(antes: number, depois: number): string {
  const d = depois - antes;
  if (!d) return 'mesmo tamanho';
  return `${d > 0 ? '+' : '−'}${Math.abs(d).toLocaleString('pt-BR')} caracteres`;
}
