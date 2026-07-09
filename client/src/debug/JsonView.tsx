/** Pretty-print a value; JSON-looking strings are re-indented for readability. */
export function pretty(value: unknown): string {
  if (typeof value === "string") {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

export function JsonView({ value }: { value: unknown }) {
  return <pre className="json-view">{pretty(value)}</pre>;
}
