# Résumé de session

## Point de reprise — 6 novembre 2026

- Le code modulaire des étapes 3 à 5 figure dans `929c5d3`. La branche locale `main` et la référence locale `origin/main` pointaient sur `6a3976b` à la reprise, avec un arbre de travail propre.
- `6a3976b` ajoute une [capture du 4 novembre](<../erreurs/Capture d’écran du 2026-11-04 17-50-38.png>) où Cinnamon affiche « Problèmes de démarrage de Cinnamon » après la procédure d’installation par lien symbolique. L’avertissement concerne le chargement d’extensions, d’applets ou de desklets. La capture seule ne permet pas d’identifier le composant en cause ni la cause.
- Sur macOS, `bash scripts/check.sh` passe sans `SKIP`. JavaScriptCore valide la syntaxe et exécute la simulation malgré un avertissement XPC d’`osascript`. `git diff --check` passe également.
- Pour reprendre le diagnostic, relever la version de Cinnamon, le type de session et les traces de Looking Glass ou du journal système autour de `cinnamon-tiling-shell@local`. La [recette Cinnamon/X11](recette-cinnamon.md) reste à exécuter.

## Session du 27 octobre 2026

### Demande

Faire avancer le projet en priorisant l’état persistant et l’interopérabilité JSON (étape 4), puis le découpage modulaire (étape 3) et le début de fiabilisation du drag (étape 5). La recette graphique Cinnamon/X11 reste impossible sur le poste macOS utilisé.

### Modifications

- `LayoutEngine` : format proche de Tiling Shell avec `groups` conservés, champs `w`/`h` acceptés pour les anciens fichiers, coordonnées normalisées et arrondies, identifiants en double ignorés sans écrasement.
- Export branché sur le menu : collection d’une disposition écrite dans `~/.config/cinnaflow/layouts/exports/`, sans écraser un fichier existant.
- `LayoutState` : sélection par moniteur et espace de travail dans `~/.config/cinnaflow/state.json`, relecture à l’activation, fichier corrompu ignoré. La préférence `layout` devient la disposition par défaut.
- Sélection utilisée par le menu, le cycle clavier, les raccourcis de tuilage, le drag classique et le Snap Assistant. Le dépôt sur une carte mémorise la disposition du moniteur/espace cible.
- Menu complété par l’export et l’ouverture du dossier des dispositions.
- Découpage modulaire : `Log`, `LayoutEngine`, `LayoutState`, `WindowTracker`, `IndicatorManager`, `PreviewOverlay`, `SnapAssistant` et `TilingExtension` sont dans `lib/`, exportés avec `var` et chargés via `Extension.getCurrentExtension().imports`. `extension.js` ne garde que `init`/`enable`/`disable`.
- `scripts/simulation.js` : simulation portable du moteur, de l’état, du chemin d’export et du chargement des modules, avec imports simulés et système de fichiers en mémoire. Intégrée à `scripts/check.sh` via Node ou JavaScriptCore.
- `lib/edgeTiling.js` : géométrie pure des bords/coins (modes default, adaptive, granular) avec maximise au bord haut. Option `edge-tiling-mode` désactivée par défaut, activation avec la touche de prévisualisation.
- `lib/dragController.js` : restauration de la taille d’origine en conservant le point saisi; seuil 90 px, option `restore-original-size` activée par défaut, fenêtres d’origine maximisées exclues.
- `TilingExtension` : boucle de grab étendue à la restauration et aux bords, suivi des signaux Muffin `show-tile-preview`/`hide-tile-preview` pour éviter un double aperçu, application des rectangles de bord ou maximise au relâchement.
- `scripts/package-release.py` inclut désormais `lib/*.js` dans le ZIP.
- Documentation actualisée et auditée : `AGENTS.md`, `README.md`, architecture, état, plan, roadmap, utilisation, releases, vérifications et recette; statuts, réglages, modules et procédures alignés sur le code.
- Aucun commit ni push : les étapes 3, 4 et 5 restent dans l'arbre de travail et devront être séparées en commits avant publication.
- Audit documentaire : aucun changement de code pendant la mise à jour de la documentation.

### Vérifications

- `bash scripts/check.sh` : syntaxe JavaScriptCore, JSON, simulation (10 dispositions, import/export, état, chargement des 10 modules, géométrie des bords et de restauration) et points d’entrée Cinnamon réussis, sans `SKIP`.
- `osascript -l JavaScript scripts/simulation.js` : réussi.
- `git diff --check` : réussi.
- 74 liens Markdown locaux vérifiés : tous existants.
- Paquet local `v1` généré dans un dossier temporaire : 5 fichiers racine et 10 modules `lib/` présents; aucun artefact ajouté au dépôt.

La recette Cinnamon/X11, l’import réel dans Tiling Shell, le menu, le grab réel, le multi-écran et le redémarrage de Cinnamon ne sont pas exécutés sur ce poste macOS. Le chargement réel des modules par GJS/Cinnamon reste à valider. Le tuilage aux bords est désactivé par défaut; sa priorité face à Muffin, les animations et la reprise de grab ne sont pas validées. Les `groups` sont préservés mais ne pilotent pas encore le redimensionnement solidaire.

### Reprise

Lire [l’état du projet](etat-projet.md) et [le plan](plan-implementation.md). Priorité : recette Cinnamon/X11 des étapes 0 à 5, notamment le chargement des modules, la réactivation, la restauration de taille et les bords. Ensuite, terminer l’étape 5 (grab réel, priorité Muffin, extraction complète de la boucle de drag) avant l’auto-tiling. La session du 21 octobre (réorganisation documentaire) reste dans l’historique Git.
