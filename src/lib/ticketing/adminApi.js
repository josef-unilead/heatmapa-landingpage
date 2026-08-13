// Tenká obálka nad administračním API.
//
// Přihlášení drží podepsaná cookie, kterou prohlížeč posílá sám, takže se
// tu nikde nepracuje s heslem ani tokenem. Proto taky nestačí obyčejný
// fetch bez credentials.

async function request(path, options = {}) {
  const response = await fetch(`/api/admin/${path}`, {
    credentials: "same-origin",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    ...options,
  });

  if (response.status === 401) return { ok: false, error: "unauthorized" };

  try {
    return await response.json();
  } catch {
    return { ok: false, error: "bad_response" };
  }
}

export const adminApi = {
  session: () => request("session"),
  login: (password) => request("login", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => request("logout", { method: "POST" }),

  events: () => request("events"),
  saveEvent: (event) => request("events", { method: "POST", body: JSON.stringify(event) }),
  deleteEvent: (id) => request("events/delete", { method: "POST", body: JSON.stringify({ id }) }),
  uploadCover: (filename, dataUrl) =>
    request("upload", { method: "POST", body: JSON.stringify({ filename, dataUrl }) }),

  reservations: (slug) => request(`reservations?event=${encodeURIComponent(slug)}`),
  reservationAction: (id, action) =>
    request("reservations/action", { method: "POST", body: JSON.stringify({ id, action }) }),
  stats: (slug) => request(`stats?event=${encodeURIComponent(slug)}`),

  staffCodes: (slug) => request(`staff-codes?event=${encodeURIComponent(slug)}`),
  createStaffCode: (event, label) =>
    request("staff-codes", { method: "POST", body: JSON.stringify({ event, label }) }),
  revokeStaffCode: (id) =>
    request("staff-codes/revoke", { method: "POST", body: JSON.stringify({ id }) }),

  // Export nejde přes fetch, prohlížeč si soubor stáhne sám.
  exportUrl: (slug) => `/api/admin/export?event=${encodeURIComponent(slug)}`,
};
