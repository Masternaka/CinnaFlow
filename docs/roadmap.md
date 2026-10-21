# Feuille de route — Cinnamon Tiling Shell

Le MVP actuel couvre les dispositions prédéfinies, les raccourcis clavier, les marges, le multi-écran, le choix de disposition dans le panneau, la prévisualisation au drag, le Snap Assistant v1 et le chargement de JSON personnalisés. Il reprend le principe de tuiles normalisées de [Tiling Shell](https://github.com/domferr/tilingshell), mais son code est réécrit pour Cinnamon et Muffin.

> Le statut technique de référence est [`plan-implementation.md`](plan-implementation.md).
> Les fonctions déjà codées restent **à valider sous Cinnamon/X11** avec
> [`docs/recette-cinnamon.md`](recette-cinnamon.md).

## Vue d'ensemble

Ce document fusionne la feuille de route produit et le plan d’implémentation technique. Il sert à la fois de:

- backlog priorisé pour le développement,
- plan de mise en œuvre détaillé,
- checklist de validation avant chaque livraison.

Les deux chantiers majeurs à venir sont :

1. la persistance des dispositions par moniteur/espace de travail et la compatibilité JSON complète ;
2. l’auto-tiling et l’éditeur de dispositions.

## Écart fonctionnel avec Tiling Shell

| Fonctionnalité | État dans le MVP Cinnamon |
| --- | --- |
| Dispositions personnalisées et éditeur graphique | Chargement JSON partiel ; éditeur à faire |
| Import/export JSON de dispositions | Import partiel ; export non exposé et interopérabilité à faire |
| Prévisualisation des tuiles pendant le déplacement | Codée, recette Cinnamon/X11 en attente |
| Activation avec `Ctrl` pendant un glisser-déposer | Codée, recette Cinnamon/X11 en attente |
| Snap Assistant au bord supérieur | v1 codée, recette Cinnamon/X11 en attente |
| Sélection de plusieurs tuiles avec `Alt` | À faire |
| Tuilage aux bords de l'écran | À faire |
| Auto-tiling des nouvelles fenêtres | À faire |
| Suggestions pour remplir les tuiles libres | À faire |
| Disposition par espace de travail et moniteur | À faire |
| Redimensionnement intelligent des fenêtres adjacentes | À faire |
| Navigation directionnelle entre fenêtres | À faire |
| Menu contextuel des fenêtres | À faire |
| Groupement dans Alt-Tab, bordure de fenêtre et réglages visuels avancés | À faire |
| Raccourcis pour déplacer une fenêtre entre tuiles | Disponible |
| Navigation fluide multi-moniteurs au clavier | Disponible |
| Raccourci pour restaurer la fenêtre active | Disponible |
| Raccourci pour circuler entre les dispositions avec OSD | Disponible |
| Menu de sélection de disposition | Disponible |
| Marges et zone de travail par moniteur | Disponible |

## Backlog priorisé

### Priorité 1 — État persistant + JSON compatible Tiling Shell

- Définir un format JSON compatible avec les layouts de Tiling Shell.
- Conserver les layouts sélectionnés par moniteur et espace de travail.
- Ajouter l’import/export des layouts.
- Valider les structures avant intégration dans le moteur.
- Brancher l’export et le bouton d’ouverture du dossier déjà présents.

### Priorité 2 — Fiabiliser le drag et la prévisualisation

- Exécuter la recette Cinnamon/X11 des interactions existantes.
- Restaurer la taille d’origine au début du drag d’une fenêtre tuilée.
- Ajouter edge tiling et vérifier la coexistence avec le snapping natif de Muffin.

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

- [extension.js](../extension.js)
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

- Ajout d’une classe `SnapAssistant` dans [extension.js](../extension.js)
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

### Phase 4 — Automatisation et espaces de travail

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

- Instancier `SnapAssistant` dans le constructeur
- Le détruire dans `disable()`
- Vérifier la proximité du bord supérieur dans `_onDragTick()`
- Afficher l’assistant et enregistrer la tuile cible lors du survol
- Ancrer la fenêtre dans la tuile sélectionnée au relâchement

## Checklist de livraison par phase

### Phase 1 — Dispositions personnalisées

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

## Vérification à chaque étape

- Tester avec une, deux et trois sorties, y compris diverses résolutions et échelles.
- Tester sur Cinnamon 6.0 à 6.6 sous X11 (Wayland est hors périmètre).
- Vérifier les fenêtres normales, maximisées, plein écran, dialogues et fenêtres toujours au-dessus.
- Vérifier que la désactivation de l’extension supprime les raccourcis, acteurs et signaux créés.

## Tests automatisés (Simulation JavaScriptCore)

- **Validation du parseur JSON** :
  - chargement d’un fichier valide, vérification de la normalisation des coordonnées,
  - robustesse face à des fichiers mal formés ou hors limites,
  - rejet propre sans crash.
- **Validation du Snap Assistant** :
  - mouvement du pointeur vers le bord haut (`y < 35`) → activation,
  - survol d’une mini-tuile → sélection de la tuile cible,
  - relâchement → ancrage correct dans la tuile choisie.
- **Validation syntaxique globale** :
  - exécution complète du script de simulation sans erreur.

## Priorisation finale recommandée

1. Dispositions personnalisées + JSON
2. Prévisualisation au déplacement
3. Snap Assistant et tuilage aux bords
4. Automatisation et espaces de travail
5. Gestion avancée des fenêtres

Cette séquence permet d’obtenir de la valeur fonctionnelle rapidement, tout en posant les fondations nécessaires pour la suite.
