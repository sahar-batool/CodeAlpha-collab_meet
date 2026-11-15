const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'collab_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection.', 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.message || 'Something went wrong', res.status, data?.errors);
  return data;
}