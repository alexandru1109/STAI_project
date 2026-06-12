export function ErrorCard({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="error-card" role="alert">
      <div>
        <strong>Generation failed</strong>
        <code>{message}</code>
      </div>
      <button type="button" className="ghost-btn" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  );
}
