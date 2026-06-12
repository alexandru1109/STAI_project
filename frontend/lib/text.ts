export function getContinuation(prompt: string, generatedText: string) {
  const normalizedPrompt = prompt.trim();
  const idx = generatedText.indexOf(normalizedPrompt);

  if (idx === -1) {
    return {
      promptPart: normalizedPrompt,
      continuation: generatedText,
      matchedPrompt: false,
    };
  }

  return {
    promptPart: generatedText.slice(0, idx + normalizedPrompt.length),
    continuation: generatedText.slice(idx + normalizedPrompt.length),
    matchedPrompt: true,
  };
}

export function formatNumber(value: number, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0";
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
