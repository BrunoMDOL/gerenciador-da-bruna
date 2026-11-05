import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';

/**
 * Quem entra no gerenciador da Bruna: admin, diretoria e o papel bruna_gestor
 * (espelho de public.bruna_gestor_pode no banco). O e-mail do dono entra como
 * no Dashboard, que o trata como admin antes mesmo do papel carregar.
 */
export function useGestor() {
  const { user, loading, signOut } = useAuth();
  const papeis = useUserRoles(user?.id);
  const email = user?.email?.toLowerCase() ?? null;
  const pode = Boolean(user) && (
    papeis.hasAdmin || papeis.hasDiretoria || papeis.hasBrunaGestor || email === 'bruno@besserhome.com.br'
  );
  return {
    user,
    email,
    loading: loading || papeis.loading,
    pode,
    papeis: papeis.roles,
    signOut,
  };
}
