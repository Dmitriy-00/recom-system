import { useRef, useState } from 'react';
import { LS_AUTOLOAD, LS_DATA, LS_PROFILE, coerceTropeItem } from '../algorithms';
import { Material, TropeItem } from '../types';
import { mdToMaterial } from '../utils/yaml';

interface ImportPanelProps {
  onImportMaterials: (materials: Material[]) => void;
  onClearMaterials: () => void;
  autoloadStatus: string;
  onAutoloadStatusChange: (status: string) => void;
}

const parseJSONFile = async (file: File): Promise<Material[]> => {
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) {
      console.warn('JSON должен содержать массив материалов');
      return [];
    }
    return data
      .map((item) => {
        const base = item as Material;
        const tropes: TropeItem[] = Array.isArray(base.analyzed_tropes)
          ? base.analyzed_tropes
              .map((trope) => coerceTropeItem(trope))
              .filter((trope): trope is TropeItem => Boolean(trope))
          : [];
        return { ...base, analyzed_tropes: tropes };
      })
      .filter((material) => Boolean(material.id && material.title));
  } catch (error) {
    console.warn('Не удалось распарсить JSON', error);
    return [];
  }
};

const parseMarkdownFiles = async (files: File[]): Promise<Material[]> => {
  const results: Material[] = [];
  for (const file of files) {
    const content = await file.text();
    const material = mdToMaterial(content);
    if (material) {
      results.push(material);
    }
  }
  return results;
};

const demoMaterials: Material[] = [
  {
    id: 'inception-2010',
    title: 'Inception',
    type: 'film',
    genre: 'sci-fi',
    trope_engagement: {
      meta_awareness: 8,
      overall_skill: 9,
      transformation_depth: 8
    },
    analyzed_tropes: [
      {
        trope_id: 'dream-within-dream',
        name: 'Dream Within a Dream',
        usage_type: 'deconstruction',
        awareness: 8,
        execution: 9,
        cognitive_load: 7,
        transformation_potential: 9
      },
      {
        trope_id: 'heist-team',
        name: 'Heist Team',
        usage_type: 'reconstruction',
        awareness: 7,
        execution: 8,
        cognitive_load: 6,
        transformation_potential: 7
      }
    ],
    expectation_work: {
      audience_sophistication_required: 7,
      genre_expectations: 'Игры с восприятием и структурой сна'
    },
    difficulty_factors: {
      requires_genre_literacy: 6,
      requires_meta_thinking: 7
    },
    transformation_score: 8.5,
    content_fit: 8,
    structural_fit: 7.5
  },
  {
    id: 'game-of-thrones-s1',
    title: 'Game of Thrones — Season 1',
    type: 'show',
    genre: 'fantasy',
    trope_engagement: {
      meta_awareness: 6,
      overall_skill: 8,
      transformation_depth: 7
    },
    analyzed_tropes: [
      {
        trope_id: 'noble-protagonist',
        name: 'Noble Protagonist',
        usage_type: 'subversion',
        awareness: 7,
        execution: 8,
        cognitive_load: 5,
        transformation_potential: 8
      },
      {
        trope_id: 'political-intrigue',
        name: 'Political Intrigue',
        usage_type: 'straight',
        awareness: 6,
        execution: 8,
        cognitive_load: 7,
        transformation_potential: 7
      }
    ],
    expectation_work: {
      audience_sophistication_required: 6,
      genre_expectations: 'Деконструкция героического фэнтези'
    },
    difficulty_factors: {
      requires_genre_literacy: 5,
      requires_meta_thinking: 6
    },
    transformation_score: 7.5,
    content_fit: 7,
    structural_fit: 7.2
  }
];

export const ImportPanel = ({
  onImportMaterials,
  onClearMaterials,
  autoloadStatus,
  onAutoloadStatusChange
}: ImportPanelProps) => {
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const mdInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setDragging] = useState(false);

  const handleJsonChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const materials = await parseJSONFile(file);
    onImportMaterials(materials);
    event.target.value = '';
  };

  const handleMarkdownChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const materials = await parseMarkdownFiles(files);
    onImportMaterials(materials);
    event.target.value = '';
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files || []).filter((file) => file.name.endsWith('.md'));
    if (files.length === 0) return;
    const materials = await parseMarkdownFiles(files);
    onImportMaterials(materials);
  };

  const toggleAutoload = (enabled: boolean) => {
    localStorage.setItem(LS_AUTOLOAD, String(enabled));
    onAutoloadStatusChange(enabled ? 'on' : 'off');
  };

  const retryAutoload = () => {
    const enabled = localStorage.getItem(LS_AUTOLOAD);
    if (enabled === 'false') {
      console.warn('Автозагрузка отключена, включите её перед повторной попыткой.');
      return;
    }
    onAutoloadStatusChange('pending');
  };

  const handleClearLocalStorage = () => {
    localStorage.removeItem(LS_PROFILE);
    localStorage.removeItem(LS_DATA);
    window.location.reload();
  };

  return (
    <section className="card">
      <header>
        <h2>Импорт материалов</h2>
      </header>
      <div className="field">
        <button type="button" onClick={() => jsonInputRef.current?.click()}>
          Импорт JSON
        </button>
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleJsonChange}
        />
      </div>
      <div className="field">
        <button type="button" onClick={() => mdInputRef.current?.click()}>
          Импорт Markdown
        </button>
        <input
          ref={mdInputRef}
          type="file"
          accept=".md"
          multiple
          style={{ display: 'none' }}
          onChange={handleMarkdownChange}
        />
      </div>
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
        onDrop={handleDrop}
      >
        Перетащите .md файлы сюда
      </div>
      <div className="field">
        <button type="button" onClick={() => onImportMaterials(demoMaterials)}>
          Загрузить демо-набор
        </button>
      </div>
      <div className="field">
        <button type="button" className="secondary" onClick={() => {
          localStorage.removeItem(LS_DATA);
          onClearMaterials();
        }}>
          Очистить базу
        </button>
      </div>
      <div className="field">
        <button type="button" className="danger" onClick={handleClearLocalStorage}>
          Очистить LocalStorage
        </button>
      </div>
      <div className="field">
        <h3>Настройки автозагрузки</h3>
        <div className="actions">
          <button type="button" onClick={retryAutoload}>
            Повторить
          </button>
          <button type="button" className="secondary" onClick={() => toggleAutoload(false)}>
            Отключить
          </button>
          <button type="button" onClick={() => toggleAutoload(true)}>
            Включить
          </button>
        </div>
        <small className="status">autoload: {autoloadStatus}</small>
      </div>
    </section>
  );
};

export default ImportPanel;
