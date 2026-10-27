# Architecture actuelle

État observé dans le code le 27 octobre 2026. CinnaFlow est une extension GJS chargée par Cinnamon, sans chaîne de compilation npm. Node.js sert au contrôle syntaxique et à la simulation locale/CI lorsqu’il est disponible.

## Code de l’extension

`extension.js` ne contient plus que les points d’entrée module et l’import de l’orchestrateur. Les modules sont dans `lib/` :

| Élément | Responsabilité |
| --- | --- |
| `extension.js` | `init` / `enable` / `disable`, import de `TilingExtension`. |
| `lib/log.js` | Traces et erreurs `[CinnaFlow]`, préférence `debug`. |
| `lib/layoutEngine.js` | Quatre presets, lecture des JSON utilisateur, import des collections Tiling Shell, export, sélection des tuiles et calcul des géométries. |
| `lib/state.js` | Sélections de disposition par moniteur/espace de travail dans `~/.config/cinnaflow/state.json`. |
| `lib/windowTracker.js` | Géométrie d’origine, état maximisé et suivi des fenêtres. |
| `lib/indicator.js` | Indicateur du panneau; le menu est construit dans `tilingExtension`. |
| `lib/preview.js` | Aperçu de la tuile cible. |
| `lib/snapAssistant.js` | Cartes de dispositions en haut du moniteur et survol. |
| `lib/edgeTiling.js` | Géométrie pure des bords/coins : modes default, adaptive et granular, maximise au bord haut. |
| `lib/dragController.js` | Géométrie pure de restauration de la taille d’origine. |
| `lib/tilingExtension.js` | Préférences, raccourcis, boucle de grab, construction du menu et orchestration du cycle de vie. |

Les modules exportent leurs symboles avec `var` et se chargent via l’importeur de l’extension :

```js
const Extension = imports.ui.extension;
const Me = Extension.getCurrentExtension();
const TilingExtension = Me.imports.lib.tilingExtension.TilingExtension;
```

Un module local peut importer ses voisins de la même manière. Cette forme évite `require` et `module.exports`, dépréciés dans Cinnamon. Les imports GI et Cinnamon (`imports.gi.*`, `imports.ui.*`) restent accessibles directement.

Les fenêtres et zones de travail proviennent de Cinnamon/Muffin. Les acteurs d’aperçu et du Snap Assistant sont créés dans `enable()` et détruits dans `disable()` pour permettre la réactivation. La construction du menu et la boucle de grab restent dans `TilingExtension`; la géométrie de restauration est déjà dans `lib/dragController.js` et les bords dans `lib/edgeTiling.js`. Leur scission complète appartient aux étapes suivantes.

`settings-schema.json` décrit les préférences et raccourcis; `metadata.json` porte l’UUID et la version; `stylesheet.css` fournit les styles. Leur emplacement racine fait partie du contrat de chargement et du packaging.

## Configuration, dispositions et état

Les dispositions personnelles sont dans `~/.config/cinnaflow/layouts/`. Le moteur recharge les fichiers depuis le menu de l’indicateur, en plus des quatre dispositions intégrées. Il accepte un objet seul ou une collection (tableau), les champs `tiles` ou `rects`, et `x`, `y`, `width`/`w`, `height`/`h`, `groups`. Les coordonnées sont normalisées dans `[0, 1]` et arrondies; les identifiants en double sont ignorés avec une trace.

Les `groups` sont conservés à l’import et à l’export. Ils ne pilotent pas encore le redimensionnement solidaire prévu aux étapes 7 et 8.

Le menu de l’indicateur propose l’export de la disposition active. Le fichier est écrit dans `~/.config/cinnaflow/layouts/exports/`, sous forme de collection d’une disposition conforme au format Tiling Shell. Ce sous-dossier n’est pas parcouru par le chargement automatique, pour éviter les doublons et l’écrasement d’un fichier utilisateur.

Les sélections sont enregistrées dans `~/.config/cinnaflow/state.json`, avec une clé `moniteur:espace` et une version de format :

```json
{ "version": 1, "selections": { "0:0": "grid", "1:0": "two-columns" } }
```

La préférence `layout` sert de valeur par défaut pour les espaces sans sélection. Les indices de moniteur et d’espace proviennent de Cinnamon; réorganiser les écrans peut modifier leur affectation. Un état corrompu est ignoré avec un avertissement.

## Drag, restauration et bords

Lorsqu’une fenêtre tuilée est déplacée de plus de 90 px, `restore-original-size` (défaut activé) restaure sa géométrie d’avant le tuilage en conservant le point saisi sous le pointeur. Les fenêtres dont l’état sauvegardé était maximisé sont ignorées par cette restauration. La géométrie pure est dans `lib/dragController.js`; la boucle de grab reste dans `TilingExtension`.

Le tuilage aux bords est optionnel (`edge-tiling-mode`, défaut `off`). Il s’active avec la touche de prévisualisation, dans les 16 px des bords (8 px en haut), et propose les modes `default` (quarts/moitiés), `adaptive` (colonne ou ligne de la disposition) et `granular` (tuile sous le pointeur). Le centre du bord haut maximise. Les rectangles de bord couvrent la zone de travail sans appliquer les marges internes.

Les signaux Muffin `show-tile-preview` et `hide-tile-preview` sont suivis : un aperçu natif annule toutes les cibles de l’extension et masque ses aperçus, pour éviter un double rendu. Pour utiliser les modes de l’extension sur les mêmes bords, le snapping natif de Cinnamon doit être désactivé (`org.cinnamon.muffin edge-tiling`). La priorité réelle, les animations et le comportement multi-écran restent à vérifier sous Cinnamon/X11.

## Vérification et livraison

`scripts/check.sh` compile la syntaxe JavaScript des fichiers racine et `lib/`, vérifie les JSON, recherche les points d’entrée module et exécute `scripts/simulation.js`. `.github/workflows/ci.yml` l’exécute pour les push sur `main` et les pull requests.

`scripts/simulation.js` charge les modules avec des imports simulés et un système de fichiers en mémoire. Il couvre les dispositions, l’import/export JSON, `LayoutState`, la résolution de la sélection dans `TilingExtension`, la géométrie de restauration et les trois modes de tuilage aux bords; il ne remplace pas la recette des interactions Cinnamon, du Snap Assistant, de la boucle de grab ou du multi-écran.

`scripts/package-release.py` crée un ZIP contenant les cinq fichiers racine d’exécution/licence et les modules `lib/*.js` (10 actuellement). `.github/workflows/release.yml` vérifie le code et le tag, puis prépare une release en brouillon. Voir [releases](releases.md) et [vérifications](verifications.md).

Le découpage est amorcé : les classes indépendantes et l’orchestrateur sont séparés. La scission interne du menu et de la boucle de grab reste à faire; elle nécessitera de nouvelles vérifications et une recette Cinnamon/X11.
