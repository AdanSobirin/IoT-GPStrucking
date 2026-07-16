// Interval polling bersama, bisa diatur lewat VITE_POLLING_INTERVAL_MS di .env
// tanpa perlu mengubah kode (untuk menyesuaikan beban server VPS).
const parsed = Number(import.meta.env.VITE_POLLING_INTERVAL_MS);

export const POLLING_INTERVAL_MS = Number.isFinite(parsed) && parsed > 0 ? parsed : 8000;
