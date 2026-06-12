type EmptyStateProps = {
  onExample: (prompt: string) => void;
  examples: string[];
};

export function EmptyState({ onExample, examples }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-mark" aria-hidden="true"><span className="brand-flag" /></div>
      <p className="eyebrow">No generations yet</p>
      <h2>Write a Romanian prompt.</h2>
      <p>Choose an example or write your own opening line.</p>
      <div className="example-grid" aria-label="Example prompts">
        {examples.map((example) => (
          <button key={example} type="button" onClick={() => onExample(example)}>
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
