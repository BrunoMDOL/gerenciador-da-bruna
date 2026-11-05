import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, CircleDot, CircleSlash, Download, FileQuestion, FileText, FlaskConical, GitCompare, Loader2, Rocket, Sparkles, Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FaixaDeAbas } from '@/components/croqui/FaixaDeAbas';
import { Carregando, Erro, Esqueleto, Painel, Vazio } from '@/gerenciador/componentes';
import { useGestor } from '@/gerenciador/lib/acesso';
import { dataHora, numero } from '@/gerenciador/lib/formatos';
import { CHAVES, invalidarOutrasAreas } from './chaves';
import { ROTAS } from './rotas';
import { Chip } from './comum/Chip';
import { SugestoesDaArea } from './comum/SugestoesDaArea';
import { baixarTexto, hashCurto, mensagemDeErro } from './comum/util';
import { pendenciaDoNo, useConfigs } from './geral/dados';
import { Comparar } from './nucleo/Comparar';
import { useConteudo, useVersaoAtual, useVersoes } from './nucleo/consultas';
import { aprovarVersao, criarVersaoEditada, descartarVersao, marcarPublicada, notaDaReversao, reverterPara, type VersaoDaLista } from './nucleo/dados';
import { EditarSecao } from './nucleo/EditarSecao';
import { Leitura } from './nucleo/Leitura';
import { EstadoDaVersao, ListaDeVersoes } from './nucleo/ListaDeVersoes';
import { PublicarDialog, TestarDialog } from './nucleo/Publicar';
import { trocarMiolo, type Secao } from './nucleo/secoes';
import { ORIGEM_DA_VERSAO, perguntaDeRevisao, rotaDaRevisao } from './nucleo/textos';

type Confirmacao = 'descartar' | 'reverter' | null;

/**
 * /configuracoes/nucleo: as versões do prompt principal da Bruna, a
 * leitura por seções, a edição de uma seção (vira versão nova em rascunho),
 * a comparação entre versões e o caminho até o ar. ?versao=<id> abre uma
 * versão; ?aba=comparar&base=<id> abre a comparação.
 */
