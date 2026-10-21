# Architecture actuelle

État observé dans le code le 21 octobre 2026. CinnaFlow est une extension GJS chargée par Cinnamon, sans chaîne de compilation npm. Node.js sert uniquement au contrôle syntaxique local/CI lorsqu’il est disponible.

## Code de l’extension

Toutes les classes suivantes sont actuellement dans `extension.js` :

| Élément | Responsabilité |
| --- | --- |
| `Log` | Traces et erreurs `[CinnaFlow]`, préférence `debug`. |
| `LayoutEngine` | Quatre presets, lecture des JSON utilisateur, sélection des tuiles et calcul des géométries. |
| `WindowTracker` | Géométrie d’origine, état maximisé et suivi des fenêtres. |
| `IndicatorManager` | Indicateur et menu du panneau. |
| `PreviewOverlay` | Aperçu de la tuile cible. |
| `SnapAssistant` | Cartes de dispositions en haut du moniteur et survol. |
| `TilingExtension` | Préférences, raccourcis, drag, signaux et orchestration du cycle de vie. |
| `init` / `enable` / `disable` | Points d’entrée module exigés par Cinnamon. |

Les imports utilisent `imports.ui` et `imports.gi` (St, Meta, Gio, GLib, Clutter). Les fenêtres et zones de travail proviennent de Cinnamon/Muffin. Les acteurs d’aperçu et du Snap Assistant sont créés dans `enable()` et détruits dans `disable()` pour permettre la réactivation.

`settings-schema.json` décrit les préférences et raccourcis; `metadata.json` porte l’UUID et la version; `stylesheet.css` fournit les styles. Leur emplacement racine fait partie du contrat de chargement et du packaging.

## Configuration et dispositions

Les dispositions personnelles sont dans `~/.config/cinnaflow/layouts/`. Le moteur recharge les fichiers depuis le menu de l’indicateur, en plus des quatre dispositions intégrées. Il lit des objets contenant `tiles` (ou `rects`) et des coordonnées `x`, `y`, `width`, `height`; il normalise les valeurs numériques. Ce traitement ne constitue pas une validation stricte de tous les JSON possibles.

Une méthode `exportLayout` existe dans le moteur, sans parcours d’export exposé dans l’interface. La conservation de `groups` et la persistance des sélections par moniteur/espace de travail restent des objectifs du plan. Ne pas déduire la compatibilité complète Tiling Shell de la simple présence d’une lecture JSON.

## Vérification et livraison

`scripts/check.sh` compile la syntaxe JavaScript sans exécuter GJS, vérifie les JSON et recherche les points d’entrée module. `.github/workflows/ci.yml` l’exécute pour les push sur `main` et les pull requests.

`scripts/package-release.py` crée un ZIP contenant seulement les cinq fichiers d’exécution/licence. `.github/workflows/release.yml` vérifie le code et le tag, puis prépare une release en brouillon. Voir [releases](releases.md) et [vérifications](verifications.md).

Le découpage en `lib/` décrit dans [le plan](plan-implementation.md) reste à réaliser; il nécessitera aussi d’adapter le packaging et les contrôles. La présente réorganisation ne découpe pas le code de l’extension.
