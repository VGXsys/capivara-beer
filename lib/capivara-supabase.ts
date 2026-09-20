export const CAPIVARA_SUPABASE_URL = "https://rgoymrxnnsfukqnohdoe.supabase.co";
export const CAPIVARA_SUPABASE_KEY = "sb_publishable_nYUz2kWGIIPB7ANCLKP0NA_1micYp0b";

export type CapivaraSession = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  user: { id: string; email?: string | null };
};

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

function headers(token?: string, extra?: HeadersInit): HeadersInit {
  return {
    apikey: CAPIVARA_SUPABASE_KEY,
    Authorization: `Bearer ${token ?? CAPIVARA_SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function parseResponse(response: Response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.msg || data?.error_description || data?.error || `Erro ${response.status}`;
    throw new Error(message);
  }
  return data;
}

export async function capivaraPublic(path: string, init?: RequestInit) {
  const response = await fetch(`${CAPIVARA_SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: headers(undefined, init?.headers),
    cache: "no-store",
  });
  return parseResponse(response);
}

export async function capivaraAuthed(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${CAPIVARA_SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: headers(token, init?.headers),
    cache: "no-store",
  });
  return parseResponse(response);
}

export async function capivaraRpc<T = unknown>(name: string, body: Json, token?: string): Promise<T> {
  const response = await fetch(`${CAPIVARA_SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return parseResponse(response);
}

export async function capivaraSignIn(email: string, password: string): Promise<CapivaraSession> {
  const response = await fetch(`${CAPIVARA_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  return parseResponse(response);
}

export async function capivaraSignUp(email: string, password: string): Promise<CapivaraSession | { user: { id: string; email?: string | null }; session: CapivaraSession | null }> {
  const response = await fetch(`${CAPIVARA_SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });
  return parseResponse(response);
}
