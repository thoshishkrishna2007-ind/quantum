export interface AuthUser {
  id: string
  email: string
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const payload = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? `Request failed with status ${response.status}.`)
  return payload
}

export async function getCurrentUser() {
  const response = await fetch('/api/auth/session')
  if (response.status === 401) return null
  const payload = await response.json() as { user?: AuthUser; error?: string }
  if (!response.ok || !payload.user) throw new Error(payload.error ?? 'Unable to verify the current session.')
  return payload.user
}

export async function signIn(email: string, password: string) {
  const payload = await request<{ user: AuthUser }>('/api/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  })
  return payload.user
}

export async function registerAccount(email: string, password: string) {
  const payload = await request<{ user: AuthUser }>('/api/auth/register', {
    method: 'POST', body: JSON.stringify({ email, password }),
  })
  return payload.user
}

export async function signOut() {
  await request<{ signedOut: boolean }>('/api/auth/logout', { method: 'POST' })
}