// Leitura e escrita da área Bairros foco: chaves do react-query, consultas e
// as ações do gestor. As RPCs de escrita já auditam por dentro
// (gestor_bairro_foco_*): nada aqui chama auditarGestor.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { db, rpc, ErroDoBanco } from '@/gerenciador/lib/db';
import { avisoDoDesfeito, daPraca, moverNaLista, nadaMudouNoBanco, nomeDaMudanca, ordenarPracas } from './regras';
import type {
  MudancaNoHistorico, PainelDoFoco, Praca, ResultadoDoDesfazer, ResultadoDoSalvar, ResultadoDoTeste, Simulacao, TipoDoFoco,
} from './tipos';

/** Período do painel (leads e pedidos fora do foco). */
export const DIAS_DO_PAINEL = 90;
/** Período da simulação: quem mudaria de situação entre os leads destes dias. */
export const DIAS_DA_SIMULACAO = 180;
export const LIMITE_DO_HISTORICO = 50;

export const chaves = {
  pracas: ['gerenciador', 'bairros', 'pracas'] as const,
  contagens: ['gerenciador', 'bairros', 'contagens'] as const,
  pendencia: ['gerenciador', 'bairros', 'pendencia-do-contexto'] as const,
  /** Tudo o que uma mudança na praça deixa velho: painel, histórico e o teste de bairro. */
  praca: (praca: string) => ['gerenciador', 'bairros', praca] as const,
  painel: (praca: string, dias: number) => ['gerenciador', 'bairros', praca, 'painel', dias] as const,
  historico: (praca: string, comSincronizacoes: boolean) => ['gerenciador', 'bairros', praca, 'historico', { comSincronizacoes }] as const,
  teste: (praca: string, bairro: string, cidade: string) => ['gerenciador', 'bairros', praca, 'teste', { bairro, cidade }] as const,
  /** Fora do prefixo da praça: remover não pode pedir de novo a simulação do item que acabou de sair. */
  remocao: (praca: string, tipo: TipoDoFoco, nome: string) => ['gerenciador', 'bairros', 'simular-remocao', { praca, tipo, nome }] as const,
};

/**
 * A mensagem do toast. PGRST202 é o PostgREST dizendo que a função não está no
 * banco: hoje, remover e desfazer, que vêm na migration 20261105040200 (ainda
 * não aplicada; tem DELETE e espera a confirmação do dono). Em vez do inglês do
 * PostgREST, a frase diz o que falta. Quando a migration entrar, o ramo não
 * acontece mais.
 */
export const mensagemDeErro = (e: unknown): string => {
  if (e instanceof ErroDoBanco && (e.detalhe as { code?: string } | undefined)?.code === 'PGRST202') {
    return 'Remover e desfazer ainda não funcionam: falta aplicar no banco a migration 20261105040200 (remover e desfazer). Nada foi mudado.';
  }
  return e instanceof Error && e.message ? e.message : 'não deu certo';
};

/** As praças com consultoria, lidas de bruna_regioes. */
export function usePracas() {
  return useQuery({
    queryKey: chaves.pracas,
    queryFn: async (): Promise<Praca[]> => {
      const { data, error } = await db.from('bruna_regioes').select('region, nome, oferece_consultoria').eq('oferece_consultoria', true);
      if (error) throw new ErroDoBanco(error.message, error);
      return ordenarPracas(((data ?? []) as Array<Praca & { oferece_consultoria: boolean }>).map(({ region, nome }) => ({ region, nome })));
    },
    staleTime: 5 * 60_000,
  });
}

/** Quantos itens cada praça tem na lista (bairros e cidades). */
export function useContagens() {
  return useQuery({
    queryKey: chaves.contagens,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await db.from('bruna_bairros_foco').select('region');
      if (error) throw new ErroDoBanco(error.message, error);
      const n: Record<string, number> = {};
      for (const linha of (data ?? []) as Array<{ region: string }>) n[linha.region] = (n[linha.region] ?? 0) + 1;
      return n;
    },
    staleTime: 60_000,
  });
}

export function usePainel(praca: string | null) {
  return useQuery({
    queryKey: chaves.painel(praca ?? '', DIAS_DO_PAINEL),
    queryFn: () => rpc<PainelDoFoco>('bruna_gestor_bairros_foco_painel', { p_region: praca, p_dias: DIAS_DO_PAINEL }),
    enabled: Boolean(praca),
    staleTime: 30_000,
  });
}

