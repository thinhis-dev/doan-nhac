const KEY = "doan-nhac-session";

/**
 * The secret that lets this tab take its room seat back after a reconnect or a reload.
 * It lives in sessionStorage, so each tab has its own. Storage failures are ignored.
 */
export function readSessionToken(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveSessionToken(token: string): void {
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    // Blocked storage: a reload then starts as a new player, as before.
  }
}

export function clearSessionToken(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
}
