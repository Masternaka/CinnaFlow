# Plan d'implémentation — CinnaFlow (Cinnamon Tiling Shell)

> Objectif : reproduire les fonctionnalités de [Tiling Shell](https://github.com/domferr/tilingshell)
> (GNOME Shell) sur Cinnamon/Muffin, en réutilisant son **modèle** (tuiles normalisées,
> interactions) mais **pas son code** (API GNOME incompatibles).
>
> **Dernière mise à jour :** 2026-10-27

---

## 0. État d'avancement

Légende : 🔎 code fait, recette à valider · 🟡 code partiel, recette à valider · ⏳ à faire

| Étape | Statut | Détail |
|---|---|---|
| 0 — Débloquer le chargement | 🔎 | `init`/`enable`/`disable` module-level ; `enable()` retourne l'instance |
| 1 — Corriger les bugs runtime | 🔎 | 7 correctifs + 10 constats de revue corrigés |
| 2 — Filet de sécurité | 🔎 | `scripts/check.sh`, CI GitHub Actions, `docs/recette-cinnamon.md`, logger + préférence `debug` |
| 3 — Découpage modulaire | 🔎 | classes et orchestrateur dans `lib/`, chargement Cinnamon à valider |
| 4 — État persistant + JSON interopérable | 🔎 | code fait (2026-10-27), recette à valider |
| 5 — Fiabiliser le cœur | 🟡 | code partiel (2026-10-27) : restauration, edge tiling, signaux Muffin ; recette à valider |
| 6 — Auto-tiling | ⏳ | — |
| 7 — Gestion avancée | ⏳ | — |
| 8 — Éditeur de layouts | ⏳ | — |
| 9 — Options risquées | ⏳ | — |
| 10 — Finition et publication | ⏳ | — |

> **🔎 / 🟡 = code appliqué mais non encore validé sur une machine Cinnamon.** Les étapes
> 0 à 5 attendent la recette du §3 et la checklist [`recette-cinnamon.md`](recette-cinnamon.md).

---

## 1. Contexte

### État actuel (MVP + étapes 0-5)
- 4 dispositions prédéfinies (2/3 colonnes, colonne + pile, grille 2×2) ;
- prévisualisation au glisser-déposer avec modificateur (`Ctrl`/`Alt`) ;
- Snap Assistant v1 (barre de mini-tuiles en haut d'écran) ;
- raccourcis clavier configurables + OSD ;
- indicateur de panneau avec menu ;
- multi-écran, work areas, gaps internes/externes ;
- chargement de layouts JSON personnalisés (`~/.config/cinnaflow/layouts/`) ;
- cycle de vie Cinnamon conforme et correctifs de robustesse (étapes 0-1) ;
- filet de sécurité : `scripts/check.sh`, CI GitHub Actions, `docs/recette-cinnamon.md`,
  logger `[CinnaFlow]` + préférence `debug` (étape 2) ;
- découpage modulaire dans `lib/` (étape 3) ;
- état persistant par moniteur/espace et import/export Tiling Shell (étape 4) ;
- restauration de la taille au drag, tuilage aux bords en option et signaux Muffin (étape 5 partielle).

### Constat
- **Direction produit : correcte.** Le modèle de tuiles normalisées et les interactions
  clés correspondent à l'amont.
- **Fondations : partiellement consolidées.** Cycle de vie corrigé, bugs bloquants levés,
  contrôles automatisés en place, état persistant codé. Le découpage modulaire est
  appliqué : `extension.js` garde les points d'entrée et les classes sont dans `lib/`.
  La scission interne du menu et de la boucle de grab reste à faire.

### Périmètre
- **Cible :** Cinnamon 6.0 → 6.6, **X11**.
- **Hors périmètre :** Wayland (les API utilisées — `move_resize_frame`, `global.get_pointer`,
  grab-ops, work areas — sont X11/Muffin).

---

## 2. Principes directeurs

1. **1 étape = 1 branche = 1 PR.** Jamais de refactor + feature dans le même commit.
2. **Rester chargeable en permanence** : on ne merge que si la checklist passe.
3. **Tester les cycles activation → désactivation → réactivation** à chaque étape.
4. **Feature-detect toute API privée** (`Main.wm._prepareAnimationInfo`, `imports.ui.windowMenu`,
   signatures de signaux) et dégrader proprement avec un log explicite.
5. **La ROADMAP est un contrat** : la mettre à jour dès qu'une fonctionnalité change de statut.
6. **L'amont est une spécification, pas une source** : s'en inspirer, réimplémenter pour Cinnamon.

### Anti-patterns à éviter
- Ajouter une fonctionnalité avant d'avoir corrigé le cycle de vie.
- Mélanger déplacement de fichiers et changement de comportement.
- Copier un module TS de l'amont en espérant l'adapter « à la marge ».
- Ignorer le snapping natif de Muffin (double aperçu, double animation).

---

## 3. Matrice de vérification (à repasser à chaque étape)

### Environnement
- [ ] 1 écran, 2 écrans, 3 écrans ;
- [ ] résolutions et échelles différentes ;
- [ ] panneau en haut **et** en bas ;
- [ ] thème clair et sombre.

### Fenêtres
- [ ] fenêtre normale ;
- [ ] fenêtre maximisée ;
- [ ] fenêtre plein écran ;
- [ ] dialogue / fenêtre transiente ;
- [ ] fenêtre « toujours au-dessus » ;
- [ ] fenêtre sur un autre espace de travail.

### Réglages
- [ ] `gap` = 0 puis 64 ;
- [ ] `outer-gap` = 0 puis 64 ;
- [ ] `snap-modifier` = `ctrl`, `alt`, `always` ;
- [ ] indicateur affiché / masqué.

### Cycle de vie
- [ ] activation → désactivation → réactivation (×3) sans erreur ;
- [ ] aucun acteur/signal/hotkey résiduel après désactivation ;
- [ ] aucune règle CSS de l'extension active après désactivation.

---

## 4. Étapes

### Étape 0 — Débloquer le chargement · 1-2 h

**Statut : 🔎 code appliqué (2026-09-16) — recette runtime à valider**

**Objectif :** que l'extension s'active et se désactive réellement.

**Actions**
1. En fin de `extension.js`, remplacer le `init` actuel par :

```js
let extension = null;

function init(metadata) {
    extension = new TilingExtension(metadata);
}

function enable() {
    extension.enable();
    return extension; // callbacks pour les boutons de settings-schema.json
}

function disable() {
    extension.disable();
}
```

2. Ne pas toucher à `TilingExtension.enable()` / `disable()` (déjà corrects).

**Definition of Done**
- [ ] l'extension est active dans Paramètres → Extensions ;
- [ ] l'indicateur apparaît ;
- [ ] 3 cycles activer/désactiver sans erreur dans les logs.

**Piège :** Cinnamon appelle `init()` mais **ignore sa valeur de retour**. C'est `enable()`
qui doit retourner les callbacks.

**Recette en attente :** activer l'extension, vérifier l'indicateur, puis 3 cycles
activer/désactiver ; cocher les cases ci-dessus ensuite.

---

### Étape 1 — Corriger les bugs runtime · 2-4 h

**Statut : 🔎 code appliqué (2026-09-16) — recette runtime à valider**

**Objectif :** zéro erreur JS, zéro effet de bord système.

| # | Correctif | Emplacement | État |
|---|---|---|---|
| 1 | `PopupMenuManager` : fournir un propriétaire exposant `.actor` | `IndicatorManager._create()` (`lib/indicator.js`) | ✅ |
| 2 | `PopupMenu(sourceActor, orientation)` — l'argument `arrowSide` à la GNOME n'existe pas en Cinnamon 6.x (vérifié en 6.0.0 et 6.4.0) | `lib/indicator.js` | ✅ |
| 3 | Scoper le CSS : classe `cinnaflow-indicator` + `.cinnaflow-indicator .system-status-icon` | `stylesheet.css:1` | ✅ |
| 4 | Bouton « Ouvrir le dossier des dispositions » résolu via le `return` d'`enable()` | `settings-schema.json` | ✅ |
| 5 | `enumerator.close(null)` | `lib/layoutEngine.js` | ✅ |
| 6 | `_getPanel()` dupliqué supprimé | `lib/tilingExtension.js` | ✅ |
| 7 | Nettoyage de l'état de drag (`_trackDragWindow` / `_untrackDragWindow` / `_resetDrag` + signal `unmanaged`) | `lib/tilingExtension.js` | ✅ |

#### Revue de code du 2026-09-16

10 constats corrigés (4 avertissements, 6 suggestions) :

| Sév. | Constat | Correctif | Emplacement |
|---|---|---|---|
| ⚠️ | Zone de survol (35 px) plus petite que la barre (~77 px) : le bas des cartes était inerte | Hauteur d'activation mesurée via `get_preferred_height` | `SnapAssistant.getActivationHeight()` |
| ⚠️ | Barre jamais reconstruite au changement de moniteur pendant un drag | `_monitor` mémorisé dans `buildFor()` + `matchesMonitor()`, rebuild conditionnel | `SnapAssistant`, `TilingExtension._onDragTick()` |
| ⚠️ | Balayage des styles de toutes les tuiles à chaque tick (40 Hz) | Surlignage différentiel (`_active`, `_setActive`, `_applyActive`) ; `hide()` sort si déjà masquée | `SnapAssistant` |
| ⚠️ | Disposition personnalisée incompatible avec la combobox `layout` (reset au prochain upgrade du schéma) | `_syncLayoutOptions()` → `settings.setOptions('layout', …)` dans `enable()` et à l'ouverture du menu | `TilingExtension` |
| 💡 | Tick 25 ms sans détection de changement, actif même prévisualisation désactivée | Timer non armé si `enable-snap-preview` est faux ; court-circuit `(x, y, modificateur)` | `_onGrabOpBegin()`, `_onDragTick()` |
| 💡 | `layoutId` collecté mais jamais consommé | Au dépôt, la disposition active suit la carte choisie — nouvelle option `sync-layout-on-snap` | `_onGrabOpEnd()` |
| 💡 | Layouts JSON jamais rechargés à chaud | `loadCustomLayouts()` à l'ouverture du menu | `_rebuildMenu()` |
| 💡 | Liste des raccourcis dupliquée (risque de désynchronisation) | `_hotkeyBindings` unique, utilisée par `enable()` et `_installHotkeys()` | `TilingExtension` |
| 💡 | Binding `_enableSnapAssistant` écrit et jamais lu | Supprimé (`getValue` suffit) | `enable()` |
| 💡 | `IndicatorManager.uuid` écrit et jamais lu | Supprimé | `IndicatorManager` |

**Nouvelle clé de préférences :** `sync-layout-on-snap` (checkbox, défaut `true`).
Cette clé modifie le schéma : Cinnamon appliquera une mise à niveau des réglages au
prochain chargement (valeur par défaut pour la clé, autres réglages préservés).

**Vérifications faites :** syntaxe complète de `extension.js` (JavaScriptCore), `jq` sur
`settings-schema.json`, cohérence des appels. **Aucun test runtime** (machine de
développement macOS, pas de Cinnamon).

**Definition of Done**
- [ ] ouvrir/fermer le menu de l'indicateur 10× ; clic extérieur = fermeture ;
- [ ] les autres icônes du panneau ne changent pas de taille ;
- [ ] le bouton du dossier ouvre `~/.config/cinnaflow/layouts/` ;
- [ ] aucun `TypeError` dans les logs ;
- [ ] Snap Assistant : survol du bas des cartes OK, suivi du moniteur OK ;
- [ ] dépôt sur une carte d'une autre disposition → la disposition active change ;
- [ ] ajout d'un `.json` pendant la session → visible après un clic sur l'indicateur.

---

### Étape 2 — Filet de sécurité · 2-3 h

**Statut : 🔎 code fait (2026-09-16) — CI à confirmer au premier push**

**Objectif :** ne plus casser ce qui fonctionne.

**Actions**
1. ✅ `scripts/check.sh` — script unique, utilisé en local et par la CI :
   - syntaxe de `extension.js` et `lib/*.js` (`node --check`, repli JavaScriptCore sur macOS) ;
   - validité JSON de `settings-schema.json` et `metadata.json` (`jq`, repli `python3`) ;
   - présence des fonctions de cycle de vie `init`/`enable`/`disable`
     (garde-fou contre la régression de l'étape 0) ;
2. ✅ `.github/workflows/ci.yml` — exécute `bash scripts/check.sh` sur `push` vers `main`
   et sur les pull requests.
3. ✅ `docs/recette-cinnamon.md` — matrice du §3 + tests spécifiques aux étapes 0-1
   (Snap Assistant, combobox, rechargement à chaud) + journal des recettes.
4. ✅ Logger préfixé `[CinnaFlow]` et préférence `debug` (checkbox, défaut `false`).
   Le logger a été extrait vers `lib/log.js` à l'étape 3, sans changement d'API.

**Definition of Done**
- [ ] la CI passe sur `main` (au premier push) ;
- [ ] `bash scripts/check.sh` passe en local ;
- [ ] la checklist `docs/recette-cinnamon.md` est exécutée et verte avant chaque merge.

---

### Étape 3 — Découpage modulaire (refactor à comportement constant) · 1 j

**Statut : 🔎 code appliqué (2026-10-27) — chargement Cinnamon à valider**

**Objectif :** sortir du monolithe **sans changer le comportement**.

**Arborescence actuelle et suite**
```
extension.js            → init / enable / disable et import de l'orchestrateur
lib/log.js              → Log
lib/layoutEngine.js     → LayoutEngine
lib/state.js            → LayoutState
lib/windowTracker.js    → WindowTracker
lib/indicator.js        → IndicatorManager
lib/preview.js          → PreviewOverlay
lib/snapAssistant.js    → SnapAssistant
lib/tilingExtension.js  → TilingExtension (préférences, drag, menu, orchestration)
lib/edgeTiling.js       → géométrie des bords (étape 5)
lib/dragController.js   → géométrie de restauration (boucle encore dans tilingExtension)
```

**Actions**
1. ✅ Extraire les classes indépendantes et `TilingExtension` dans `lib/`, sans renommer
   de méthode ni modifier les algorithmes. `extension.js` ne garde que les points d'entrée.
2. ✅ Charger les modules par `Extension.getCurrentExtension().imports` et exporter avec
   `var` ; aucun `require`/`module.exports`.
3. ✅ Adapter `scripts/check.sh` (syntaxe de `lib/*.js`), `scripts/package-release.py`
   (modules inclus dans le ZIP) et `scripts/simulation.js` (chargeur de modules simulé).
4. ⏳ La construction du menu reste dans `TilingExtension`; la géométrie de restauration
   est déjà dans `lib/dragController.js`, la boucle de grab reste à extraire à l'étape 5.
   La scission du menu pourra suivre avec l'éditeur de dispositions.

> *Déviation assumée :* `TilingExtension` est déplacé tel quel dans son propre module,
> au lieu d'être immédiatement réparti entre `indicator.js` et `dragController.js`.
> Ce découpage interne change les dépendances et sera terminé avec l'étape 5, sous recette.
> Les noms de méthodes et le comportement restent inchangés dans cette étape.

**Mécanique GJS**
- Chargement : `const Me = Extension.getCurrentExtension();`
  `const LayoutEngine = Me.imports.lib.layoutEngine.LayoutEngine;`
- **Exporter avec `var`** : `var LayoutEngine = class LayoutEngine { ... };`
  L'importer natif n'expose pas `let`/`const`/`class` → cause classique de
  `undefined is not a constructor`.
- L'importeur de l'extension résout normalement `lib/`; si un cas particulier l'exige,
  ajouter le chemin de l'extension à `imports.searchPath` et le documenter.

**Règles**
- un commit = un déplacement de fichier ;
- aucun renommage de méthode dans le même commit ;
- interdiction de mélanger refactor et feature.

**Definition of Done**
- [x] diff mécanique des classes (mêmes algorithmes, méthodes inchangées) ;
- [x] `scripts/check.sh`, simulation et paquet adaptés aux modules ;
- [ ] chargement réel sous Cinnamon/X11 : `init`/`enable`/`disable` et menu ;
- [ ] checklist §3 verte et aucune régression fonctionnelle.

> Vérifié localement : syntaxe des modules, simulation avec chargeur GJS simulé, paquet
> contenant les modules `lib/`. **Non vérifié** : résolution réelle des imports par Cinnamon,
> acteurs, menu, raccourcis et chargement après réactivation.

---

### Étape 4 — État persistant + JSON compatible Tiling Shell · 1-2 j

**Statut : 🔎 code appliqué (2026-10-27) — recette runtime à valider**

**Objectif :** une source de vérité unique — prérequis de la moitié des fonctionnalités restantes.

**Actions**
1. ✅ `lib/state.js` — `LayoutState` :
   - charge `~/.config/cinnaflow/state.json`, avec une sélection
     **par moniteur et par espace de travail** ;
   - API disponible : `getSelectedLayout(monitor, workspace)`,
     `setSelectedLayout(monitor, workspace, layoutId)`, `save()` et `load()` ;
   - écriture après chaque changement, relecture à l'activation ;
   - fichier corrompu ou version inconnue ignoré avec un avertissement.
   - la classe a été écrite inline puis déplacée sans changement d'API à l'étape 3.
2. ✅ **Schéma JSON aligné sur l'amont** (voir annexe C) :
   - `Layout` = `{ "id": string, "tiles": [...] }` ;
   - `Tile` = `{ "x", "y", "width", "height", "groups": [int] }` ;
   - `groups` conservé à l'import et à l'export ; `w`/`h` acceptés pour les anciens
     fichiers manuscrits ; coordonnées normalisées dans `[0, 1]` et arrondies ;
   - un identifiant déjà chargé est ignoré avec une trace, sans écraser la première
     disposition.
3. ✅ **Déjà fait (étape 1)** — les layouts personnalisés sont exposés dans les préférences :
   `_syncLayoutOptions()` appelle `settings.setOptions('layout', options)` dans `enable()`
   et à chaque ouverture du menu. Les libellés en double sont désambiguïsés.
4. ✅ **Export branché** : entrée « Exporter la disposition active (JSON) » dans le menu,
   fichier écrit dans `~/.config/cinnaflow/layouts/exports/` (sous-dossier non chargé
   automatiquement), sous forme de **collection** d'une disposition, format attendu par
   l'import de Tiling Shell. Le nom de fichier est dérivé du libellé et n'écrase pas une
   exportation existante.
5. ✅ La sélection est utilisée par le menu, le cycle clavier, les raccourcis de tuilage,
   le drag classique et le Snap Assistant, avec repli sur la préférence `layout` puis sur
   `two-columns` si la disposition n'existe plus.

**Definition of Done**
- [ ] un layout exporté par Tiling Shell s'importe et apparaît dans le menu et la combo ;
- [ ] un layout exporté par CinnaFlow se réimporte dans Tiling Shell ;
- [ ] la disposition choisie est mémorisée par moniteur et par espace de travail ;
- [ ] un `state.json` corrompu ne bloque ni l'activation ni le tuilage.

> Vérifié par `scripts/simulation.js` : import d'une collection Tiling Shell, conservation
> des `groups`, normalisation, export en collection, réimport, persistance, récupération
> après corruption, priorité de la sélection ciblée sur la préférence et chemin d'export
> du menu. **Non vérifié sous Cinnamon/X11** : indices réels de moniteur/espace, menu,
> raccourcis, drag et redémarrage de Cinnamon.

---

### Étape 5 — Fiabiliser le cœur (drag / prévisualisation / Snap Assistant) · 2-3 j

**Statut : 🟡 code partiel (2026-10-27) — recette runtime à valider**

**Objectif :** un drag irréprochable avant d'empiler des fonctionnalités.

**Actions**
1. 🟡 **Extraction partielle** dans `lib/dragController.js` : la géométrie pure de
   restauration y est isolée et testée. La boucle de grab (25 ms, modificateur, cibles)
   reste dans `TilingExtension`; son extraction complète demande encore une passe de
   refactor avec recette.
2. ✅ **Restaurer la taille d'origine** au début du déplacement d'une fenêtre tuilée
   (seuil 90 px, option `restore-original-size`, défaut activé). La géométrie conserve
   le point saisi sous le pointeur. Les fenêtres dont l'état d'origine était maximisé
   sont exclues de cette restauration; le raccourci de détulage reste disponible.
   La reprise du grab Muffin (`end_grab_op`/`begin_grab_op`) n'est pas utilisée :
   `move_resize_frame` est appliqué pendant le grab et doit être validé en conditions
   réelles.
3. ✅ **Déjà fait (étape 1)** — synchronisation de la disposition active au dépôt
   (option `sync-layout-on-snap`, équivalent `SNAP_ASSIST_SYNC_LAYOUT`) et mémorisation
   du moniteur de construction de la barre (`matchesMonitor()`).
4. 🔎 **Edge tiling** dans `lib/edgeTiling.js` : bords/coins, modes `default`
   (quarts/moitiés), `adaptive` (colonne/ligne de la disposition) et `granular`
   (tuile sous le pointeur), maximise au bord haut. Le module est pur et testé.
   L'option `edge-tiling-mode` est **désactivée par défaut** pour ne pas modifier le
   comportement existant avant la recette. L'activation se fait avec la touche de
   prévisualisation, dans les 16 px des bords (8 px en haut); la bande haute réservée
   au Snap Assistant reste prioritaire en dehors des 8 px.
5. 🟡 **Coexistence Muffin** : les signaux `show-tile-preview`/`hide-tile-preview` sont
   suivis; un aperçu natif de Muffin annule toutes les cibles de l'extension et
   masque ses aperçus pour éviter un double rendu. Pour utiliser les modes de l’extension
   sur les mêmes bords, le snapping natif (`org.cinnamon.muffin edge-tiling`) doit être
   désactivé. Comportement réel, animations et priorité restent à vérifier.

**Definition of Done**
- [ ] 10 scénarios de drag passent (avec/sans modificateur, 1-2 écrans, fenêtre max) ;
- [ ] la taille d'origine revient au début du déplacement d'une fenêtre tuilée ;
- [ ] les trois modes de tuilage aux bords et le maximise au bord haut fonctionnent ;
- [ ] aucun artefact visuel, aucun aperçu résiduel, pas de double aperçu Muffin.

> Vérifié par `scripts/simulation.js` : géométrie des trois modes d'edge tiling,
> maximize au bord haut, coins, colonnes/lignes adaptatives, tuile granulaire et
> restauration de la taille avec conservation du point saisi. **Non vérifié** :
> grab Muffin réel, priorité sur le snapping natif, animations, multi-écran et
> fenêtres maximisées.

---

### Étape 6 — Auto-tiling · 1 j

**Objectif :** placer automatiquement les nouvelles fenêtres.

**Actions**
- écouter `window-created` ;
- chercher la meilleure tuile vide (référence `_findEmptyTile` dans l'ancien TS) ;
- option **désactivée par défaut** (comme l'amont).

**Dépendances :** étape 4 (`State`) + `WindowTracker`.

**Definition of Done**
- [ ] ouvrir 4 fenêtres sur une grille 2×2 → chacune se place seule, sans voler le focus ;
- [ ] option désactivée = comportement inchangé.

---

### Étape 7 — Gestion avancée des fenêtres · 2-4 j

**Actions**
1. **Smart resize** : écouter `grab-op` en redimensionnement, solidariser les voisins (option).
2. **Sélection multi-tuiles (`Alt`)** : union de rectangles + aperçu de sélection
   (référence : `selectionTilePreview.ts`).
3. **Focus directionnel entre fenêtres** (le déplacement entre tuiles existe déjà).

**Definition of Done**
- [ ] redimensionner une fenêtre ajuste les voisines ;
- [ ] sélection multi-tuiles visuellement claire ;
- [ ] navigation clavier cohérente.

---

### Étape 8 — Éditeur de layouts · 3-5 j

**Objectif :** créer/éditer des dispositions sans éditer de JSON.

**Actions**
- UI dans l'indicateur : clic gauche = split, `Ctrl`+clic = split vertical,
  clic droit = supprimer, sauvegarde / annulation ;
- reprendre la logique de l'amont (`editor/layoutEditor.ts`, `editableTilePreview.ts`)
  réimplémentée avec St/Clutter Cinnamon ;
- persistance via `State` (étape 4).

**Definition of Done**
- [ ] créer, éditer, supprimer un layout depuis l'UI ;
- [ ] le layout est utilisable dans le menu, les raccourcis et le Snap Assistant ;
- [ ] les `groups` sont correctement gérés (déplacements solidaires).

---

### Étape 9 — Fonctionnalités à évaluer (prototype d'abord) · variable

| Fonctionnalité | Recommandation |
|---|---|
| Menu contextuel fenêtre (tiling buttons) | Prototyper un patch de `imports.ui.windowMenu` sur une branche isolée. Si trop fragile → proposer ces actions dans le menu de l'indicateur. |
| Bordure de fenêtre focalisée / smart radius | Démarrer par une bordure à radius fixe, puis adapter. La décoration est dessinée par Muffin, pas par un actor St. |
| Groupement Alt-Tab | Reporter. Patcher `js/ui/appSwitcher/*` est fragile. |
| Suggestions de fenêtres | Après l'éditeur. Gros chantier UI mais portable. |

**Règle :** chaque fonctionnalité « risquée » fait l'objet d'un prototype isolé et d'une
décision go/no-go écrite dans la ROADMAP.

---

### Étape 10 — Finition et publication · 1-2 j

- i18n (`imports.gettext` + dossier `locale/`), accents corrigés partout ;
- `LICENSE` complet (texte GPL-3.0) ;
- README : refléter l'état réel (recette, modules, limites) ;
- ROADMAP alignée sur le code ;
- `metadata.json` : bump de version, matrice Cinnamon 6.0-6.6 ;
- publication sur **Cinnamon Spices** (possible dès la fin de l'étape 6).

---

## 5. Récapitulatif et planning

| Étape | Livrable | Durée indicative | Statut |
|---|---|---|---|
| 0 | Extension chargeable | 1-2 h | 🔎 code fait |
| 1 | Zéro bug JS, zéro effet global | 2-4 h | 🔎 code fait |
| 2 | CI + checklist de recette | 2-3 h | 🔎 code fait |
| 3 | Modules GJS | 1 j | 🔎 code fait |
| 4 | State + JSON interopérable | 1-2 j | 🔎 code fait |
| 5 | Drag / edge tiling fiables | 2-3 j | 🟡 code partiel |
| 6 | Auto-tiling | 1 j | ⏳ |
| 7 | Smart resize + multi-tuiles | 2-4 j | ⏳ |
| 8 | Éditeur de layouts | 3-5 j | ⏳ |
| 9 | Options risquées | au cas par cas | ⏳ |
| 10 | Publication | 1-2 j | ⏳ |

**MVP solide (étapes 0 → 6) : ~1 semaine de travail concentré.**
**Suite complète hors fonctions risquées : ~2-3 semaines.**

---

## 6. Journal

| Date | Changement |
|---|---|
| 2026-09-16 | **Étape 0** — cycle de vie Cinnamon : `init`/`enable`/`disable` au niveau module, instance stockée, `enable()` retourne les callbacks de `settings-schema.json`. |
| 2026-09-16 | **Étape 1** — 7 correctifs runtime : propriétaire `.actor` de `PopupMenuManager`, signature `PopupMenu(sourceActor, orientation)`, CSS scopé, callback du bouton, `enumerator.close(null)`, `_getPanel()` dupliqué supprimé, nettoyage de l'état de drag (`unmanaged`). |
| 2026-09-16 | **Revue de code** — 10 constats corrigés (4 ⚠️, 6 💡) : zone d'activation du Snap Assistant, rebuild par moniteur, surlignage différentiel, sync de la combobox `layout`, détection de changement du tick, sync de disposition au dépôt, rechargement à chaud des layouts, liste de raccourcis unique, suppression de deux codes morts. Nouvelle clé `sync-layout-on-snap`. |
| 2026-09-16 | **Vérifications** — syntaxe `extension.js` OK (JavaScriptCore), JSON OK (`jq`), cohérence des appels OK. Recette runtime **non faite** (machine de développement macOS). |
| 2026-09-16 | **Étape 2** — `scripts/check.sh` (syntaxe, JSON, cycle de vie), CI GitHub Actions (`.github/workflows/ci.yml`), `docs/recette-cinnamon.md`, logger `[CinnaFlow]` + préférence `debug` (nouvelle clé de schéma). Exécution locale du script : toutes les vérifications passent. |
| 2026-09-20 | Correctif de cycle de vie : les acteurs de prévisualisation et du Snap Assistant sont maintenant créés dans `enable()` et recréés après chaque `disable()`. Vérifications statiques repassées ; recette Cinnamon/X11 toujours en attente. |
| 2026-10-27 | **Étape 4** — `LayoutState` (initialement inline, déplacé à l'étape 3) : sélection par moniteur/espace de travail dans `state.json`, repli sur la préférence `layout`. Schéma JSON aligné sur Tiling Shell : `groups` conservés, `w`/`h` acceptés, coordonnées normalisées, identifiants en double ignorés. Export en collection depuis le menu vers `layouts/exports/`. |
| 2026-10-27 | **Simulation** — `scripts/simulation.js` exécute le moteur et l'état avec un système de fichiers en mémoire, via Node ou JavaScriptCore ; intégré à `scripts/check.sh`. Couvre import/export, `groups`, normalisation, persistance, fichier d'état corrompu, résolution de sélection, géométrie des bords et de restauration, et cycle de vie simulé. Ne couvre pas les API Cinnamon, le menu, la boucle de grab ni le multi-écran. |
| 2026-10-27 | **Étape 3** — découpage modulaire : `Log`, `LayoutEngine`, `LayoutState`, `WindowTracker`, `IndicatorManager`, `PreviewOverlay`, `SnapAssistant` et `TilingExtension` déplacés dans `lib/` avec export `var`. `extension.js` ne garde que `init`/`enable`/`disable`. Contrôles, simulation (chargeur GJS simulé) et ZIP adaptés. La construction du menu et la boucle de grab restent dans `TilingExtension`; le chargement Cinnamon/X11 reste à valider. |
| 2026-10-27 | **Étape 5 (partielle)** — `lib/dragController.js` (géométrie de restauration) et `lib/edgeTiling.js` (modes default/adaptive/granular, maximise au bord haut). Option `restore-original-size` (défaut vrai, seuil 90 px, hors fenêtres maximisées) et option `edge-tiling-mode` (défaut désactivé). Suivi des signaux `show-tile-preview`/`hide-tile-preview` pour céder la priorité à l'aperçu natif. Simulation étendue; grab Muffin et coexistence réelle à valider. |

---

## Annexe A — Couverture fonctionnelle vs Tiling Shell

Légende : ✅ fait · 🟡 partiel · ❌ absent · Portabilité : **D**irecte /**A**daptée /**R**isquée

| Fonctionnalité amont | État | Portabilité | Remarque |
|---|---|---|---|
| Tiling System (Ctrl + drag) | ✅ | D | — |
| Snap Assistant | 🟡 v1+ | D | zone de survol, changement de moniteur et sync de disposition corrigés (étape 1) |
| Sélection de layout (indicateur) | ✅ | D | — |
| Tile with keyboard | ✅ | D | — |
| Sélection multi-tuiles (Alt) | ❌ | D | union de rectangles |
| Layout editor | ❌ | A | UI St/PopupMenu, gros chantier |
| Smart resize | ❌ | A | grab RESIZING + voisins |
| Edge tiling | 🟡 | A | `lib/edgeTiling.js`, 3 modes, option `off` par défaut; recette à valider |
| Restauration de la taille au drag | 🟡 | D | `lib/dragController.js`, seuil 90 px; recette à valider |
| Tiling buttons / context menu | ❌ | **R** | pas d'API publique (patch `windowMenu`) |
| Per-workspace + per-monitor layout | 🟡 | A | `LayoutState` codé, recette à valider |
| Auto-tiling | ❌ | D | `window-created` + tuile vide |
| Export / import JSON | 🟡 | D | collection Tiling Shell, `groups` conservés, export menu ; recette à valider |
| Windows suggestions | ❌ | D | gros chantier UI |
| Smart border radius | ❌ | **R** | décoration gérée par Muffin |
| Groupement Alt-Tab | ❌ | A/R | patch `appSwitcher` |

---

## Annexe B — API à risque GNOME → Cinnamon

| Sujet | Constat | Stratégie |
|---|---|---|
| Menu de fenêtre | Pas de hook public ; `WindowMenuManager.showWindowMenuForWindow` | Monkey-patch isolé + feature-detect |
| Animations | `Main.wm._prepareAnimationInfo` existe (API privée) + `TilePreview` natif | Adaptateur + fallback sans animation |
| Snapping natif Muffin | Zones `ZONE_*`, `show-tile-preview`, `hide-tile-preview`, `Meta.SizeChange.TILE` | Gating modificateur + priorité à l’aperçu natif |
| Préférences | `settings-schema.json` uniquement (pas de prefs JS GTK4) | Représenter les réglages avec les widgets disponibles |
| Multi-fichiers | Importer par xlet disponible (`Extension.getCurrentExtension().imports`) | Modules `var` |
| Wayland | Non supporté par les API utilisées | Hors périmètre |

---

## Annexe C — Format JSON (compatible Tiling Shell)

Un fichier exporté par Tiling Shell contient une **collection** de dispositions, c'est-à-dire
un tableau. CinnaFlow accepte un objet seul ou un tableau ; son export écrit un tableau
d'une disposition pour rester importable en amont.

```json
[
  {
    "id": "Equal split",
    "tiles": [
      { "x": 0,   "y": 0, "width": 0.5, "height": 1, "groups": [1] },
      { "x": 0.5, "y": 0, "width": 0.5, "height": 1, "groups": [1] }
    ]
  }
]
```

- `Layout` : exactement 2 propriétés (`id`, `tiles`).
- `Tile` : 5 propriétés (`x`, `y`, `width`, `height`, `groups`).
- `groups` sert à lier les tuiles entre elles (éditeur, redimensionnement solidaire).
  CinnaFlow les préserve, mais ne les exploite pas encore pour le redimensionnement.
- L'export utilise le libellé de la disposition comme `id`; un fichier CinnaFlow réimporté
  dans CinnaFlow devient une disposition personnalisée avec ce libellé.
- Référence amont : `doc/json-internal-documentation.md`.

---

## Annexe D — Arborescence cible

```
CinnaFlow/
├── extension.js              # init / enable / disable
├── lib/
│   ├── tilingExtension.js    # orchestration actuelle (menu + boucle de grab)
│   ├── layoutEngine.js       # modèle de tuiles normalisées
│   ├── state.js              # état + sélection par moniteur/workspace
│   ├── windowTracker.js      # fenêtre ↔ tuile, géométrie d'origine
│   ├── dragController.js     # géométrie de restauration ; boucle encore dans tilingExtension
│   ├── preview.js            # prévisualisation
│   ├── snapAssistant.js      # barre de mini-tuiles
│   ├── edgeTiling.js         # bords/coins, trois modes
│   ├── autoTiling.js         # (étape 6)
│   ├── smartResize.js        # (étape 7)
│   ├── editor.js             # (étape 8)
│   ├── indicator.js          # panneau ; menu encore dans tilingExtension
│   └── log.js
├── settings-schema.json
├── stylesheet.css
├── metadata.json
├── docs/
│   └── recette-cinnamon.md
└── .github/workflows/ci.yml
```
