import { load } from 'js-yaml';
import { Material, TropeItem } from '../types';
import { coerceTropeItem, toNumberAny } from '../algorithms';

const aliasValue = <T = unknown>(source: Record<string, unknown>, aliases: string[], fallback?: T): T | undefined => {
  for (const key of aliases) {
    if (key in source) {
      return source[key] as T;
    }
  }
  return fallback;
};

export const extractFrontmatter = (md: string): string | null => {
  const match = md.match(/^---\s*\n([\s\S]*?)\n---/);
  return match ? match[1] : null;
};

const normalizeString = (value: unknown, def = ''): string => {
  if (value == null) return def;
  return String(value).trim();
};

const normalizeType = (value: unknown): Material['type'] => {
  const mapping: Record<string, Material['type']> = {
    film: 'film',
    movie: 'film',
    фильм: 'film',
    book: 'book',
    novel: 'book',
    книга: 'book',
    game: 'game',
    игра: 'game',
    show: 'show',
    сериал: 'show',
    material: 'material'
  };
  const key = normalizeString(value).toLowerCase();
  return mapping[key] ?? 'material';
};

const normalizeTropeList = (input: unknown): TropeItem[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => coerceTropeItem(item))
    .filter((item): item is TropeItem => Boolean(item));
};

export const yamlToMaterial = (raw: unknown): Material => {
  if (!raw || typeof raw !== 'object') {
    throw new Error('yamlToMaterial: ожидается объект');
  }
  const source = raw as Record<string, unknown>;

  const id = normalizeString(
    aliasValue(source, ['id', 'uid', 'slug', 'identifier', 'код', 'ключ'], ''),
    ''
  );
  const title = normalizeString(aliasValue(source, ['title', 'name', 'название'], ''), '');
  const genre = normalizeString(aliasValue(source, ['genre', 'жанр'], ''), '');

  if (!id || !title) {
    console.warn('yamlToMaterial: отсутствуют id или title', raw);
  }

  const typeValue = normalizeType(aliasValue(source, ['type', 'вид', 'категория', 'format'], 'material'));

  const tropeEngagementRaw = aliasValue<Record<string, unknown>>(source, ['trope_engagement', 'trope', 'engagement']);
  const trope_engagement = tropeEngagementRaw
    ? {
        meta_awareness: toNumberAny(
          aliasValue(tropeEngagementRaw, ['meta_awareness', 'awareness', 'мета'], 0),
          0
        ),
        overall_skill: toNumberAny(aliasValue(tropeEngagementRaw, ['overall_skill', 'skill', 'исполнение'], 0), 0),
        transformation_depth: toNumberAny(
          aliasValue(tropeEngagementRaw, ['transformation_depth', 'depth', 'глубина'], 0),
          0
        )
      }
    : undefined;

  const analyzed_tropes = normalizeTropeList(aliasValue(source, ['analyzed_tropes', 'tropes', 'тропы']));

  const expectationRaw = aliasValue<Record<string, unknown>>(source, ['expectation_work', 'expectations', 'ожидания']);
  const expectation_work = expectationRaw
    ? {
        audience_sophistication_required: toNumberAny(
          aliasValue(expectationRaw, ['audience_sophistication_required', 'sophistication', 'уровень'], 0),
          0
        ),
        genre_expectations: normalizeString(
          aliasValue(expectationRaw, ['genre_expectations', 'ожидания_жанра', 'описание'], ''),
          ''
        )
      }
    : undefined;

  const difficultyRaw = aliasValue<Record<string, unknown>>(source, ['difficulty_factors', 'difficulty', 'сложность']);
  const difficulty_factors = difficultyRaw
    ? {
        requires_genre_literacy: toNumberAny(
          aliasValue(difficultyRaw, ['requires_genre_literacy', 'genre_literacy', 'жанровая_грамотность'], 0),
          0
        ),
        requires_meta_thinking: toNumberAny(
          aliasValue(difficultyRaw, ['requires_meta_thinking', 'meta', 'мета_мышление'], 0),
          0
        )
      }
    : undefined;

  const transformation_score = toNumberAny(
    aliasValue(source, ['transformation_score', 'transform', 'score_transformation'], 0),
    0
  );
  let content_fit = toNumberAny(aliasValue(source, ['content_fit', 'content', 'fit_content'], undefined), 0);
  let structural_fit = toNumberAny(aliasValue(source, ['structural_fit', 'structure', 'fit_structure'], undefined), 0);

  if ((content_fit === 0 || Number.isNaN(content_fit)) && difficulty_factors?.requires_genre_literacy != null) {
    content_fit = Math.max(0, 10 - toNumberAny(difficulty_factors.requires_genre_literacy, 0));
  }
  if ((structural_fit === 0 || Number.isNaN(structural_fit)) && difficulty_factors?.requires_meta_thinking != null) {
    structural_fit = Math.max(0, 10 - toNumberAny(difficulty_factors.requires_meta_thinking, 0));
  }

  const material: Material = {
    id: id || title.toLowerCase().replace(/\s+/g, '-'),
    title,
    type: typeValue,
    genre: genre || 'general',
    trope_engagement,
    analyzed_tropes,
    expectation_work,
    difficulty_factors,
    transformation_score,
    content_fit,
    structural_fit
  };

  if ((!material.analyzed_tropes || material.analyzed_tropes.length === 0) && material.trope_engagement) {
    console.warn('нулевой список тропов — агрегированный троп', material.title);
    material.analyzed_tropes = [
      {
        trope_id: `${material.id}_aggregate`,
        name: 'Aggregated Engagement',
        usage_type: 'meta',
        awareness: material.trope_engagement.meta_awareness ?? 0,
        execution: material.trope_engagement.overall_skill ?? 0,
        cognitive_load: material.difficulty_factors?.requires_meta_thinking ?? 0,
        transformation_potential: material.trope_engagement.transformation_depth ?? 0
      }
    ];
  }

  return material;
};

export const mdToMaterial = (md: string): Material | null => {
  const yamlSection = extractFrontmatter(md);
  if (!yamlSection) {
    console.warn('не найден YAML-фронтматтер');
    return null;
  }
  const parsed = load(yamlSection);
  if (!parsed || typeof parsed !== 'object') {
    console.warn('YAML не содержит объекта материала');
    return null;
  }
  try {
    return yamlToMaterial(parsed);
  } catch (error) {
    console.warn('Ошибка преобразования YAML в материал', error);
    return null;
  }
};
