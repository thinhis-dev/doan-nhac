const KEY = "lastName";

/** The last player name, kept as a convenience. Storage failures are ignored. */
export function readLastName(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveLastName(name: string): void {
  try {
    localStorage.setItem(KEY, name);
  } catch {
    // Private mode or blocked storage: the name is just not remembered.
  }
}