interface PendenciaDoGerenciador { codigo: string; resolvida: boolean }

/**
 * Enquanto o nó "Montar contexto v3" não sobe ao n8n, o texto da lista no
 * prompt ainda sai do REGIOES embutido. A pendência mora em
 * bruna_gestor_config (chave pendencias, codigo n8n_montar_contexto).
 */
export function usePendenciaDoContexto() {
  return useQuery({
    queryKey: chaves.pendencia,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await db.from('bruna_gestor_config').select('valor').eq('chave', 'pendencias').maybeSingle();
      if (error) throw new ErroDoBanco(error.message, error);
      const lista = Array.isArray(data?.valor) ? (data.valor as PendenciaDoGerenciador[]) : [];
      return lista.some((p) => p?.codigo === 'n8n_montar_contexto' && !p.resolvida);
    },
    staleTime: 5 * 60_000,
  });
}

/** As 50 mudanças mais recentes da praça; sem as sincronizações do repositório, a não ser que se peça. */
export function useHistorico(praca: string, comSincronizacoes: boolean) {
  return useQuery({
    queryKey: chaves.historico(praca, comSincronizacoes),
    queryFn: async (): Promise<MudancaNoHistorico[]> => {
      let consulta = db.from('bruna_bairros_foco_historico').select('*').eq('region', praca);
      if (!comSincronizacoes) consulta = consulta.eq('origem', 'gestor');
      const { data, error } = await consulta
        .order('feito_em', { ascending: false })
        .order('id', { ascending: false })
        .limit(LIMITE_DO_HISTORICO);
      if (error) throw new ErroDoBanco(error.message, error);
      return (data ?? []) as MudancaNoHistorico[];
    },
    staleTime: 30_000,
  });
}

export interface ConsultaDoTeste {
  bairro: string;
  cidade: string;
}

/** A decisão real (bruna_v4_foco_do_bairro) para um bairro escrito como o cliente escreveria. */
export function useTesteDoBairro(praca: string, consulta: ConsultaDoTeste | null) {
  return useQuery({
    queryKey: chaves.teste(praca, consulta?.bairro ?? '', consulta?.cidade ?? ''),
    queryFn: () => rpc<ResultadoDoTeste>('bruna_gestor_bairro_foco_testar', {
      p_region: praca,
      p_bairro: consulta?.bairro,
      p_cidade: consulta?.cidade || null,
    }),
    enabled: Boolean(consulta?.bairro),
    retry: false,
  });
}

