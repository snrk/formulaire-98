# Formulaire 98 — Acoustique (BF technicien du son)

Recréation du formulaire W. Köller v3.4 en 11ty, complétée avec les formules miroirs et des sections ajoutées (line array, subs directifs, électricité, numérique).

## Utilisation

```bash
npm install
npm run dev     # http://localhost:8080
npm run build   # → _site/
```

Impression : ouvrir la page dans **Chrome / Edge** → Imprimer → A4, marges « Par défaut », cocher « Graphiques d'arrière-plan ». Les numéros de page en pied de page utilisent les marges `@page` (Chrome ≥ 131).

## Structure

```
eleventy.config.js        filtres KaTeX (tex, texi, rich) + shortcodes SVG
src/_data/formulaire.js   TOUT le contenu (sections, formules, miroirs, tableaux, errata)
src/_lib/svg.js           cycle des quintes + abaque dB / Pa / W/m² générés en SVG
src/_includes/blocs.njk   rendu des blocs (formule, table, texte, svg)
src/index.njk             page
src/css/print.css         mise en page A4
```

## Ajouter une formule

Dans `src/_data/formulaire.js`, dans la section voulue :

```js
{
  type: "formule",
  titre: "Distance de transition",
  eq: [r`d_t = \frac{h^2 f}{680}`],           // forme principale
  miroirs: [r`f = \frac{680\, d_t}{h^2}`],     // variable isolée
  vars: [["d_t", "Distance de transition", "[m]"]],
  note: "Texte libre avec $formule$ inline et **gras**",
  ajout: true,                                  // badge « + » (absent de l'original)
}
```

- `r\`…\`` = String.raw : on écrit le LaTeX sans doubler les `\`.
- KaTeX est rendu **au build** : une formule invalide fait échouer `npm run build` avec le message d'erreur, et aucune librairie JS n'est chargée côté navigateur.
- `^{\frac{a}{b}}` est automatiquement converti en `^{a/b}` (une fraction en exposant est illisible à l'impression).
- Les tableaux calculés (notes, λ, Lδ, addition de niveaux, Alcons/STI, délais) sont générés en haut du fichier de données.
