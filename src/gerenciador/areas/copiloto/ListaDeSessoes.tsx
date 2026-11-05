import { Link } from 'react-router-dom';
import { Loader2, MessageSquare, Plus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Cota } from '@/components/croqui/Cota';
import { cn } from '@/lib/utils';
import { Erro, Esqueleto, Vazio } from '@/gerenciador/componentes';
import { nomeCurto, relativo } from '@/gerenciador/lib/formatos';
import type { CopilotoSessao } from '@/gerenciador/lib/tipos';
import type { ContatoCurto } from './lib/consultas';
import { rota } from '@/gerenciador/lib/rotas';

interface ListaDeSessoesProps {
  sessoes: CopilotoSessao[] | undefined;
  carregando: boolean;
  erro: Error | null;
  tentar: () => void;
  contatos: Record<number, ContatoCurto>;
  sessaoAtiva: number | null;
  /** A sessão em que o copiloto está respondendo agora. */
  sessaoEmAndamento: number | null;
  aoNovaConversa: () => void;
  /** Ao escolher uma conversa (no celular, troca para a tela do chat). */
  aoEscolher: () => void;
  className?: string;
}

/** A coluna da esquerda: as conversas do gestor, da mais recente para a mais antiga. */
export function ListaDeSessoes({
  sessoes, carregando, erro, tentar, contatos, sessaoAtiva, sessaoEmAndamento, aoNovaConversa, aoEscolher, className,
}: ListaDeSessoesProps) {
  return (
    <aside className={cn('h-full w-full shrink-0 flex-col border-border bg-card md:w-72 md:border-r', className)}>
      <div className="px-4 pb-3 pt-5">
        <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-croqui-soft">Gerenciador · Copiloto</p>
        <h1 className="font-croqui-num text-[28px] font-semibold leading-none tracking-tight text-foreground">Copiloto</h1>
        <Cota className="my-3" />
        <Button variant="default" className="w-full" onClick={aoNovaConversa}>
          <Plus strokeWidth={1.75} aria-hidden />
          Nova conversa
        </Button>
      </div>
      <nav aria-label="Conversas com o copiloto" className="min-h-0 flex-1 overflow-y-auto border-t border-border">
        {carregando && <div className="px-4 py-4"><Esqueleto linhas={6} /></div>}
        {!carregando && erro && <div className="p-3"><Erro mensagem={erro.message} tentar={tentar} /></div>}
        {!carregando && !erro && sessoes && sessoes.length === 0 && (
          <Vazio
            Icone={MessageSquare}
            titulo="Nenhuma conversa ainda"
            descricao="Comece pedindo ao copiloto para ler uma conversa, explicar por que um lead não agendou ou resumir a semana."
            className="py-8"
          />
        )}
        {!carregando && !erro && sessoes && sessoes.length > 0 && (
          <ul>
            {sessoes.map((s) => {
              const ativa = s.id === sessaoAtiva;
              const lead = s.contato_id != null ? contatos[s.contato_id] : undefined;
              return (
                <li key={s.id}>
                  <Link
                    to={rota(`/copiloto/${s.id}`)}
                    onClick={aoEscolher}
                    aria-current={ativa ? 'page' : undefined}
                    className={cn(
                      'relative flex min-h-[44px] flex-col justify-center gap-0.5 border-b border-border px-4 py-2.5 transition-colors',
                      ativa ? 'bg-accent' : 'hover:bg-accent/60',
                    )}
                  >
                    {ativa && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-croqui-red" />}
                    <span className={cn('truncate text-[13.5px]', ativa ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
                      {s.titulo?.trim() || 'Conversa sem título'}
                    </span>
                    <span className="flex items-center gap-1.5 text-2xs text-croqui-soft">
                      {sessaoEmAndamento === s.id && <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-label="respondendo" />}
                      {lead && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <User className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden />
                          <span className="truncate">{nomeCurto(lead.user_name, lead.user_number)}</span>
                        </span>
                      )}
                      {!lead && s.contato_id != null && <span>lead {s.contato_id}</span>}
                      <span className="ml-auto shrink-0 font-croqui-num tabular-nums">{relativo(s.atualizado_em)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}
