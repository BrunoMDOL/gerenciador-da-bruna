import { useId, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { EtapaFup90 } from '@/gerenciador/lib/tipos';
import { cn } from '@/lib/utils';
import { CHIP, CHIP_ATIVO, CHIP_REPOUSO, NUM } from './estilos';
import {
  AJUDA_DA_ETAPA, avisosDeOrdem, esquemaDaEtapa, TEMPERATURAS, valoresDaEtapa, type ValoresDaEtapa,
} from './regrasDaCampanha';
import { SeletorDeTemplate } from './SeletorDeTemplate';
import { corpoDoTemplate } from './templatesTexto';
import { nomeDaCategoria, textoDoStatusDoTemplate } from './textos';
import type { TemplateDaMeta } from './tipos';

function Ajuda({ children }: { children: string }) {
  return <p className="text-2xs leading-relaxed text-croqui-soft">{children}</p>;
}

function ErroDoCampo({ mensagem }: { mensagem?: string }) {
  if (!mensagem) return null;
  return (
    <p role="alert" className="flex items-center gap-1 text-2xs font-medium text-croqui-red-text">
      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
      {mensagem}
    </p>
  );
}

interface Props {
  /** null quando é etapa nova. */
  etapa: EtapaFup90 | null;
  /** O followup_num da etapa (o livre seguinte, quando é nova). */
  numero: number;
  /** As etapas da campanha, para avisar quando os dias saem de ordem. */
  etapas: EtapaFup90[];
  templates: TemplateDaMeta[];
  offsetPadrao?: number;
  ocupado: boolean;
  aoSalvar: (valores: ValoresDaEtapa, corpo: string | null) => void;
  aoCancelar: () => void;
}

/**
 * O formulário de uma etapa da FUP90 (react-hook-form + zod, com as regras do
 * banco: dia > 0, temperatura quente/morno/frio, variáveis em JSON). Trocar o
 * template traz o idioma e o corpo dele.
 */
export function EditorDeEtapa({ etapa, numero, etapas, templates, offsetPadrao = 1, ocupado, aoSalvar, aoCancelar }: Props) {
  const id = useId();
  const form = useForm<ValoresDaEtapa>({ resolver: zodResolver(esquemaDaEtapa), defaultValues: valoresDaEtapa(etapa, offsetPadrao) });
  const { register, control, formState: { errors, isDirty } } = form;
  const [corpo, setCorpo] = useState<string | null>(etapa?.template_body ?? null);
  const [corpoMudou, setCorpoMudou] = useState(false);

  const nomeDoTemplate = form.watch('template_name');
  const offset = Number(form.watch('offset_dias'));
  const ativo = form.watch('ativo');
  const temperatura = form.watch('temperatura');
  const escolhido = templates.find((t) => t.name === nomeDoTemplate) ?? null;
  const corpoDaMeta = escolhido ? corpoDoTemplate(escolhido.components) : null;
  const corpoDiferente = Boolean(nomeDoTemplate && corpoDaMeta && corpo !== corpoDaMeta);

  const comEsta = [
    ...etapas.filter((e) => e.id !== etapa?.id).map((e) => ({ followup_num: e.followup_num, offset_dias: e.offset_dias, ativo: e.ativo })),
    { followup_num: numero, offset_dias: Number.isFinite(offset) ? offset : 0, ativo },
  ];
  const avisos = avisosDeOrdem(comEsta).filter((a) => a.includes(`FUP ${numero} `) || a.includes(`FUP ${numero} (`));

  const escolherTemplate = (t: TemplateDaMeta | null) => {
    form.setValue('template_name', t?.name ?? '', { shouldDirty: true, shouldValidate: true });
    if (t?.language) form.setValue('template_lang', t.language, { shouldDirty: true });
    setCorpo(t ? corpoDoTemplate(t.components) : null);
    setCorpoMudou(true);
  };

  const enviar = form.handleSubmit((v) => aoSalvar(v, v.template_name ? corpo : null));

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate aria-label={etapa ? `Editar o FUP ${numero}` : `Nova etapa, FUP ${numero}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-dia`}>Dia</Label>
          <Input id={`${id}-dia`} type="number" inputMode="numeric" min={1} className={cn(NUM, 'h-10')} aria-invalid={Boolean(errors.offset_dias)} {...register('offset_dias')} />
          <ErroDoCampo mensagem={errors.offset_dias?.message} />
          {avisos.map((a) => (
            <p key={a} className="flex items-start gap-1 text-2xs font-medium text-warning"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />{a}</p>
          ))}
          <Ajuda>{AJUDA_DA_ETAPA.offset_dias}</Ajuda>
        </div>
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Temperatura</legend>
          <div className="flex flex-wrap gap-1.5">
            {TEMPERATURAS.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={temperatura === t}
                onClick={() => form.setValue('temperatura', t, { shouldDirty: true })}
                className={cn(CHIP, temperatura === t ? CHIP_ATIVO : CHIP_REPOUSO)}
              >
                {t}
              </button>
            ))}
          </div>
          <Ajuda>{AJUDA_DA_ETAPA.temperatura}</Ajuda>
        </fieldset>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-objetivo`}>Objetivo</Label>
        <Input id={`${id}-objetivo`} className="h-10" maxLength={200} aria-invalid={Boolean(errors.objetivo)} {...register('objetivo')} />
        <ErroDoCampo mensagem={errors.objetivo?.message} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor={`${id}-template`}>Template</Label>
          <SeletorDeTemplate id={`${id}-template`} valor={nomeDoTemplate} templates={templates} aoEscolher={escolherTemplate} />
          {nomeDoTemplate && escolhido?.status !== 'APPROVED' && (
            <p className="flex items-start gap-1 text-2xs font-medium text-croqui-red-text">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              {escolhido ? `Este template está ${textoDoStatusDoTemplate(escolhido.status)} na Meta` : 'Este template não está na tabela de templates'}: a validação acusa bloqueio e o envio falha até ele ser aprovado.
            </p>
          )}
          {escolhido?.status === 'APPROVED' && escolhido.category && escolhido.category !== 'MARKETING' && (
            <p className="flex items-start gap-1 text-2xs font-medium text-warning">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              Template de {nomeDaCategoria(escolhido.category).toLowerCase()}: com a etapa ativa, a validação da campanha acusa atenção, porque a FUP90
              espera template de marketing.
            </p>
          )}
          {!nomeDoTemplate && ativo && <p className="text-2xs font-medium text-warning">Etapa ativa sem template: a validação acusa bloqueio.</p>}
          <Ajuda>{AJUDA_DA_ETAPA.template_name}</Ajuda>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-idioma`}>Idioma</Label>
          <Input id={`${id}-idioma`} className={cn(NUM, 'h-10')} maxLength={10} aria-invalid={Boolean(errors.template_lang)} {...register('template_lang')} />
          <ErroDoCampo mensagem={errors.template_lang?.message} />
        </div>
      </div>

      {nomeDoTemplate && (
        <div className="space-y-1.5">
          <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-croqui-soft">Texto que o lead recebe</p>
          {corpo ? (
            <p className="whitespace-pre-line rounded-md border border-primary/30 bg-bubble-agent px-3 py-2 text-[13px] text-foreground">{corpo}</p>
          ) : (
            <p className="text-[13px] text-croqui-soft">O template não tem corpo de texto na tabela.</p>
          )}
          {corpoDiferente && (
            <div className="flex flex-col gap-2 rounded-sm border border-warning/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-2xs text-foreground">O texto guardado nesta etapa é diferente do texto aprovado na Meta para {nomeDoTemplate}. A conversa do lead mostra o guardado.</p>
              <Button type="button" size="sm" variant="outline" onClick={() => { setCorpo(corpoDaMeta); setCorpoMudou(true); }}>
                Usar o texto da Meta
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-variaveis`}>Variáveis</Label>
        <Textarea id={`${id}-variaveis`} rows={2} className={cn(NUM, 'text-[13px]')} aria-invalid={Boolean(errors.variaveis)} {...register('variaveis')} />
        <ErroDoCampo mensagem={errors.variaveis?.message} />
        <Ajuda>{AJUDA_DA_ETAPA.variaveis}</Ajuda>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-leituras`}>Mínimo de leituras</Label>
          <Input id={`${id}-leituras`} type="number" inputMode="numeric" min={0} className={cn(NUM, 'h-10')} aria-invalid={Boolean(errors.min_leituras)} {...register('min_leituras')} />
          <ErroDoCampo mensagem={errors.min_leituras?.message} />
          <Ajuda>{AJUDA_DA_ETAPA.min_leituras}</Ajuda>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${id}-condicional`}>Condicional</Label>
            <Controller control={control} name="condicional" render={({ field }) => (
              <Switch id={`${id}-condicional`} checked={field.value} onCheckedChange={field.onChange} />
            )} />
          </div>
          <Ajuda>{AJUDA_DA_ETAPA.condicional}</Ajuda>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${id}-ativo`}>Ativa</Label>
            <Controller control={control} name="ativo" render={({ field }) => (
              <Switch id={`${id}-ativo`} checked={field.value} onCheckedChange={field.onChange} />
            )} />
          </div>
          <Ajuda>{AJUDA_DA_ETAPA.ativo}</Ajuda>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <Button type="submit" disabled={ocupado || (etapa != null && !isDirty && !corpoMudou)}>
          {ocupado && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {etapa ? 'Salvar etapa' : 'Criar etapa'}
        </Button>
        <Button type="button" variant="outline" onClick={aoCancelar} disabled={ocupado}>Cancelar</Button>
      </div>
    </form>
  );
}
