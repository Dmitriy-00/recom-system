import { useMemo } from 'react';
import {
  calculateRecommendationScore,
  matchTropeEngagement,
  normalize10,
  toNumberAny,
  clamp
} from '../algorithms';
import { Material, Profile } from '../types';
import ResultItem from './ResultItem';

type SortBy = 'score' | 'meta' | 'transform';

type FilterType = '' | 'film' | 'book' | 'game' | 'show';

interface ResultsListProps {
  materials: Material[];
  profile: Profile;
  filterType: FilterType;
  sortBy: SortBy;
}

interface ComputedMaterial {
  material: Material;
  score: number;
  breakdown: {
    content: number;
    structure: number;
    trope: number;
    transform: number;
  };
  match: ReturnType<typeof matchTropeEngagement>;
}

export const ResultsList = ({ materials, profile, filterType, sortBy }: ResultsListProps) => {
  const computed = useMemo<ComputedMaterial[]>(() => {
    return materials
      .filter((material) => (filterType ? material.type === filterType : true))
      .map((material) => {
        const match = matchTropeEngagement(material, profile);
        const content =
          material.content_fit ?? Math.max(0, 10 - toNumberAny(material.difficulty_factors?.requires_genre_literacy, 0));
        const structure =
          material.structural_fit ?? Math.max(0, 10 - toNumberAny(material.difficulty_factors?.requires_meta_thinking, 0));
        const transformationScore = toNumberAny(material.transformation_score, 0);
        const transformationDepth = toNumberAny(material.trope_engagement?.transformation_depth, 0);
        const metaAwareness = toNumberAny(material.trope_engagement?.meta_awareness, 0);
        let bonus = 0;
        if (transformationDepth >= 7) bonus += 1;
        if (metaAwareness >= 8) bonus += 0.5;
        const adjustedTransformation = clamp(transformationScore + bonus, 0, 10);
        const tropeNormalized = normalize10(match.trope_engagement_score);

        const score = calculateRecommendationScore(material, profile);

        return {
          material,
          score,
          breakdown: {
            content,
            structure,
            trope: tropeNormalized,
            transform: adjustedTransformation
          },
          match: {
            ...match,
            learning_opportunity: match.learning_opportunity
          }
        };
      })
      .sort((a, b) => {
        if (sortBy === 'meta') {
          const aMeta = toNumberAny(a.material.trope_engagement?.meta_awareness, 0);
          const bMeta = toNumberAny(b.material.trope_engagement?.meta_awareness, 0);
          if (bMeta !== aMeta) return bMeta - aMeta;
        } else if (sortBy === 'transform') {
          const diff = b.breakdown.transform - a.breakdown.transform;
          if (diff !== 0) return diff;
        } else {
          if (b.score !== a.score) return b.score - a.score;
        }
        return a.material.title.localeCompare(b.material.title);
      });
  }, [materials, profile, filterType, sortBy]);

  if (computed.length === 0) {
    return (
      <section className="card">
        <header>
          <h2>Результаты</h2>
        </header>
        <p>Материалы не найдены. Импортируйте данные или загрузите демо-набор.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <header>
        <h2>Результаты</h2>
      </header>
      <ul className="results-list">
        {computed.map((item) => (
          <ResultItem key={item.material.id} material={item.material} score={item.score} breakdown={item.breakdown} match={item.match} />
        ))}
      </ul>
    </section>
  );
};

export default ResultsList;
