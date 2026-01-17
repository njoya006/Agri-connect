type TokenKind = "access" | "refresh";

const ACCESS_TOKEN_KEY = "agriconnect.accessToken";
const REFRESH_TOKEN_KEY = "agriconnect.refreshToken";

const storageKeyMap: Record<TokenKind, string> = {
  access: ACCESS_TOKEN_KEY,
  refresh: REFRESH_TOKEN_KEY,
};

const isBrowser = () => typeof window !== "undefined";

export function setToken(kind: TokenKind, value: string) {
  if (!isBrowser()) return;
  localStorage.setItem(storageKeyMap[kind], value);
}

export function getToken(kind: TokenKind): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(storageKeyMap[kind]);
}

export function clearToken(kind?: TokenKind) {
  if (!isBrowser()) return;
  if (kind) {
    localStorage.removeItem(storageKeyMap[kind]);
    return;
  }
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getTokenPair() {
  return {
    access: getToken("access"),
    refresh: getToken("refresh"),
  };
}

export type TokenPair = ReturnType<typeof getTokenPair>;
export type { TokenKind };