export default function Nucleo() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { email } = useGestor();
  const versoes = useVersoes();
  const atual = useVersaoAtual();
  const configs = useConfigs();

  const [editando, setEditando] = useState<Secao | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [confirmar, setConfirmar] = useState<Confirmacao>(null);

  const lista = useMemo(() => versoes.data ?? [], [versoes.data]);
  const atualId = atual.data?.id ?? null;
  const daUrl = Number(params.get('versao'));
  const pedida = Number.isInteger(daUrl) && daUrl > 0 ? daUrl : null;
  const selecionadaId = pedida ?? atualId ?? lista[0]?.id ?? null;
  const selecionada = lista.find((v) => v.id === selecionadaId) ?? null;
  const versaoAtual = lista.find((v) => v.id === atualId) ?? null;
  const aba = params.get('aba') === 'comparar' ? 'comparar' : 'ler';

  const baseDaUrl = Number(params.get('base'));
  // Sem base na URL: a base da versão; senão a publicada; para a publicada, a anterior a ela.
  const anteriorAEla = selecionada ? lista.find((v) => v.numero < selecionada.numero) ?? null : null;
  const baseDaVersao = selecionada?.base_versao_id ?? (atualId && atualId !== selecionadaId ? atualId : anteriorAEla?.id ?? null);
  const baseId = Number.isInteger(baseDaUrl) && baseDaUrl > 0 ? baseDaUrl : baseDaVersao ?? lista.find((v) => v.id !== selecionadaId)?.id ?? null;
  const baseDaRevisao = selecionada?.base_versao_id ?? (atualId !== selecionadaId ? atualId : null);

  const conteudo = useConteudo(selecionada?.id ?? null);
  const conteudoDaBase = useConteudo(baseDaRevisao);
  const texto = conteudo.data?.conteudo ?? null;

  const mudarParams = (mudanca: Record<string, string | null>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(mudanca)) {
      if (v == null) p.delete(k);
      else p.set(k, v);
    }
    setParams(p);
  };
  const irParaVersao = (id: number) => setParams(new URLSearchParams({ versao: String(id) }));

  const recarregar = () => {
    void qc.invalidateQueries({ queryKey: CHAVES.versoes });
    void qc.invalidateQueries({ queryKey: CHAVES.atual });
    void qc.invalidateQueries({ queryKey: CHAVES.sugestoes('nucleo') });
    invalidarOutrasAreas(qc, 'nucleo');
  };
  const falhou = (e: unknown) => toast.error(mensagemDeErro(e));

  const criar = useMutation({
    mutationFn: ({ secao, miolo, nota }: { secao: Secao; miolo: string; nota: string }) => {
      if (!selecionada || texto == null) throw new Error('A versão base não carregou. Tente de novo.');
      return criarVersaoEditada({
        conteudo: trocarMiolo(texto, secao, miolo),
        nota,
        baseVersaoId: selecionada.id,
        baseNumero: selecionada.numero,
        secao: secao.titulo,
      });
    },
    onSuccess: (id) => {
      toast.success('Versão nova criada em rascunho. Ela só vai ao ar depois de publicada.');
      setEditando(null);
      recarregar();
      irParaVersao(id);
    },
    onError: falhou,
  });

  const aprovar = useMutation({
    mutationFn: (v: VersaoDaLista) => aprovarVersao(v, email),
    onSuccess: (_r, v) => { toast.success(`Versão nº ${v.numero} aprovada. Para ir ao ar, falta publicar.`); recarregar(); },
    onError: falhou,
  });

  const descartar = useMutation({
    mutationFn: (v: VersaoDaLista) => descartarVersao(v),
    onSuccess: (_r, v) => { toast.success(`Versão nº ${v.numero} descartada.`); setConfirmar(null); recarregar(); },
    onError: falhou,
  });

  const reverter = useMutation({
    mutationFn: (v: VersaoDaLista) => {
      if (texto == null) throw new Error('O texto da versão não carregou. Tente de novo.');
      return reverterPara({ id: v.id, numero: v.numero, conteudo: texto }, atual.data ?? null);
    },
    onSuccess: (id, v) => {
      toast.success(`Rascunho criado com o texto da versão nº ${v.numero}. Publique para voltar ao ar.`);
      setConfirmar(null);
      recarregar();
      irParaVersao(id);
    },
    onError: falhou,
  });

  const publicar = useMutation({
    mutationFn: (v: VersaoDaLista) => marcarPublicada(v, atual.data ?? null, email),
    onSuccess: (_r, v) => { toast.success(`Versão nº ${v.numero} marcada como publicada.`); setPublicando(false); recarregar(); },
    onError: (e) => { falhou(e); recarregar(); },
  });

  if (versoes.isPending || atual.isPending) {
    return (
      <div className="space-y-4" aria-busy>
        <Esqueleto linhas={4} />
        <Carregando texto="Carregando as versões do núcleo" />
      </div>
    );
  }
  if ((versoes.isError && !versoes.data) || (atual.isError && atual.data === undefined)) {
    const erro = versoes.error ?? atual.error;
    return <Erro mensagem={erro?.message ?? 'não deu para ler as versões'} tentar={() => { void versoes.refetch(); void atual.refetch(); }} />;
  }
  if (!lista.length) {
    return (
      <Vazio
        Icone={FileText}
        titulo="Nenhuma versão do núcleo no banco"
        descricao="O núcleo no ar ainda não foi registrado em bruna_prompt_versoes. Quem cuida do repositório registra o docs/bruna/prompt-nucleo-v3.md da main como a versão nº 1, de origem repositório; daí em diante as edições nascem aqui."
      />
    );
  }

  const estaNoAr = selecionada?.id === atualId;
  const maisNovaQueAtual = selecionada && (!versaoAtual || selecionada.numero > versaoAtual.numero);
  const podeAprovar = selecionada?.status === 'rascunho';
  const podePublicar = Boolean(selecionada && (selecionada.status === 'rascunho' || selecionada.status === 'aprovada') && maisNovaQueAtual);
  const podeDescartar = Boolean(selecionada && !estaNoAr && (selecionada.status === 'rascunho' || selecionada.status === 'aprovada'));
  const podeReverter = Boolean(selecionada && versaoAtual && !estaNoAr && (selecionada.numero < versaoAtual.numero || selecionada.status === 'descartada'));
  const baseAtrasada = Boolean(selecionada && versaoAtual && selecionada.numero < versaoAtual.numero);

  const pedirRevisao = () => {
    if (!selecionada || texto == null) return;
    // Sem o texto da base, a pergunta iria sem o diff e o copiloto revisaria a publicada no lugar da proposta.
    if (baseDaRevisao != null && conteudoDaBase.isError) {
      const numeroDaBase = lista.find((v) => v.id === baseDaRevisao)?.numero ?? baseDaRevisao;
      toast.error(`Não deu para ler a versão nº ${numeroDaBase}, a base da comparação: ${conteudoDaBase.error.message}. Tente de novo.`);
      void conteudoDaBase.refetch();
      return;
    }
    const base = baseDaRevisao && conteudoDaBase.data ? { numero: conteudoDaBase.data.numero, conteudo: conteudoDaBase.data.conteudo } : null;
    navigate(rotaDaRevisao(perguntaDeRevisao(selecionada, texto, base)));
  };
  const baixar = () => {
    if (texto == null) return;
    baixarTexto('prompt-nucleo-v3.md', texto);
  };

  return (
    <div className="space-y-6">
      <SugestoesDaArea tipo="nucleo" recarregar={CHAVES.versoes} />

      <Painel semRecheio titulo="Versões" nota={`${numero(lista.length)} ${lista.length === 1 ? 'versão' : 'versões'}, a mais nova primeiro`}>
        <p className="flex items-start gap-2 border-b border-border px-4 py-2.5 text-[13px] leading-relaxed text-croqui-soft">
          <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2} aria-hidden />
          {versaoAtual ? (
            <span>
              No ar segundo o banco: <span className="font-medium text-foreground">versão nº {versaoAtual.numero}</span>, publicada em{' '}
              <span className="font-croqui-num tabular-nums">{dataHora(versaoAtual.publicada_em)}</span>
              {versaoAtual.publicada_por_email ? ` por ${versaoAtual.publicada_por_email}` : ''}.
            </span>
          ) : (
            <span>Nenhuma versão está marcada como publicada no banco.</span>
          )}
        </p>
        <ListaDeVersoes versoes={lista} atualId={atualId} selecionadaId={selecionada?.id ?? null} aoSelecionar={irParaVersao} />
      </Painel>

      {!selecionada && versoes.isFetching ? (
        // A versão recém-criada chega com a lista recarregada.
        <Carregando texto="Abrindo a versão" />
      ) : !selecionada ? (
        <Vazio
          Icone={FileQuestion}
          titulo={`A versão ${pedida ?? ''} não existe`}
          descricao="Pode ter sido um link antigo. Abra a publicada ou escolha outra na lista."
          acao={<Button variant="outline" size="sm" onClick={() => setParams(new URLSearchParams())}>Abrir a publicada</Button>}
        />
      ) : (
        <>
          <section aria-labelledby="nucleo-versao-titulo" className="rounded-md border border-border bg-card">
            <div className="space-y-2 px-4 pb-3 pt-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h2 id="nucleo-versao-titulo" className="font-croqui-num text-[22px] font-semibold leading-none tabular-nums text-foreground">
                  Versão nº {selecionada.numero}
                </h2>
                <EstadoDaVersao v={selecionada} noAr={estaNoAr} />
              </div>
              {selecionada.nota && <p className="max-w-3xl text-[13.5px] leading-relaxed text-foreground/90">{selecionada.nota}</p>}
              <dl className="flex flex-wrap gap-x-4 gap-y-1 text-2xs text-croqui-soft">
                <div><dt className="inline">criada </dt><dd className="inline font-croqui-num tabular-nums">{dataHora(selecionada.criado_em)}</dd>{selecionada.criado_por_email && <dd className="inline"> por {selecionada.criado_por_email}</dd>}</div>
                <div><dt className="inline">origem </dt><dd className="inline text-foreground">{ORIGEM_DA_VERSAO[selecionada.origem]}</dd>{selecionada.commit_sha && <dd className="inline"> · commit <span className="font-croqui-num">{selecionada.commit_sha.slice(0, 7)}</span></dd>}</div>
                {selecionada.base_versao_id && (
                  <div><dt className="inline">parte da </dt><dd className="inline"><button type="button" className="underline decoration-croqui-rule underline-offset-4 hover:text-foreground" onClick={() => irParaVersao(selecionada.base_versao_id as number)}>nº {lista.find((v) => v.id === selecionada.base_versao_id)?.numero ?? selecionada.base_versao_id}</button></dd></div>
                )}
                <div><dt className="inline">hash </dt><dd className="inline font-croqui-num tabular-nums" title={selecionada.hash}>{hashCurto(selecionada.hash)}</dd></div>
                {texto != null && <div><dd className="inline font-croqui-num tabular-nums">{numero(texto.length)}</dd><dt className="inline"> caracteres</dt></div>}
                {selecionada.aprovada_em && <div><dt className="inline">aprovada </dt><dd className="inline font-croqui-num tabular-nums">{dataHora(selecionada.aprovada_em)}</dd>{selecionada.aprovada_por_email && <dd className="inline"> por {selecionada.aprovada_por_email}</dd>}</div>}
                {selecionada.publicada_em && <div><dt className="inline">publicada </dt><dd className="inline font-croqui-num tabular-nums">{dataHora(selecionada.publicada_em)}</dd>{selecionada.publicada_por_email && <dd className="inline"> por {selecionada.publicada_por_email}</dd>}</div>}
              </dl>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
              {podeAprovar && (
                <Button size="sm" onClick={() => aprovar.mutate(selecionada)} disabled={aprovar.isPending}>
                  {aprovar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
                  Aprovar
                </Button>
              )}
              {podePublicar && (
                <Button size="sm" variant={podeAprovar ? 'outline' : 'default'} onClick={() => setPublicando(true)}>
                  <Rocket className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Publicar
                </Button>
              )}
              {podeReverter && (
                <Button size="sm" variant="outline" onClick={() => setConfirmar('reverter')} disabled={texto == null}>
                  <Undo2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Reverter para esta
                </Button>
              )}
              {!estaNoAr && atualId && (
                <Button size="sm" variant="outline" onClick={() => mudarParams({ aba: 'comparar', base: String(atualId) })}>
                  <GitCompare className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Comparar com a publicada
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={pedirRevisao} disabled={texto == null || (baseDaRevisao != null && conteudoDaBase.isFetching && !conteudoDaBase.data)}>
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Pedir revisão ao copiloto
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setTestando(true)}>
                <FlaskConical className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Testar antes de aplicar
              </Button>
              <Button size="sm" variant="ghost" onClick={baixar} disabled={texto == null}>
                <Download className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Baixar o arquivo
              </Button>
              {podeDescartar && (
                <Button size="sm" variant="ghost" className="sm:ml-auto" onClick={() => setConfirmar('descartar')}>
                  <CircleSlash className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Descartar
                </Button>
              )}
            </div>
          </section>

          <div>
            <FaixaDeAbas ativa={aba} className="border-b border-border">
              <Chip ativo={aba === 'ler'} onClick={() => mudarParams({ aba: null, base: null })}>Ler por seções</Chip>
              <Chip ativo={aba === 'comparar'} onClick={() => mudarParams({ aba: 'comparar' })}>Comparar versões</Chip>
            </FaixaDeAbas>
            <div className="pt-5">
              {aba === 'comparar' ? (
                <Comparar
                  versoes={lista}
                  baseId={baseId}
                  comparadaId={selecionada.id}
                  aoMudar={({ base, comparada }) => mudarParams({ versao: String(comparada), base: String(base), aba: 'comparar' })}
                />
              ) : conteudo.isPending ? (
                <Carregando texto={`Lendo a versão nº ${selecionada.numero}`} />
              ) : conteudo.isError ? (
                <Erro mensagem={conteudo.error.message} tentar={() => void conteudo.refetch()} />
              ) : texto == null ? (
                <Vazio Icone={FileQuestion} titulo="O texto desta versão não veio do banco" descricao="Recarregue a página. Se continuar, a linha pode ter sido apagada." />
              ) : (
                <Leitura conteudo={texto} aoEditar={setEditando} />
              )}
            </div>
          </div>
        </>
      )}

      {editando && selecionada && (
        <EditarSecao
          secao={editando}
          base={{ id: selecionada.id, numero: selecionada.numero }}
          baseAtrasada={baseAtrasada}
          salvando={criar.isPending}
          aoFechar={() => setEditando(null)}
          aoSalvar={(secao, miolo, nota) => criar.mutateAsync({ secao, miolo, nota })}
        />
      )}

      {publicando && selecionada && (
        <PublicarDialog
          versao={selecionada}
          anterior={atual.data ?? null}
          pendencia={pendenciaDoNo(configs.data)}
          marcando={publicar.isPending}
          aoBaixar={baixar}
          aoMarcar={() => publicar.mutateAsync(selecionada)}
          aoFechar={() => setPublicando(false)}
        />
      )}

      {testando && selecionada && <TestarDialog versao={selecionada} aoBaixar={baixar} aoFechar={() => setTestando(false)} />}

      <AlertDialog open={confirmar !== null} onOpenChange={(v) => { if (!v && !descartar.isPending && !reverter.isPending) setConfirmar(null); }}>
        <AlertDialogContent>
          {confirmar === 'descartar' && selecionada && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base">Descartar a versão nº {selecionada.numero}?</AlertDialogTitle>
                <AlertDialogDescription className="text-[13px] leading-relaxed">
                  Ela sai das propostas, mas continua no histórico e pode voltar com “Reverter para esta”. Nada muda no que está no ar.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={descartar.isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction disabled={descartar.isPending} onClick={(e) => { e.preventDefault(); descartar.mutate(selecionada); }}>
                  {descartar.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Descartar
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {confirmar === 'reverter' && selecionada && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base">Reverter o núcleo para a versão nº {selecionada.numero}?</AlertDialogTitle>
                <AlertDialogDescription className="text-[13px] leading-relaxed">
                  Nasce uma versão nova, em rascunho, com o texto da nº {selecionada.numero} e a nota “{notaDaReversao(selecionada.numero)}”.
                  Nada muda no ar até você publicar essa versão nova.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={reverter.isPending}>Cancelar</AlertDialogCancel>
                <AlertDialogAction disabled={reverter.isPending} onClick={(e) => { e.preventDefault(); reverter.mutate(selecionada); }}>
                  {reverter.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null} Criar a versão revertida
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <p className="text-2xs leading-relaxed text-croqui-soft">
        O banco só sabe o que foi marcado como publicado. O que a Bruna roda de verdade é o nó “Montar contexto v3” no n8n, e quem confere os dois é a
        subida pelo repositório. Ajuste que não precisa mexer no núcleo cabe numa{' '}
        <Link to={ROTAS.instrucoes} className="underline decoration-croqui-rule underline-offset-4 hover:text-foreground">orientação</Link> ou numa entrada da{' '}
        <Link to={ROTAS.base} className="underline decoration-croqui-rule underline-offset-4 hover:text-foreground">base</Link>.
      </p>
    </div>
  );
}
