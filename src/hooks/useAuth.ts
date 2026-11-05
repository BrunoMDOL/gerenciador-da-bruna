import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { writeAuditLog } from './useAuditLogs';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (event === 'SIGNED_IN') {
          // Defer to avoid recursion in onAuthStateChange
          setTimeout(() => { writeAuditLog({ action: 'auth_login', entity_type: 'auth' }); }, 0);
        } else if (event === 'SIGNED_OUT') {
          // Already signed out, can't write — handled in signOut() before the call
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  // Sem cadastro aqui: quem entra no gerenciador já tem login no Besser Talk.

  const signOut = async () => {
    // Log BEFORE signing out (so JWT is still valid)
    try { await writeAuditLog({ action: 'auth_logout', entity_type: 'auth' }); } catch { /* sem registro, mas a saída segue */ }
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signIn,
    signOut,
  };
}
