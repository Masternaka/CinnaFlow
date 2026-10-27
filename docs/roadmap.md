# Feuille de route — Cinnamon Tiling Shell

Le MVP actuel couvre les dispositions prédéfinies, les raccourcis clavier, les marges, le multi-écran, le choix de disposition dans le panneau, la prévisualisation au drag, le Snap Assistant v1, le chargement de JSON personnalisés, l’état par moniteur/espace, l’import/export Tiling Shell, la restauration de taille et un tuilage aux bords optionnel. Il reprend le principe de tuiles normalisées de [Tiling Shell](https://github.com/domferr/tilingshell), mais son code est réécrit pour Cinnamon et Muffin.

> Le statut technique de référence est [`plan-implementation.md`](plan-implementation.md).
> Les fonctions déjà codées restent **à valider sous Cinnamon/X11** avec
> [`docs/recette-cinnamon.md`](recette-cinnamon.md).

## Vue d'ensemble

Ce document fusionne la feuille de route produit et le plan d’implémentation technique. Il sert à la fois de:

- backlog priorisé pour le développement,
- plan de mise en œuvre détaillé,
- checklist de validation avant chaque livraison.

Les deux chantiers majeurs à venir sont :

1. la validation Cinnamon/X11 de l’état persistant, du JSON interopérable et du chargement modulaire, puis la fiabilisation du drag ;
2. l’auto-tiling et l’éditeur de dispositions.

## Écart fonctionnel avec Tiling Shell

| Fonctionnalité | État dans le MVP Cinnamon |
| --- | --- |
| Dispositions personnalisées et éditeur graphique | Chargement JSON, import Tiling Shell et export codés ; éditeur à faire |
| Import/export JSON de dispositions | Codé, recette Cinnamon/X11 en attente |
| Prévisualisation des tuiles pendant le déplacement | Codée, recette Cinnamon/X11 en attente |
| Activation avec `Ctrl` pendant un glisser-déposer | Codée, recette Cinnamon/X11 en attente |
| Snap Assistant au bord supérieur | v1 codée, recette Cinnamon/X11 en attente |
| Sélection de plusieurs tuiles avec `Alt` | À faire |
| Tuilage aux bords de l'écran | Codé en option (`edge-tiling-mode`), recette Cinnamon/X11 en attente |
| Auto-tiling des nouvelles fenêtres | À faire |
| Suggestions pour remplir les tuiles libres | À faire |
| Disposition par espace de travail et moniteur | Codée, recette Cinnamon/X11 en attente |
| Redimensionnement intelligent des fenêtres adjacentes | À faire |
| Navigation directionnelle entre fenêtres | À faire |
| Menu contextuel des fenêtres | À faire |
| Restauration de la taille d'origine au drag | Codée, recette Cinnamon/X11 en attente |
| Groupement dans Alt-Tab, bordure de fenêtre et réglages visuels avancés | À faire |
| Raccourcis pour déplacer une fenêtre entre tuiles | Disponible |
| Navigation fluide multi-moniteurs au clavier | Disponible |
| Raccourci pour restaurer la fenêtre active | Disponible |
| Raccourci pour circuler entre les dispositions avec OSD | Disponible |
| Menu de sélection de disposition | Disponible |
| Marges et zone de travail par moniteur | Disponible |

## Backlog priorisé

### Priorité 1 — État persistant + JSON compatible Tiling Shell

**État au 27 octobre 2026 : codé, recette Cinnamon/X11 en attente.**

- Format JSON compatible avec les collections de Tiling Shell.
- Layouts sélectionnés par moniteur et espace de travail dans `~/.config/cinnaflow/state.json`.
- Import des collections Tiling Shell et export de la disposition active depuis le menu.
- Structures validées et normalisées avant intégration dans le moteur; `groups` conservés.
- Export et bouton d’ouverture du dossier branchés.

### Priorité 2 — Fiabiliser le drag et la prévisualisation

**État au 27 octobre 2026 : code partiel, recette Cinnamon/X11 en attente.**

- Exécuter la recette Cinnamon/X11 des interactions existantes.
- Restauration de la taille d’origine au début du drag : codée (`lib/dragController.js`).
- Tuilage aux bords : codé en option (`lib/edgeTiling.js`, `edge-tiling-mode`), avec priorité à l’aperçu natif de Muffin.
- Terminer l’extraction de la boucle de grab dans `lib/dragController.js`.

### Priorité 3 — Auto-tiling et espaces de travail

- Placer les nouvelles fenêtres dans la meilleure tuile libre.
- Proposer les fenêtres pouvant compléter les tuiles vides.

### Priorité 4 — Éditeur et gestion avancée

- Créer un éditeur de layouts.
- Ajouter sélection multi-tuiles, smart resize et focus directionnel.

### Priorité 5 — Fonctions risquées

- Prototyper le menu contextuel, la bordure de fenêtre et le groupement Alt-Tab sur des branches isolées.

## Plan d’implémentation détaillé

### Phase 1 — Dispositions personnalisées et import/export JSON

#### Objectif

Séparer le moteur de tuilage des quatre dispositions codées en dur pour permettre des layouts externes, dynamiques et éditables.

#### Détails d’implémentation

- Stockage des fichiers JSON dans `~/.config/cinnaflow/layouts/` (standard XDG Linux)
- Création automatique du dossier et d’un fichier d’exemple tel que `sample-ultrawide.json`
- Détection automatique des fichiers `.json` dans le dossier
- Intégration des layouts dans :
  - le menu du panneau,
  - le sélecteur de disposition,
  - le cycle clavier,
  - le Snap Assistant
- Validation des champs JSON : `name`, `tiles`, `x`, `y`, `w`, `h` dans `[0, 1]`
- Fusion avec les dispositions par défaut
- Export d’une disposition existante vers un fichier JSON
- Import depuis le dossier utilisateur avec gestion des erreurs sans crash

#### Points d’intégration

- Ajout du bouton `open-layouts-folder` dans le schéma des paramètres Cinnamon.
- Appel à `_openLayoutsFolder()` pour ouvrir le dossier utilisateur via le gestionnaire de fichiers par défaut.
- Utilisation de `Gio.AppInfo.launch_default_for_uri` pour un comportement natif.

#### Fichiers concernés

- [lib/layoutEngine.js](../lib/layoutEngine.js)
- [lib/tilingExtension.js](../lib/tilingExtension.js)
- [settings-schema.json](../settings-schema.json)
- [stylesheet.css](../stylesheet.css)

#### Règles de validation

- Les layouts invalides doivent être rejetés proprement.
- Les fichiers mal formés ou hors limites doivent être ignorés sans bloquer l’extension.
- La structure reste compatible avec le format de Tiling Shell autant que possible.

### Phase 2 — Prévisualisation au déplacement

#### Objectif

Passer d’un tiling basé sur le clavier à une interaction visuelle de glisser-déposer.

#### Points clés

- Écoute des mouvements de fenêtrage fournis par Muffin.
- Création d’une surcouche semi-transparente sur le moniteur concerné.
- Détection de la tuile sous le pointeur.
- Application au relâchement de la fenêtre.
- Activation avec `Ctrl`, configurable dans les préférences.

### Phase 3 — Snap Assistant et tuilage aux bords

#### Objectif

Afficher une aide visuelle au bord supérieur et permettre de poser immédiatement une fenêtre dans une tuile.

#### Comportement attendu

- Lorsque le pointeur approche du bord haut de la zone de travail (`y < workArea.y + 35`), la barre d’aide apparaît.
- La barre est centrée en haut du moniteur, sous forme de mini-tuiles.
- Le survol d’une tuile l’illumine et affiche une surcouche grand format.
- Le relâchement de la souris ancre la fenêtre dans la tuile sélectionnée.
- `enable-snap-assistant` active ou désactive ce comportement.

#### Implémentation technique

- Ajout d’une classe `SnapAssistant` dans [lib/snapAssistant.js](../lib/snapAssistant.js)
- Conteneur visuel `St.BoxLayout` dans `Main.uiGroup`
- Construction dynamique des mini-tuiles selon la disposition active
- Méthodes attendues :
  - `showForMonitor(monitor, layout, workArea)`
  - `findHoveredTile(x, y)`
  - `hide()`
  - `destroy()`
- Intégration dans `_onDragTick()` de `TilingExtension`
- Masquage du Snap Assistant dès que le pointeur quitte la zone sensible

#### Styles visuels

Dans [stylesheet.css](../stylesheet.css) :

- `.snap-assistant-bar`
- `.snap-assistant-tile`
- `.snap-assistant-tile-active`

#### Paramètres

Dans [settings-schema.json](../settings-schema.json) :

- `enable-snap-assistant` (`checkbox`, défaut `true`)
- `open-layouts-folder` (`button`, appelle `_openLayoutsFolder`)

#### Tuilage aux bords (code présent, option désactivée par défaut)

- `edge-tiling-mode` : `off`, `default`, `adaptive` ou `granular`.
- Activation avec la touche de prévisualisation, dans les 16 px des bords (8 px en haut).
- Le centre du bord haut maximise ; le Snap Assistant reste accessible juste sous cette bande.
- `default` : quarts aux coins, moitiés sur les bords ; `adaptive` : colonne/ligne de la disposition ; `granular` : tuile sous le pointeur.
- Les aperçus natifs Muffin annulent les cibles de l’extension pour éviter un double rendu.
- Recette Cinnamon/X11 et priorité réelle face au snapping natif à valider.

### Phase 4 — Automatisation et espaces de travail

**État au 27 octobre 2026 : sélection par moniteur/espace codée; auto-tiling et suggestions à faire.**

- Conserver la disposition sélectionnée par moniteur et par espace de travail.
- Proposer le meilleur emplacement libre à l’ouverture d’une fenêtre.
- Suggérer les fenêtres pouvant compléter les tuiles libres.

### Phase 5 — Gestion avancée des fenêtres

- Sélection de plusieurs tuiles adjacentes avec `Alt`.
- Redimensionnement coordonné des fenêtres voisines.
- Changement de focus directionnel et menu contextuel.
- Évaluation des améliorations visuelles supplémentaires.

## Architecture technique recommandée

### LayoutEngine

- Définir le dossier de configuration : `~/.config/cinnaflow/layouts/`
- Charger les layouts JSON dynamiquement
- Valider la structure des fichiers avant intégration
- Fusionner les layouts personnalisés avec les layouts par défaut
- Ajouter `loadCustomLayouts()`
- Ajouter `exportLayout(id, targetPath)`

### SnapAssistant

- Créer un conteneur visuel dans `Main.uiGroup`
- Construire les mini-tuiles dynamiquement selon la disposition active
- Détecter le survol grâce à `findHoveredTile(x, y)`
- Synchroniser avec `PreviewOverlay`
- Nettoyer correctement à la fermeture

### TilingExtension

- Créer `SnapAssistant` et `PreviewOverlay` dans `enable()`
- Les détruire dans `disable()`
- Vérifier la proximité du bord supérieur dans `_onDragTick()`
- Afficher l’assistant et enregistrer la tuile cible lors du survol
- Ancrer la fenêtre dans la tuile sélectionnée au relâchement
- Déléguer la géométrie des bords à `lib/edgeTiling.js` et la restauration de taille à `lib/dragController.js`
- Suivre les signaux Muffin `show-tile-preview`/`hide-tile-preview` pour céder la priorité à l’aperçu natif

## Checklist de livraison par phase

### Phase 1 — Dispositions personnalisées

> Cases à cocher après la recette Cinnamon/X11. Le code correspondant est présent, mais
> le dossier n’est pas encore utilisé pour le redimensionnement solidaire des `groups`.

- [ ] dossier `~/.config/cinnaflow/layouts/` créé automatiquement
- [ ] fichier d’exemple généré
- [ ] chargement des layouts JSON validés
- [ ] layouts invalides ignorés proprement
- [ ] import/export fonctionnel
- [ ] bouton d’ouverture du dossier ajouté dans les paramètres

### Phase 2 — Prévisualisation

- [ ] drag détecté correctement
- [ ] overlay visible pendant le déplacement
- [ ] tuile cible calculée sous le pointeur
- [ ] placement appliqué au relâchement
- [ ] activation par `Ctrl` fonctionnelle

### Phase 3 — Snap Assistant

- [ ] barre d’aide affichée au bord supérieur
- [ ] mini-tuiles générées dynamiquement
- [ ] survol détecté proprement
- [ ] prévisualisation grand format affichée
- [ ] fenêtre ancrée dans la tuile choisie
- [ ] option `enable-snap-assistant` fonctionnelle

### Phase 3 bis — Tuilage aux bords (code présent, option)

- [ ] `edge-tiling-mode` = `off` : aucun changement de comportement
- [ ] `default` : coins en quarts, bords en moitiés, bord bas en moitié
- [ ] `adaptive` : colonne/ligne de la disposition
- [ ] `granular` : tuile sous le pointeur
- [ ] centre du bord haut : maximise
- [ ] Snap Assistant accessible sous les 8 px du bord haut
- [ ] aperçu natif Muffin prioritaire, sans double rendu

## Vérification à chaque étape

- Tester avec une, deux et trois sorties, y compris diverses résolutions et échelles.
- Tester sur Cinnamon 6.0 à 6.6 sous X11 (Wayland est hors périmètre).
- Vérifier les fenêtres normales, maximisées, plein écran, dialogues et fenêtres toujours au-dessus.
- Vérifier que la désactivation de l’extension supprime les raccourcis, acteurs et signaux créés.

## Tests automatisés (simulation portable)

Une simulation partielle existe dans [`scripts/simulation.js`](../scripts/simulation.js), exécutée par `scripts/check.sh` avec Node ou JavaScriptCore. Elle vérifie :

- **Parseur et export JSON** : collection Tiling Shell, objet seul, `groups`, `w`/`h`, normalisation des coordonnées, JSON invalide ignoré, export en collection et réimport ;
- **État persistant** : sélection par moniteur/espace de travail, relecture après redémarrage, indices invalides normalisés, fichier corrompu ignoré ;
- **Géométrie de drag et de bords** : restauration de la taille en conservant le point saisi, trois modes d’edge tiling, maximise au bord haut ;
- **Exécution globale** : chargement de `extension.js` et des modules `lib/` avec des imports simulés et un système de fichiers en mémoire.

Elle ne simule pas le Snap Assistant, les acteurs St, les signaux Muffin, le menu du panneau, la boucle de grab ni le multi-écran. Ces interactions restent couvertes par [la recette](recette-cinnamon.md).

## Priorisation finale recommandée

1. Valider sous Cinnamon/X11 les dispositions personnalisées, le JSON et l’état persistant.
2. Valider la prévisualisation, la restauration de taille et le tuilage aux bords.
3. Terminer l’extraction de la boucle de grab.
4. Automatisation et espaces de travail.
5. Gestion avancée des fenêtres.

Cette séquence permet d’obtenir de la valeur fonctionnelle rapidement, tout en posant les fondations nécessaires pour la suite.
