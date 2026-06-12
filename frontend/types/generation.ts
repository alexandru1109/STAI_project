export type GenerateRequest = {
  prompt: string;
  max_new_tokens: number;
  temperature: number;
  top_k: number;
  repetition_penalty: number;
};

export type GenerateResponse = {
  generated_text: string;
  tokens_generated: number;
  time_seconds: number;
  tokens_per_second: number;
  device: "GPU" | "CPU" | string;
};

export type HealthResponse = {
  status: "ok" | string;
  model_loaded: boolean;
  cuda_available: boolean;
  device: string;
};

export type ApiErrorPayload = {
  detail?: string;
  error?: string;
};

export type PresetName = "creative" | "balanced" | "focused" | "conservative";

export type GenerationPreset = {
  label: string;
  description: string;
  params: Omit<GenerateRequest, "prompt">;
};

export type GenerationRecord = {
  id: string;
  createdAt: string;
  prompt: string;
  request: GenerateRequest;
  response: GenerateResponse;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  prompt: string;
  params: Omit<GenerateRequest, "prompt">;
  records: GenerationRecord[];
};
