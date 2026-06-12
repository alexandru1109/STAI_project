import { getContinuation, formatNumber } from "@/lib/text";
import type { GenerationRecord } from "@/types/generation";

type OutputCardProps = {
  record: GenerationRecord;
  index: number;
  onRerun: (record: GenerationRecord) => void;
  onContinue: (record: GenerationRecord) => void;
  onDelete: (recordId: string) => void;
};

export function OutputCard({ record, index, onRerun, onContinue, onDelete }: OutputCardProps) {
  const split = getContinuation(record.prompt, record.response.generated_text);
  const createdAt = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(record.createdAt));

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <article className="result-card">
      <header className="result-header">
        <div className="result-badge">Result #{index + 1}</div>

        <div className="info-reveal result-stats">
          <button type="button" className="reveal-trigger" aria-label="Show generation statistics">
            Stats
          </button>
          <div className="info-panel stats-panel" role="status" aria-label="Generation statistics">
            <span><strong>{record.response.tokens_generated}</strong> tokens</span>
            <span><strong>{record.response.time_seconds.toFixed(2)}s</strong></span>
            <span><strong>{formatNumber(record.response.tokens_per_second)}</strong> tok/s</span>
            <span>{record.response.device}</span>
            <span>{createdAt}</span>
          </div>
        </div>
      </header>

      <div className="result-prompt" aria-label="Original prompt">
        {record.prompt}
      </div>

      <div className="result-text" aria-label="Generated text">
        <span className="prompt-part">{split.promptPart}</span>
        <span className="generated-part">{split.continuation}</span>
      </div>

      <footer className="result-footer">
        <div className="result-actions">
          <button type="button" className="ghost-btn" onClick={() => copy(record.response.generated_text)}>
            Copy full text
          </button>
          <button type="button" className="ghost-btn" onClick={() => copy(split.continuation.trim())}>
            Copy continuation
          </button>
          <button type="button" className="ghost-btn" onClick={() => onContinue(record)}>
            Continue from this
          </button>
          <button type="button" className="ghost-btn" onClick={() => onRerun(record)}>
            Rerun
          </button>
          <button type="button" className="ghost-btn" onClick={() => onDelete(record.id)}>
            Delete
          </button>
        </div>

        <div className="info-reveal result-parameters">
          <button type="button" className="reveal-trigger" aria-label="Show generation parameters">
            Params
          </button>
          <div className="info-panel params-panel" role="status" aria-label="Generation parameters">
            <span>T={record.request.temperature.toFixed(2)}</span>
            <span>K={record.request.top_k}</span>
            <span>rep={record.request.repetition_penalty.toFixed(2)}</span>
          </div>
        </div>
      </footer>
    </article>
  );
}
