import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BESSER_TALK_URL, GerenciadorShell } from './layout/GerenciadorShell';
import { useGestor } from './lib/acesso';
import { Vazio } from './componentes';
import { rota, traduzirCaminho } from '@/gerenciador/lib/rotas';

// Cada área carrega sob demanda: só uma aparece por vez.
const VisaoGeral = lazy(() => import('./areas/visao-geral/VisaoGeral'));
const Leads = lazy(() => import('./areas/leads/Leads'));
const Copiloto = lazy(() => import('./areas/copiloto/Copiloto'));
const Analises = lazy(() => import('./areas/analises/Analises'));
const Regua = lazy(() => import('./areas/regua/Regua'));
const Bairros = lazy(() => import('./areas/bairros/Bairros'));
const Configuracoes = lazy(() => import('./areas/configuracoes/Configuracoes'));

/** /bruna/leads/1?x=y (como o Besser Talk escrevia) vira o endereço de hoje, com a busca e a âncora. */
function RedirecionarLegado() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={traduzirCaminho(pathname) + search + hash} replace />;
}

const Espera = () => (
  <div className="flex h-[60vh] items-center justify-center" role="status">
    <Loader2 className="h-6 w-6 animate-spin text-croqui-soft" />
  </div>
);

/**
 * O gerenciador da Bruna, na raiz do app. Entra quem é admin, diretoria ou
 * bruna_gestor; quem não é vê o aviso e o caminho de volta ao Besser Talk.
 */
export default function GerenciadorPage() {
  const { user, loading, pode, email, signOut } = useGestor();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth?redirect=' + encodeURIComponent(location.pathname + location.search), { replace: true });
    }
  }, [user, loading, navigate, location.pathname, location.search]);

  if (loading || !user) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const sair = async () => { await signOut(); navigate('/auth'); };

  if (!pode) {
    return (
      <GerenciadorShell email={email} aoSair={sair}>
        <Vazio
          Icone={ShieldOff}
          titulo="O gerenciador é de quem cuida da Bruna"
          descricao="Peça a um admin o papel bruna_gestor para o seu login. Até lá, o painel de atendimento continua disponível."
          acao={<Button variant="outline" asChild><a href={BESSER_TALK_URL} target="_blank" rel="noopener noreferrer">Voltar ao painel</a></Button>}
          className="h-[70vh]"
        />
      </GerenciadorShell>
    );
  }

  return (
    <GerenciadorShell email={email} aoSair={sair}>
      <Suspense fallback={<Espera />}>
        <Routes>
          <Route index element={<VisaoGeral />} />
          <Route path="leads" element={<Leads />} />
          <Route path="leads/:contatoId" element={<Leads />} />
          <Route path="copiloto" element={<Copiloto />} />
          <Route path="copiloto/:sessaoId" element={<Copiloto />} />
          <Route path="analises" element={<Analises />} />
          <Route path="analises/:analiseId" element={<Analises />} />
          <Route path="regua/*" element={<Regua />} />
          <Route path="bairros" element={<Bairros />} />
          <Route path="configuracoes/*" element={<Configuracoes />} />
          {/* Endereço guardado do Besser Talk (/bruna/leads/1): leva ao mesmo lugar aqui. */}
          <Route path="bruna/*" element={<RedirecionarLegado />} />
          <Route path="*" element={<Navigate to={rota('/')} replace />} />
        </Routes>
      </Suspense>
    </GerenciadorShell>
  );
}
