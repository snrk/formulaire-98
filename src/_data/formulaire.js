// =====================================================================
//  FORMULAIRE 98 — Acoustique, Brevet fédéral de technicien du son
//  Source : W. Köller, v3.4 (06.2022) — recréé et complété
//
//  Structure d'un bloc :
//   { type: "formule", titre, eq: [latex], miroirs: [latex], vars: [[sym, desc, unité]], note, ajout }
//   { type: "table",   titre, head: [...], rows: [[...]], note, ajout, cls }
//   { type: "texte",   text, kind: "info" | "attention", ajout }
//   { type: "svg",     name: "nomogramme" | "cycleQuintes", titre }
//
//  - LaTeX : utiliser r`...` (String.raw) pour ne pas doubler les backslashes
//  - Texte libre (desc, note, text, cellules) : $...$ = formule inline, **gras**
//  - ajout: true => bloc absent du formulaire original (badge « + » à l'impression)
// =====================================================================

const r = String.raw;

/* ---------- Tableaux calculés ---------- */

// Fréquences des notes (tempérament égal, LA3 = 440 Hz, notation française)
const NOTES = ["DO", "DO♯", "RÉ", "RÉ♯", "MI", "FA", "FA♯", "SOL", "SOL♯", "LA", "SI♭", "SI"];
const fmtHz = (x) => (x < 100 ? x.toFixed(1) : Math.round(x).toString());
// exposant : (oct − 3) octaves + (i − 9) demi-tons depuis LA3
const tableNotes = [-1, 0, 1, 2, 3, 4, 5, 6].map((oct) => [
  `**${oct}**`,
  ...NOTES.map((_, i) => fmtHz(440 * 2 ** (oct - 3 + (i - 9) / 12))),
]);

// Intervalles
const INTERVALLES = [
  ["Demi-ton", 1, ""], ["Ton", 2, ""], ["Tierce mineure", 3, "6/5"], ["Tierce majeure", 4, "5/4"],
  ["Quarte", 5, "4/3"], ["Triton", 6, ""], ["Quinte", 7, "3/2"], ["Sixte mineure", 8, "8/5"],
  ["Sixte majeure", 9, "5/3"], ["Septième mineure", 10, ""], ["Septième majeure", 11, ""], ["Octave", 12, "2"],
];
const tableIntervalles = INTERVALLES.map(([nom, n, just]) => [
  nom, String(n), `$2^{${n}/12}$`, (2 ** (n / 12)).toFixed(3), just ? `$\\approx ${just}$` : "–",
]);

// Longueurs d'onde (c = 340 m/s)
const lam = (fr) => { const l = 340 / fr; return l >= 1 ? `${+l.toFixed(1)} m` : `${+(l * 100).toFixed(1)} cm`; };
const FREQ_L = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
const hz = (x) => (x >= 1000 ? `${x / 1000} kHz` : `${x} Hz`);

// Facteur de directivité δ (tableau original) + indice Lδ calculé
const ANG = [120, 110, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
const DELTA = [
  [10, [42, 44, 47, 51, 56, 63, 72, 85, 105, 139, 208, 414]],
  [20, [21, 22, 24, 26, 28, 31, 36, 43, 53, 70, 104]],
  [30, [14, 15, 16, 17, 19, 21, 24, 29, 35, 47]],
  [40, [10, 11, 12, 13, 14, 16, 18, 22, 27]],
  [50, [8.4, 8.9, 9.5, 10, 11, 13, 15, 17]],
  [60, [7.0, 7.4, 8.0, 8.7, 9.6, 11, 12]],
  [70, [6.0, 6.4, 6.9, 7.5, 8.3, 9.4]],
  [80, [5.3, 5.7, 6.1, 6.7, 7.4]],
  [90, [4.8, 5.1, 5.5, 6.0]],
  [100, [4.3, 4.6, 5.0]],
  [110, [4.0, 4.3]],
  [120, [3.7]],
];
const pad = (arr) => [...arr, ...Array(12 - arr.length).fill("")];
const tableDelta = DELTA.map(([v, vals]) => [`**${v}°**`, ...pad(vals.map((x) => (Number.isInteger(x) ? String(x) : x.toFixed(1))))]);
const tableLdelta = DELTA.map(([v, vals]) => [`**${v}°**`, ...pad(vals.map((x) => Math.round(10 * Math.log10(x)).toString()))]);

// Addition de deux niveaux : écart → valeur à ajouter au plus fort
const tableAddition = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15].map((d) => [
  `${d} dB`, `+ ${(10 * Math.log10(1 + 10 ** (-d / 10))).toFixed(1)} dB`,
]);

// Alcons ↔ STI (approximation de Farrel Becker)
const qualite = (sti) => (sti < 0.3 ? "mauvaise" : sti < 0.45 ? "médiocre" : sti < 0.6 ? "passable" : sti < 0.75 ? "bonne" : "excellente");
const tableAlcons = [1, 2, 3, 5, 7, 10, 15, 20, 30, 40].map((a) => {
  const sti = 0.9482 - 0.1845 * Math.log(a);
  return [`${a} %`, sti.toFixed(2), qualite(sti)];
});

// Subwoofers : distance → délai (c = 340 m/s)
const tableSubDelai = [0.35, 0.4, 0.5, 0.6, 0.8, 1.0].map((d) => [`${d * 100} cm`, `${((d / 340) * 1000).toFixed(1)} ms`]);
const tableSubEsp = [50, 100, 150, 200, 250].map((fr) => [`≤ ${fr} Hz`, `< ${(340 / fr / 4).toFixed(2)} m`]);

/* ---------- Contenu ---------- */

