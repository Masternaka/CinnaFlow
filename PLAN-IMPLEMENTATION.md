# Plan d'implémentation — CinnaFlow (Cinnamon Tiling Shell)

> Objectif : reproduire les fonctionnalités de [Tiling Shell](https://github.com/domferr/tilingshell)
> (GNOME Shell) sur Cinnamon/Muffin, en réutilisant son **modèle** (tuiles normalisées,
> interactions) mais **pas son code** (API GNOME incompatibles).
>
> **Dernière mise à jour :** 2026-09-16

---

## 0. État d'avancement

Légende : 🔎 code fait, recette à valider · ⏳ à faire

| Étape | Statut | Détail |
|---|---|---|
| 0 — Débloquer le chargement | 🔎 | `init`/`enable`/`disable` module-level ; `enable()` retourne l'instance |
| 1 — Corriger les bugs runtime | 🔎 | 7 correctifs + 10 constats de revue corrigés |
| 2 — Filet de sécurité | 🔎 | `scripts/check.sh`, CI GitHub Actions, `docs/CHECKLIST.md`, logger + préférence `debug` |
| 3 — Découpage modulaire | ⏳ | — |
| 4 — État persistant + JSON interopérable | ⏳ | 1/4 déjà fait (options de la combobox `layout`) |
| 5 — Fiabiliser le cœur | ⏳ | 2/5 déjà faits (sync disposition, mémoire du moniteur) |
| 6 — Auto-tiling | ⏳ | — |
| 7 — Gestion avancée | ⏳ | — |
| 8 — Éditeur de layouts | ⏳ | — |
| 9 — Options risquées | ⏳ | — |
| 10 — Finition et publication | ⏳ | — |

> **🔎 = code appliqué mais non encore validé sur une machine Cinnamon.** Les étapes 0 et 1
> attendent la recette du §3 et la checklist de test en fin d'étape 1.

---

## 1. Contexte

### État actuel (MVP + étapes 0-2)
- 4 dispositions prédéfinies (2/3 colonnes, colonne + pile, grille 2×2) ;
- prévisualisation au glisser-déposer avec modificateur (`Ctrl`/`Alt`) ;
- Snap Assistant v1 (barre de mini-tuiles en haut d'écran) ;
- raccourcis clavier configurables + OSD ;
- indicateur de panneau avec menu ;
- multi-écran, work areas, gaps internes/externes ;
- chargement de layouts JSON personnalisés (`~/.config/cinnaflow/layouts/`) ;
- cycle de vie Cinnamon conforme et correctifs de robustesse (étapes 0-1) ;
- filet de sécurité : `scripts/check.sh`, CI GitHub Actions, `docs/CHECKLIST.md`,
  logger `[CinnaFlow]` + préférence `debug` (étape 2).

### Constat
- **Direction produit : correcte.** Le modèle de tuiles normalisées et les interactions
  clés correspondent à l'amont.
- **Fondations : partiellement consolidées.** Cycle de vie corrigé, bugs bloquants levés,
  contrôles automatisés en place. L'extension reste un fichier unique (~1265 lignes) sans
  état persistant : les étapes 3 et 4 restent le prérequis des fonctionnalités suivantes.

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
| 1 | `PopupMenuManager` : fournir un propriétaire exposant `.actor` | `IndicatorManager._create()` (`extension.js:392`) | ✅ |
| 2 | `PopupMenu(sourceActor, orientation)` — l'argument `arrowSide` à la GNOME n'existe pas en Cinnamon 6.x (vérifié en 6.0.0 et 6.4.0) | `extension.js:389` | ✅ |
| 3 | Scoper le CSS : classe `cinnaflow-indicator` + `.cinnaflow-indicator .system-status-icon` | `stylesheet.css:1` | ✅ |
| 4 | Bouton « Ouvrir le dossier des dispositions » résolu via le `return` d'`enable()` | `settings-schema.json` | ✅ |
| 5 | `enumerator.close(null)` | `extension.js:92` | ✅ |
| 6 | `_getPanel()` dupliqué supprimé | `extension.js` | ✅ |
| 7 | Nettoyage de l'état de drag (`_trackDragWindow` / `_untrackDragWindow` / `_resetDrag` + signal `unmanaged`) | `extension.js:989, 1001, 1148` | ✅ |

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
   - syntaxe de `extension.js` (`node --check`, repli JavaScriptCore sur macOS) ;
   - validité JSON de `settings-schema.json` et `metadata.json` (`jq`, repli `python3`) ;
   - présence des fonctions de cycle de vie `init`/`enable`/`disable`
     (garde-fou contre la régression de l'étape 0).
2. ✅ `.github/workflows/ci.yml` — exécute `bash scripts/check.sh` sur `push` vers `main`
   et sur les pull requests.
3. ✅ `docs/CHECKLIST.md` — matrice du §3 + tests spécifiques aux étapes 0-1
   (Snap Assistant, combobox, rechargement à chaud) + journal des recettes.
4. ✅ Logger préfixé `[CinnaFlow]` et préférence `debug` (checkbox, défaut `false`).
   *Déviation assumée :* le logger est encore **inline** dans `extension.js` (constante `Log`)
   plutôt que dans `lib/log.js` — introduire un module multi-fichiers maintenant ajouterait
   un risque de chargement à une étape dont le but est justement de sécuriser. L'extraction
   est prévue à l'étape 3, sans changement d'API.

**Definition of Done**
- [ ] la CI passe sur `main` (au premier push) ;
- [ ] `bash scripts/check.sh` passe en local ;
- [ ] la checklist `docs/CHECKLIST.md` est exécutée et verte avant chaque merge.

---

### Étape 3 — Découpage modulaire (refactor à comportement constant) · 1 j

**Objectif :** sortir du monolithe **sans changer le comportement**.

**Arborescence cible**
```
extension.js            → init / enable / disable uniquement
lib/layoutEngine.js     → LayoutEngine
lib/windowTracker.js    → WindowTracker
lib/indicator.js        → IndicatorManager + construction du menu
lib/preview.js          → PreviewOverlay
lib/snapAssistant.js    → SnapAssistant
lib/dragController.js   → logique grab-op + tick
lib/state.js            → (créé vide, rempli à l'étape 4)
lib/log.js
```

> Le logger existe déjà (constante `Log` dans `extension.js`) : l'étape 3 le déplace
> simplement dans `lib/log.js`, sans changer son API.

**Mécanique GJS**
- Chargement : `const Me = Extension.getCurrentExtension();`
  `const LayoutEngine = Me.imports.lib.layoutEngine.LayoutEngine;`
- **Exporter avec `var`** : `var LayoutEngine = class LayoutEngine { ... };`
  L'importer natif n'expose pas `let`/`const`/`class` → cause classique de
  `undefined is not a constructor`.
- Si l'importer d'un sous-dossier pose problème : ajouter le chemin de l'extension
  à `imports.searchPath`.

**Règles**
- un commit = un déplacement de fichier ;
- aucun renommage de méthode dans le même commit ;
- interdiction de mélanger refactor et feature.

**Definition of Done**
- [ ] diff purement mécanique (revue rapide) ;
- [ ] checklist §3 verte ;
- [ ] aucune régression fonctionnelle.

---

### Étape 4 — État persistant + JSON compatible Tiling Shell · 1-2 j

**Objectif :** une source de vérité unique — prérequis de la moitié des fonctionnalités restantes.

**Actions**
1. `lib/state.js` :
   - charge `~/.config/cinnaflow/layouts/*.json` et un `state.json` (disposition sélectionnée
     **par moniteur et par espace de travail**) ;
   - API : `getLayouts()`, `getLayout(id)`, `getSelectedLayout(monitor, workspace)`,
     `setSelectedLayout()`, `saveLayout()`, `deleteLayout()` ;
   - signal `changed` (via `imports.signals`) pour notifier l'UI.
2. **Aligner le schéma JSON sur l'amont** (voir annexe C) :
   - `Layout` = `{ "id": string, "tiles": [...] }` ;
   - `Tile` = `{ "x", "y", "width", "height", "groups": [int] }` ;
   - **conserver `groups`** (actuellement jeté en `extension.js:129-154`).
3. ✅ **Déjà fait (étape 1)** — les layouts personnalisés sont exposés dans les préférences :
   `_syncLayoutOptions()` appelle `settings.setOptions('layout', options)` dans `enable()`
   et à chaque ouverture du menu.
4. Brancher l'export (code mort `extension.js:156-179`) sur le format amont.

**Definition of Done**
- [ ] un layout exporté par Tiling Shell s'importe et apparaît dans le menu et la combo ;
- [ ] un layout exporté par CinnaFlow se réimporte dans Tiling Shell ;
- [ ] la disposition choisie est mémorisée par moniteur et par espace de travail.

---

### Étape 5 — Fiabiliser le cœur (drag / prévisualisation / Snap Assistant) · 2-3 j

**Objectif :** un drag irréprochable avant d'empiler des fonctionnalités.

**Actions**
1. Extraire la logique dans `lib/dragController.js` (tick 16-25 ms, gating modificateur).
2. **Restaurer la taille d'origine** au début du déplacement d'une fenêtre tuilée
   (seuil ~90 px) — référence : `58b0fa5^:src/components/tilingsystem/tilingManager.ts`.
3. ✅ **Déjà fait (étape 1)** — synchronisation de la disposition active au dépôt
   (option `sync-layout-on-snap`, équivalent `SNAP_ASSIST_SYNC_LAYOUT`) et mémorisation
   du moniteur de construction de la barre (`matchesMonitor()`).
4. **Edge tiling** (bords/coins, 3 modes + maximize au bord haut) —
   référence : `58b0fa5^:src/components/tilingsystem/edgeTilingManager.ts`.
5. Vérifier la **coexistence avec le snapping natif de Muffin**
   (zones `ZONE_*`, signaux `show-tile-preview` / `hide-tile-preview`) :
   pas de double aperçu, pas de double animation.

**Definition of Done**
- [ ] 10 scénarios de drag passent (avec/sans modificateur, 1-2 écrans, fenêtre max) ;
- [ ] aucun artefact visuel, aucun aperçu résiduel.

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
- README : retirer la mention Wayland, refléter l'état réel ;
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
| 3 | Modules GJS | 1 j | ⏳ |
| 4 | State + JSON interopérable | 1-2 j | ⏳ (1/4 fait) |
| 5 | Drag / edge tiling fiables | 2-3 j | ⏳ (2/5 faits) |
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
| 2026-09-16 | **Étape 2** — `scripts/check.sh` (syntaxe, JSON, cycle de vie), CI GitHub Actions (`.github/workflows/ci.yml`), `docs/CHECKLIST.md`, logger `[CinnaFlow]` + préférence `debug` (nouvelle clé de schéma). Exécution locale du script : toutes les vérifications passent. |

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
| Edge tiling | ❌ | A | déjà écrit dans l'ancien TS |
| Tiling buttons / context menu | ❌ | **R** | pas d'API publique (patch `windowMenu`) |
| Per-workspace + per-monitor layout | ❌ | A | nécessite `State` |
| Auto-tiling | ❌ | D | `window-created` + tuile vide |
| Export / import JSON | 🟡 | D | combobox synchronisée (étape 1) ; format à aligner (`groups`, étape 4) |
| Windows suggestions | ❌ | D | gros chantier UI |
| Smart border radius | ❌ | **R** | décoration gérée par Muffin |
| Groupement Alt-Tab | ❌ | A/R | patch `appSwitcher` |

---

## Annexe B — API à risque GNOME → Cinnamon

| Sujet | Constat | Stratégie |
|---|---|---|
| Menu de fenêtre | Pas de hook public ; `WindowMenuManager.showWindowMenuForWindow` | Monkey-patch isolé + feature-detect |
| Animations | `Main.wm._prepareAnimationInfo` existe (API privée) + `TilePreview` natif | Adaptateur + fallback sans animation |
| Snapping natif Muffin | Zones `ZONE_*`, `show-tile-preview`, `Meta.SizeChange.TILE` | Coexistence explicite (gating modificateur) |
| Préférences | `settings-schema.json` uniquement (pas de prefs JS GTK4) | Représenter les réglages avec les widgets disponibles |
| Multi-fichiers | Importer par xlet disponible (`Extension.getCurrentExtension().imports`) | Modules `var` |
| Wayland | Non supporté par les API utilisées | Hors périmètre |

---

## Annexe C — Format JSON (compatible Tiling Shell)

```json
{
  "id": "Equal split",
  "tiles": [
    { "x": 0,   "y": 0, "width": 0.5, "height": 1, "groups": [1] },
    { "x": 0.5, "y": 0, "width": 0.5, "height": 1, "groups": [1] }
  ]
}
```

- `Layout` : exactement 2 propriétés (`id`, `tiles`).
- `Tile` : 5 propriétés (`x`, `y`, `width`, `height`, `groups`).
- `groups` sert à lier les tuiles entre elles (éditeur, redimensionnement solidaire).
- Référence amont : `doc/json-internal-documentation.md`.

---

## Annexe D — Arborescence cible

```
CinnaFlow/
├── extension.js              # init / enable / disable
├── lib/
│   ├── layoutEngine.js       # modèle de tuiles normalisées
│   ├── state.js              # layouts + sélection par moniteur/workspace
│   ├── windowTracker.js      # fenêtre ↔ tuile, géométrie d'origine
│   ├── dragController.js     # grab-op, tick, cibles
│   ├── preview.js            # prévisualisation
│   ├── snapAssistant.js      # barre de mini-tuiles
│   ├── edgeTiling.js         # bords/coins (étape 5)
│   ├── autoTiling.js         # (étape 6)
│   ├── smartResize.js        # (étape 7)
│   ├── editor.js             # (étape 8)
│   ├── indicator.js          # panneau + menu
│   └── log.js
├── settings-schema.json
├── stylesheet.css
├── metadata.json
├── docs/
│   └── CHECKLIST.md
└── .github/workflows/ci.yml
```