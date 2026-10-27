# Checklist de recette — CinnaFlow

À exécuter **avant chaque merge**, et à repasser entièrement à la fin des étapes 0-5
(voir [`plan-implementation.md`](plan-implementation.md), §3 à §5).

En-tête à remplir : version de `metadata.json` · version de Cinnamon · X11 · nombre d'écrans.

## Préparation

- [ ] copier `extension.js`, `metadata.json`, `settings-schema.json`, `stylesheet.css`,
      `LICENSE` et le dossier `lib/` dans
      `~/.local/share/cinnamon/extensions/cinnamon-tiling-shell@local/` ;
- [ ] recharger Cinnamon : `Alt`+`F2`, taper `r`, `Entrée` ;
- [ ] activer l'extension dans Paramètres → Extensions ;
- [ ] suivre les erreurs : `tail -f ~/.xsession-errors`
      (ou Looking Glass : `Alt`+`F2` puis `lg`).

> Toute erreur `[CinnaFlow]` ou tout `TypeError` dans les logs invalide la recette.

## 1. Environnement

- [ ] 1 écran ;
- [ ] 2 écrans ;
- [ ] 3 écrans (si disponible) ;
- [ ] résolutions et échelles différentes ;
- [ ] panneau en haut **et** en bas ;
- [ ] thème clair et sombre.

## 2. Fenêtres

- [ ] fenêtre normale ;
- [ ] fenêtre maximisée (tuilage puis restauration) ;
- [ ] fenêtre plein écran (ignorée par l'extension) ;
- [ ] dialogue / fenêtre transiente (ignorée) ;
- [ ] fenêtre « toujours au-dessus » ;
- [ ] fenêtre sur un autre espace de travail ;
- [ ] fenêtre fermée pendant un drag : aucun timer résiduel.

## 3. Réglages

- [ ] `gap` = 0 puis 64 ;
- [ ] `outer-gap` = 0 puis 64 ;
- [ ] `snap-modifier` = `ctrl`, puis `alt`, puis `always` ;
- [ ] `enable-snap-preview` désactivé : aucun aperçu, aucun ralentissement ;
- [ ] `enable-snap-assistant` désactivé : pas de barre en haut ;
- [ ] `restore-original-size` activé puis désactivé : comportement de drag attendu ;
- [ ] `edge-tiling-mode` = `off`, `default`, `adaptive`, `granular` : chaque mode se comporte comme décrit en 7 ter ;
- [ ] `show-indicator` décoché : l'indicateur disparaît, puis revient ;
- [ ] `debug` activé : traces `[CinnaFlow]` visibles dans les logs.

## 4. Cycle de vie

- [ ] chargement de `extension.js` et des modules `lib/*.js` sans erreur d’import ;
- [ ] activation → désactivation → réactivation (×3) sans erreur ;
- [ ] après désactivation : aucun acteur résiduel (indicateur, aperçu, barre) ;
- [ ] après désactivation : aucun raccourci clavier actif ;
- [ ] après désactivation : les icônes des autres panneaux sont inchangées.

## 5. Indicateur et préférences

- [ ] ouvrir/fermer le menu 10× ; un clic à l'extérieur ferme le menu ;
- [ ] les autres icônes du panneau ne changent pas de taille ;
- [ ] le bouton « Ouvrir le dossier… » ouvre `~/.config/cinnaflow/layouts/` ;
- [ ] la combobox « Disposition par défaut » liste les 4 presets **et** les layouts personnalisés ;
- [ ] les options `restore-original-size` et `edge-tiling-mode` sont présentes et persistantes.

## 6. Tuilage (raccourcis)

- [ ] `Super`+`Alt`+flèches déplacent la fenêtre active de tuile en tuile ;
- [ ] navigation entre moniteurs par les bords ;
- [ ] `Super`+`Alt`+`BackSpace` restaure la géométrie d'origine (y compris maximisée) ;
- [ ] `Super`+`Alt`+`espace` cycle les dispositions avec OSD.

## 7. Drag et prévisualisation

- [ ] sans modificateur : aucun aperçu de l'extension ;
- [ ] avec le modificateur : aperçu de la tuile sous le pointeur ;
- [ ] relâcher puis rappuyer le modificateur sans bouger : l'aperçu revient ;
- [ ] au relâchement, la fenêtre est tuilée dans la tuile prévisualisée ;
- [ ] aucun double aperçu avec le snapping natif de Muffin.

### 7 bis. Restauration de la taille d'origine

- [ ] tuiler une fenêtre normale, puis la déplacer de plus de 90 px : elle retrouve
      sa taille d'avant le tuilage, sans saut du point saisi ;
- [ ] l'aperçu de tuile reste utilisable après la restauration ;
- [ ] décocher `restore-original-size` : la taille tuilée est conservée pendant le drag ;
- [ ] une fenêtre dont l'état d'origine était maximisé n'est pas redimensionnée par ce
      mécanisme (utiliser le raccourci de détulage) ;
- [ ] fermer la fenêtre pendant le drag ne laisse ni timer ni aperçu.

### 7 ter. Tuilage aux bords

- [ ] activer `edge-tiling-mode` sur `default` ;
- [ ] avec le modificateur, approcher le bord gauche/droit : moitié d'écran ;
- [ ] approcher le bord bas au centre : moitié basse ;
- [ ] approcher un coin : quart correspondant ;
- [ ] approcher le centre du bord haut : maximise (aperçu plein écran) ;
- [ ] le Snap Assistant reste accessible juste sous les 8 px du bord haut, au centre (hors coins) ;
- [ ] passer en `adaptive` sur une grille : le bord gauche suit la colonne gauche de la
      disposition courante, le bord bas suit la ligne basse ;
- [ ] passer en `granular` : la tuile sous le pointeur est utilisée ;
- [ ] remettre sur `off` : l'aperçu classique revient ;
- [ ] lorsqu'un aperçu natif Muffin apparaît, les cibles de l'extension sont annulées
      et aucun double rendu ne subsiste ;
- [ ] les rectangles de bord couvrent bien la zone de travail, sans marge interne.

## 8. Snap Assistant (étapes 0-1)

- [ ] la barre apparaît quand le pointeur entre dans le haut de l'écran ;
- [ ] survoler le **bas** d'une carte fonctionne (pas de bascule vers l'aperçu classique) ;
- [ ] drag d'un moniteur à l'autre : la barre suit le moniteur du pointeur ;
- [ ] dépôt sur une carte d'une autre disposition : la fenêtre est tuilée **et**
      la disposition active change (option `sync-layout-on-snap`) ;
