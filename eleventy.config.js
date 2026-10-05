import katex from "katex";
import { nomogramme, cycleQuintes } from "./src/_lib/svg.js";

// Lit un groupe {…} équilibré à partir de s[i] === "{" ; renvoie [contenu, index après "}"]
const group = (s, i) => {
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "{") depth++;
    else if (s[j] === "}" && --depth === 0) return [s.slice(i + 1, j), j + 1];
  }
  throw new Error(`Accolade non fermée : ${s}`);
};

// ^{\frac{N}{D}} => ^{N/D} : une fraction en exposant est illisible une fois imprimée.
// Le numérateur est mis entre parenthèses s'il contient une opération.
const flatExponents = (tex) => {
  let out = "", i = 0;
  const key = "^{\\frac{";
  while (i < tex.length) {
    const k = tex.indexOf(key, i);
    if (k === -1) { out += tex.slice(i); break; }
    const [exp, end] = group(tex, k + 1);       // contenu de ^{…}
    out += tex.slice(i, k);
    if (exp.startsWith("\\frac{")) {
      const [num, n2] = group(exp, 5);
      const [den, n3] = group(exp, n2);
      if (n3 === exp.length) {
        const simple = !/[+\-\\]|\s/.test(num.replace(/\\log|\\cdot/g, "")) && !/[+\-]/.test(num);
        out += `^{${simple ? num : `(${num})`}/${den}}`;
        i = end;
        continue;
      }
    }
    out += `^{${exp}}`;
    i = end;
  }
  return out;
};

// Rendu KaTeX au build : aucune dépendance JS côté navigateur.
const render = (tex, displayMode) =>
  katex.renderToString(flatExponents(tex), {
    displayMode,
    throwOnError: true, // une formule invalide casse le build => on la voit tout de suite
    strict: "ignore",
    output: "html",
    macros: {
      "\\dB": "\\,\\text{dB}",
      "\\lg": "\\log",
    },
  });

// Texte libre : $...$ => formule inline, **gras**, retours à la ligne
// (le texte est traité avant les formules : le HTML KaTeX contient des retours à la ligne)
const rich = (str = "") =>
  String(str)
    .split(/(\$[^$]+\$)/g)
    .map((part) =>
      part.startsWith("$") && part.endsWith("$") && part.length > 1
        ? render(part.slice(1, -1), false)
        : part.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>")
    )
    .join("");

export default function (eleventyConfig) {
  eleventyConfig.addFilter("tex", (t) => render(t, true));
  eleventyConfig.addFilter("texi", (t) => render(t, false));
  eleventyConfig.addFilter("rich", rich);

  eleventyConfig.addShortcode("nomogramme", nomogramme);
  eleventyConfig.addShortcode("cycleQuintes", cycleQuintes);

  eleventyConfig.addPassthroughCopy({ "node_modules/katex/dist/katex.min.css": "katex/katex.min.css" });
  eleventyConfig.addPassthroughCopy({ "node_modules/katex/dist/fonts": "katex/fonts" });
  eleventyConfig.addPassthroughCopy("src/css");

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
  };
}
