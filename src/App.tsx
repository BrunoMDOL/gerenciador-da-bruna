import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, Suspense, lazy } from "react";

// Rotas carregadas sob demanda (code-splitting): o gerenciador puxa recharts
// e as áreas pesadas, então não deve entrar no bundle da tela de login.
// Após um novo deploy, os chunks antigos deixam de existir no CDN e o
// import dinâmico falha ("error loading dynamically imported module").
// Nesse caso recarregamos a página uma única vez para pegar o index novo.
const lazyWithReload = <T extends { default: React.ComponentType }>(
  factory: () => Promise<T>,
  key: string,
) =>
  lazy(() =>
    factory().catch((err) => {
      const flag = `chunk-reload:${key}`;
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, "1");
        window.location.reload();
        return new Promise<T>(() => {});
      }
      throw err;
    }),
  );

const AuthPage = lazyWithReload(() => import("./pages/AuthPage"), "auth");
// O gerenciador da Bruna (admin, diretoria e bruna_gestor) é o app inteiro:
// mora na raiz, com navegação própria.
const Gerenciador = lazyWithReload(() => import("./gerenciador"), "gerenciador");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
    Carregando...
  </div>
);

const App = () => {
  // Tema do localStorage; escuro por padrão.
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/*" element={<Gerenciador />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
