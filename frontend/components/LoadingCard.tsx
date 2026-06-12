export function LoadingCard({ maxTokens, canCancel, onCancel }: { maxTokens: number; canCancel: boolean; onCancel: () => void }) {
  return (
    <div className="spinner-card" role="status" aria-live="polite">
      <div className="line-spinner" aria-hidden="true" />
      <div className="spinner-text">
        Generating up to {maxTokens} tokens…
        <small>The backend returns one completed response, so the motion reflects request progress.</small>
      </div>
      {canCancel ? (
        <button type="button" className="ghost-btn cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      ) : null}
    </div>
  );
}
