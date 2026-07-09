import { useState, type FormEvent } from "react";

interface Props {
  disabled: boolean;
  placeholder: string;
  onSend: (prompt: string) => void;
}

export function PromptBar({ disabled, placeholder, onSend }: Props) {
  const [value, setValue] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const prompt = value.trim();
    if (!prompt || disabled) return;
    setValue("");
    onSend(prompt);
  };

  return (
    <form className="prompt-form" onSubmit={submit}>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus
      />
      <button type="submit" disabled={disabled || !value.trim()}>
        Send
      </button>
    </form>
  );
}
