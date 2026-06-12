import type { CSSProperties, ChangeEvent } from "react";

export type RangeControlProps = {
  id: string;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  formatter?: (value: number) => string;
  onChange: (value: number) => void;
};

export function RangeControl({
  id,
  label,
  hint,
  min,
  max,
  step,
  value,
  formatter = String,
  onChange,
}: RangeControlProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(Number(event.target.value));
  }

  const progress = ((value - min) / (max - min)) * 100;

  return (
    <label className="param-row" htmlFor={id}>
      <span className="param-header">
        <span className="param-label">{label}</span>
        <span className="param-value">{formatter(value)}</span>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        style={{ "--range-progress": `${progress}%` } as CSSProperties}
      />
      <span className="hint">{hint}</span>
    </label>
  );
}
