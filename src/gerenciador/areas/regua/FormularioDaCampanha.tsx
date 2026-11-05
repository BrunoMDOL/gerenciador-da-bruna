import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Controller, useForm, type FieldError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Painel } from '@/gerenciador/componentes';
import { nomeDaRegiao } from '@/gerenciador/lib/formatos';
import type { CampanhaFup90 } from '@/gerenciador/lib/tipos';
import { cn } from '@/lib/utils';
import { useRegioes, useSalvarCampanha, useTags } from './dadosDoFup90';
import { NUM } from './estilos';
import {
  AJUDA_DA_CAMPANHA, campanhaParaOBanco, camposAlterados, esquemaDaCampanha, valoresDaCampanha, type ValoresDaCampanha,
} from './regrasDaCampanha';
import { SeletorDeTags } from './SeletorDeTags';

function Campo({ id, rotulo, ajuda, erro, children, className }: {
  id: string;
  rotulo: string;
  ajuda?: string;
  erro?: FieldError;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
      {erro?.message && (
        <p role="alert" className="flex items-center gap-1 text-2xs font-medium text-croqui-red-text">
          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />{erro.message}
        </p>
      )}
      {ajuda && <p className="text-2xs leading-relaxed text-croqui-soft">{ajuda}</p>}
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 border-t border-border pt-4">
      <legend className="pr-2 text-[13.5px] font-semibold text-foreground">{titulo}</legend>
      {children}
    </fieldset>
  );
}

/**
 * As regras da campanha FUP90 (fup_campanhas): quem entra, quando sai e até
 * quando. react-hook-form + zod com os limites do banco; grava só os campos
 * que o gestor mexeu e audita com o antes e o depois.
 *
 * Mudança que chega de fora (o interruptor "Campanha ligada", outra pessoa)
 * entra no formulário quando ele não tem nada por salvar; com edição em
 * andamento, o que foi digitado fica, e o salvar não regrava os outros campos.
 */
