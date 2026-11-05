// Templates da Meta: a tabela templates (espelho que o sync grava) e as duas
// edge functions, chamadas do mesmo jeito que o painel de atendimento chama
// (src/services/whatsapp.ts: supabase.functions.invoke com o login do usuário).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { db } from '@/gerenciador/lib/db';
import { auditarGestor } from '@/gerenciador/lib/auditoria';
import { createTemplate, syncTemplates, type CreateTemplatePayload } from '@/services/whatsapp';
import { recarregarRegua } from './dados';
import { faltouNaMeta, juntarComE } from './templatesTexto';
import { textoDoStatusDoTemplate } from './textos';

/** Busca na Meta todos os templates da conta e regrava a tabela (sync-templates). */
export function useSincronizarTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncTemplates(),
    onSuccess: async ({ synced, deleted }) => {
      toast.success(`Templates sincronizados com a Meta: ${synced} na conta${deleted ? `, ${deleted} que sumiram de lá saíram daqui` : ''}.`);
      await recarregarRegua(qc);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export type CategoriaDoTemplate = 'MARKETING' | 'UTILITY';

/**
 * O pedido de criação. A create-template no ar (versão 59) lê nome,
 * categoria, idioma, corpo e também `examples`, `footer` e `buttons`, que
 * manda à Meta (ver CREATE_TEMPLATE_MANDA_EXTRAS).
 */
export interface PedidoDeTemplate {
  name: string;
  category: CategoriaDoTemplate;
  language: string;
  body: string;
  /** O exemplo de cada variável, na ordem {{1}}, {{2}}… (vira example.body_text). */
  examples?: string[];
  footer?: string;
  /** Botões de resposta rápida (QUICK_REPLY). */
  buttons?: Array<{ text: string }>;
}

export type PayloadDaCriacao = CreateTemplatePayload & Pick<PedidoDeTemplate, 'examples' | 'footer' | 'buttons'>;

/** O corpo que vai à create-template: os extras só entram quando preenchidos. */
export function payloadDaCriacao(p: PedidoDeTemplate): PayloadDaCriacao {
  const exemplos = (p.examples ?? []).map((e) => e.trim());
  const rodape = p.footer?.trim() ?? '';
  const botoes = (p.buttons ?? []).map((b) => ({ text: b.text.trim() })).filter((b) => b.text);
  return {
    name: p.name,
    category: p.category,
    language: p.language,
    body: p.body,
    ...(exemplos.length ? { examples: exemplos } : {}),
    ...(rodape ? { footer: rodape } : {}),
    ...(botoes.length ? { buttons: botoes } : {}),
  };
}

interface ErroDaMeta {
  error?: { message?: string; error_user_title?: string; error_user_msg?: string };
}

/**
 * A frase de erro da create-template e, quando é outra, a da Meta. A versão
 * 58 traduzia todo código 100 como nome repetido (a Meta usa o 100 para
 * qualquer parâmetro inválido); a 59 já traz a frase certa e o código da Meta
 * entre parênteses, e aí o texto da Meta não se repete.
 */
export function erroDaCriacao(r: { error?: string; details?: unknown } | null | undefined): string {
  const base = r?.error || 'a Meta não aceitou o template';
  const d = (r?.details as ErroDaMeta | undefined)?.error;
  const daMeta = d?.error_user_msg || d?.message;
  return daMeta && !base.includes(daMeta) ? `${base} (Meta: ${daMeta})` : base;
}

export interface TemplateCriado {
  name: string;
  /** O id na Meta, quando ela devolve. */
  metaId: string | null;
  /** O status que a Meta deu na criação (quase sempre PENDING). */
  statusNaCriacao: string;
  /** O status que ficou na tabela depois do sync; null quando o sync não trouxe o template. */
  statusNoBanco: string | null;
  sincronizou: boolean;
  /** O que o pedido levava (exemplo, rodapé, botões) e não está no template que a Meta devolveu. */
  faltouNaMeta: string[];
}

/**
 * Cria o template na Meta (create-template), sincroniza a tabela para ele
 * aparecer, lê o status gravado e confere se o exemplo, o rodapé e os botões
 * chegaram lá. Audita gestor_template_criado.
 */
export function useCriarTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido: PedidoDeTemplate): Promise<TemplateCriado> => {
      const payload = payloadDaCriacao(pedido);
      const r = await createTemplate(payload);
      if (!r?.success) throw new Error(erroDaCriacao(r));
      const statusNaCriacao = r.status || 'PENDING';
      let sincronizou = true;
      try {
        await syncTemplates();
      } catch (e) {
        sincronizou = false;
        console.warn('[régua] sync depois de criar template falhou', e);
      }
      let statusNoBanco: string | null = null;
      let faltou: string[] = [];
      const { data, error } = await db.from('templates').select('status, components').eq('name', pedido.name).maybeSingle();
      if (!error && data) {
        const linha = data as { status: string | null; components: unknown };
        statusNoBanco = linha.status ?? null;
        faltou = faltouNaMeta(payload, linha.components);
      }
      await auditarGestor({
        acao: 'gestor_template_criado',
        entidade: 'templates',
        detalhes: {
          name: pedido.name, category: pedido.category, language: pedido.language,
          meta_id: r.template_id ?? null, status: statusNoBanco ?? statusNaCriacao, corpo: pedido.body.slice(0, 400),
          exemplos: payload.examples ?? [], rodape: payload.footer ?? null, botoes: (payload.buttons ?? []).map((b) => b.text),
          faltou_na_meta: faltou,
        },
      });
      return { name: pedido.name, metaId: r.template_id ?? null, statusNaCriacao, statusNoBanco, sincronizou, faltouNaMeta: faltou };
    },
    onSuccess: async (t) => {
      toast.success(`Template ${t.name} enviado para a Meta. Status: ${textoDoStatusDoTemplate(t.statusNoBanco ?? t.statusNaCriacao)}.`);
      if (t.faltouNaMeta.length) toast.message(`A Meta recebeu ${t.name} sem ${juntarComE(t.faltouNaMeta)}.`);
      if (!t.sincronizou) toast.message('O sync com a Meta falhou agora; clique em "Sincronizar agora" daqui a pouco.');
      await recarregarRegua(qc);
    },
    onError: (e: Error) => toast.error(`Não deu para criar o template: ${e.message}`),
  });
}