- [ ] option décochée : la disposition active reste inchangée.

## 9. Layouts personnalisés

- [ ] ajouter un `.json` dans le dossier pendant la session ;
- [ ] cliquer sur l'indicateur : le layout apparaît sans redémarrer Cinnamon ;
- [ ] le cycle clavier l'inclut ;
- [ ] supprimer le fichier : il disparaît après un clic sur l'indicateur.

## 10. État, import et export JSON (étape 4)

- [ ] sur le moniteur 1 / espace 1, choisir une disposition ; changer d’espace puis revenir : la sélection est retrouvée ;
- [ ] sur un second moniteur, choisir une autre disposition : les deux sélections coexistent ;
- [ ] redémarrer Cinnamon (`Alt`+`F2`, `r`) : les sélections sont restaurées depuis `~/.config/cinnaflow/state.json` ;
- [ ] modifier la combobox « Disposition par défaut » : elle s’applique à l’espace courant, puis aux espaces sans sélection ;
- [ ] menu → « Exporter la disposition active (JSON) » : un fichier apparaît dans `~/.config/cinnaflow/layouts/exports/`, sans écraser un export existant ;
- [ ] le fichier exporté est un tableau d’une disposition avec `id`, `tiles` et les `groups` ;
- [ ] importer ce fichier dans Tiling Shell : la disposition est acceptée ;
- [ ] déposer une collection exportée par Tiling Shell dans `~/.config/cinnaflow/layouts/`, puis rouvrir le menu : elle apparaît dans le menu et la combobox ;
- [ ] un fichier JSON invalide est ignoré avec une trace, sans bloquer l’extension ;
- [ ] un `state.json` corrompu est ignoré : l’extension s’active et retombe sur la disposition par défaut ;
- [ ] les `groups` sont visibles dans l’export mais ne modifient pas encore le redimensionnement.

## 11. Journal des recettes

| Date | Version | Cinnamon | Testeur | Résultat | Notes |
|---|---|---|---|---|---|
| | | | | | |
