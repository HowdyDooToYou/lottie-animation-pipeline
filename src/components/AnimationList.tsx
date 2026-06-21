import { useCallback, useRef, useState } from 'react';

interface AnimationFile {
  name: string;
  path: string;
  data: Record<string, unknown>;
}

interface AnimationListProps {
  animations: AnimationFile[];
  selected: string | null;
  onSelect: (name: string) => void;
  onLoadFile: (file: File) => void;
}

export function AnimationList({ animations, selected, onSelect, onLoadFile }: AnimationListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.json')) {
        onLoadFile(file);
      }
    },
    [onLoadFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onLoadFile(file);
    },
    [onLoadFile],
  );

  return (
    <div className="animation-list">
      <div
        className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <p>Drop .json here or</p>
        <button onClick={() => fileInputRef.current?.click()}>
          Browse Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
      </div>

      <div className="animation-items">
        {animations.length === 0 && (
          <p className="empty-hint">No animations loaded yet.</p>
        )}
        {animations.map((anim) => (
          <div
            key={anim.name}
            className={`animation-item ${selected === anim.name ? 'selected' : ''}`}
            onClick={() => onSelect(anim.name)}
          >
            <span className="anim-name">{anim.name}</span>
            <span className="anim-meta">
              {(anim.data.w as number)}×{(anim.data.h as number)} · {anim.data.op as number}f
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
