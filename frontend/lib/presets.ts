import type { GenerationPreset, PresetName } from "@/types/generation";

export const PRESETS: Record<PresetName, GenerationPreset> = {
  creative: {
    label: "Creative",
    description: "Longer, more surprising completions.",
    params: {
      max_new_tokens: 200,
      temperature: 1.1,
      top_k: 80,
      repetition_penalty: 1.1,
    },
  },
  balanced: {
    label: "Balanced",
    description: "Good default for most prompts.",
    params: {
      max_new_tokens: 150,
      temperature: 0.8,
      top_k: 50,
      repetition_penalty: 1.2,
    },
  },
  focused: {
    label: "Focused",
    description: "More deterministic and concise.",
    params: {
      max_new_tokens: 100,
      temperature: 0.5,
      top_k: 20,
      repetition_penalty: 1.3,
    },
  },
  conservative: {
    label: "Conservative",
    description: "Shortest and most controlled.",
    params: {
      max_new_tokens: 80,
      temperature: 0.35,
      top_k: 10,
      repetition_penalty: 1.5,
    },
  },
};

export const DEFAULT_PARAMS = PRESETS.balanced.params;

export const EXAMPLE_PROMPTS = [
  "Aseară, în centrul capitalei, a avut loc un eveniment neașteptat",
  "Într-un laborator de inteligență artificială din București, cercetătorii au descoperit",
  "Pe măsură ce trenul se apropia de munți, Ana și-a dat seama că",
  "Primarul a anunțat astăzi un nou proiect pentru modernizarea orașului",
];
