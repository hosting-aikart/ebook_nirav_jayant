/**
 * Calls the store's backend. Same address as the site: in development Vite forwards /api
 * to the backend (vite.config.ts); in production the backend serves the site itself.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: Record<string, unknown> | null,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; file?: Blob; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (options.file) {
    body = options.file;
    headers["Content-Type"] = options.file.type || "application/octet-stream";
  } else if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    headers["Content-Type"] = "application/json";
  }
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  let res: Response;
  try {
    res = await fetch(path, { method: options.method ?? (body ? "POST" : "GET"), headers, body });
  } catch {
    throw new ApiError(0, "Can't reach the store right now. Please check your connection and try again.", null);
  }
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) {
    // No JSON body: the backend isn't running or a proxy answered instead.
    const message = typeof data?.error === "string" ? data.error : "The store isn't responding. Please try again in a moment.";
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}
