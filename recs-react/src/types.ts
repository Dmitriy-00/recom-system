export type UsageType = 'straight' | 'deconstruction' | 'reconstruction' | 'subversion' | 'meta';

export interface TropeItem {
  trope_id: string;
  name?: string;
  usage_type?: UsageType;
  awareness?: number;
  execution?: number;
  cognitive_load?: number;
  transformation_potential?: number;
}

export interface Material {
  id: string;
  title: string;
  type: 'film' | 'book' | 'game' | 'show' | 'material';
  genre: string;
  trope_engagement?: {
    meta_awareness?: number;
    overall_skill?: number;
    transformation_depth?: number;
  };
  analyzed_tropes?: TropeItem[];
  expectation_work?: {
    audience_sophistication_required?: number;
    genre_expectations?: string;
  };
  difficulty_factors?: {
    requires_genre_literacy?: number;
    requires_meta_thinking?: number;
  };
  transformation_score?: number;
  content_fit?: number;
  structural_fit?: number;
}

export interface Profile {
  meta_awareness_level: number;
  tolerance_for_deconstruction: number;
  needs_reconstruction: number;
  genre_literacy: Record<string, number>;
  trope_fatigue: string[];
  trope_interest: string[];
}
