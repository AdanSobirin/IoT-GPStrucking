// ============================================================
// utils/mapIcons.js
// Ikon kustom menggunakan L.divIcon dari Leaflet
// Status truk: "loading" = Hijau, "idle" = Abu-abu
// ============================================================

import L from "leaflet";

/**
 * Membuat ikon truk dengan warna dinamis berdasarkan status.
 * @param {"loading"|"idle"} status
 * @param {boolean} isSelected - truk yang sedang dipilih akan punya border highlight
 */
export function createTruckIcon(status, isSelected = false) {
  const isLoading = status === "loading";

  // Warna berdasarkan status
  const bgColor = isLoading ? "#10b981" : "#6b7280";       // emerald-500 atau gray-500
  const ringColor = isLoading ? "#34d399" : "#9ca3af";     // emerald-400 atau gray-400
  const shadowColor = isLoading ? "#065f4688" : "#11182766"; // shadow warna-warni

  const selectedRing = isSelected
    ? `box-shadow: 0 0 0 3px #fbbf24, 0 0 12px ${shadowColor};` // yellow ring saat selected
    : `box-shadow: 0 0 0 2px ${ringColor}, 0 2px 8px ${shadowColor};`;

  const html = `
    <div style="
      width: 36px;
      height: 36px;
      background: ${bgColor};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      ${selectedRing}
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="
        transform: rotate(45deg);
        font-size: 16px;
        line-height: 1;
        display: block;
        margin-top: 2px;
        margin-right: 2px;
      ">🚛</span>
    </div>
    <div style="
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 8px solid ${bgColor};
      margin: -1px auto 0;
      transform: rotate(0deg);
    "></div>
  `;

  return L.divIcon({
    html,
    className: "", // penting: kosongkan agar tidak ada Leaflet default style
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46],
  });
}

/**
 * Ikon untuk TPH (Tempat Pengumpulan Hasil)
 * Tampil sebagai diamond oranye dengan label
 */
export function createTphIcon(name) {
  const html = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    ">
      <div style="
        width: 20px;
        height: 20px;
        background: #f59e0b;
        border: 2px solid #fbbf24;
        border-radius: 3px;
        transform: rotate(45deg);
        box-shadow: 0 0 6px #f59e0b88;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(-45deg); font-size: 10px;">📦</span>
      </div>
      <div style="
        background: rgba(15,23,42,0.85);
        color: #fbbf24;
        font-size: 9px;
        font-family: monospace;
        font-weight: bold;
        padding: 1px 4px;
        border-radius: 3px;
        border: 1px solid #f59e0b55;
        white-space: nowrap;
        letter-spacing: 0.5px;
      ">${name}</div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "",
    iconSize: [60, 44],
    iconAnchor: [30, 22],
    popupAnchor: [0, -22],
  });
}

/**
 * Ikon Pabrik PKS — lebih besar dan berbeda visual
 */
export function createFactoryIcon() {
  const html = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    ">
      <div style="
        width: 30px;
        height: 30px;
        background: #7c3aed;
        border: 2px solid #a78bfa;
        border-radius: 6px;
        box-shadow: 0 0 10px #7c3aed88;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      ">🏭</div>
      <div style="
        background: rgba(15,23,42,0.85);
        color: #a78bfa;
        font-size: 9px;
        font-family: monospace;
        font-weight: bold;
        padding: 1px 4px;
        border-radius: 3px;
        border: 1px solid #7c3aed55;
        white-space: nowrap;
      ">PKS</div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "",
    iconSize: [60, 48],
    iconAnchor: [30, 24],
    popupAnchor: [0, -24],
  });
}
