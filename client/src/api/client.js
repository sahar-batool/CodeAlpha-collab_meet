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

// Uploads and downloads can't use the JSON helper above: the browser has to set
// the multipart header itself, and downloads return raw bytes.
export async function uploadFile(code, file) {
  const form = new FormData();
  form.append('file', file);
  let res;
  try {
    res = await fetch(`${API_URL}/api/files/${code}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection.', 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.message || 'Upload failed', res.status);
  return data;
}

export async function downloadFile(code, file) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/files/${code}/${file.id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection.', 0);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(data?.message || 'Download failed', res.status);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}