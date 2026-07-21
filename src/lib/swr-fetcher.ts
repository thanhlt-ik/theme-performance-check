// Shared fetcher for every useSWR call in the dashboard — all API routes
// here return { success, data } or { success, error }, so this is the one
// place that unwraps that envelope and turns a failure into a thrown error.
export async function apiFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json();

  if (!res.ok || !body.success) {
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return body.data as T;
}
