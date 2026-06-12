import { PRESETS } from "@/lib/presets";
import type { Conversation, GenerateRequest, HealthResponse, PresetName } from "@/types/generation";
import { RangeControl } from "./RangeControl";

type SidebarProps = {
  conversations: Conversation[];
  activeConversationId: string;
  params: Omit<GenerateRequest, "prompt">;
  activePreset: PresetName | "custom";
  health: HealthResponse | null;
  isLoadingModel: boolean;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, title: string) => void;
  onParamChange: <K extends keyof Omit<GenerateRequest, "prompt">>(key: K, value: GenerateRequest[K]) => void;
  onPreset: (preset: PresetName) => void;
  onLoadModel: () => void;
};

export function Sidebar({
  conversations,
  activeConversationId,
  params,
  activePreset,
  health,
  isLoadingModel,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onParamChange,
  onPreset,
  onLoadModel,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <section className="sidebar-section conversations-section">
        <div className="section-heading-row">
          <div className="section-label">Conversations</div>
          <button type="button" className="mini-btn" onClick={onNewConversation}>
            New
          </button>
        </div>

        <div className="conversation-list" aria-label="Saved conversations">
          {conversations.map((conversation) => {
            const selected = conversation.id === activeConversationId;
            const date = new Intl.DateTimeFormat(undefined, {
              month: "short",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(conversation.updatedAt));

            return (
              <article key={conversation.id} className={`conversation-item ${selected ? "selected" : ""}`}>
                <button type="button" className="conversation-main" onClick={() => onSelectConversation(conversation.id)}>
                  <span className="conversation-title">{conversation.title}</span>
                </button>

                <div className="conversation-tools" aria-label="Conversation actions">
                  <span className="conversation-info" tabIndex={0}>
                    <span className="conversation-info-trigger">Info</span>
                    <span className="conversation-info-panel">
                      <strong>{conversation.records.length}</strong> result{conversation.records.length === 1 ? "" : "s"} · {date}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Rename"
                    onClick={() => {
                      const nextTitle = window.prompt("Conversation title", conversation.title)?.trim();
                      if (nextTitle) onRenameConversation(conversation.id, nextTitle.slice(0, 64));
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Delete"
                    disabled={conversations.length === 1}
                    onClick={() => {
                      const confirmed = window.confirm("Delete this conversation?");
                      if (confirmed) onDeleteConversation(conversation.id);
                    }}
                  >
                    Del
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="sidebar-section">
        <div className="section-label">Controls</div>

        <RangeControl
          id="max-tokens"
          label="Max new tokens"
          hint="Length of the continuation after your prompt."
          min={10}
          max={512}
          step={10}
          value={params.max_new_tokens}
          onChange={(value) => onParamChange("max_new_tokens", value)}
        />

        <RangeControl
          id="temperature"
          label="Temperature"
          hint="Higher gives more variation; lower stays closer to the most likely tokens."
          min={0.1}
          max={2}
          step={0.05}
          value={params.temperature}
          formatter={(value) => value.toFixed(2)}
          onChange={(value) => onParamChange("temperature", value)}
        />

        <RangeControl
          id="top-k"
          label="Top-K"
          hint="Limits sampling to the most likely next-token candidates."
          min={1}
          max={200}
          step={1}
          value={params.top_k}
          onChange={(value) => onParamChange("top_k", value)}
        />

        <RangeControl
          id="rep-penalty"
          label="Repetition penalty"
          hint="Discourages repeated phrasing. 1.0 turns it off."
          min={1}
          max={2}
          step={0.05}
          value={params.repetition_penalty}
          formatter={(value) => value.toFixed(2)}
          onChange={(value) => onParamChange("repetition_penalty", value)}
        />
      </section>

      <section className="sidebar-section">
        <div className="section-label">Presets</div>
        <div className="preset-grid">
          {(Object.keys(PRESETS) as PresetName[]).map((presetName) => {
            const preset = PRESETS[presetName];
            const selected = activePreset === presetName;

            return (
              <button
                key={presetName}
                type="button"
                className={`preset-btn ${selected ? "selected" : ""}`}
                onClick={() => onPreset(presetName)}
                title={preset.description}
              >
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
        {activePreset === "custom" ? <p className="hint preset-hint">Custom parameter mix.</p> : null}
      </section>

      <section className="sidebar-section">
        <div className="section-label">Model card</div>
        <div className="info-card">
          <InfoRow label="Architecture" value="Decoder-only RoBERTa" />
          <InfoRow label="Vocab" value="32 000" />
          <InfoRow label="d_model" value="768" />
          <InfoRow label="Layers" value="12" />
          <InfoRow label="Heads" value="12" />
          <InfoRow label="Max seq" value="512" />
          <InfoRow label="Parameters" value="~120M" />
          <InfoRow label="Language" value="Romanian" />
        </div>
      </section>

      <section className="sidebar-section">
        <div className="section-label">Backend</div>
        <div className="info-card">
          <InfoRow label="Server" value={health?.status === "ok" ? "Online" : "Offline"} />
          <InfoRow label="Model" value={health?.model_loaded ? "Loaded" : "Not loaded"} />
          <InfoRow label="Device" value={health?.device ?? "—"} />
          <InfoRow label="CUDA" value={health ? (health.cuda_available ? "Available" : "Not available") : "—"} />
        </div>
        <button
          type="button"
          className="secondary-btn full-width"
          onClick={onLoadModel}
          disabled={isLoadingModel || health?.model_loaded === true}
        >
          {isLoadingModel ? "Loading model…" : health?.model_loaded ? "Model ready" : "Preload model"}
        </button>
      </section>
    </aside>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span className="k">{label}</span>
      <span className="v">{value}</span>
    </div>
  );
}
