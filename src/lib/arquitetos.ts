// Funil "Arquitetos" — lista manual, alimentada por importação de CSV/PDF.
//
// Três regras o diferenciam dos demais funis:
//  1. não segue a distribuição por DDD (o lead fica em Arquitetos venha de onde vier);
//  2. a Bruna nunca responde — `status` é forçado para 'off' no banco
//     (trigger trg_zz_force_bruna_off_arquitetos) e o toggle some da UI;
//  3. é fechado por role: só quem tem `arquitetos_visualizador` vê a aba,
//     conversa e dispara. O bloqueio de verdade é o RLS (migration
//     20260729193522_arquitetos_role_rls) — esconder a aba é só conforto.

import type { Region } from '@/types/database';

export const ARQUITETOS_REGION: Region = 'arquitetos';

export const ARQUITETOS_LABEL = 'Arquitetos';

export const ARQUITETOS_ROLE = 'arquitetos_visualizador';

export function isArquitetosRegion(region: string | null | undefined): boolean {
  return region === ARQUITETOS_REGION;
}

// ------------------------------------------------------ Tags de posição -----
//
// Cada lead importado é marcado com duas tags:
//  - a posição exata (#37) — tag oculta, para não inchar a lista de tags que é
//    compartilhada por todos os funis;
//  - a faixa de 150 ("Posição 1-150") — tag normal, visível e filtrável.

export const POSITION_RANGE_SIZE = 150;

const RANGE_COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const POSITION_TAG_COLOR = '#6b7280';

export interface TagSpec {
  name: string;
  color: string;
  oculta: boolean;
}

/** Tag da posição exata — oculta das listas de tags. */
export function positionTag(position: number): TagSpec {
  return { name: `#${position}`, color: POSITION_TAG_COLOR, oculta: true };
}

/** Tag da faixa de 150 em que a posição cai — visível. */
export function positionRangeTag(position: number): TagSpec {
  const index = Math.floor((position - 1) / POSITION_RANGE_SIZE);
  const start = index * POSITION_RANGE_SIZE + 1;
  const end = start + POSITION_RANGE_SIZE - 1;
  return {
    name: `Posição ${start}-${end}`,
    color: RANGE_COLORS[index % RANGE_COLORS.length],
    oculta: false,
  };
}

export interface TagPlan {
  /** Todas as tags que precisam existir, sem repetição. */
  tags: TagSpec[];
  /** Nomes das tags de cada lead, indexado pelo telefone canônico. */
  byPhone: Map<string, string[]>;
}

/**
 * Monta as tags de uma importação: quais precisam existir no banco e quais vão
 * para cada lead. Leads sem posição não recebem tag.
 */
export function buildPositionTagPlan(
  leads: Array<{ phone: string | null; position: number | null }>,
): TagPlan {
  const tags = new Map<string, TagSpec>();
  const byPhone = new Map<string, string[]>();

  for (const lead of leads) {
    if (!lead.phone || lead.position === null || !Number.isFinite(lead.position)) continue;

    const specs = [positionTag(lead.position), positionRangeTag(lead.position)];
    for (const spec of specs) {
      if (!tags.has(spec.name)) tags.set(spec.name, spec);
    }
    byPhone.set(lead.phone, specs.map((s) => s.name));
  }

  return { tags: [...tags.values()], byPhone };
}
