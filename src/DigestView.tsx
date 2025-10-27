export function DigestView({
  digest,
  date,
  onBack,
}: {
  digest: { timestamp: string; text: string }[];
  date: Date | null;
  onBack: () => void;
}) {
  const titleDate = date
    ? date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
    : '—';
  return (
    <>
      <div className="top-bar">
        <button className="btn secondary subtle" onClick={onBack}>
          ← Back
        </button>
      </div>
      <h2 style={{ marginBottom: '1rem' }}>Completed Tasks – {titleDate}</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {digest.map((d, i) => (
          <li key={i} style={{ marginBottom: '0.5rem' }}>
            <strong>
              {new Date(d.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </strong>
            {' – '}
            <pre
              className="note-text"
              style={{
                whiteSpace: 'pre-wrap',
                margin: 0,
                fontFamily: 'inherit', // keep consistent look
              }}
            >
              {d.text}
            </pre>
          </li>
        ))}
      </ul>
    </>
  );
}
