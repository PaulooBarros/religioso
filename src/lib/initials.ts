/** Avatar initials: "Maria Clara" -> "MC". */
export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((p) => p[0] ?? "")
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}
