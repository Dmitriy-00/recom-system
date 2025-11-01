import { useMemo, useState } from 'react';
import { Profile } from '../types';
import { clamp } from '../algorithms';

interface ProfileCardProps {
  profile: Profile;
  onChange: (profile: Profile) => void;
  onSave: () => void;
  onReset: () => void;
}

const toCsv = (values: string[]): string => values.join(', ');

const fromCsv = (value: string): string[] =>
  value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const ProfileCard = ({ profile, onChange, onSave, onReset }: ProfileCardProps) => {
  const [genreKey, setGenreKey] = useState('');
  const [genreValue, setGenreValue] = useState(5);

  const handleSliderChange = (key: keyof Pick<Profile, 'meta_awareness_level' | 'tolerance_for_deconstruction' | 'needs_reconstruction'>) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      onChange({ ...profile, [key]: clamp(value) });
    };

  const handleGenreCommit = (value: number) => {
    const key = genreKey.trim().toLowerCase();
    if (!key) return;
    onChange({
      ...profile,
      genre_literacy: {
        ...profile.genre_literacy,
        [key]: value
      }
    });
  };

  const existingGenres = useMemo(
    () => Object.entries(profile.genre_literacy).sort(([a], [b]) => a.localeCompare(b)),
    [profile.genre_literacy]
  );

  return (
    <section className="card">
      <header>
        <h2>Профиль зрителя</h2>
      </header>
      <div className="field">
        <label htmlFor="meta_awareness_level">Мета-грамотность: {profile.meta_awareness_level}</label>
        <input
          id="meta_awareness_level"
          type="range"
          min={0}
          max={10}
          step={1}
          value={profile.meta_awareness_level}
          onChange={handleSliderChange('meta_awareness_level')}
        />
      </div>
      <div className="field">
        <label htmlFor="tolerance_for_deconstruction">Толерантность к деконструкциям: {profile.tolerance_for_deconstruction}</label>
        <input
          id="tolerance_for_deconstruction"
          type="range"
          min={0}
          max={10}
          step={1}
          value={profile.tolerance_for_deconstruction}
          onChange={handleSliderChange('tolerance_for_deconstruction')}
        />
      </div>
      <div className="field">
        <label htmlFor="needs_reconstruction">Потребность в реконструкции: {profile.needs_reconstruction}</label>
        <input
          id="needs_reconstruction"
          type="range"
          min={0}
          max={10}
          step={1}
          value={profile.needs_reconstruction}
          onChange={handleSliderChange('needs_reconstruction')}
        />
      </div>

      <div className="field">
        <label htmlFor="genre_key">Жанр</label>
        <input
          id="genre_key"
          type="text"
          placeholder="например, sci-fi"
          value={genreKey}
          onChange={(event) => setGenreKey(event.target.value)}
        />
        <label htmlFor="genre_value">Уровень жанровой грамотности: {genreValue}</label>
        <input
          id="genre_value"
          type="range"
          min={0}
          max={10}
          step={1}
          value={genreValue}
          onChange={(event) => {
            const value = Number(event.target.value);
            setGenreValue(value);
            handleGenreCommit(value);
          }}
          onMouseUp={() => handleGenreCommit(genreValue)}
          onTouchEnd={() => handleGenreCommit(genreValue)}
        />
      </div>

      {existingGenres.length > 0 && (
        <div className="genre-list">
          {existingGenres.map(([key, value]) => (
            <span key={key} className="badge">
              {key}: {value}
            </span>
          ))}
        </div>
      )}

      <div className="field">
        <label htmlFor="trope_fatigue">Тропы усталости</label>
        <input
          id="trope_fatigue"
          type="text"
          placeholder="trope1, trope2"
          value={toCsv(profile.trope_fatigue)}
          onChange={(event) =>
            onChange({
              ...profile,
              trope_fatigue: fromCsv(event.target.value)
            })
          }
        />
      </div>

      <div className="field">
        <label htmlFor="trope_interest">Интересные тропы</label>
        <input
          id="trope_interest"
          type="text"
          placeholder="trope1, trope2"
          value={toCsv(profile.trope_interest)}
          onChange={(event) =>
            onChange({
              ...profile,
              trope_interest: fromCsv(event.target.value)
            })
          }
        />
      </div>

      <div className="actions">
        <button type="button" onClick={onSave}>
          Сохранить профиль
        </button>
        <button type="button" className="secondary" onClick={onReset}>
          Сброс профиля
        </button>
      </div>
    </section>
  );
};

export default ProfileCard;
