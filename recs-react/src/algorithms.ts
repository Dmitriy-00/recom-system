import { Material, Profile, TropeItem, UsageType } from './types';

export const LS_PROFILE = 'meta_tropes_profile_v1';
export const LS_DATA = 'meta_tropes_materials_v1';
export const LS_AUTOLOAD = 'meta_tropes_autoload_enabled_v1';

export const defaultProfile: Profile = {
  meta_awareness_level: 5,
  tolerance_for_deconstruction: 5,
  needs_reconstruction: 5,
  genre_literacy: {},
  trope_fatigue: [],
  trope_interest: []
};

const isBrowser = typeof window !== 'undefined';

const safeJSONParse = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('Failed to parse JSON from localStorage', error);
    return null;
  }
};

export const clamp = (value: number, min = 0, max = 10): number => {
  if (Number.isNaN(value)) return clamp(min, min, max);
  return Math.min(max, Math.max(min, value));
};

export const round2 = (value: number): number => Math.round(value * 100) / 100;

export const normalize10 = (x: number): number => {
  const safe = Number.isFinite(x) ? x : 0;
  return round2(1 / (1 + Math.exp(-safe / 3)) * 10);
};

export const toNumberAny = (input: unknown, def = 0): number => {
  if (typeof input === 'number') {
    return clamp(input);
  }
  if (typeof input === 'string') {
    const raw = input.trim();
    if (!raw) return def;
    if (raw.endsWith('%')) {
      const percent = Number.parseFloat(raw.slice(0, -1).replace(',', '.'));
      const result = percent / 10;
      return Number.isNaN(result) ? def : clamp(result);
    }
    if (raw.includes('/')) {
      const [numStr, denStr] = raw.split('/').map((part) => part.trim());
      const num = Number.parseFloat(numStr.replace(',', '.'));
      const den = Number.parseFloat(denStr.replace(',', '.')) || 1;
      const result = den !== 0 ? (num / den) * 10 : num;
      return Number.isNaN(result) ? def : clamp(result);
    }
    const normalized = raw.replace(',', '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isNaN(parsed) ? def : clamp(parsed);
  }
  return def;
};

type TropeAliases = {
  keys: string[];
  assign: (target: Partial<TropeItem>, value: unknown) => void;
};

const tropeAliases: TropeAliases[] = [
  {
    keys: ['trope_id', 'id', 'slug', 'троп', 'троп_id'],
    assign: (target, value) => {
      if (value == null) return;
      target.trope_id = String(value);
    }
  },
  {
    keys: ['name', 'название', 'title'],
    assign: (target, value) => {
      if (value == null) return;
      target.name = String(value);
    }
  },
  {
    keys: ['usage_type', 'type', 'тип', 'использование'],
    assign: (target, value) => {
      if (value == null) return;
      const normalized = String(value).toLowerCase() as UsageType;
      const allowed: UsageType[] = ['straight', 'deconstruction', 'reconstruction', 'subversion', 'meta'];
      target.usage_type = allowed.includes(normalized) ? normalized : undefined;
    }
  },
  {
    keys: ['awareness', 'осознанность'],
    assign: (target, value) => {
      target.awareness = toNumberAny(value);
    }
  },
  {
    keys: ['execution', 'исполнение', 'skill', 'overall_skill'],
    assign: (target, value) => {
      target.execution = toNumberAny(value);
    }
  },
  {
    keys: ['cognitive_load', 'нагрузка', 'cognitive', 'complexity'],
    assign: (target, value) => {
      target.cognitive_load = toNumberAny(value);
    }
  },
  {
    keys: ['transformation_potential', 'depth', 'глубина'],
    assign: (target, value) => {
      target.transformation_potential = toNumberAny(value);
    }
  }
];

export const coerceTropeItem = (raw: unknown): TropeItem | null => {
  if (raw == null || typeof raw !== 'object') {
    console.warn('coerceTropeItem: invalid input', raw);
    return null;
  }
  const candidate: Partial<TropeItem> = {};
  const source = raw as Record<string, unknown>;
  tropeAliases.forEach(({ keys, assign }) => {
    keys.forEach((key) => {
      if (key in source) {
        assign(candidate, source[key]);
      }
    });
  });
  if (!candidate.trope_id) {
    if (candidate.name) {
      candidate.trope_id = candidate.name.toLowerCase().replace(/\s+/g, '_');
      console.warn('coerceTropeItem: generated trope_id from name', candidate.name);
    } else {
      console.warn('coerceTropeItem: missing trope_id');
      return null;
    }
  }
  return {
    trope_id: candidate.trope_id,
    name: candidate.name,
    usage_type: candidate.usage_type,
    awareness: candidate.awareness ?? 0,
    execution: candidate.execution ?? 0,
    cognitive_load: candidate.cognitive_load ?? 0,
    transformation_potential: candidate.transformation_potential ?? 0
  };
};

export const loadProfile = (): Profile => {
  if (!isBrowser) return { ...defaultProfile };
  const stored = safeJSONParse<Profile>(localStorage.getItem(LS_PROFILE));
  if (!stored) {
    return { ...defaultProfile };
  }
  return {
    ...defaultProfile,
    ...stored,
    genre_literacy: stored.genre_literacy || {},
    trope_fatigue: Array.isArray(stored.trope_fatigue) ? stored.trope_fatigue : [],
    trope_interest: Array.isArray(stored.trope_interest) ? stored.trope_interest : []
  };
};

export const saveProfile = (profile: Profile): void => {
  if (!isBrowser) return;
  localStorage.setItem(LS_PROFILE, JSON.stringify(profile));
};

export const loadMaterials = (): Material[] => {
  if (!isBrowser) return [];
  const stored = safeJSONParse<Material[]>(localStorage.getItem(LS_DATA));
  if (!stored) return [];
  return stored.map((material) => ({
    ...material,
    analyzed_tropes: Array.isArray(material.analyzed_tropes)
      ? material.analyzed_tropes
          .map((item) => coerceTropeItem(item))
          .filter((item): item is TropeItem => Boolean(item))
      : []
  }));
};

export const saveMaterials = (materials: Material[]): void => {
  if (!isBrowser) return;
  localStorage.setItem(LS_DATA, JSON.stringify(materials));
};

export const uniqById = <T extends { id: string }>(items: T[]): T[] => {
  const map = new Map<string, T>();
  items.forEach((item) => {
    if (item.id) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
};

export interface MatchResult {
  trope_engagement_score: number;
  explanation: string[];
  learning_opportunity: boolean;
}

export const matchTropeEngagement = (material: Material, profile: Profile): MatchResult => {
  let score = 0;
  const explanation: string[] = [];

  const fatigueSet = new Set(profile.trope_fatigue.map((t) => t.toLowerCase().trim()).filter(Boolean));
  const interestSet = new Set(profile.trope_interest.map((t) => t.toLowerCase().trim()).filter(Boolean));

  const tropes = (material.analyzed_tropes || []).map((item) => coerceTropeItem(item)!).filter(Boolean);

  tropes.forEach((trope) => {
    const nameKey = (trope.name || trope.trope_id).toLowerCase();
    if (fatigueSet.has(nameKey)) {
      if (trope.usage_type === 'straight') {
        score -= 3;
        explanation.push(`Троп «${trope.name || trope.trope_id}» уже надоел и используется напрямую.`);
      } else if (trope.usage_type) {
        score += 2;
        explanation.push(`Троп «${trope.name || trope.trope_id}» устал, но форма использования (${trope.usage_type}) может оживить интерес.`);
      }
    }
    if (interestSet.has(nameKey) && (trope.execution ?? 0) >= 7) {
      score += 3;
      explanation.push(`Интересующий троп «${trope.name || trope.trope_id}» хорошо исполнен (⩾7).`);
    }
  });

  const sophisticationRequired = toNumberAny(
    material.expectation_work?.audience_sophistication_required,
    0
  );
  const metaLevel = profile.meta_awareness_level;
  let learningOpportunity = sophisticationRequired === metaLevel + 1;

  if (sophisticationRequired <= metaLevel) {
    score += 2;
    explanation.push('Уровень мета-грамотности материала соответствует профилю зрителя.');
  } else if (sophisticationRequired > metaLevel + 2) {
    score -= 2;
    explanation.push('Материал требует слишком высокой мета-грамотности по сравнению с профилем.');
  } else {
    score += 1;
    explanation.push('Материал немного превосходит текущий уровень мета-грамотности — потенциал роста.');
  }

  const deconstructionTropes = tropes.filter((trope) => trope.usage_type === 'deconstruction');
  if (deconstructionTropes.length > 0) {
    const avgTransformation =
      deconstructionTropes.reduce((sum, trope) => sum + (trope.transformation_potential ?? 0), 0) /
      deconstructionTropes.length;
    if (avgTransformation > 7 && profile.tolerance_for_deconstruction < 5) {
      score -= 2;
      explanation.push('Сильная деконструкция может быть дискомфортна при низкой толерантности.');
    } else if (profile.tolerance_for_deconstruction >= 7) {
      score += 2;
      explanation.push('Высокая толерантность к деконструкциям делает материал более подходящим.');
    }
  }

  const hasReconstruction = tropes.some((trope) => trope.usage_type === 'reconstruction');
  const metaAwarenessMaterial = toNumberAny(material.trope_engagement?.meta_awareness, 0);
  if (profile.needs_reconstruction >= 7 && !hasReconstruction && metaAwarenessMaterial > 6) {
    score -= 1;
    explanation.push('Профиль нуждается в реконструкции, но материал не предлагает её явно.');
  }

  const genreRequirement = toNumberAny(material.difficulty_factors?.requires_genre_literacy, 0);
  const userGenreLevel = toNumberAny(profile.genre_literacy[material.genre], 0);
  if (genreRequirement > userGenreLevel + 2) {
    score -= 1;
    explanation.push('Материал требует большей жанровой грамотности.');
  }

  return {
    trope_engagement_score: score,
    explanation,
    learning_opportunity
  };
};

export const calculateRecommendationScore = (material: Material, profile: Profile): number => {
  const { trope_engagement_score, explanation } = matchTropeEngagement(material, profile);
  const contentFit =
    material.content_fit ?? Math.max(0, 10 - toNumberAny(material.difficulty_factors?.requires_genre_literacy, 0));
  const structuralFit =
    material.structural_fit ?? Math.max(0, 10 - toNumberAny(material.difficulty_factors?.requires_meta_thinking, 0));
  const transformationScore = toNumberAny(material.transformation_score, 0);

  const transformationDepth = toNumberAny(material.trope_engagement?.transformation_depth, 0);
  const metaAwareness = toNumberAny(material.trope_engagement?.meta_awareness, 0);

  let bonus = 0;
  if (transformationDepth >= 7) bonus += 1;
  if (metaAwareness >= 8) bonus += 0.5;

  const adjustedTransformation = clamp(transformationScore + bonus, 0, 10);
  const normalizedTrope = normalize10(trope_engagement_score);

  const finalScore =
    contentFit * 0.3 + structuralFit * 0.3 + normalizedTrope * 0.2 + adjustedTransformation * 0.2;

  if (!Number.isFinite(finalScore)) {
    console.warn('calculateRecommendationScore: non-finite result', {
      material,
      explanation
    });
    return 0;
  }

  return round2(finalScore);
};
