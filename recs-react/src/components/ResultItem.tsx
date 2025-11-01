import { Material } from '../types';
import { MatchResult } from '../algorithms';

interface ResultItemProps {
  material: Material;
  score: number;
  breakdown: {
    content: number;
    structure: number;
    trope: number;
    transform: number;
  };
  match: MatchResult;
}

const formatValue = (value: number): string => value.toFixed(2);

export const ResultItem = ({ material, score, breakdown, match }: ResultItemProps) => {
  return (
    <li className="result-item">
      <div className="result-header">
        <h3>{material.title}</h3>
        <div className="badges">
          <span className="badge">{material.type}</span>
          <span className="badge">{material.genre}</span>
          {match.learning_opportunity && <span className="badge highlight">Зона роста</span>}
        </div>
        <div className="score">Скор: {formatValue(score)}</div>
      </div>
      <div className="breakdown">
        <span>Контент: {formatValue(breakdown.content)}</span>
        <span>Структура: {formatValue(breakdown.structure)}</span>
        <span>Тропы: {formatValue(breakdown.trope)}</span>
        <span>Трансформация: {formatValue(breakdown.transform)}</span>
      </div>
      {match.explanation.length > 0 && (
        <details>
          <summary>Пояснения</summary>
          <ul>
            {match.explanation.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
};

export default ResultItem;
