const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}/api${endpoint}`;

  const config: RequestInit = {
    ...options,
    credentials: 'include', // Include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}`;
    let errorData;

    try {
      errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // Ignore JSON parse errors
    }

    throw new ApiError(errorMessage, response.status, errorData);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }

  return {} as T;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),

  post: <T>(endpoint: string, data: any) =>
    request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  put: <T>(endpoint: string, data: any) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),

  upload: <T>(endpoint: string, formData: FormData) =>
    fetch(`${API_BASE}/api${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new ApiError(error.message || 'Upload failed', res.status, error);
      }
      return res.json() as Promise<T>;
    }),
};

export { ApiError };