export default {
  titre: "Acoustique — Formulaire",
  sousTitre: "Brevet fédéral de technicien du son",
  source: "D’après W. Köller, formulaire v3.4 (06.2022) — recréé et complété",
  version: "v3.4+ · 10.2026",

  sections: [
    /* ================================================================ 1.1 */
    {
      num: "1.1", titre: "Nomenclature",
      blocs: [
        {
          type: "table", cls: "nomenclature",
          head: ["Symbole", "Grandeur", "Unité"],
          rows: [
            ["$A$", "Aire d’absorption acoustique", "[m²]"],
            ["$c$", "Célérité (vitesse) du son", "[m/s]"],
            ["$d$", "Distance", "[m]"],
            ["$f$", "Fréquence", "[Hz] hertz"],
            ["$I_a$", "Intensité acoustique", "[W/m²]"],
            ["$k$", "Nombre d’onde", "[rad/m]"],
            ["$L$", "Niveau « Level » « Pegel »", "[dB]"],
            ["$L_A$", "Niveau pondéré A", "[dB(A)]"],
            ["$L_{eq}$", "Niveau équivalent = niveau moyen", "[dB(A)]"],
            ["$L_I$", "Niveau d’intensité acoustique", "[dB SL]"],
            ["$L_p$", "Niveau de pression acoustique", "[dB SPL]"],
            ["$L_W$", "Niveau de puissance acoustique", "[dB PL]"],
            ["$L_\\delta$", "Indice de directivité (aussi : DI)", "[dB]"],
            ["$p_a$", "Pression acoustique", "[Pa] pascal"],
            ["$P_a$", "Puissance acoustique", "[W] watt"],
            ["$P_e$", "Puissance électrique", "[W]"],
            ["$S$", "Surface", "[m²]"],
            ["$t$", "Temps", "[s]"],
            ["$T$", "Période / Température", "[s] / [°C]"],
            ["$T_r$, $T_{60}$", "Durée de réverbération (aussi : RT60)", "[s]"],
            ["$v_a$", "Vitesse acoustique (≠ célérité !)", "[m/s]"],
            ["$V$", "Volume", "[m³]"],
            ["$\\alpha$", "Coefficient d’absorption acoustique", "[–]"],
            ["$\\delta$", "Facteur de directivité (aussi : Q)", "[–]"],
            ["$\\lambda$", "Longueur d’onde", "[m]"],
            ["$\\omega$", "Pulsation", "[rad/s]"],
            ["$\\varphi$", "Phase, déphasage", "[rad] ou [°]"],
            ["$h$", "Hauteur d’un line array **(+)**", "[m]"],
            ["$d_t$", "Distance de transition champ proche / lointain **(+)**", "[m]"],
            ["$L_{1W,1m}$", "Sensibilité d’une enceinte **(+)**", "[dB]"],
            ["$U$, $I$, $R$, $Z$", "Tension, courant, résistance, impédance **(+)**", "[V] [A] [Ω]"],
          ],
        },
      ],
    },

    /* ================================================================ 1.2 */
    {
      num: "1.2", titre: "Rappels de mathématiques",
      blocs: [
        {
          type: "formule", titre: "Puissances",
          eq: [r`10^A \cdot 10^B = 10^{A+B}`, r`\frac{10^A}{10^B} = 10^{A-B}`, r`\frac{1}{10^B} = 10^{-B}`],
          miroirs: [r`\left(10^A\right)^B = 10^{A\cdot B}`, r`\sqrt{10^A} = 10^{A/2}`],
        },
        {
          type: "formule", titre: "Logarithmes",
          eq: [r`\log(A\cdot B) = \log A + \log B`, r`\log\frac{A}{B} = \log A - \log B`, r`\log A^C = C\cdot\log A`, r`\log\frac{1}{A} = -\log A`],
          miroirs: [r`\log 2 \approx 0.30 \quad \log 3 \approx 0.48 \quad \log 10 = 1`],
        },
        {
          type: "formule", titre: "Isoler la variable d’un logarithme", ajout: true,
          eq: [r`y = a\cdot\log x \;\Longleftrightarrow\; x = 10^{\,y/a}`],
          miroirs: [r`L = 10\log x \Leftrightarrow x = 10^{L/10}`, r`L = 20\log x \Leftrightarrow x = 10^{L/20}`, r`\log_2 x = \frac{\log x}{\log 2}`],
          note: "C’est la règle utilisée pour toutes les formules miroirs de ce formulaire.",
        },
        {
          type: "formule", titre: "Théorème de Pythagore",
          eq: [r`c^2 = a^2 + b^2`],
          miroirs: [r`c = \sqrt{a^2+b^2}`, r`a = \sqrt{c^2-b^2}`],
          note: "Distance réelle enceinte suspendue → auditeur : $d = \\sqrt{d_{horiz}^2 + h^2}$",
        },
        {
          type: "formule", titre: "Trigonométrie", ajout: true,
          eq: [r`\sin\theta = \frac{\text{opposé}}{\text{hypoténuse}} \qquad \tan\theta = \frac{\text{opposé}}{\text{adjacent}}`],
          miroirs: [r`\theta = \arcsin(x) \Leftrightarrow x = \sin\theta`, r`\theta_{rad} = \theta^{\circ}\cdot\frac{\pi}{180}`],
          note: "Calculatrice en mode **DEG** pour les angles d’ouverture.",
        },
      ],
    },

    /* ================================================================ 1.3 */
    {
      num: "1.3", titre: "Fréquence",
      blocs: [
        {
          type: "formule",
          eq: [r`f = \frac{1}{T}`], miroirs: [r`T = \frac{1}{f}`],
          vars: [["f", "Fréquence", "[Hz]"], ["T", "Période", "[s]"]],
        },
        {
          type: "formule", titre: "Fréquences normalisées par octave et tiers d’octave",
          eq: [r`f = \sqrt{f_{c1}\cdot f_{c2}}`],
          miroirs: [r`f_{c2} = 2\cdot f_{c1}\ \text{(octave)}`, r`f_{c2} = \sqrt[3]{2}\cdot f_{c1}\ \text{(1/3 oct.)}`, r`f_{inf} = \frac{f_c}{\sqrt 2},\; f_{sup} = \sqrt 2\, f_c`],
          vars: [["f", "Frontière entre deux bandes", "[Hz]"], ["f_{c1}, f_{c2}", "Fréquences centrales des bandes concernées", "[Hz]"]],
          note: "Bornes d’octave : $f_c/\\sqrt2$ et $\\sqrt2\\,f_c$ — tiers d’octave : $f_c/\\sqrt[6]2$ et $\\sqrt[6]2\\,f_c$ **(+)**",
        },
        {
          type: "formule", titre: "Intervalle de $n$ demi-tons", ajout: true,
          eq: [r`f_2 = f_1\cdot 2^{\,n/12}`],
          miroirs: [r`n = 12\cdot\log_2\frac{f_2}{f_1} = 39.86\cdot\log\frac{f_2}{f_1}`, r`f_1 = f_2\cdot 2^{-n/12}`],
          vars: [["n", "Nombre de demi-tons (négatif = vers le grave)", "[–]"]],
        },
        {
          type: "table", titre: "Intervalles (tempérament égal)",
          head: ["Intervalle", "Demi-tons", "Facteur", "Valeur", "Juste"],
          rows: tableIntervalles,
          note: "En passant d’une note à une autre, la fréquence est multipliée par un facteur. Ex. demi-ton (RÉ → RÉ♯) : × $\\sqrt[12]2 \\approx 1.059$",
        },
        { type: "svg", name: "cycleQuintes", titre: "Cycle des quintes et des quartes" },
        {
          type: "table", titre: "Fréquences théoriques des notes de musique [Hz] — LA3 = 440 Hz",
          head: ["Oct.", ...NOTES], rows: tableNotes, cls: "dense notes",
        },
      ],
    },

    /* ================================================================ 1.4 */
    {
      num: "1.4", titre: "Célérité du son",
      blocs: [
        {
          type: "formule", titre: "Célérité du son dans l’air",
          eq: [r`c \approx 331.4 + 0.61\cdot T`], miroirs: [r`T \approx \frac{c - 331.4}{0.61}`],
          vars: [["c", "Célérité (vitesse) du son", "[m/s]"], ["T", "Température de l’air", "[°C]"]],
          note: "331 m/s à 0 °C — 340 m/s à 14 °C — 343 m/s à 20 °C",
        },
        {
          type: "formule", titre: "Formule exacte", ajout: true,
          eq: [r`c = 331.3\cdot\sqrt{1 + \frac{T}{273.15}}`],
          miroirs: [r`T = 273.15\cdot\left[\left(\frac{c}{331.3}\right)^2 - 1\right]`],
        },
      ],
    },

    /* ================================================================ 1.5 */
    {
      num: "1.5", titre: "Longueur d’onde",
      blocs: [
        {
          type: "formule",
          eq: [r`\lambda = \frac{c}{f}`], miroirs: [r`f = \frac{c}{\lambda}`, r`c = \lambda\cdot f`],
          vars: [["\\lambda", "Longueur d’onde", "[m]"], ["c", "Célérité du son", "[m/s]"], ["f", "Fréquence", "[Hz]"]],
        },
        {
          type: "table", cls: "dense",
          head: ["$f$", ...FREQ_L.map(hz)],
          rows: [["$\\lambda$", ...FREQ_L.map(lam)]],
          note: "Valeurs pour $c$ = 340 m/s",
        },
      ],
    },

    /* ================================================================ 1.6 */
    {
      num: "1.6", titre: "Grandeurs acoustiques",
      blocs: [
        {
          type: "formule",
          eq: [r`I_a = p_a\cdot v_a`, r`I_a = \frac{p_a^2}{400}`, r`v_a = \frac{p_a}{400}`],
          miroirs: [r`p_a = \sqrt{400\cdot I_a}`, r`p_a = 400\cdot v_a`, r`v_a = \frac{I_a}{p_a}`],
          vars: [
            ["I_a", "Intensité acoustique", "[W/m²]"],
            ["p_a", "Pression acoustique (valeur efficace)", "[Pa]"],
            ["v_a", "Vitesse acoustique — ce n’est pas la « vitesse du son » !", "[m/s]"],
            ["Z_c", "Impédance acoustique de l’air ≈ 400", "[Pa·s/m]"],
          ],
        },
        {
          type: "formule",
          eq: [r`I_a = \frac{P_a}{S}`], miroirs: [r`P_a = I_a\cdot S`, r`S = \frac{P_a}{I_a}`],
          vars: [["I_a", "Intensité acoustique", "[W/m²]"], ["P_a", "Puissance acoustique", "[W]"], ["S", "Surface sur laquelle se répartit la puissance", "[m²]"]],
        },
        {
          type: "formule", titre: "Surfaces de rayonnement", ajout: true,
          eq: [r`S_{sphère} = 4\pi d^2 \qquad S_{demi\text{-}sphère} = 2\pi d^2`],
          miroirs: [r`d = \sqrt{\frac{S}{4\pi}}`],
          note: "Source posée au sol (demi-espace) : même puissance sur la moitié de la surface ⇒ +3 dB ($\\delta$ = 2).",
        },
      ],
    },

    /* ================================================================ 1.7 */
    {
      num: "1.7", titre: "Déphasage",
      blocs: [
        {
          type: "formule",
          eq: [r`\frac{\Delta t}{T} = \frac{\Delta\varphi}{2\pi} = \frac{\Delta\varphi^{\circ}}{360}`, r`\Delta t = \frac{\Delta x}{c}`],
          miroirs: [r`\Delta\varphi^{\circ} = 360\cdot f\cdot\Delta t`, r`\Delta\varphi^{\circ} = 360\cdot\frac{f\cdot\Delta x}{c}`, r`\Delta t = \frac{\Delta\varphi^{\circ}}{360\cdot f}`, r`\Delta x = c\cdot\Delta t`],
          vars: [
            ["\\Delta t", "Décalage temporel", "[s]"], ["T", "Période", "[s]"],
            ["\\Delta\\varphi", "Déphasage", "[rad] ou [°]"], ["\\Delta x", "Décalage dans l’espace", "[m]"],
            ["c", "Célérité du son", "[m/s]"],
          ],
        },
        { type: "texte", kind: "attention", text: "Un déphasage entraîne un risque d’interférences." },
      ],
    },

    /* ================================================================ 1.8 */
    {
      num: "1.8", titre: "Équations d’onde",
      blocs: [
        {
          type: "formule", titre: "Dans le temps",
          eq: [r`T = \frac{1}{f}\ \text{[s]}`, r`\omega = 2\pi f = \frac{2\pi}{T}\ \text{[rad/s]}`, r`p_a(t) = \hat p_a\cdot\sin(\omega t)`],
          miroirs: [r`f = \frac{\omega}{2\pi}`],
        },
        {
          type: "formule", titre: "Dans l’espace",
          eq: [r`\lambda = \frac{c}{f}\ \text{[m]}`, r`k = \frac{2\pi}{\lambda} = \frac{\omega}{c}\ \text{[rad/m]}`, r`p_a(x) = \hat p_a\cdot\sin(kx)`],
          miroirs: [r`\lambda = \frac{2\pi}{k}`],
        },
        {
          type: "formule", titre: "Onde progressive / rétrograde",
          eq: [r`p_a(x,t) = \hat p_a\cdot\sin(kx - \omega t)`, r`p_a(x,t) = \hat p_a\cdot\sin(kx + \omega t)`],
          vars: [["\\hat p_a", "Amplitude (crête) de la pression", "[Pa]"]],
          note: "Valeur efficace d’un sinus : $p_{eff} = \\hat p / \\sqrt 2$ **(+)**",
        },
      ],
    },

    /* ================================================================ 1.9 */
    {
      num: "1.9", titre: "Calculs avec des décibels",
      blocs: [
        { type: "texte", kind: "attention", text: "Il n’est pas possible de multiplier, diviser, additionner et soustraire des décibels. C’est un abus de langage qui nécessite des opérations particulières." },
        {
          type: "formule", titre: "« Multiplication » et « division »",
          eq: [r`L_I = L_{I0} + 10\log N \quad (I_a = N\cdot I_{a0})`, r`L_I = L_{I0} - 10\log N \quad (I_a = I_{a0}/N)`],
          miroirs: [r`N = 10^{\frac{L_I - L_{I0}}{10}}`, r`L_{I0} = L_I - 10\log N`],
          vars: [["L_I", "Niveau d’intensité acoustique, niveau sonore", "[dB]"], ["I_a, I_{a0}", "Intensité acoustique", "[W/m²]"], ["N", "Facteur de multiplication ou division", "[–]"]],
          note: "Ex. : 50 × 81 dB(A) = 5 × 10 × 81 dB(A) → 81 + 7 + 10 = 98 dB(A)",
        },
        {
          type: "formule", titre: "« Addition » et « soustraction » (sources non corrélées)",
          eq: [r`L_I = 10\log\left(10^{\frac{L_1}{10}} \pm 10^{\frac{L_2}{10}}\right)`],
          miroirs: [r`L_2 = 10\log\left(10^{\frac{L_I}{10}} - 10^{\frac{L_1}{10}}\right)`, r`L_{N\,\text{sources identiques}} = L_1 + 10\log N`],
          vars: [["L_I", "Niveau résultant", "[dB]"], ["L_1, L_2", "Niveaux à combiner", "[dB]"]],
          note: "« Soustraction » : 80 dB ⊖ 75 dB ≈ 78.5 dB → différence 5 dB ⇒ on retire ≈ 1.5 dB\n« Addition » : 78.5 dB ⊕ 75 dB ≈ 80 dB → différence 3.5 dB ⇒ on ajoute ≈ 1.5 dB",
        },
        {
          type: "table", titre: "Addition rapide de deux niveaux", ajout: true, cls: "half",
          head: ["Écart entre les niveaux", "À ajouter au plus fort"], rows: tableAddition,
          note: "Au-delà de 10 dB d’écart, le plus faible est négligeable.",
        },
        {
          type: "formule", titre: "Calcul général",
          eq: [r`X_i = 10^{\frac{L_i}{10}} \qquad L = 10\log\left(\textstyle\sum X_i\right)`],
          vars: [["L_1, L_2, L_3\\ldots", "Niveaux sonores du calcul", "[dB ou dB(A)]"], ["L", "Niveau sonore résultat", "[dB ou dB(A)]"]],
        },
        {
          type: "formule", titre: "Moyenne = niveau équivalent",
          eq: [r`L_{eq} = 10\log\left(\frac{1}{T}\sum_i t_i\cdot 10^{\frac{L_i}{10}}\right)`],
          miroirs: [r`\text{durées égales : } L_{eq} = 10\log\left(\frac{1}{n}\sum_i 10^{\frac{L_i}{10}}\right)`, r`t_i = \frac{T\cdot 10^{L_{eq}/10}}{10^{L_i/10}}`],
          vars: [["L_{eq}", "Niveau équivalent = moyenne énergétique sur la durée T", "[dB(A)]"], ["t_i", "Durée pendant laquelle règne $L_i$", "[s] [h]"], ["T", "Durée totale ($\\sum t_i$)", "[s] [h]"]],
          note: "+3 dB ⇔ durée d’exposition divisée par 2 pour la même dose **(+)**",
        },
        { type: "svg", name: "nomogramme", titre: "Niveau sonore — pression acoustique — intensité acoustique" },
      ],
    },

    /* ================================================================ 1.10 */
    {
      num: "1.10", titre: "Niveaux",
      blocs: [
        {
          type: "formule",
          eq: [r`L_I = 10\log\frac{I_a}{10^{-12}}`], miroirs: [r`I_a = 10^{-12}\cdot 10^{\frac{L_I}{10}}`],
          vars: [["L_I", "Niveau d’intensité acoustique", "[dB SL]"], ["I_a", "Intensité acoustique", "[W/m²]"]],
        },
        {
          type: "formule",
          eq: [r`L_p = 20\log\frac{p_a}{20\cdot10^{-6}}`], miroirs: [r`p_a = 20\cdot10^{-6}\cdot 10^{\frac{L_p}{20}}`],
          vars: [["L_p", "Niveau de pression acoustique", "[dB SPL]"], ["p_a", "Pression acoustique", "[Pa]"]],
          note: "1 Pa ≈ 94 dB SPL — dans l’air $L_I \\approx L_p$ **(+)**",
        },
        {
          type: "formule",
          eq: [r`L_W = 10\log\frac{P_a}{10^{-12}}`], miroirs: [r`P_a = 10^{-12}\cdot 10^{\frac{L_W}{10}}`],
          vars: [["L_W", "Niveau de puissance acoustique", "[dB PL]"], ["P_a", "Puissance acoustique", "[W]"]],
        },
      ],
    },

    /* ================================================================ 1.11 */
    {
      num: "1.11", titre: "Pondérations fréquentielles",
      blocs: [
        {
          type: "table", cls: "dense weighting",
          head: ["$f$ [Hz]", "A [dB]", "C [dB]", "$f$ [Hz]", "A [dB]", "C [dB]"],
          rows: [
            ["12.5", "-63.4", "-11.2", "800", "-0.8", "0"],
            ["**16**", "**-56.7**", "**-8.5**", "**1000**", "**0**", "**0**"],
            ["20", "-50.5", "-6.2", "1250", "+0.6", "0"],
            ["25", "-44.7", "-4.4", "1600", "+1.0", "-0.1"],
            ["**31.5**", "**-39.4**", "**-3.0**", "**2000**", "**+1.2**", "**-0.2**"],
            ["40", "-34.6", "-2.0", "2500", "+1.3", "-0.3"],
            ["50", "-30.2", "-1.3", "3150", "+1.2", "-0.5"],
            ["**63**", "**-26.2**", "**-0.8**", "**4000**", "**+1.0**", "**-0.8**"],
            ["80", "-22.5", "-0.5", "5000", "+0.5", "-1.3"],
            ["100", "-19.1", "-0.3", "6300", "-0.1", "-2.0"],
            ["**125**", "**-16.1**", "**-0.2**", "**8000**", "**-1.1**", "**-3.0**"],
            ["160", "-13.4", "-0.1", "10000", "-2.5", "-4.4"],
            ["200", "-10.9", "0", "12500", "-4.3", "-6.2"],
            ["**250**", "**-8.6**", "**0**", "**16000**", "**-6.6**", "**-8.5**"],
            ["315", "-6.6", "0", "20000", "-9.3", "-11.2"],
            ["400", "-4.8", "0", "", "", ""],
            ["**500**", "**-3.2**", "**0**", "", "", ""],
            ["630", "-1.9", "0", "", "", ""],
          ],
          note: "En **gras** : bandes d’octave normalisées.",
        },
        {
          type: "formule", titre: "Niveau global pondéré A à partir de bandes", ajout: true,
          eq: [r`L_A = 10\log\sum_i 10^{\frac{L_i + A_i}{10}}`],
          vars: [["L_i", "Niveau dans la bande $i$", "[dB]"], ["A_i", "Pondération A de la bande", "[dB]"]],
        },
      ],
    },

    /* ================================================================ 1.12 */
    {
      num: "1.12", titre: "Rappel : somme de deux signaux",
      blocs: [
        {
          type: "formule", titre: "Sinus + sinus (signaux corrélés, même fréquence) → de +6 dB à −∞ dB",
          eq: [r`L = 20\log\left(10^{\frac{L_1}{20}} + 10^{\frac{L_2}{20}}\right)\ \text{(en phase)}`],
          note: "Deux sons purs de même fréquence et même pression : ce sont les **pressions** qui s’additionnent (selon la phase).",
          ajout: false,
        },
        {
          type: "formule", titre: "Son complexe + son complexe (non corrélés) → +3 dB",
          eq: [r`L = 10\log\left(10^{\frac{L_1}{10}} + 10^{\frac{L_2}{10}}\right)`],
          note: "Pour deux sons complexes de même intensité, ce sont les **énergies** (intensités) qui s’additionnent.",
        },
      ],
    },

    /* ================================================================ 1.13 */
    {
      num: "1.13", titre: "Interférences",
      blocs: [
        {
          type: "formule", titre: "Déphasage entre deux ondes de même fréquence et même amplitude",
          eq: [r`\Delta\varphi^{\circ} = 360\cdot\frac{\Delta t}{T} \quad\text{ou}\quad \Delta\varphi = 2\pi\cdot\frac{\Delta t}{T}`],
          miroirs: [r`\frac{p}{p_1} = 2\cos\frac{\Delta\varphi}{2}`, r`\Delta L = 20\log\left|2\cos\frac{\Delta\varphi}{2}\right|`],
          note: "Les formules miroirs (+) génèrent le tableau ci-dessous.",
        },
        {
          type: "table", cls: "half",
          head: ["$\\Delta\\varphi$", "[rad]", "Pression", "Niveau"],
          rows: [
            ["0°", "0", "2.0 ×", "+6.0 dB"], ["30°", "$\\pi/6$", "1.9 ×", "+5.7 dB"],
            ["45°", "$\\pi/4$", "1.8 ×", "+5.3 dB"], ["60°", "$\\pi/3$", "1.7 ×", "+4.8 dB"],
            ["90°", "$\\pi/2$", "1.4 ×", "+3.0 dB"], ["120°", "$2\\pi/3$", "1.0 ×", "0.0 dB"],
            ["150°", "$5\\pi/6$", "0.5 ×", "−5.7 dB"], ["180°", "$\\pi$", "0", "−∞ dB"],
          ],
        },
      ],
    },

    /* ================================================================ 1.14 */
    {
      num: "1.14", titre: "Interférences, filtre en peigne (comb filter)",
      blocs: [
        {
          type: "formule", titre: "Fréquences des creux (annulations)",
          eq: [r`f_n = \frac{2n-1}{2\,\Delta t} \qquad \left(\frac{1}{2\Delta t},\ \frac{3}{2\Delta t},\ \frac{5}{2\Delta t},\ \frac{7}{2\Delta t}\ldots\right)`],
          miroirs: [r`\Delta t = \frac{1}{2 f_1}`, r`f_1 = \frac{c}{2\,\Delta d}`, r`\Delta d = \frac{c}{2 f_1}`],
          vars: [["\\Delta t", "Retard entre les deux signaux", "[s]"], ["\\Delta d", "Différence de marche (de distance)", "[m]"], ["n", "1, 2, 3…", "[–]"]],
        },
        {
          type: "formule", titre: "Fréquences des pics (renforcements)", ajout: true,
          eq: [r`f_n = \frac{n}{\Delta t}`],
          note: "Écart entre deux creux successifs : $1/\\Delta t$",
        },
      ],
    },

    /* ================================================================ 1.15 */
    {
      num: "1.15", titre: "Effet Doppler",
      blocs: [
        {
          type: "formule", titre: "Source se rapprochant — fréquence perçue plus élevée",
          eq: [r`f' = f_0\cdot\frac{c}{c - v}`], miroirs: [r`v = c\cdot\left(1 - \frac{f_0}{f'}\right)`, r`f_0 = f'\cdot\frac{c-v}{c}`],
        },
        {
          type: "formule", titre: "Source s’éloignant — fréquence perçue plus basse",
          eq: [r`f' = f_0\cdot\frac{c}{c + v}`], miroirs: [r`v = c\cdot\left(\frac{f_0}{f'} - 1\right)`, r`f_0 = f'\cdot\frac{c+v}{c}`],
          vars: [["c", "Vitesse du son (≈ 340 m/s ou ≈ 1225 km/h)", "*"], ["v", "Vitesse de la source", "*"], ["f_0", "Fréquence de la source à l’arrêt", "[Hz]"]],
        },
        { type: "texte", kind: "attention", text: "* Ne pas mélanger les unités ! (m/s avec m/s, km/h avec km/h)" },
      ],
    },

    /* ================================================================ 1.16 */
    {
      num: "1.16", titre: "Décroissance (géométrique) avec la distance",
      blocs: [
        {
          type: "formule", titre: "Ondes sphériques",
          eq: [r`L_I(d_2) = L_I(d_1) - 20\log\frac{d_2}{d_1}`],
          miroirs: [r`d_2 = d_1\cdot 10^{\frac{L_I(d_1) - L_I(d_2)}{20}}`, r`L_I(d_1) = L_I(d_2) + 20\log\frac{d_2}{d_1}`],
          vars: [["L_I", "Niveau d’intensité acoustique", "[dB SL]"], ["d_1, d_2", "Distances", "[m]"]],
        },
        {
          type: "formule", titre: "Ondes cylindriques", ajout: true,
          eq: [r`L_I(d_2) = L_I(d_1) - 10\log\frac{d_2}{d_1}`],
          miroirs: [r`d_2 = d_1\cdot 10^{\frac{L_I(d_1) - L_I(d_2)}{10}}`],
        },
        {
          type: "formule", titre: "À partir de la puissance de la source",
          eq: [r`L_I(d) = L_W - 20\log d - 11 + L_\delta`, r`I_a(d) = \frac{\delta\cdot P_a}{4\pi d^2}`],
          miroirs: [r`L_W = L_I(d) + 20\log d + 11 - L_\delta`, r`d = 10^{\frac{L_W - 11 + L_\delta - L_I}{20}}`, r`P_a = \frac{4\pi d^2\cdot I_a}{\delta}`],
          vars: [
            ["L_I", "Niveau d’intensité acoustique", "[dB SL]"], ["L_W", "Niveau de puissance acoustique de la source", "[dB PL]"],
            ["d", "Distance", "[m]"], ["I_a", "Intensité acoustique", "[W/m²]"], ["P_a", "Puissance acoustique de la source", "[W]"],
            ["L_\\delta", "Indice de directivité", "[dB]"], ["\\delta", "Facteur de directivité", "[–]"],
          ],
          note: "$-11 = 10\\log\\frac{1}{4\\pi}$ — source omnidirectionnelle : $\\delta$ = 1, $L_\\delta$ = 0 dB **(+)**",
        },
        {
          type: "table", cls: "half",
          head: ["Type d’onde", "Décroissance"],
          rows: [
            ["Sphérique (source ponctuelle)", "−6 dB par doublement de distance"],
            ["Cylindrique (source longue, line array en champ proche)", "−3 dB par doublement de distance"],
            ["Plane (tubes…)", "pas de décroissance"],
          ],
        },
      ],
    },

    /* ================================================================ 1.17 */
    {
      num: "1.17", titre: "Directivité",
      blocs: [
        {
          type: "formule",
          eq: [r`L_\delta = 10\log\delta`, r`L_{I,1m} = L_W - 11 + L_\delta`],
          miroirs: [r`\delta = 10^{\frac{L_\delta}{10}}`, r`L_W = L_{I,1m} + 11 - L_\delta`, r`L_\delta = L_{I,1m} - L_W + 11`],
          vars: [["L_\\delta", "Indice de directivité (aussi : DI)", "[dB]"], ["\\delta", "Facteur de directivité (aussi : Q)", "[–]"], ["L_{I,1m}", "Niveau d’intensité acoustique à 1 m (dans l’axe)", "[dB]"], ["L_W", "Niveau de puissance acoustique", "[dB]"]],
        },
        {
          type: "formule", titre: "Facteur de directivité à partir des angles d’ouverture", ajout: true,
          eq: [r`\delta \approx \frac{180^{\circ}}{\arcsin\left(\sin\frac{\theta_h}{2}\cdot\sin\frac{\theta_v}{2}\right)}`],
          vars: [["\\theta_h, \\theta_v", "Angles d’ouverture horizontal et vertical (−6 dB)", "[°]"]],
          note: "Formule de Molloy : elle génère le tableau ci-dessous (ex. 90° × 90° → 6.0).",
        },
        {
          type: "table", titre: "Facteur de directivité δ — horizontal (colonnes) × vertical (lignes)",
          head: ["", ...ANG.map((a) => `${a}°`)], rows: tableDelta, cls: "dense triangle",
          note: "Ex. : un pavillon de 40° vertical × 110° horizontal présente une directivité $\\delta$ = 11.",
        },
        {
          type: "table", titre: "Indice de directivité Lδ = 10 log δ [dB]", ajout: true,
          head: ["", ...ANG.map((a) => `${a}°`)], rows: tableLdelta, cls: "dense triangle",
        },
        {
          type: "formule", titre: "Angles d’ouverture approximatifs d’un haut-parleur (piston)",
          eq: [r`\theta_{-3\,dB} \approx 2\arcsin\left(0.26\cdot\frac{\lambda}{a}\right)`, r`\theta_{-6\,dB} \approx 2\arcsin\left(0.61\cdot\frac{\lambda}{a}\right)`],
          miroirs: [r`a = \frac{0.26\cdot\lambda}{\sin(\theta_{-3dB}/2)}`, r`f = \frac{0.26\cdot c}{a\cdot\sin(\theta_{-3dB}/2)}`],
          vars: [["a", "Rayon du haut-parleur", "[m]"], ["\\lambda", "Longueur d’onde", "[m]"]],
        },
        {
          type: "formule", titre: "Angle d’ouverture vertical approximatif d’un line array rectiligne",
          eq: [r`\theta_{-3\,dB} \approx 2\arcsin\left(0.44\cdot\frac{\lambda}{L}\right) = 2\arcsin\frac{150}{L\cdot f}`, r`\theta_{-6\,dB} \approx 2\arcsin\left(0.50\cdot\frac{\lambda}{L}\right)`],
          miroirs: [r`L = \frac{0.44\cdot\lambda}{\sin(\theta_{-3dB}/2)}`, r`f = \frac{150}{L\cdot\sin(\theta_{-3dB}/2)}`],
          vars: [["L", "Longueur / hauteur du line array rectiligne", "[m]"], ["\\lambda", "Longueur d’onde", "[m]"]],
          note: "Pas de solution si l’argument de arcsin > 1 : l’array ne contrôle plus la directivité (≈ omnidirectionnel verticalement).",
        },
      ],
    },

    /* ================================================================ 1.18 */
    {
      num: "1.18", titre: "Niveau d’intensité acoustique en champ diffus",
      blocs: [
        {
          type: "formule",
          eq: [r`L_{I,diff} = L_W - 10\log A + 6`],
          miroirs: [r`L_W = L_{I,diff} + 10\log A - 6`, r`A = 10^{\frac{L_W + 6 - L_{I,diff}}{10}}`],
          vars: [["L_{I,diff}", "Niveau en champ diffus (réverbéré)", "[dB SL]"], ["L_W", "Niveau de puissance acoustique de la source", "[dB PL]"], ["A", "Aire d’absorption acoustique", "[m²]"]],
          note: "Plusieurs sources : utiliser $L_{W,tot}$ (somme énergétique des puissances).",
        },
        {
          type: "formule", titre: "Niveau total en salle : champ direct + champ diffus", ajout: true,
          eq: [r`L_{I,tot} = 10\log\left(10^{\frac{L_{I,dir}}{10}} + 10^{\frac{L_{I,diff}}{10}}\right)`, r`L_{I,tot} = L_W + 10\log\left(\frac{\delta}{4\pi d^2} + \frac{4}{A}\right)`],
          note: "La seconde forme (Hopkins-Stryker) regroupe 1.16 et 1.18 : $10\\log\\frac{1}{4\\pi} = -11$ et $10\\log 4 = +6$.",
        },
      ],
    },

    /* ================================================================ 1.19 */
    {
      num: "1.19", titre: "Sonorisation (résumé)",
      blocs: [
        {
          type: "formule", titre: "① Enceinte : puissance et directivité",
          eq: [r`L_W = L_{I,1m} + 11 - L_\delta`, r`L_\delta = 10\log\delta`],
          vars: [["L_W", "Niveau de puissance acoustique d’une enceinte", "[dB PL]"], ["L_\\delta", "Indice de directivité", "[dB]"]],
        },
        {
          type: "formule", titre: "② Niveau à 1 m",
          eq: [r`L_{1m} = L_{1W,1m} + 10\log P_e + 10\log N`],
          miroirs: [r`P_e = 10^{\frac{L_{1m} - L_{1W,1m} - 10\log N}{10}}`, r`N = 10^{\frac{L_{1m} - L_{1W,1m} - 10\log P_e}{10}}`],
          vars: [["L_{1W,1m}", "Caractéristique (sensibilité) de l’enceinte", "[dB]"], ["P_e", "Puissance électrique dans chaque enceinte", "[W]"], ["N", "Nombre d’enceintes (dans cette direction)", "[–]"]],
        },
        { type: "texte", kind: "attention", text: "$L_{1m}$ ne doit pas dépasser le niveau maximum de l’enceinte $L_{max}$ (marge / headroom : $L_{crête} \\approx L + 10$ à $20$ dB → compression ou limitation si nécessaire)." },
        {
          type: "formule", titre: "③ Champ direct à la distance $d_2$",
          eq: [r`L_2 = L_{1W,1m} + 10\log P_e + 10\log N - 20\log\frac{d_2}{d_1}`],
          miroirs: [r`L_1 = L_2 + 20\log\frac{d_2}{d_1}`, r`P_e = 10^{\frac{L_2 - L_{1W,1m} - 10\log N + 20\log(d_2/d_1)}{10}}`],
          vars: [["L_2", "Niveau sonore obtenu au point d’écoute", "[dB]"], ["d_1", "Distance de référence = 1 m", "[m]"], ["d_2", "Distance enceinte → auditeur", "[m]"]],
        },
        {
          type: "formule", titre: "④ Champ diffus (en salle)",
          eq: [r`L_{diff} = L_{W,tot} - 10\log A + 6`, r`A = 0.16\cdot\frac{V}{T_r}`],
          vars: [["L_{W,tot}", "Niveau de puissance total dans la salle", "[dB PL]"]],
        },
        {
          type: "formule", titre: "Rendement d’une enceinte", ajout: true,
          eq: [r`\eta = \frac{P_a}{P_e}`],
          miroirs: [r`P_a = \eta\cdot P_e`],
          note: "Typiquement 1 à 5 % pour une enceinte de sonorisation.",
        },
      ],
    },

    /* ================================================================ 1.20 */
    {
      num: "1.20", titre: "Fréquences de résonance, modes propres",
      blocs: [
        {
          type: "formule", titre: "Entre deux parois rigides — tube ouvert aux deux bouts",
          eq: [r`f = N\cdot\frac{c}{2L}`], miroirs: [r`L = N\cdot\frac{c}{2f}`],
          vars: [["c", "Vitesse du son, 340 m/s", "[m/s]"], ["L", "Distance entre parois, longueur du tube", "[m]"], ["N", "1 (fondamentale), 2 (harm. 2), 3 (harm. 3)…", "[–]"]],
        },
        {
          type: "formule", titre: "Tube ouvert à un bout, fermé à l’autre",
          eq: [r`f = N\cdot\frac{c}{4L}`], miroirs: [r`L = N\cdot\frac{c}{4f}`],
          vars: [["N", "1, 3, 5, 7, 9… (harmoniques impaires seulement)", "[–]"]],
        },
        {
          type: "formule", titre: "Entre six parois rigides (salle parallélépipédique)",
          eq: [r`f = \frac{c}{2}\sqrt{\left(\frac{N_x}{L_x}\right)^2 + \left(\frac{N_y}{L_y}\right)^2 + \left(\frac{N_z}{L_z}\right)^2}`],
          vars: [["L_{x,y,z}", "Distance entre deux parois selon x, y ou z", "[m]"], ["N_{x,y,z}", "0, 1, 2, 3… selon x, y ou z", "[–]"]],
          note: "Un seul $N \\neq 0$ : mode axial — deux : tangentiel — trois : oblique.",
        },
        {
          type: "formule", titre: "Fréquence de Schroeder", ajout: true,
          eq: [r`f_S \approx 2000\cdot\sqrt{\frac{T_r}{V}}`],
          note: "Sous $f_S$, la salle est dominée par ses modes propres ; au-dessus, le champ peut être considéré comme diffus.",
        },
      ],
    },

    /* ================================================================ 1.21 */
    {
      num: "1.21", titre: "Durée de réverbération",
      blocs: [
        {
          type: "formule", titre: "Formule de Sabine",
          eq: [r`T_r = 0.16\cdot\frac{V}{A}`, r`A = \sum S_i\cdot\alpha_i`],
          miroirs: [r`A = 0.16\cdot\frac{V}{T_r}`, r`V = \frac{T_r\cdot A}{0.16}`, r`\bar\alpha = \frac{A}{S_{tot}}`],
          vars: [["T_r", "Durée de réverbération", "[s]"], ["V", "Volume de la salle", "[m³]"], ["A", "Aire d’absorption acoustique", "[m²]"], ["S_i", "Surface de chacun des éléments", "[m²]"], ["\\alpha_i", "Coefficient d’absorption de chacun des éléments", "[–]"]],
        },
        {
          type: "formule", titre: "Formule d’Eyring (salles très absorbantes)", ajout: true,
          eq: [r`T_r = \frac{0.16\cdot V}{-S_{tot}\cdot\ln(1-\bar\alpha)}`],
          note: "À préférer à Sabine quand $\\bar\\alpha$ > 0.3 environ.",
        },
        {
          type: "table", titre: "Durées de réverbération recommandées", cls: "half",
          head: ["Local", "$T_r$"],
          rows: [
            ["Bureaux", "0.6 à 0.8 s"], ["Cafés, restaurants", "0.6 à 0.8 s"], ["Ateliers (< 1000 m³)", "0.6 à 1.0 s"],
            ["Ateliers (1000 à 10 000 m³)", "0.8 à 1.3 s"], ["Ateliers (> 20 000 m³)", "1.0 à 1.5 s"], ["Cinémas", "0.6 à 1.0 s"],
            ["Salles de concert sonorisées", "0.8 à 1.2 s"], ["Salles pour la parole", "0.8 à 1.1 s"], ["Salles polyvalentes", "1.0 à 1.6 s"],
            ["Théâtres, opéras", "1.0 à 1.6 s"], ["Salles pour musique de chambre", "1.2 à 2.8 s"], ["Salles de concert symphonique", "1.8 à 2.4 s"],
            ["Salles pour un orgue ou un chœur", "2.0 à 4.0 s"],
          ],
        },
      ],
    },

    /* ================================================================ 1.22 */
    {
      num: "1.22", titre: "Coefficient d’absorption acoustique",
      blocs: [
        {
          type: "table", cls: "dense absorption",
          head: ["Matériau", "125 Hz", "250 Hz", "500 Hz", "1 kHz", "2 kHz", "4 kHz"],
          rows: [
            ["Béton, plâtre, carrelage, parquet, verre…", "0.01", "0.01", "0.02", "0.02", "0.03", "0.05"],
            ["Moquette rase", "0.01", "0.05", "0.10", "0.20", "0.30", "0.40"],
            ["Faux plafond en plâtre perforé", "0.20", "0.40", "0.50", "0.60", "0.60", "0.50"],
            ["Faux plafond en panneaux de laine minérale", "0.30", "0.70", "0.90", "0.90", "0.90", "0.90"],
            ["Rideau velours à 20 cm du mur", "0.20", "0.40", "0.50", "0.60", "0.60", "0.60"],
            ["3 cm de laine minérale contre le support", "0.10", "0.25", "0.40", "0.90", "1.00", "1.00"],
            ["20 cm de laine minérale contre le support", "0.40", "0.90", "1.00", "1.00", "1.00", "1.00"],
            ["1 personne debout ou assise sur une chaise [m²]", "0.3", "0.4", "0.5", "0.5", "0.5", "0.5"],
          ],
          note: "Coefficients donnés uniquement à titre d’exercice. Pour les personnes, la valeur est directement une aire d’absorption $A$ en m².",
        },
      ],
    },

    /* ================================================================ 1.23 */
    {
      num: "1.23", titre: "Rayon caractéristique et distance critique",
      blocs: [
        { type: "texte", kind: "info", text: "Distance à laquelle le niveau du champ diffus (réverbéré) est égal au niveau du champ direct." },
        {
          type: "formule",
          eq: [r`r_c = 0.14\cdot\sqrt{A}`, r`d_c = 0.14\cdot\sqrt{\delta\cdot A}`],
          miroirs: [r`A = \left(\frac{r_c}{0.14}\right)^2`, r`\delta = \frac{1}{A}\left(\frac{d_c}{0.14}\right)^2`, r`d_c \approx 0.057\sqrt{\frac{\delta\cdot V}{T_r}}`],
          vars: [["r_c", "Rayon caractéristique (source omnidirectionnelle)", "[m]"], ["d_c", "Distance critique (source directive)", "[m]"], ["A", "Aire d’absorption acoustique", "[m²]"], ["\\delta", "Directivité de la source", "[–]"]],
          note: "$0.14 = \\sqrt{1/(16\\pi)}$ — à $d_c$ : $L_{tot} = L_{dir} + 3$ dB **(+)**",
        },
      ],
    },

    /* ================================================================ 1.24 */
    {
      num: "1.24", titre: "Intelligibilité de la parole",
      blocs: [
        {
          type: "formule", titre: "Formule de Peutz",
          eq: [r`Al_{cons} = \frac{200\cdot d^2\cdot T_r^2\cdot N}{\delta\cdot V}`, r`Al_{cons,MAX} \approx 9\cdot T_r`],
          miroirs: [r`d = \sqrt{\frac{Al_{cons}\cdot\delta\cdot V}{200\cdot T_r^2\cdot N}}`, r`T_r = \sqrt{\frac{Al_{cons}\cdot\delta\cdot V}{200\cdot d^2\cdot N}}`],
          vars: [
            ["Al_{cons}", "Perte d’intelligibilité des consonnes", "[%]"], ["N", "Nombre total de sources ÷ nombre de sources utiles", "[–]"],
            ["d", "Distance source → auditeur", "[m]"], ["T_r", "Durée de réverbération (à 2 kHz)", "[s]"],
            ["\\delta", "Directivité de la source", "[–]"], ["V", "Volume de la salle", "[m³]"],
          ],
          note: "Plafonnement $Al_{cons,MAX}$ au-delà de ≈ 3 × $d_c$.",
        },
        {
          type: "formule", titre: "Conversion Alcons ↔ STI", ajout: true,
          eq: [r`STI \approx 0.9482 - 0.1845\cdot\ln(Al_{cons})`],
          miroirs: [r`Al_{cons} \approx 170.5\cdot e^{-5.419\cdot STI}`],
          note: "Remplace la lecture graphique de l’abaque original (p. 17). Ex. : $Al_{cons}$ = 15 % ⇒ STI ≈ 0.45 ≈ 69 % de mots compris en dictée.",
        },
        {
          type: "table", titre: "Correspondance Alcons / STI", ajout: true, cls: "half",
          head: ["$Al_{cons}$", "STI", "Intelligibilité"], rows: tableAlcons,
        },
      ],
    },

    /* ================================================================ 1.25 + */
    {
      num: "1.25", titre: "Line array", ajout: true,
      blocs: [
        {
          type: "formule", titre: "Distance de transition champ proche (Fresnel) / champ lointain (Fraunhofer)",
          eq: [r`d_t \approx \frac{h^2}{2\lambda} = \frac{h^2\cdot f}{680}`],
          miroirs: [r`h = \sqrt{\frac{680\cdot d_t}{f}}`, r`f = \frac{680\cdot d_t}{h^2}`],
          vars: [["d_t", "Distance de transition", "[m]"], ["h", "Hauteur de l’array ($N \\times$ hauteur d’un élément)", "[m]"], ["f", "Fréquence", "[Hz]"]],
          note: "$d_t$ augmente avec la fréquence : un même array est « cylindrique » loin dans l’aigu et « sphérique » tôt dans le grave.",
        },
        {
          type: "formule", titre: "Atténuation avec la distance",
          eq: [r`d \le d_t : \quad \Delta L = 10\log\frac{d}{d_0}`, r`d > d_t : \quad \Delta L = 10\log\frac{d_t}{d_0} + 20\log\frac{d}{d_t}`],
          miroirs: [r`L(d) = L_{1W,1m} + 10\log P_e + 10\log N - \Delta L`],
          vars: [["d_0", "Distance de référence = 1 m", "[m]"], ["\\Delta L", "Atténuation totale", "[dB]"]],
          note: "−3 dB par doublement de distance jusqu’à $d_t$, puis −6 dB.",
        },
        {
          type: "formule", titre: "Ouverture verticale (array droit)",
          eq: [r`\theta_{-3\,dB} \approx 2\arcsin\frac{150}{h\cdot f}`],
          miroirs: [r`f_{min} \approx \frac{c}{h}`],
          note: "En dessous de $f_{min}$ (λ ≥ h), l’array ne contrôle plus la directivité verticale.",
        },
        {
          type: "formule", titre: "Couplage des sources (conditions WST)",
          eq: [r`\text{espacement} \le \frac{\lambda}{2} \;\Leftrightarrow\; f_{max} = \frac{c}{2\cdot\text{espacement}}`],
          note: "Au-dessus de $f_{max}$ (aigus), le couplage exige un guide d’onde produisant un front d’onde plan sur ≥ 80 % de la hauteur. Courbure : viser des points de visée équidistants dans le public.",
        },
      ],
    },

    /* ================================================================ 1.26 + */
    {
      num: "1.26", titre: "Subwoofers directifs et délais", ajout: true,
      blocs: [
        {
          type: "formule", titre: "Délai correspondant à une distance",
          eq: [r`\Delta t = \frac{d}{c}`],
          miroirs: [r`d = c\cdot\Delta t`, r`\Delta t\,[\text{ms}] \approx 2.94\cdot d\,[\text{m}]`],
        },
        {
          type: "formule", titre: "End-fire (sources alignées dans l’axe)",
          eq: [r`\Delta t_n = \frac{n\cdot d}{c} \qquad d \le \frac{\lambda_{max}}{4}`],
          note: "Chaque rangée avant est retardée du temps de parcours depuis la rangée arrière : sommation vers l’avant, annulation partielle vers l’arrière.",
        },
        {
          type: "formule", titre: "Cardioïde (gradient)",
          eq: [r`\Delta t = \frac{d}{c} \quad\text{+ inversion de polarité de l’élément arrière}`],
          note: "L’élément arrière (tourné ou non) est retardé de $d/c$ : en phase vers l’avant, opposition de phase vers l’arrière.",
        },
        {
          type: "table", titre: "Espacement max. entre subs (λ/4)", cls: "half",
          head: ["Fréquence", "Espacement $d$"], rows: tableSubEsp,
        },
        {
          type: "table", titre: "Distance → délai", cls: "half",
          head: ["$d$", "$\\Delta t$"], rows: tableSubDelai,
        },
        {
          type: "formule", titre: "Enceintes de rappel (delay towers)",
          eq: [r`\Delta t = \frac{d_{principal} - d_{rappel}}{c} + (5\ \text{à}\ 15\ \text{ms})`],
          note: "Le léger retard supplémentaire exploite l’effet de précédence (Haas) : le son est localisé sur la scène.",
        },
      ],
    },

    /* ================================================================ 1.27 + */
    {
      num: "1.27", titre: "Grandeurs et niveaux électriques", ajout: true,
      blocs: [
        {
          type: "formule", titre: "Loi d’Ohm et puissance",
          eq: [r`U = R\cdot I`, r`P = U\cdot I = \frac{U^2}{R} = R\cdot I^2`],
          miroirs: [r`U = \sqrt{P\cdot R}`, r`I = \sqrt{\frac{P}{R}}`, r`R = \frac{U^2}{P}`],
          vars: [["U", "Tension", "[V]"], ["I", "Courant", "[A]"], ["R, Z", "Résistance, impédance", "[Ω]"], ["P", "Puissance", "[W]"]],
          note: "2.83 V sur 8 Ω = 1 W — 2 V sur 4 Ω = 1 W",
        },
        {
          type: "formule", titre: "Impédances (haut-parleurs)",
          eq: [r`Z_{série} = Z_1 + Z_2`, r`Z_{parallèle} = \frac{Z_1\cdot Z_2}{Z_1 + Z_2}`],
          miroirs: [r`N\ \text{HP identiques en parallèle : } Z = \frac{Z_1}{N}`],
        },
        {
          type: "formule", titre: "Niveaux de tension",
          eq: [r`L_{dBu} = 20\log\frac{U}{0.775\ \text{V}}`, r`L_{dBV} = 20\log\frac{U}{1\ \text{V}}`],
          miroirs: [r`U = 0.775\cdot 10^{\frac{L_{dBu}}{20}}`, r`U = 10^{\frac{L_{dBV}}{20}}`, r`L_{dBu} = L_{dBV} + 2.2`],
          note: "+4 dBu = 1.23 V (niveau ligne pro) — −10 dBV = 0.316 V (niveau ligne grand public)",
        },
        {
          type: "formule", titre: "Niveaux de puissance",
          eq: [r`L_{dBW} = 10\log\frac{P}{1\ \text{W}}`, r`L_{dBm} = 10\log\frac{P}{1\ \text{mW}}`],
          miroirs: [r`P = 10^{\frac{L_{dBW}}{10}}`, r`L_{dBm} = L_{dBW} + 30`],
          note: "0 dBm sur 600 Ω = 0.775 V = 0 dBu",
        },
        {
          type: "formule", titre: "Gain",
          eq: [r`G = 20\log\frac{U_{sortie}}{U_{entrée}} = 10\log\frac{P_{sortie}}{P_{entrée}}`],
          miroirs: [r`\frac{U_s}{U_e} = 10^{G/20}`],
        },
      ],
    },

    /* ================================================================ 1.28 + */
    {
      num: "1.28", titre: "Audio numérique", ajout: true,
      blocs: [
        {
          type: "formule", titre: "Échantillonnage et quantification",
          eq: [r`f_{max} = \frac{f_s}{2}\ \text{(Nyquist)}`, r`D \approx 6.02\cdot n + 1.76\ \text{dB}`],
          miroirs: [r`n = \frac{D - 1.76}{6.02}`, r`f_s \ge 2\cdot f_{max}`],
          vars: [["f_s", "Fréquence d’échantillonnage", "[Hz]"], ["n", "Résolution", "[bit]"], ["D", "Dynamique théorique (sinus pleine échelle)", "[dB]"]],
        },
        {
          type: "formule", titre: "Débit et taille d’un fichier PCM",
          eq: [r`\text{débit} = f_s\cdot n\cdot\text{canaux}\ \text{[bit/s]}`, r`\text{taille} = \frac{\text{débit}\cdot t}{8}\ \text{[octet]}`],
          note: "48 kHz / 24 bit / 2 canaux = 2.304 Mbit/s ≈ 17.3 Mo par minute",
        },
        {
          type: "formule", titre: "Latence d’un buffer",
          eq: [r`t = \frac{\text{taille du buffer}}{f_s}`],
          note: "256 échantillons à 48 kHz = 5.3 ms",
        },
      ],
    },
  ],

  // Différences avec le PDF original (v3.4)
  errata: [
    "1.6 — Puissance acoustique $P_a$ : unité [W] (l’original indique [Pa]). Impédance de l’air $Z_c$ ≈ 400 Pa·s/m.",
    "1.7 — Célérité $c$ en [m/s] (l’original indique [m]).",
    "1.8 — Nombre d’onde $k$ en [rad/m] (l’original indique [rad/s]).",
    "1.21 — Coefficient $\\alpha$ sans unité [–] (l’original indique [m²]).",
    "1.17 — Coefficients −6 dB : la théorie donne ≈ 0.35 pour un piston (0.61 correspond au premier zéro) et ≈ 0.60 pour une ligne (l’original indique 0.50). Les valeurs du formulaire original sont conservées, car c’est la référence d’examen.",
    "1.22 — Faute de frappe « .0.90 » corrigée en 0.90.",
    "Pages-images (cycle des quintes, abaque p. 9, résumé sonorisation p. 14, abaque Alcons/STI p. 17) redessinées ou remplacées par des formules équivalentes.",
  ],
};
