import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity, ArrowLeft, Bot, FlaskConical, LogOut, MapPin, Menu, Moon, Search, Settings2, Sparkles, Sun, Users, Workflow, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import besserTalkLogo from '@/assets/besser-talk-mark.png';
import { rota } from '@/gerenciador/lib/rotas';

/** O painel de atendimento (Besser Talk) é outro app: abre em outra aba. */
export const BESSER_TALK_URL = 'https://bruna-chat-manager.lovable.app';

export interface ItemDeNavegacao {
  para: string;
  rotulo: string;
  Icone: typeof Activity;
  /** Só a rota exata (a visão geral mora na raiz do app). */
  exato?: boolean;
}

const NAVEGACAO: ItemDeNavegacao[] = [
  { para: rota('/'), rotulo: 'Visão geral', Icone: Activity, exato: true },
  { para: rota('/leads'), rotulo: 'Leads', Icone: Search },
  { para: rota('/copiloto'), rotulo: 'Copiloto', Icone: Sparkles },
  { para: rota('/analises'), rotulo: 'Análises', Icone: FlaskConical },
  { para: rota('/regua'), rotulo: 'Régua', Icone: Workflow },
  { para: rota('/bairros'), rotulo: 'Bairros foco', Icone: MapPin },
  { para: rota('/configuracoes'), rotulo: 'Configurações', Icone: Settings2 },
];

function useTema() {
  const [tema, setTema] = useState<'dark' | 'light'>(() => (localStorage.getItem('theme') as 'dark' | 'light') || 'dark');
  const alternar = () => {
    const proximo = tema === 'dark' ? 'light' : 'dark';
    setTema(proximo);
    localStorage.setItem('theme', proximo);
    document.documentElement.classList.toggle('dark', proximo === 'dark');
  };
  return { tema, alternar };
}

function Navegacao({ aoNavegar }: { aoNavegar?: () => void }) {
  return (
    <nav aria-label="Áreas do gerenciador" className="flex flex-col gap-0.5 px-2">
      {NAVEGACAO.map(({ para, rotulo, Icone, exato }) => (
        <NavLink
          key={para}
          to={para}
          end={exato}
          onClick={aoNavegar}
          className={({ isActive }) => cn(
            'relative flex h-9 items-center gap-2.5 rounded-sm px-3 text-[13.5px] transition-colors',
            isActive ? 'bg-accent font-semibold text-foreground' : 'font-medium text-croqui-soft hover:bg-accent/60 hover:text-foreground',
          )}
        >
          {({ isActive }) => (
            <>
              {isActive && <span aria-hidden className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-croqui-red" />}
              <Icone className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
              {rotulo}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

interface ShellProps {
  email: string | null;
  aoSair: () => void;
  children: ReactNode;
}

/**
 * A prancheta do gerenciador: barra lateral com as seis áreas, cabeçalho curto
 * e o conteúdo da área. No celular a barra vira um menu que abre por cima.
 */
export function GerenciadorShell({ email, aoSair, children }: ShellProps) {
  const { tema, alternar } = useTema();
  const [menuAberto, setMenuAberto] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setMenuAberto(false); }, [pathname]);

  const botoesDoTopo = (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-croqui-soft hover:bg-accent" title="Alternar tema" onClick={alternar}>
        {tema === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-croqui-soft hover:bg-accent" title="Sair" onClick={aoSair}>
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Barra lateral (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-14 items-center gap-2 px-4">
          <img src={besserTalkLogo} alt="" aria-hidden className="h-8 w-8 rounded-md object-contain" />
          <div className="min-w-0 leading-tight">
            <span className="block truncate text-[13.5px] font-semibold text-foreground">Gerenciador da Bruna</span>
            <span className="block truncate text-2xs text-croqui-soft">Besser Talk</span>
          </div>
        </div>
        <div className="border-t border-border py-3">
          <Navegacao />
        </div>
        <div className="mt-auto border-t border-border p-3">
          <a href={BESSER_TALK_URL} target="_blank" rel="noopener noreferrer" className="flex h-8 items-center gap-2 rounded-sm px-2 text-[13px] text-croqui-soft hover:bg-accent/60 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Voltar ao painel
          </a>
          <div className="mt-2 flex items-center justify-between gap-2 px-2">
            <span className="truncate text-2xs text-croqui-soft" title={email ?? ''}>{email ?? ''}</span>
            {botoesDoTopo}
          </div>
        </div>
      </aside>

      {/* Cabeçalho (celular) */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-card px-2 lg:hidden">
        <Button variant="ghost" size="icon" className="text-foreground" aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'} onClick={() => setMenuAberto(v => !v)}>
          {menuAberto ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <Bot className="h-4 w-4 text-bot" strokeWidth={1.75} aria-hidden />
        <span className="flex-1 truncate text-[13.5px] font-semibold text-foreground">Gerenciador da Bruna</span>
        {botoesDoTopo}
      </div>
      {menuAberto && (
        <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-label="Menu do gerenciador">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuAberto(false)} />
          <div className="absolute inset-y-0 left-0 top-14 w-72 border-r border-border bg-card py-3">
            <Navegacao aoNavegar={() => setMenuAberto(false)} />
            <div className="mt-3 border-t border-border p-3">
              <a href={BESSER_TALK_URL} target="_blank" rel="noopener noreferrer" className="flex h-8 items-center gap-2 rounded-sm px-2 text-[13px] text-croqui-soft hover:text-foreground">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Voltar ao painel
              </a>
            </div>
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
