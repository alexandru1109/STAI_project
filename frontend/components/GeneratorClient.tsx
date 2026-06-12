"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { generateText, fetchHealth, loadModel } from "@/lib/api";
import { DEFAULT_PARAMS, EXAMPLE_PROMPTS, PRESETS } from "@/lib/presets";
import type {
  Conversation,
  GenerateRequest,
  GenerationRecord,
  HealthResponse,
  PresetName,
} from "@/types/generation";
import { EmptyState } from "./EmptyState";
import { ErrorCard } from "./ErrorCard";
import { LoadingCard } from "./LoadingCard";
import { OutputCard } from "./OutputCard";
import { Sidebar } from "./Sidebar";
import { StatusPill } from "./StatusPill";
import type { StatusKind } from "./StatusPill";

const STORAGE_KEY = "stai-next-ui-state-v3";
const LEGACY_STORAGE_KEY = "stai-next-ui-state-v2";
const MAX_HISTORY_ITEMS = 40;
const MAX_CONVERSATIONS = 30;
const MAX_PROMPT_CHARS = 2000;

type StoredState = {
  activeConversationId: string;
  conversations: Conversation[];
};

type LegacyStoredState = {
  prompt?: string;
  params?: Omit<GenerateRequest, "prompt">;
  records?: GenerationRecord[];
};