/** Quem deixaria o foco se o item saísse da lista. Nada fica gravado. */
export function useSimulacaoDaRemocao(praca: string, item: { tipo: TipoDoFoco; nome: string } | null) {
  return useQuery({
    queryKey: chaves.remocao(praca, item?.tipo ?? 'bairro', item?.nome ?? ''),
    queryFn: () => rpc<Simulacao>('bruna_gestor_bairro_foco_simular', {
      p_acao: 'remover',
      p_region: praca,
      p_tipo: item?.tipo,
      p_nome: item?.nome,
      p_dias: DIAS_DA_SIMULACAO,
    }),
    enabled: Boolean(item),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
}

/** O item como o diálogo propõe: o que decide quem é foco. */
export interface MudancaProposta {
  tipo: TipoDoFoco;
  nome: string;
  soSe: string[];
  naoSe: string[];
  /** null ao criar; o nome atual ao editar. */
  nomeOriginal: string | null;
  tipoOriginal: TipoDoFoco | null;
}

export interface ItemParaSalvar extends MudancaProposta {
  observacao: string | null;
  /** Só ao criar: entra logo depois deste item do mesmo tipo; null = no fim. */
  depoisDe: string | null;
  motivo: string | null;
}

/** Simula criar ou alterar um item. Nada fica gravado. */
export function useSimularMudanca(praca: string) {
  return useMutation({
    mutationFn: (m: MudancaProposta) => rpc<Simulacao>('bruna_gestor_bairro_foco_simular', {
      p_acao: 'salvar',
      p_region: praca,
      p_tipo: m.tipo,
      p_nome: m.nome,
      p_so_se: m.soSe,
      p_nao_se: m.naoSe,
      p_nome_original: m.nomeOriginal,
      p_tipo_original: m.tipoOriginal,
      p_dias: DIAS_DA_SIMULACAO,
    }),
  });
}

/**
 * As mudanças na lista da praça. Cada uma recarrega a praça (painel,
 * histórico, teste), as contagens das praças e os leads (o estado do bairro
 * de cada lead sai desta lista), e dá um toast curto.
 */
export function useAcoesDoFoco(praca: string, nomeDaPraca: string) {
  const qc = useQueryClient();
  const recarregar = () => {
    qc.invalidateQueries({ queryKey: chaves.praca(praca) });
    qc.invalidateQueries({ queryKey: chaves.contagens });
    qc.invalidateQueries({ queryKey: ['gerenciador', 'leads'] });
  };
  const aoFalhar = (e: unknown) => { toast.error(mensagemDeErro(e)); };

  const salvar = useMutation({
    mutationFn: (v: ItemParaSalvar) => rpc<ResultadoDoSalvar>('bruna_gestor_bairro_foco_salvar', {
      p_region: praca,
      p_tipo: v.tipo,
      p_nome: v.nome,
      p_so_se: v.soSe,
      p_nao_se: v.naoSe,
      p_observacao: v.observacao,
      p_nome_original: v.nomeOriginal,
      p_tipo_original: v.tipoOriginal,
      p_depois_de: v.depoisDe,
      p_motivo: v.motivo,
    }),
    onSuccess: (r, v) => {
      // Recarrega também quando nada mudou: a tela estava com a lista velha.
      recarregar();
      if (nadaMudouNoBanco(r)) {
        toast.info(r?.avisos?.find((a) => typeof a === 'string' && a.trim()) ?? 'Nada mudou: o item já estava assim.');
        return;
      }
      const nome = r?.item?.nome ?? v.nome;
      toast.success(r?.acao === 'criado' ? `${nome} entrou na lista ${daPraca(nomeDaPraca)}.` : `Mudança em ${nome} salva.`);
    },
    onError: aoFalhar,
  });

  const chaveDoPainel = chaves.painel(praca, DIAS_DO_PAINEL);
  const mover = useMutation({
    mutationFn: (v: { tipo: TipoDoFoco; nome: string; depoisDe: string | null }) => rpc<{ ok: boolean }>('bruna_gestor_bairro_foco_mover', {
      p_region: praca,
      p_tipo: v.tipo,
      p_nome: v.nome,
      p_depois_de: v.depoisDe,
    }),
    // A lista anda na hora; se o banco recusar, volta como estava.
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: chaveDoPainel });
      const antes = qc.getQueryData<PainelDoFoco>(chaveDoPainel);
      if (antes) qc.setQueryData<PainelDoFoco>(chaveDoPainel, { ...antes, itens: moverNaLista(antes.itens, v.tipo, v.nome, v.depoisDe) });
      return { antes };
    },
    onError: (e, _v, contexto) => {
      if (contexto?.antes) qc.setQueryData(chaveDoPainel, contexto.antes);
      aoFalhar(e);
    },
    onSuccess: () => { toast.success('Ordem salva.', { id: 'bairros-foco-ordem' }); },
    onSettled: () => { qc.invalidateQueries({ queryKey: chaves.praca(praca) }); },
  });

  const remover = useMutation({
    mutationFn: (v: { tipo: TipoDoFoco; nome: string; motivo: string | null }) => rpc<{ ok: boolean }>('bruna_gestor_bairro_foco_remover', {
      p_region: praca,
      p_tipo: v.tipo,
      p_nome: v.nome,
      p_motivo: v.motivo,
    }),
    onSuccess: (_r, v) => { recarregar(); toast.success(`${v.nome} saiu da lista ${daPraca(nomeDaPraca)}.`); },
    onError: aoFalhar,
  });

  const desfazer = useMutation({
    mutationFn: (h: MudancaNoHistorico) => rpc<ResultadoDoDesfazer>('bruna_gestor_bairro_foco_desfazer', { p_historico_id: h.id }),
    onSuccess: (r, h) => { recarregar(); toast.success(avisoDoDesfeito(r?.acao ?? '', nomeDaMudanca(h))); },
    onError: aoFalhar,
  });

  return { salvar, mover, remover, desfazer };
}

export type AcoesDoFoco = ReturnType<typeof useAcoesDoFoco>;
