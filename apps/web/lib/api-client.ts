import type {
  AccountOverview,
  ActivityEntry,
  AuthResponse,
  MetricRange,
  OverviewResponse,
  PaginationMeta,
  Project,
  ProjectListParams,
  ProjectStats,
  SessionEntry,
  TimeseriesPoint,
  User,
} from './types';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';
const ACCESS_TOKEN_KEY = 'nexuscore.accessToken';
const REFRESH_TOKEN_KEY = 'nexuscore.refreshToken';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly requestId?: string;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message || 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
    this.requestId = payload.requestId;
  }

  /** Field-level messages from Zod issues, keyed by form field name. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    if (Array.isArray(this.details)) {
      for (const issue of this.details as Array<{ path?: string; message?: string }>) {
        if (issue.path) out[issue.path] = issue.message ?? 'Invalid value';
      }
    }
    return out;
  }
}

// ---------------------------------------------------------------------------
// Token storage — in-memory first, mirrored to localStorage for reloads.
// ---------------------------------------------------------------------------
let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export const tokenStore = {
  getAccess(): string | null {
    if (memoryAccessToken) return memoryAccessToken;
    const store = safeLocalStorage();
    memoryAccessToken = store?.getItem(ACCESS_TOKEN_KEY) ?? null;
    return memoryAccessToken;
  },
  getRefresh(): string | null {
    if (memoryRefreshToken) return memoryRefreshToken;
    const store = safeLocalStorage();
    memoryRefreshToken = store?.getItem(REFRESH_TOKEN_KEY) ?? null;
    return memoryRefreshToken;
  },
  set(accessToken: string, refreshToken?: string): void {
    memoryAccessToken = accessToken;
    const store = safeLocalStorage();
    store?.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      memoryRefreshToken = refreshToken;
      store?.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  },
  clear(): void {
    memoryAccessToken = null;
    memoryRefreshToken = null;
    const store = safeLocalStorage();
    store?.removeItem(ACCESS_TOKEN_KEY);
    store?.removeItem(REFRESH_TOKEN_KEY);
  },
};

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
}

let refreshInFlight: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = tokenStore.getRefresh();

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });

      if (!response.ok) {
        tokenStore.clear();
        return false;
      }

      const payload = (await response.json()) as ApiEnvelope<AuthResponse>;
      if (!payload.success || !payload.data?.accessToken) {
        tokenStore.clear();
        return false;
      }

      tokenStore.set(payload.data.accessToken, payload.data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const { method = 'GET', body, auth = true, retryOnUnauthorized = true } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = tokenStore.getAccess();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      cache: 'no-store',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      message: 'Cannot reach the NexusCore API. Check that the backend is running.',
    });
  }

  if (response.status === 401 && auth && retryOnUnauthorized) {
    const refreshed = await performRefresh();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, retryOnUnauthorized: false });
    }
  }

  const text = await response.text();
  const payload = text.length > 0 ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok || payload.success === false) {
    const errorPayload = (payload.error as ApiErrorPayload | undefined) ?? {
      code: 'UNKNOWN_ERROR',
      message: `Request failed with status ${response.status}`,
    };
    throw new ApiError(response.status, errorPayload);
  }

  return payload as unknown as ApiEnvelope<T>;
}

/** Convenience wrapper that unwraps the envelope. */
async function get<T>(path: string, auth = true): Promise<T> {
  return (await apiRequest<T>(path, { method: 'GET', auth })).data;
}

function queryString(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const serialised = search.toString();
  return serialised.length > 0 ? `?${serialised}` : '';
}

// ---------------------------------------------------------------------------
// Resource modules
// ---------------------------------------------------------------------------
export const authApi = {
  async register(input: {
    name: string;
    email: string;
    password: string;
    company?: string;
    jobTitle?: string;
  }): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: input,
      auth: false,
    });
    tokenStore.set(response.data.accessToken, response.data.refreshToken);
    return response.data;
  },

  async login(input: { email: string; password: string }): Promise<AuthResponse> {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: input,
      auth: false,
    });
    tokenStore.set(response.data.accessToken, response.data.refreshToken);
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: { refreshToken: tokenStore.getRefresh() ?? undefined },
        auth: false,
      });
    } finally {
      tokenStore.clear();
    }
  },

  async me(): Promise<AccountOverview> {
    return get<AccountOverview>('/auth/me');
  },

  async updateProfile(input: {
    name?: string;
    company?: string | null;
    jobTitle?: string | null;
    avatarUrl?: string | null;
  }): Promise<User> {
    const response = await apiRequest<{ user: User }>('/auth/me', { method: 'PATCH', body: input });
    return response.data.user;
  },

  async changePassword(input: { currentPassword: string; newPassword: string }): Promise<string> {
    const response = await apiRequest<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: input,
    });
    tokenStore.clear();
    return response.data.message;
  },

  async sessions(): Promise<SessionEntry[]> {
    const response = await apiRequest<{ sessions: SessionEntry[] }>('/auth/sessions');
    return response.data.sessions;
  },

  async revokeAllSessions(): Promise<void> {
    await apiRequest('/auth/sessions', { method: 'DELETE' });
    tokenStore.clear();
  },

  async passwordStrength(password: string): Promise<{ score: number; label: string; suggestions: string[] }> {
    const response = await apiRequest<{ score: number; label: string; suggestions: string[] }>(
      '/auth/password-strength',
      { method: 'POST', body: { password }, auth: false },
    );
    return response.data;
  },
};

export const projectsApi = {
  async list(params: ProjectListParams = {}): Promise<{ items: Project[]; meta: PaginationMeta }> {
    const response = await apiRequest<Project[]>(
      `/projects${queryString({
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        status: params.status,
        priority: params.priority,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      })}`,
    );

    return {
      items: response.data,
      meta:
        response.meta ??
        ({
          page: 1,
          pageSize: response.data.length,
          total: response.data.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        } as PaginationMeta),
    };
  },

  async get(id: string): Promise<Project> {
    return get<Project>(`/projects/${id}`);
  },

  async create(input: Record<string, unknown>): Promise<Project> {
    const response = await apiRequest<Project>('/projects', { method: 'POST', body: input });
    return response.data;
  },

  async update(id: string, input: Record<string, unknown>): Promise<Project> {
    const response = await apiRequest<Project>(`/projects/${id}`, { method: 'PATCH', body: input });
    return response.data;
  },

  async remove(id: string): Promise<{ id: string; name: string; deleted: boolean }> {
    const response = await apiRequest<{ id: string; name: string; deleted: boolean }>(`/projects/${id}`, {
      method: 'DELETE',
    });
    return response.data;
  },

  async stats(): Promise<ProjectStats> {
    return get<ProjectStats>('/projects/stats');
  },
};

export const metricsApi = {
  async overview(range: MetricRange = '30d', projectId?: string): Promise<OverviewResponse> {
    return get<OverviewResponse>(`/metrics/overview${queryString({ range, projectId })}`);
  },

  async timeseries(range: MetricRange = '90d', projectId?: string): Promise<{ range: MetricRange; points: TimeseriesPoint[] }> {
    return get<{ range: MetricRange; points: TimeseriesPoint[] }>(`/metrics/timeseries${queryString({ range, projectId })}`);
  },

  async activity(limit = 8): Promise<ActivityEntry[]> {
    return get<ActivityEntry[]>(`/metrics/activity${queryString({ limit })}`);
  },
};

export const api = { auth: authApi, projects: projectsApi, metrics: metricsApi, tokenStore, ApiError };
export default api;