type GeneratorClientProps = {
  initialConversationId?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function createConversation(
  title = "Untitled conversation",
  prompt = "",
): Conversation {
  const timestamp = nowIso();

  return {
    id: crypto.randomUUID(),
    title,
    createdAt: timestamp,
    updatedAt: timestamp,
    prompt,
    params: DEFAULT_PARAMS,
    records: [],
  };
}

function titleFromPrompt(prompt: string) {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  if (!normalized) return "Untitled conversation";
  return normalized.length > 56
    ? `${normalized.slice(0, 56).trim()}…`
    : normalized;
}

function sortConversations(conversations: Conversation[]) {
  return [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function normalizeConversation(
  conversation: Partial<Conversation>,
): Conversation {
  const fallback = createConversation();
  const records = Array.isArray(conversation.records)
    ? conversation.records.slice(0, MAX_HISTORY_ITEMS)
    : [];
  const prompt =
    typeof conversation.prompt === "string"
      ? conversation.prompt.slice(0, MAX_PROMPT_CHARS)
      : "";
  const title =
    typeof conversation.title === "string" && conversation.title.trim()
      ? conversation.title.trim().slice(0, 64)
      : titleFromPrompt(prompt);

  return {
    id: typeof conversation.id === "string" ? conversation.id : fallback.id,
    title,
    createdAt:
      typeof conversation.createdAt === "string"
        ? conversation.createdAt
        : fallback.createdAt,
    updatedAt:
      typeof conversation.updatedAt === "string"
        ? conversation.updatedAt
        : fallback.updatedAt,
    prompt,
    params: { ...DEFAULT_PARAMS, ...(conversation.params ?? {}) },
    records,
  };
}

function readStoredState(initialConversationId?: string): StoredState {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (raw) {
    const stored = JSON.parse(raw) as Partial<StoredState>;
    const conversations = Array.isArray(stored.conversations)
      ? sortConversations(
          stored.conversations.map(normalizeConversation),
        ).slice(0, MAX_CONVERSATIONS)
      : [];

    if (conversations.length) {
      const storedActiveId =
        typeof stored.activeConversationId === "string"
          ? stored.activeConversationId
          : conversations[0].id;
      const activeConversationId = conversations.some(
        (item) => item.id === initialConversationId,
      )
        ? (initialConversationId as string)
        : conversations.some((item) => item.id === storedActiveId)
          ? storedActiveId
          : conversations[0].id;

      return { activeConversationId, conversations };
    }
  }

  const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacyRaw) {
    const legacy = JSON.parse(legacyRaw) as LegacyStoredState;
    const conversation = normalizeConversation({
      title: legacy.records?.[0]?.prompt
        ? titleFromPrompt(legacy.records[0].prompt)
        : "Imported conversation",
      prompt: typeof legacy.prompt === "string" ? legacy.prompt : "",
      params: legacy.params,
      records: legacy.records,
    });

    return {
      activeConversationId: conversation.id,
      conversations: [conversation],
    };
  }

  const conversation = createConversation();
  return {
    activeConversationId: conversation.id,
    conversations: [conversation],
  };
}

export function GeneratorClient({
  initialConversationId,
}: GeneratorClientProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState("");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [statusText, setStatusText] = useState("Connecting…");
  const [statusKind, setStatusKind] = useState<StatusKind>("loading");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    try {
      const stored = readStoredState(initialConversationId);
      setConversations(stored.conversations);
      setActiveConversationId(stored.activeConversationId);
      if (
        initialConversationId &&
        initialConversationId !== stored.activeConversationId
      ) {
        router.replace(`/conversations/${stored.activeConversationId}`);
      }
    } catch {
      const conversation = createConversation();
      setConversations([conversation]);
      setActiveConversationId(conversation.id);
    } finally {
      setIsHydrated(true);
    }
  }, [initialConversationId, router]);

  useEffect(() => {
    if (!isHydrated || !conversations.length || !activeConversationId) return;
    const state: StoredState = {
      activeConversationId,
      conversations: sortConversations(conversations).slice(
        0,
        MAX_CONVERSATIONS,
      ),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [activeConversationId, conversations, isHydrated]);

  const activeConversation = useMemo(() => {
    return (
      conversations.find(
        (conversation) => conversation.id === activeConversationId,
      ) ??
      conversations[0] ??
      null
    );
  }, [activeConversationId, conversations]);

  const prompt = activeConversation?.prompt ?? "";
  const params = activeConversation?.params ?? DEFAULT_PARAMS;
  const records = activeConversation?.records ?? [];

  const updateConversation = useCallback(
    (
      conversationId: string,
      updater: (conversation: Conversation) => Conversation,
    ) => {
      setConversations((current) => {
        const next = current.map((conversation) =>
          conversation.id === conversationId
            ? updater(conversation)
            : conversation,
        );
        return sortConversations(next).slice(0, MAX_CONVERSATIONS);
      });
    },
    [],
  );

  const refreshHealth = useCallback(async () => {
    const controller = new AbortController();
    try {
      const data = await fetchHealth(controller.signal);
      setHealth(data);
      if (data.model_loaded) {
        setStatusKind("ready");
        setStatusText(`Model ready · ${data.cuda_available ? "GPU" : "CPU"}`);
      } else {
        setStatusKind("warning");
        setStatusText("Server online · model not loaded");
      }
    } catch {
      setHealth(null);
      setStatusKind("offline");
      setStatusText("Server offline");
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
    const id = window.setInterval(refreshHealth, 5000);
    return () => window.clearInterval(id);
  }, [refreshHealth]);

  const activePreset = useMemo<PresetName | "custom">(() => {
    const entry = (
      Object.entries(PRESETS) as [PresetName, (typeof PRESETS)[PresetName]][]
    ).find(([, preset]) => {
      return (
        preset.params.max_new_tokens === params.max_new_tokens &&
        preset.params.temperature === params.temperature &&
        preset.params.top_k === params.top_k &&
        preset.params.repetition_penalty === params.repetition_penalty
      );
    });

    return entry?.[0] ?? "custom";
  }, [params]);

  function setActivePrompt(value: string) {
    if (!activeConversation) return;
    const nextPrompt = value.slice(0, MAX_PROMPT_CHARS);
    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      prompt: nextPrompt,
      updatedAt: nowIso(),
    }));
  }

  function updateParam<K extends keyof Omit<GenerateRequest, "prompt">>(
    key: K,
    value: GenerateRequest[K],
  ) {
    if (!activeConversation) return;
    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      params: { ...conversation.params, [key]: value },
      updatedAt: nowIso(),
    }));
  }

  function applyPreset(name: PresetName) {
    if (!activeConversation) return;
    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      params: PRESETS[name].params,
      updatedAt: nowIso(),
    }));
  }

  function createNewConversation() {
    const conversation = createConversation();
    setConversations((current) =>
      [conversation, ...current].slice(0, MAX_CONVERSATIONS),
    );
    setActiveConversationId(conversation.id);
    setError(null);
    router.push(`/conversations/${conversation.id}`);
    window.setTimeout(() => promptRef.current?.focus(), 0);
  }

  function selectConversation(conversationId: string) {
    setActiveConversationId(conversationId);
    setError(null);
    router.push(`/conversations/${conversationId}`);
  }

  function deleteConversation(conversationId: string) {
    setConversations((current) => {
      if (current.length <= 1) return current;
      const remaining = current.filter(
        (conversation) => conversation.id !== conversationId,
      );
      if (conversationId === activeConversationId) {
        const nextActive = remaining[0];
        setActiveConversationId(nextActive.id);
        router.push(`/conversations/${nextActive.id}`);
      }
      return remaining;
    });
  }

  function renameConversation(conversationId: string, title: string) {
    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      title: title.trim().slice(0, 64) || conversation.title,
      updatedAt: nowIso(),
    }));
  }

  async function preloadModel() {
    setIsLoadingModel(true);
    setError(null);
    setStatusKind("loading");
    setStatusText("Loading model…");

    try {
      await loadModel();
      await refreshHealth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Model load failed.");
      setStatusKind("offline");
      setStatusText("Model load failed");
    } finally {
      setIsLoadingModel(false);
    }
  }

  async function submitGeneration(overrides?: Partial<GenerateRequest>) {
    const targetConversation = activeConversation;
    const trimmedPrompt = (
      overrides?.prompt ??
      targetConversation?.prompt ??
      ""
    ).trim();
    if (!targetConversation || !trimmedPrompt || isGenerating) {
      promptRef.current?.focus();
      return;
    }

    const request: GenerateRequest = {
      prompt: trimmedPrompt,
      max_new_tokens:
        overrides?.max_new_tokens ?? targetConversation.params.max_new_tokens,
      temperature:
        overrides?.temperature ?? targetConversation.params.temperature,
      top_k: overrides?.top_k ?? targetConversation.params.top_k,
      repetition_penalty:
        overrides?.repetition_penalty ??
        targetConversation.params.repetition_penalty,
    };

    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setIsGenerating(true);
    setStatusKind("loading");
    setStatusText("Generating…");

    try {
      const response = await generateText(request, controller.signal);
      const nextRecord: GenerationRecord = {
        id: crypto.randomUUID(),
        createdAt: nowIso(),
        prompt: request.prompt,
        request,
        response,
      };

      updateConversation(targetConversation.id, (conversation) => ({
        ...conversation,
        title:
          conversation.records.length === 0 &&
          conversation.title === "Untitled conversation"
            ? titleFromPrompt(request.prompt)
            : conversation.title,
        prompt: request.prompt,
        params: {
          max_new_tokens: request.max_new_tokens,
          temperature: request.temperature,
          top_k: request.top_k,
          repetition_penalty: request.repetition_penalty,
        },
        records: [nextRecord, ...conversation.records].slice(
          0,
          MAX_HISTORY_ITEMS,
        ),
        updatedAt: nowIso(),
      }));
      setStatusKind("ready");
      setStatusText("Ready");
      void refreshHealth();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(
          "Request cancelled in the browser. The FastAPI process may still finish its current computation.",
        );
        setStatusKind(health?.model_loaded ? "ready" : "warning");
        setStatusText(
          health?.model_loaded ? "Ready" : "Server online · model not loaded",
        );
      } else {
        setError(err instanceof Error ? err.message : "Generation failed.");
        setStatusKind("offline");
        setStatusText("Generation failed");
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }

  function cancelGeneration() {
    abortRef.current?.abort();
  }

  function rerun(record: GenerationRecord) {
    if (!activeConversation) return;
    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      prompt: record.prompt,
      params: {
        max_new_tokens: record.request.max_new_tokens,
        temperature: record.request.temperature,
        top_k: record.request.top_k,
        repetition_penalty: record.request.repetition_penalty,
      },
      updatedAt: nowIso(),
    }));
    void submitGeneration(record.request);
  }

  function continueFromRecord(record: GenerationRecord) {
    const nextPrompt = record.response.generated_text.slice(-MAX_PROMPT_CHARS);
    setActivePrompt(nextPrompt);
    window.setTimeout(() => promptRef.current?.focus(), 0);
  }

  function deleteRecord(recordId: string) {
    if (!activeConversation) return;
    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      records: conversation.records.filter((record) => record.id !== recordId),
      updatedAt: nowIso(),
    }));
  }

  function clearHistory() {
    if (!activeConversation) return;
    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      records: [],
      updatedAt: nowIso(),
    }));
    setError(null);
  }

  function clearPrompt() {
    setActivePrompt("");
    promptRef.current?.focus();
  }

  function useExample(example: string) {
    setActivePrompt(example);
    promptRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      void submitGeneration();
    }
  }

  const canGenerate = prompt.trim().length > 0 && !isGenerating;
  if (!isHydrated || !activeConversation) {
    return (
      <div className="app-shell boot-shell">
        <main className="boot-panel">
          <div className="line-spinner" aria-hidden="true" />
          <p>Loading interface…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span className="brand-flag" />
          </div>
          <div>
            <p className="eyebrow">Special Topics in Artificial Intelligence</p>
            <h1>News Generator</h1>
          </div>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="secondary-btn compact"
            onClick={() => void refreshHealth()}
          >
            Sync backend
          </button>
          <StatusPill kind={statusKind} label={statusText} health={health} />
        </div>
      </header>

      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversation.id}
        params={params}
        activePreset={activePreset}
        health={health}
        isLoadingModel={isLoadingModel}
        onNewConversation={createNewConversation}
        onSelectConversation={selectConversation}
        onDeleteConversation={deleteConversation}
        onRenameConversation={renameConversation}
        onParamChange={updateParam}
        onPreset={applyPreset}
        onLoadModel={() => void preloadModel()}
      />

      <main className="main-panel">
        <section className="prompt-panel" aria-label="Prompt controls">
          <div className="prompt-heading-row">
            <h2>{activeConversation.title}</h2>
            <span
              className={
                prompt.length > MAX_PROMPT_CHARS * 0.9
                  ? "char-counter warning"
                  : "char-counter"
              }
            >
              {prompt.length}/{MAX_PROMPT_CHARS}
            </span>
          </div>

          <textarea
            ref={promptRef}
            id="prompt"
            value={prompt}
            maxLength={MAX_PROMPT_CHARS}
            placeholder="Aseară, în centrul capitalei, a avut loc un eveniment…"
            onChange={(event) => setActivePrompt(event.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className="prompt-actions">
            <button
              type="button"
              className="primary-btn"
              disabled={!canGenerate}
              onClick={() => void submitGeneration()}
            >
              {isGenerating ? "Generating…" : "Generate text"}
              <span className="shortcut">Ctrl/⌘ Enter</span>
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={clearPrompt}
              disabled={!prompt}
            >
              Clear prompt
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={clearHistory}
              disabled={!records.length && !error}
            >
              Clear conversation
            </button>
          </div>
        </section>

        <section className="output-panel" aria-label="Generation output">
          <div className="output-toolbar">
            <h2>Results</h2>
          </div>

          {isGenerating ? (
            <LoadingCard
              maxTokens={params.max_new_tokens}
              canCancel
              onCancel={cancelGeneration}
            />
          ) : null}
          {error ? (
            <ErrorCard message={error} onDismiss={() => setError(null)} />
          ) : null}

          {records.length === 0 && !isGenerating && !error ? (
            <EmptyState examples={EXAMPLE_PROMPTS} onExample={useExample} />
          ) : null}

          <div className="results-stack">
            {records.map((record, index) => (
              <OutputCard
                key={record.id}
                record={record}
                index={records.length - index - 1}
                onRerun={rerun}
                onContinue={continueFromRecord}
                onDelete={deleteRecord}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
