# Checklist de recette — CinnaFlow

À exécuter **avant chaque merge**, et à repasser entièrement à la fin des étapes 0-1
(voir [`PLAN-IMPLEMENTATION.md`](../PLAN-IMPLEMENTATION.md), §3 et §4).

En-tête à remplir : version de `metadata.json` · version de Cinnamon · X11 · nombre d'écrans.

## Préparation

- [ ] copier `extension.js`, `settings-schema.json` et `stylesheet.css` dans
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
- [ ] `show-indicator` décoché : l'indicateur disparaît, puis revient ;
- [ ] `debug` activé : traces `[CinnaFlow]` visibles dans les logs.

## 4. Cycle de vie

- [ ] activation → désactivation → réactivation (×3) sans erreur ;
- [ ] après désactivation : aucun acteur résiduel (indicateur, aperçu, barre) ;
- [ ] après désactivation : aucun raccourci clavier actif ;
- [ ] après désactivation : les icônes des autres panneaux sont inchangées.

## 5. Indicateur et préférences

- [ ] ouvrir/fermer le menu 10× ; un clic à l'extérieur ferme le menu ;
- [ ] les autres icônes du panneau ne changent pas de taille ;
- [ ] le bouton « Ouvrir le dossier… » ouvre `~/.config/cinnaflow/layouts/` ;
- [ ] la combobox « disposition » liste les 4 presets **et** les layouts personnalisés.

## 6. Tuilage (raccourcis)

- [ ] `Super`+`Alt`+flèches déplacent la fenêtre active de tuile en tuile ;
- [ ] navigation entre moniteurs par les bords ;
- [ ] `Super`+`Alt`+`BackSpace` restaure la géométrie d'origine (y compris maximisée) ;
- [ ] `Super`+`Alt`+`espace` cycle les dispositions avec OSD.

## 7. Drag et prévisualisation

- [ ] sans modificateur : aucun aperçu ;
- [ ] avec le modificateur : aperçu de la tuile sous le pointeur ;
- [ ] relâcher puis rappuyer le modificateur sans bouger : l'aperçu revient ;
- [ ] au relâchement, la fenêtre est tuilée dans la tuile prévisualisée ;
- [ ] aucun double aperçu avec le snapping natif de Muffin.

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

## 10. Journal des recettes

| Date | Version | Cinnamon | Testeur | Résultat | Notes |
|---|---|---|---|---|---|
| | | | | | |
