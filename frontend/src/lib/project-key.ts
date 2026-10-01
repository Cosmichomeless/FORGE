/** Suggests a project key from its name: ASCII letters and digits, uppercase, starting with a letter, at most 5 characters. */
export function suggestKey(name: string): string {
  return name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toUpperCase()
    .replace(/[^A-Z0-9]+/g, "").replace(/^[0-9]+/, "").slice(0, 5);
}
