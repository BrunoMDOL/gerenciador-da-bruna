import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CartaoDeSugestao, Carregando, Erro, Esqueleto, Vazio } from '@/gerenciador/componentes';
import { useGestor } from '@/gerenciador/lib/acesso';
import { cn } from '@/lib/utils';
import type { Sugestao, TipoSugestao } from '@/gerenciador/lib/tipos';
import { CHAVE, lerSugestoesDecididas, lerSugestoesPendentes, NOME_DA_ORIGEM, NOME_DO_TIPO_DE_SUGESTAO, plural } from './dados';

const TIPOS = Object.keys(NOME_DO_TIPO_DE_SUGESTAO) as TipoSugestao[];
const ORIGENS = Object.keys(NOME_DA_ORIGEM) as Array<Sugestao['origem']>;

/**
 * A aba Sugestões: tudo o que está pendente, de qualquer origem (análise,
 * copiloto, gestor), com filtro por tipo e origem, e as últimas decididas
 * dobradas embaixo. O cartão é o mesmo das outras áreas.
 */
export function Sugestoes() {
  const { email, user } = useGestor();
  const quem = { email, userId: user?.id ?? null };
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<'todos' | TipoSugestao>('todos');
  const [origem, setOrigem] = useState<'todas' | Sugestao['origem']>('todas');
  const [decididasAbertas, setDecididasAbertas] = useState(false);

  const pendentes = useQuery({ queryKey: CHAVE.sugestoesPendentes, queryFn: lerSugestoesPendentes });
  const decididas = useQuery({ queryKey: CHAVE.sugestoesDecididas, queryFn: lerSugestoesDecididas, enabled: decididasAbertas });
  const recarregar = () => { void qc.invalidateQueries({ queryKey: CHAVE.tudo }); };

  const todas = pendentes.data ?? [];
  const filtradas = todas.filter((s) => (tipo === 'todos' || s.tipo === tipo) && (origem === 'todas' || s.origem === origem));
  const filtrando = tipo !== 'todos' || origem !== 'todas';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-3">
          <div className="space-y-1 sm:w-44">
            <Label htmlFor="filtro-tipo" className="text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
              <SelectTrigger id="filtro-tipo" className="h-10" aria-label="Filtrar por tipo"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">todos os tipos</SelectItem>
                {TIPOS.map((t) => <SelectItem key={t} value={t}>{NOME_DO_TIPO_DE_SUGESTAO[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:w-44">
            <Label htmlFor="filtro-origem" className="text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">Origem</Label>
            <Select value={origem} onValueChange={(v) => setOrigem(v as typeof origem)}>
              <SelectTrigger id="filtro-origem" className="h-10" aria-label="Filtrar por origem"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">todas as origens</SelectItem>
                {ORIGENS.map((o) => <SelectItem key={o} value={o}>{NOME_DA_ORIGEM[o]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {pendentes.data && (
          <p className="font-data text-[13px] text-croqui-soft">
            {filtrando ? `${plural(filtradas.length, 'pendente', 'pendentes')} de ${todas.length}` : plural(todas.length, 'pendente', 'pendentes')}
          </p>
        )}
      </div>

      {pendentes.isPending ? (
        <Esqueleto linhas={6} />
      ) : pendentes.isError ? (
        <Erro mensagem={pendentes.error.message} tentar={() => void pendentes.refetch()} />
      ) : todas.length === 0 ? (
        <Vazio
          Icone={Lightbulb}
          titulo="Nenhuma sugestão pendente"
          descricao="As sugestões chegam pela análise semanal (ou por Rodar agora) e pelo copiloto. Quando houver, elas aparecem aqui para você aprovar, aplicar ou rejeitar."
        />
      ) : filtradas.length === 0 ? (
        <Vazio
          Icone={Lightbulb}
          titulo="Nada pendente com esse filtro"
          descricao={`${plural(todas.length, 'sugestão pendente', 'sugestões pendentes')} em outros tipos ou origens.`}
          acao={<Button variant="outline" size="sm" onClick={() => { setTipo('todos'); setOrigem('todas'); }}>Limpar filtros</Button>}
        />
      ) : (
        <ul className="space-y-3" aria-label="Sugestões pendentes">
          {filtradas.map((s) => (
            <li key={s.id}>
              <CartaoDeSugestao sugestao={s} quem={quem} aoMudar={recarregar} mostrarOrigem />
            </li>
          ))}
        </ul>
      )}

      <Collapsible open={decididasAbertas} onOpenChange={setDecididasAbertas} className="border-t border-border pt-2">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex min-h-[40px] w-full items-center justify-between gap-3 rounded-sm px-1 py-1.5 text-left text-sm font-medium text-foreground hover:bg-accent/60"
          >
            <span className="min-w-0">
              Decididas
              <span className="block text-2xs font-normal text-croqui-soft sm:ml-2 sm:inline">aprovadas, aplicadas, rejeitadas e descartadas · as últimas 50</span>
            </span>
            <ChevronDown className={cn('h-4 w-4 shrink-0 text-croqui-soft transition-transform', decididasAbertas && 'rotate-180')} strokeWidth={1.75} aria-hidden />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          {decididas.isPending ? (
            <Carregando texto="Buscando as decididas" />
          ) : decididas.isError ? (
            <Erro mensagem={decididas.error.message} tentar={() => void decididas.refetch()} />
          ) : (decididas.data ?? []).length === 0 ? (
            <p className="px-1 py-4 text-[13px] text-croqui-soft">Nenhuma sugestão decidida ainda.</p>
          ) : (
            <ul className="space-y-3" aria-label="Sugestões decididas">
              {(decididas.data ?? []).map((s) => (
                <li key={s.id}>
                  <CartaoDeSugestao sugestao={s} quem={quem} aoMudar={recarregar} mostrarOrigem />
                </li>
              ))}
            </ul>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
