// Graphiques générés en SVG au build (remplacent les images du PDF original)

const f = (n) => +n.toFixed(2);

/* ------------------------------------------------------------------
   Abaque niveau sonore / pression acoustique / intensité acoustique
   (page 9 du formulaire original)
------------------------------------------------------------------- */
export function nomogramme() {
  const W = 180, H = 170, top = 8, bot = 160;
  const y = (L) => f(bot - (L / 120) * (bot - top)); // 0 dB en bas, 120 dB en haut
  const cols = [30, 90, 150];
  let s = `<svg class="nomo" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Abaque niveau, pression et intensité acoustiques">`;

  cols.forEach((x) => (s += `<line x1="${x}" y1="${top}" x2="${x}" y2="${bot}" class="axis"/>`));

  // dB : graduation 1 dB, repère 5 dB, label 10 dB
  for (let L = 0; L <= 120; L++) {
    const len = L % 10 === 0 ? 7 : L % 5 === 0 ? 4.5 : 2.5;
    s += `<line x1="${cols[0]}" x2="${cols[0] + len}" y1="${y(L)}" y2="${y(L)}" class="${L % 10 ? "minor" : "major"}"/>`;
    if (L % 10 === 0) s += `<text x="${cols[0] - 2}" y="${y(L) + 1.2}" text-anchor="end">${L} dB</text>`;
  }

  // Graduations logarithmiques (1..9 par décade)
  const logScale = (x, toL, decades, label) => {
    decades.forEach((d) => {
      for (let m = 1; m <= 9; m++) {
        const L = toL(m * 10 ** d);
        if (L < -0.01 || L > 120.01) continue;
        const len = m === 1 ? 7 : m === 5 ? 4.5 : 2.5;
        s += `<line x1="${x}" x2="${x + len}" y1="${y(L)}" y2="${y(L)}" class="${m === 1 ? "major" : "minor"}"/>`;
        if (m === 1) s += `<text x="${x - 2}" y="${y(L) + 1.2}" text-anchor="end">${label(d)}</text>`;
      }
    });
  };
  const pow = (d) => (d >= -2 && d <= 1 ? String(10 ** d).replace(/(\.\d*?)0+$/, "$1") : `10<tspan dy="-1.6" font-size="2.4">${d}</tspan><tspan dy="1.6"></tspan>`);

  // Pression : Lp = 20 log(p / 20 µPa)
  logScale(cols[1], (p) => 20 * Math.log10(p / 2e-5), [-5, -4, -3, -2, -1, 0, 1], (d) => `${pow(d)} Pa`);
  // Intensité : LI = 10 log(I / 1e-12)
  logScale(cols[2], (I) => 10 * Math.log10(I / 1e-12), [-12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0], (d) => `${pow(d)} W/m²`);

  // Références
  s += `<text x="${cols[1] + 9}" y="${y(0) + 1.2}" class="ref">20 µPa</text>`;
  s += `<text x="${cols[1] + 9}" y="${y(120) + 1.2}" class="ref">20 Pa</text>`;

  ["Niveau sonore [dB]", "Pression acoust. [Pa]", "Intensité acoust. [W/m²]"].forEach((t, i) => {
    s += `<text x="${cols[i]}" y="${H - 2}" text-anchor="middle" class="cap">${t}</text>`;
  });
  return s + "</svg>";
}

/* ------------------------------------------------------------------
   Cycle des quintes et des quartes (page 4 du formulaire original)
------------------------------------------------------------------- */
export function cycleQuintes() {
  const maj = ["DO", "SOL", "RÉ", "LA", "MI", "SI", "FA♯ / SOL♭", "RÉ♭", "LA♭", "MI♭", "SI♭", "FA"];
  const min = ["la", "mi", "si", "fa♯", "do♯", "sol♯", "ré♯ / mi♭", "si♭", "fa", "do", "sol", "ré"];
  const alt = ["0", "1♯", "2♯", "3♯", "4♯", "5♯", "6♯ / 6♭", "5♭", "4♭", "3♭", "2♭", "1♭"];
  const C = 75, R1 = 66, R2 = 48, R3 = 30;
  let s = `<svg class="quintes" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Cycle des quintes">`;
  [R1 + 8, (R1 + R2) / 2 + 1, (R2 + R3) / 2 + 1].forEach((r) => (s += `<circle cx="${C}" cy="${C}" r="${f(r)}" class="ring"/>`));
  for (let i = 0; i < 12; i++) {
    const a = ((i * 30 - 90) * Math.PI) / 180;
    const sep = (((i + 0.5) * 30 - 90) * Math.PI) / 180;
    s += `<line x1="${f(C + 21 * Math.cos(sep))}" y1="${f(C + 21 * Math.sin(sep))}" x2="${f(C + (R1 + 8) * Math.cos(sep))}" y2="${f(C + (R1 + 8) * Math.sin(sep))}" class="sep"/>`;
    const p = (r) => `x="${f(C + r * Math.cos(a))}" y="${f(C + r * Math.sin(a) + 1.4)}"`;
    const small = maj[i].length > 4 ? " sm" : "";
    s += `<text ${p(R1)} text-anchor="middle" class="maj${small}">${maj[i]}</text>`;
    s += `<text ${p(R2)} text-anchor="middle" class="min${small}">${min[i]}</text>`;
    s += `<text ${p(R3)} text-anchor="middle" class="alt${small}">${alt[i]}</text>`;
  }
  s += `<text x="${C}" y="${C - 3}" text-anchor="middle" class="cap">→ quintes</text>`;
  s += `<text x="${C}" y="${C + 5}" text-anchor="middle" class="cap">← quartes</text>`;
  return s + "</svg>";
}
