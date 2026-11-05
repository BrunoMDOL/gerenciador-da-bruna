import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarClock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Erro, Esqueleto, Painel, Vazio } from '@/gerenciador/componentes';
import { useGestor } from '@/gerenciador/lib/acesso';
import { data, dataHora } from '@/gerenciador/lib/formatos';
import { CHAVE, DIAS_DA_SEMANA, horaCheia, lerConfigAnalise, proximaRodada, quantoFalta, salvarConfigAnalise } from './dados';
import type { ConfigAnalise, LinhaDeConfigAnalise } from './tipos';
import { rota } from '@/gerenciador/lib/rotas';

const HORAS = Array.from({ length: 24 }, (_, h) => h);

/** O que a tela mostra; a gravação parte do valor cru do banco, para não perder chave que a interface não conhece. */
function normalizar(valor: unknown): ConfigAnalise | null {
  if (!valor || typeof valor !== 'object') return null;
  const v = valor as Record<string, unknown>;
  const dia = Number(v.dia_semana);
  const hora = Number(v.hora);
  return {
    ativa: Boolean(v.ativa),
    modelo: typeof v.modelo === 'string' ? v.modelo : '',
    dia_semana: Number.isFinite(dia) ? ((Math.trunc(dia) % 7) + 7) % 7 : 1,
    hora: Number.isFinite(hora) ? Math.max(0, Math.min(23, Math.trunc(hora))) : 6,
  };
}

/**
 * A agenda da análise semanal (bruna_gestor_config, chave 'analise'): se roda
 * sozinha, em que dia e hora de Brasília, e quando cai a próxima. O modelo só
 * aparece: muda em Configurações › Geral.
 */
export function AgendaSemanal({ className }: { className?: string }) {
  const { email } = useGestor();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: CHAVE.config, queryFn: lerConfigAnalise });

  const salvar = useMutation({
    mutationFn: ({ atual, mudanca }: { atual: ConfigAnalise; mudanca: Partial<ConfigAnalise> }) => salvarConfigAnalise(atual, mudanca, email),
    onSuccess: (valor) => {
      qc.setQueryData<LinhaDeConfigAnalise | null>(CHAVE.config, (linha) =>
        linha ? { ...linha, valor, atualizado_em: new Date().toISOString(), atualizado_por: email } : linha);
      void qc.invalidateQueries({ queryKey: CHAVE.config });
      void qc.invalidateQueries({ queryKey: ['gerenciador', 'configuracoes'] });
      toast.success('Agenda salva.');
    },
    onError: (e: Error) => toast.error(e.message || 'Não deu para salvar a agenda.'),
  });

  const linha = q.data ?? null;
  const config = normalizar(linha?.valor);
  const mudar = (mudanca: Partial<ConfigAnalise>) => {
    if (!linha) return;
    salvar.mutate({ atual: linha.valor as ConfigAnalise, mudanca });
  };
  const proxima = config ? proximaRodada(config) : null;
  const ocupado = salvar.isPending;

  return (
    <Painel
      titulo="Agenda semanal"
      nota="horário de Brasília"
      className={className}
      acoes={ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin text-croqui-soft" aria-label="Salvando" /> : undefined}
    >
      {q.isPending ? (
        <Esqueleto linhas={4} />
      ) : q.isError ? (
        <Erro mensagem={q.error.message} tentar={() => void q.refetch()} />
      ) : !linha || !config ? (
        <Vazio
          Icone={CalendarClock}
          titulo="A chave analise não está em bruna_gestor_config"
          descricao="A migration da fundação do gerenciador cria essa linha. Sem ela, a análise semanal não roda sozinha; Rodar agora continua funcionando."
          className="py-6"
        />
      ) : (
        <div className="space-y-4">
          <div className="flex min-h-[40px] items-center justify-between gap-3">
            <Label htmlFor="analise-ativa" className="text-sm font-medium text-foreground">Rodar toda semana</Label>
            <Switch
              id="analise-ativa"
              checked={config.ativa}
              onCheckedChange={(v) => mudar({ ativa: v })}
              disabled={ocupado}
              aria-label="Rodar toda semana"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="analise-dia" className="text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">Dia</Label>
              <Select value={String(config.dia_semana)} onValueChange={(v) => mudar({ dia_semana: Number(v) })} disabled={ocupado}>
                <SelectTrigger id="analise-dia" className="h-10" aria-label="Dia da semana"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIAS_DA_SEMANA.map((nome, i) => <SelectItem key={i} value={String(i)}>{nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="analise-hora" className="text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">Hora</Label>
              <Select value={String(config.hora)} onValueChange={(v) => mudar({ hora: Number(v) })} disabled={ocupado}>
                <SelectTrigger id="analise-hora" className="h-10 font-data" aria-label="Hora"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {HORAS.map((h) => <SelectItem key={h} value={String(h)} className="font-data">{horaCheia(h)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-[13px] leading-relaxed text-foreground">
            {config.ativa && proxima ? (
              <>
                Próxima: <span className="font-medium">{DIAS_DA_SEMANA[config.dia_semana]}</span>,{' '}
                <span className="font-data">{data(proxima)} às {horaCheia(config.hora)}</span>{' '}
                <span className="text-croqui-soft">({quantoFalta(proxima)})</span>
              </>
            ) : (
              <>Desligada: nenhuma análise roda sozinha. <span className="text-croqui-soft">Rodar agora continua funcionando.</span></>
            )}
          </p>

          <p className="text-2xs leading-relaxed text-croqui-soft">
            Modelo: <span className="text-foreground">{config.modelo || '—'}</span> · muda em{' '}
            <Link to={rota('/configuracoes/geral')} className="underline decoration-croqui-rule underline-offset-4 hover:text-foreground">Configurações › Geral</Link>.
          </p>
          <p className="text-2xs leading-relaxed text-croqui-soft">
            A rodada automática confere de hora em hora e dispara quando o dia e a hora batem, desde que não tenha rodado nas últimas 20 h.
            {linha.atualizado_em ? <> Última alteração {dataHora(linha.atualizado_em)}{linha.atualizado_por ? ` por ${linha.atualizado_por}` : ''}.</> : null}
          </p>
        </div>
      )}
    </Painel>
  );
}
