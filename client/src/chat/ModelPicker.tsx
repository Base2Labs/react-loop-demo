import { useEffect, useState } from "react";

const CUSTOM = "__custom__";

/** Fetches the curated model list and owns the current selection. */
export function useModels() {
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState<string>("");

  useEffect(() => {
    fetch("/api/models")
      .then((res) => res.json())
      .then((body: { models: string[]; defaultModel: string }) => {
        setModels(body.models);
        setModel((current) => current || body.defaultModel);
      })
      .catch(() => {});
  }, []);

  return { models, model, setModel };
}

interface Props {
  models: string[];
  model: string;
  onChange: (model: string) => void;
  disabled: boolean;
}

/** Curated dropdown + free-text escape hatch for any OpenRouter model id. */
export function ModelPicker({ models, model, onChange, disabled }: Props) {
  const [customMode, setCustomMode] = useState(false);

  if (customMode) {
    return (
      <input
        className="model-custom"
        placeholder="openrouter model id…"
        disabled={disabled}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const id = e.currentTarget.value.trim();
            if (id) {
              onChange(id);
              setCustomMode(false);
            }
          }
          if (e.key === "Escape") setCustomMode(false);
        }}
      />
    );
  }

  const known = models.includes(model);
  return (
    <select
      className="model-picker"
      value={known ? model : model || ""}
      disabled={disabled}
      onChange={(e) => {
        if (e.target.value === CUSTOM) setCustomMode(true);
        else onChange(e.target.value);
      }}
    >
      {!known && model && <option value={model}>{model}</option>}
      {models.map((id) => (
        <option key={id} value={id}>
          {id}
        </option>
      ))}
      <option value={CUSTOM}>Custom…</option>
    </select>
  );
}
