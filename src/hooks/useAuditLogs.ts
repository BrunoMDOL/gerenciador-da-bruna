import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

/**
 * Grava uma linha em audit_logs a partir da interface (entrada e saída do
 * login). É o recorte do src/hooks/useAuditLogs.ts do Besser Talk que o
 * gerenciador usa; a leitura dos logs (o hook useAuditLogs) fica lá — aqui,
 * Configurações › Auditoria lê pelo próprio lib/auditoria.
 */
export async function writeAuditLog(input: {
  action: string;
  entity_type?: string | null;
  entity_id?: number | null;
  contato_id?: number | null;
  region?: string | null;
  details?: Json;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('audit_logs').insert({
      actor_user_id: user?.id ?? null,
      actor_email: (user?.email || '').toLowerCase() || null,
      action: input.action,
      entity_type: input.entity_type ?? null,
      entity_id: input.entity_id ?? null,
      contato_id: input.contato_id ?? null,
      region: input.region ?? null,
      details: input.details ?? null,
    });
  } catch (e) {
    console.warn('[audit] write failed', e);
  }
}
