interface Props {
  options: string[];
  onPick: (option: string) => void;
}

/** Quick-reply buttons for an ask_user question with fixed choices. */
export function OptionChips({ options, onPick }: Props) {
  return (
    <span className="option-chips">
      {options.map((option) => (
        <button key={option} className="chip" onClick={() => onPick(option)}>
          {option}
        </button>
      ))}
    </span>
  );
}
