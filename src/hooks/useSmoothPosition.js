import { useEffect, useRef, useState } from "react";

// Ambang jarak (dalam derajat, kira-kira ~5.5 km) di atas mana perubahan posisi
// dianggap "loncatan" (misal saat pertama kali render, data direset, atau ada
// jeda tracking lama) — langsung dipindah tanpa animasi supaya marker tidak
// terlihat "terbang" melintasi peta secara tidak masuk akal.
const JUMP_THRESHOLD_DEG = 0.05;

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/**
 * Menghaluskan perpindahan posisi (lat, lng) dari nilai lama ke nilai baru
 * memakai requestAnimationFrame, mirip pergerakan marker di Gojek/Grab.
 */
export function useSmoothPosition(targetLat, targetLng, duration = 4000) {
  const [pos, setPos] = useState([targetLat, targetLng]);
  const posRef = useRef(pos);
  const rafRef = useRef(null);

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  useEffect(() => {
    if (targetLat == null || targetLng == null) return;

    const from = posRef.current;
    const to = [targetLat, targetLng];
    const dist = Math.hypot(to[0] - from[0], to[1] - from[1]);

    // Render pertama, atau loncatan jauh (bukan pergerakan wajar) -> langsung pindah
    if (dist === 0) return;
    if (dist > JUMP_THRESHOLD_DEG) {
      setPos(to);
      return;
    }

    const start = performance.now();
    cancelAnimationFrame(rafRef.current);

    const animate = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = easeInOutQuad(t);
      setPos([from[0] + (to[0] - from[0]) * eased, from[1] + (to[1] - from[1]) * eased]);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, [targetLat, targetLng, duration]);

  return pos;
}
