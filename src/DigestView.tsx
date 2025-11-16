import { DigestEntry } from './models/digestEntry';

export interface DigestViewProps {
  digest: DigestEntry[];
  date: Date | null;
  onBack: () => void;
}

export function DigestView({ digest, date, onBack }: DigestViewProps) {
  const titleDate = date
    ? date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
    : '—';

  return (
    <>
      <div className="top-bar digest">
        <button className="btn secondary subtle" onClick={onBack}>
          ← Back
        </button>
      </div>
      <h2 className="digest-title">Completed Tasks – {titleDate}</h2>
      <ul className="digest-list">
        {digest.map((d, i) => (
          <li key={i} className="digest-item">
            <strong className="digest-time">
              {new Date(d.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </strong>
            {' – '}
            <pre className="note-text">{d.text}</pre>
          </li>
        ))}
      </ul>
    </>
  );
}
