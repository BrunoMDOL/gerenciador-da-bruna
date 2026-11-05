/**
 * O que o gerenciador pede à Meta, pelas edge functions do projeto (com o
 * login de quem está na tela): sincronizar o espelho dos templates e criar um
 * template novo. É o recorte do src/services/whatsapp.ts do Besser Talk que a
 * área Régua › Templates usa; o envio de mensagens fica lá.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Sync templates from Meta API to database
 */
export async function syncTemplates(): Promise<{ synced: number; deleted: number }> {
  console.log('[WhatsApp] Syncing templates from Meta');

  const { data, error } = await supabase.functions.invoke('sync-templates');

  if (error) {
    console.error('[WhatsApp] Error syncing templates:', error);
    throw new Error(`Falha ao sincronizar templates: ${error.message}`);
  }

  if (data?.error) {
    console.error('[WhatsApp] API error:', data.error, data.details);
    throw new Error(data.error);
  }

  console.log('[WhatsApp] Templates synced successfully:', data);
  return { synced: data.synced || 0, deleted: data.deleted || 0 };
}

/**
 * Media header of a template. The image can come from a file picked on the
 * user's device or from a public URL.
 */
export type TemplateHeaderInput =
  | { format: 'IMAGE'; file: { name?: string; mimeType: string; dataBase64: string } }
  | { format: 'IMAGE'; url: string };

/**
 * Create Template Payload
 */
export interface CreateTemplatePayload {
  name: string;
  category: 'MARKETING' | 'UTILITY';
  language: string;
  body: string;
  header?: TemplateHeaderInput | null;
}

/**
 * Create Template Response
 */
export interface CreateTemplateResponse {
  success: boolean;
  template_id?: string;
  status?: string;
  message?: string;
  error?: string;
  details?: unknown;
}

/**
 * Create a new WhatsApp template via Edge Function
 *
 * @param payload - Template creation payload
 * @returns Response with template_id on success or error details
 */
export async function createTemplate(payload: CreateTemplatePayload): Promise<CreateTemplateResponse> {
  console.log('[WhatsApp] Creating template:', payload.name);

  const { data, error } = await supabase.functions.invoke<CreateTemplateResponse>('create-template', {
    body: payload
  });

  if (error) {
    console.error('[WhatsApp] Error creating template:', error);
    throw new Error(`Falha ao criar template: ${error.message}`);
  }

  if (!data) {
    throw new Error('Resposta vazia do servidor');
  }

  console.log('[WhatsApp] Create template response:', data);
  return data;
}