export function FormularioDaCampanha({ campanha }: { campanha: CampanhaFup90 }) {
  const id = useId();
  const salvar = useSalvarCampanha();
  const regioes = useRegioes();
  const tags = useTags();
  const form = useForm<ValoresDaCampanha>({ resolver: zodResolver(esquemaDaCampanha), defaultValues: valoresDaCampanha(campanha) });
  const { register, control, formState: { errors, isDirty } } = form;
  /** De onde a edição partiu: o que difere disto é o que o gestor mexeu. */
  const base = useRef(valoresDaCampanha(campanha));
  const vistoEm = useRef(campanha.updated_at);
  const recomecar = (valores: ValoresDaCampanha) => {
    base.current = valores;
    form.reset(valores);
  };

  useEffect(() => {
    if (isDirty || campanha.updated_at === vistoEm.current) return;
    vistoEm.current = campanha.updated_at;
    const novos = valoresDaCampanha(campanha);
    base.current = novos;
    form.reset(novos);
  }, [campanha, form, isDirty]);

  const opcoesDePraca = [
    ...(regioes.data ?? []).map((r) => r.region),
    ...campanha.regioes.filter((r) => !(regioes.data ?? []).some((x) => x.region === r)),
  ];
  const numero = (campo: keyof ValoresDaCampanha) => ({ type: 'number', inputMode: 'numeric' as const, className: cn(NUM, 'h-10'), ...register(campo) });

  const enviar = form.handleSubmit((valores) => {
    const mexidos = Object.keys(
      camposAlterados(campanhaParaOBanco(base.current) as Record<string, unknown>, campanhaParaOBanco(valores) as Record<string, unknown>),
    ) as Array<keyof ValoresDaCampanha>;
    salvar.mutate({ campanha, valores, campos: mexidos }, { onSuccess: () => recomecar(valores) });
  });

  return (
    <Painel titulo="Regras da campanha" nota={`${campanha.slug} · versão ${campanha.versao}`}>
      <form onSubmit={enviar} className="space-y-6" noValidate aria-label="Regras da campanha FUP90">
        <Campo id={`${id}-nome`} rotulo="Nome" ajuda={AJUDA_DA_CAMPANHA.nome} erro={errors.nome} className="max-w-xl">
          <Input id={`${id}-nome`} className="h-10" maxLength={120} {...register('nome')} />
        </Campo>

        <Grupo titulo="Quem entra">
          <div className="space-y-1.5">
            <p className="text-sm font-medium" id={`${id}-pracas`}>Praças</p>
            <Controller
              control={control}
              name="regioes"
              render={({ field }) => (
                <div role="group" aria-labelledby={`${id}-pracas`} className="flex flex-wrap gap-x-5 gap-y-1">
                  {regioes.isPending && <span className="text-[13px] text-croqui-soft">carregando as praças…</span>}
                  {regioes.isError && <span className="text-[13px] text-croqui-red-text">Não deu para ler as praças: {regioes.error.message}</span>}
                  {opcoesDePraca.map((r) => {
                    const marcada = field.value.includes(r);
                    return (
                      <label key={r} className="flex min-h-[40px] cursor-pointer items-center gap-2 text-[13.5px]">
                        <Checkbox
                          checked={marcada}
                          onCheckedChange={(v) => field.onChange(v ? [...field.value, r] : field.value.filter((x) => x !== r))}
                          aria-label={nomeDaRegiao(r)}
                        />
                        {nomeDaRegiao(r)}
                      </label>
                    );
                  })}
                </div>
              )}
            />
            {errors.regioes?.message && <p role="alert" className="text-2xs font-medium text-croqui-red-text">{errors.regioes.message}</p>}
            <p className="text-2xs text-croqui-soft">{AJUDA_DA_CAMPANHA.regioes}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo id={`${id}-jmin`} rotulo="Horas sem escrever para entrar" ajuda={AJUDA_DA_CAMPANHA.janela_min_horas} erro={errors.janela_min_horas}>
              <Input id={`${id}-jmin`} min={0} {...numero('janela_min_horas')} />
            </Campo>
            <Campo id={`${id}-jmax`} rotulo="Última mensagem há no máximo (dias)" ajuda={AJUDA_DA_CAMPANHA.janela_max_dias} erro={errors.janela_max_dias}>
              <Input id={`${id}-jmax`} min={1} {...numero('janela_max_dias')} />
            </Campo>
            <Campo id={`${id}-insc`} rotulo="Inscrições por rodada" ajuda={AJUDA_DA_CAMPANHA.limite_inscricao_dia} erro={errors.limite_inscricao_dia}>
              <Input id={`${id}-insc`} min={0} {...numero('limite_inscricao_dia')} />
            </Campo>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-bloq`}>Tags que bloqueiam</Label>
            <Controller control={control} name="tags_bloqueantes" render={({ field }) => (
              <SeletorDeTags id={`${id}-bloq`} rotulo="Tags que bloqueiam" valor={field.value} tags={tags.data ?? []} aoMudar={field.onChange} desabilitado={tags.isPending} />
            )} />
            {tags.isError && <p className="text-2xs text-croqui-red-text">Não deu para ler as tags: {tags.error.message}</p>}
            <p className="text-2xs text-croqui-soft">{AJUDA_DA_CAMPANHA.tags_bloqueantes}</p>
          </div>
        </Grupo>

        <Grupo titulo="Quando sai">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo id={`${id}-ini`} rotulo="Começa às" ajuda={AJUDA_DA_CAMPANHA.hora_inicio} erro={errors.hora_inicio}>
              <Input id={`${id}-ini`} type="time" className={cn(NUM, 'h-10')} {...register('hora_inicio')} />
            </Campo>
            <Campo id={`${id}-fim`} rotulo="Para às" ajuda={AJUDA_DA_CAMPANHA.hora_fim} erro={errors.hora_fim}>
              <Input id={`${id}-fim`} type="time" className={cn(NUM, 'h-10')} {...register('hora_fim')} />
            </Campo>
            <Campo id={`${id}-over`} rotulo="Transbordo às" ajuda={AJUDA_DA_CAMPANHA.hora_overflow} erro={errors.hora_overflow}>
              <Input id={`${id}-over`} type="time" className={cn(NUM, 'h-10')} {...register('hora_overflow')} />
            </Campo>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo id={`${id}-jj`} rotulo="Atraso aleatório na janela (min)" ajuda={AJUDA_DA_CAMPANHA.jitter_janela_min} erro={errors.jitter_janela_min}>
              <Input id={`${id}-jj`} min={0} {...numero('jitter_janela_min')} />
            </Campo>
            <Campo id={`${id}-jf`} rotulo="Atraso aleatório fora da janela (min)" ajuda={AJUDA_DA_CAMPANHA.jitter_min} erro={errors.jitter_min}>
              <Input id={`${id}-jf`} min={0} {...numero('jitter_min')} />
            </Campo>
            <Campo id={`${id}-int`} rotulo="Intervalo mínimo entre toques (h)" ajuda={AJUDA_DA_CAMPANHA.intervalo_min_horas} erro={errors.intervalo_min_horas}>
              <Input id={`${id}-int`} min={0} {...numero('intervalo_min_horas')} />
            </Campo>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo id={`${id}-env`} rotulo="Envios por dia" ajuda={AJUDA_DA_CAMPANHA.limite_envio_dia} erro={errors.limite_envio_dia}>
              <Input id={`${id}-env`} min={0} {...numero('limite_envio_dia')} />
            </Campo>
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex min-h-[40px] items-center gap-3">
                <Controller control={control} name="envia_fim_semana" render={({ field }) => (
                  <Switch id={`${id}-fds`} checked={field.value} onCheckedChange={field.onChange} />
                )} />
                <Label htmlFor={`${id}-fds`}>Envia no fim de semana</Label>
              </div>
              <p className="text-2xs text-croqui-soft">{AJUDA_DA_CAMPANHA.envia_fim_semana}</p>
            </div>
          </div>
        </Grupo>

        <Grupo titulo="Até quando">
          <Campo id={`${id}-teto`} rotulo="Teto de toques por lead" ajuda={AJUDA_DA_CAMPANHA.teto_toques_total} erro={errors.teto_toques_total} className="max-w-xs">
            <Input id={`${id}-teto`} min={1} {...numero('teto_toques_total')} />
          </Campo>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-paus`}>Tags que pausam</Label>
            <Controller control={control} name="tags_pausantes" render={({ field }) => (
              <SeletorDeTags id={`${id}-paus`} rotulo="Tags que pausam" valor={field.value} tags={tags.data ?? []} aoMudar={field.onChange} desabilitado={tags.isPending} />
            )} />
            <p className="text-2xs text-croqui-soft">{AJUDA_DA_CAMPANHA.tags_pausantes}</p>
          </div>
        </Grupo>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button type="submit" disabled={!isDirty || salvar.isPending}>
            {salvar.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Salvar regras
          </Button>
          <Button type="button" variant="outline" disabled={!isDirty || salvar.isPending} onClick={() => recomecar(valoresDaCampanha(campanha))}>
            Descartar mudanças
          </Button>
          {isDirty && <span className="text-2xs text-croqui-soft">Há mudanças não salvas.</span>}
        </div>
      </form>
    </Painel>
  );
}
