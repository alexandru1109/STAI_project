import type { HealthResponse } from "@/types/generation";

export type StatusKind = "offline" | "loading" | "ready" | "warning";

export type StatusPillProps = {
  kind: StatusKind;
  label: string;
  health: HealthResponse | null;
};

export function StatusPill({ kind, label, health }: StatusPillProps) {
  return (
    <div className="status-pill" title={health ? `Device: ${health.device}` : undefined}>
      <span className={`status-dot ${kind}`} />
      <span>{label}</span>
    </div>
  );
}
