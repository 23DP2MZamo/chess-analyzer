const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type ApiErrorBody = { message?: string | string[]; error?: string };

export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  const body = (await response.json().catch(() => null)) as ApiErrorBody | T | null;
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'message' in body ? body.message : null;
    throw new ApiError(
      Array.isArray(message) ? message.join(', ') : (message ?? 'Neizdevās sazināties ar serveri.'),
      response.status,
    );
  }
  return body as T;
}
