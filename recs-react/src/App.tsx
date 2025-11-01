import { useEffect, useMemo, useState } from 'react';
import ProfileCard from './components/ProfileCard';
import ImportPanel from './components/ImportPanel';
import ResultsList from './components/ResultsList';
import {
  LS_AUTOLOAD,
  defaultProfile,
  loadMaterials,
  loadProfile,
  saveMaterials,
  saveProfile,
  uniqById,
  coerceTropeItem
} from './algorithms';
import { Material, Profile, TropeItem } from './types';

const normalizeMaterial = (material: Material): Material => ({
  ...material,
  analyzed_tropes: Array.isArray(material.analyzed_tropes)
    ? material.analyzed_tropes
        .map((trope) => coerceTropeItem(trope))
        .filter((trope): trope is TropeItem => Boolean(trope))
    : []
});

const mergeMaterials = (existing: Material[], incoming: Material[]): Material[] => {
  const normalizedIncoming = incoming.map((material) => normalizeMaterial(material));
  return uniqById([...existing, ...normalizedIncoming]);
};

const fetchMaterials = async (path: string): Promise<Material[]> => {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return [];
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      console.warn('autoload: ожидался массив материалов', path);
      return [];
    }
    return data as Material[];
  } catch (error) {
    console.warn('autoload: не удалось загрузить файл', path, error);
    return [];
  }
};

function App() {
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [materials, setMaterials] = useState<Material[]>(() => loadMaterials());
  const [filterType, setFilterType] = useState<'' | 'film' | 'book' | 'game' | 'show'>('');
  const [sortBy, setSortBy] = useState<'score' | 'meta' | 'transform'>('score');
  const [autoloadStatus, setAutoloadStatus] = useState<string>('pending');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(LS_AUTOLOAD) : null;
    if (stored == null) {
      localStorage.setItem(LS_AUTOLOAD, 'true');
      setAutoloadStatus('pending');
    } else if (stored === 'false') {
      setAutoloadStatus('off');
    } else if (stored === 'true') {
      setAutoloadStatus('pending');
    } else {
      setAutoloadStatus(stored);
    }
  }, []);

  useEffect(() => {
    if (autoloadStatus !== 'pending') return;
    let cancelled = false;
    const enabled = localStorage.getItem(LS_AUTOLOAD);
    if (enabled === 'false') return;

    const loadAuto = async () => {
      const [films, books] = await Promise.all([
        fetchMaterials('/data/films.json'),
        fetchMaterials('/data/books.json')
      ]);
      if (cancelled) return;
      const combined = [...films, ...books].filter(Boolean);
      if (combined.length > 0) {
        setMaterials((prev) => mergeMaterials(prev, combined));
        setAutoloadStatus(`loaded ${combined.length}`);
      } else {
        setAutoloadStatus('none');
      }
    };

    loadAuto();

    return () => {
      cancelled = true;
    };
  }, [autoloadStatus]);

  useEffect(() => {
    saveMaterials(materials);
  }, [materials]);

  const handleProfileChange = (next: Profile) => {
    setProfile(next);
  };

  const handleProfileSave = () => {
    saveProfile(profile);
  };

  const handleProfileReset = () => {
    const reset = { ...defaultProfile };
    setProfile(reset);
    saveProfile(reset);
  };

  const handleImportMaterials = (newMaterials: Material[]) => {
    if (!newMaterials || newMaterials.length === 0) return;
    setMaterials((prev) => mergeMaterials(prev, newMaterials));
  };

  const handleClearMaterials = () => {
    setMaterials([]);
  };

  const distinctTypes = useMemo(() => {
    const types = new Set(materials.map((material) => material.type));
    return ['', ...Array.from(types)] as Array<'' | 'film' | 'book' | 'game' | 'show'>;
  }, [materials]);

  return (
    <div className="app-grid">
      <div className="left-column">
        <ProfileCard profile={profile} onChange={handleProfileChange} onSave={handleProfileSave} onReset={handleProfileReset} />
        <ImportPanel
          onImportMaterials={handleImportMaterials}
          onClearMaterials={handleClearMaterials}
          autoloadStatus={autoloadStatus}
          onAutoloadStatusChange={setAutoloadStatus}
        />
      </div>
      <div className="right-column">
        <section className="card">
          <header>
            <h2>Фильтры</h2>
          </header>
          <div className="field">
            <label htmlFor="filterType">Тип</label>
            <select
              id="filterType"
              value={filterType}
              onChange={(event) => setFilterType(event.target.value as typeof filterType)}
            >
              <option value="">Все</option>
              {distinctTypes
                .filter((type) => type)
                .map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sortBy">Сортировка</label>
            <select id="sortBy" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}>
              <option value="score">По скору</option>
              <option value="meta">Мета-грамотность</option>
              <option value="transform">Трансформация</option>
            </select>
          </div>
          <small className="status">Материалов: {materials.length}</small>
        </section>
        <ResultsList materials={materials} profile={profile} filterType={filterType} sortBy={sortBy} />
      </div>
    </div>
  );
}

export default App;
