import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { buscarVereditos, type ResultadoEnvio } from '@/services/statusEnvio';
import type { Mensagem } from '@/types/database';

// Uma conversa longa não precisa consultar o status de todas as mensagens: o que
// interessa é o fim do histórico.
const MAX_STATUS_CONSULTADOS = 300;

export function useMessages(contatoId: number | null) {
  const [messages, setMessages] = useState<Mensagem[]>([]);
  // Veredito de entrega indexado por wamid (`mensagens.meta_message_id`).
  const [vereditos, setVereditos] = useState<Record<string, ResultadoEnvio>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Busca o veredito de cada envio. Só existe para mensagens enviadas depois que
   * o webhook de status entrou no ar — antes disso o hub não guardava o wamid,
   * então o passado fica sem status e é assim mesmo.
   */
  const fetchVereditos = async (msgs: Mensagem[]) => {
    const wamids = msgs
      .map((m) => m.meta_message_id)
      .filter((id): id is string => !!id)
      .slice(-MAX_STATUS_CONSULTADOS);

    if (wamids.length === 0) {
      setVereditos({});
      return;
    }

    try {
      setVereditos(Object.fromEntries(await buscarVereditos(wamids)));
    } catch (statusError) {
      // Status é informação extra: a conversa continua legível sem ele.
      console.error('Error fetching message statuses:', statusError);
    }
  };

  const fetchMessages = async () => {
    if (!contatoId) {
      setMessages([]);
      setVereditos({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('mensagens')
        .select('*')
        .eq('contato_id', contatoId)
        // A dica do copiloto mora no painel Playbook, não na conversa.
        .neq('sender_type', 'copiloto')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });

      if (fetchError) throw fetchError;
      const msgs = (data as Mensagem[]) || [];
      setMessages(msgs);
      setError(null);
      await fetchVereditos(msgs);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    if (!contatoId) return;

    // Subscribe to realtime updates for this conversation
    const channel = supabase
      .channel(`mensagens-${contatoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: `contato_id=eq.${contatoId}`,
        },
        (payload) => {
          const newMessage = payload.new as Mensagem;
          if (newMessage.sender_type === 'copiloto') return;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contatoId]);

  return { messages, vereditos, loading, error, refetch: fetchMessages };
}

/**
 * Check if the 24h window is expired for a conversation
 * Returns true if expired (no customer message in last 24h)
 */
export function isWindowExpired(messages: Mensagem[]): boolean {
  // Find the last inbound message from customer
  const lastCustomerMessage = [...messages]
    .reverse()
    .find(
      (msg) => msg.direction === 'inbound' || msg.sender_type === 'customer'
    );

  if (!lastCustomerMessage) {
    // No customer message ever - window is considered expired
    return true;
  }

  const messageTime = new Date(lastCustomerMessage.created_at).getTime();
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  return now - messageTime > twentyFourHours;
}
