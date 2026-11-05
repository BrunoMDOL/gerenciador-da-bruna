import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ARQUITETOS_ROLE } from '@/lib/arquitetos';

export function useUserRoles(userId: string | undefined) {
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      setLoading(true);
      setRoles([]);

      const { data, error } = await supabase.rpc('get_user_roles', { _user_id: userId });
      if (cancelled) return;

      if (error) {
        console.error('[useUserRoles] failed to load roles', error);
        setRoles([]);
        setLoading(false);
        return;
      }

      setRoles(Array.isArray(data) ? (data as string[]) : []);
      setLoading(false);
    };

    void fetchRoles();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    roles,
    loading,
    hasComercial: roles.includes('comercial') || roles.includes('diretoria'),
    hasOperacional: roles.includes('operacional') || roles.includes('diretoria'),
    hasFinanceiro: roles.includes('financeiro') || roles.includes('diretoria'),
    hasAdmin: roles.includes('admin'),
    hasDiretoria: roles.includes('diretoria'),
    // Quem gerencia a Bruna (rota /bruna): espelha public.bruna_gestor_pode.
    hasBrunaGestor: roles.includes('bruna_gestor'),
    canManageBruna: roles.includes('admin') || roles.includes('diretoria') || roles.includes('bruna_gestor'),
    hasTagManager: roles.includes('tag_manager'),
    canManageTags: roles.includes('admin') || roles.includes('tag_manager'),
    // Espelha public.can_access_arquitetos() no banco — admin entra junto
    // porque é quem concede a role.
    canAccessArquitetos: roles.includes(ARQUITETOS_ROLE) || roles.includes('admin'),
  };
}
