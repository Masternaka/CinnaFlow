# Cinnamon Tiling Shell

MVP de gestion de tuiles pour Cinnamon, inspiré de l’architecture et des fonctionnalités de [Tiling Shell](https://github.com/domferr/tilingshell), mais réécrit pour les API Cinnamon/Muffin.

## Fonctionnalités actuelles

- quatre dispositions : deux ou trois colonnes, colonne principale avec pile et grille 2 × 2 ;
- prévisualisation visuelle semi-transparente et ancrage au glisser-déposer de fenêtre (en maintenant `Ctrl` ou `Alt`, paramétrable) ;
- raccourcis configurables pour déplacer la fenêtre active entre les tuiles et naviguer fluidement entre moniteurs ;
- prise en charge complète du multi-écran, des zones de travail respectives et des marges intérieures/extérieures symétriques ;
- indicateur de panneau interactif pour choisir une disposition ou restaurer la fenêtre ;
- notification OSD à l'écran lors du changement rapide de disposition ;
- restauration fidèle de la géométrie initiale et de l'état maximisé de la fenêtre.


## Installation de développement

Le dossier doit porter le même nom que l’UUID. Depuis ce dépôt :

```sh
mkdir -p ~/.local/share/cinnamon/extensions
ln -s "$(pwd)" ~/.local/share/cinnamon/extensions/cinnamon-tiling-shell@local
```

Ensuite, ouvrez **Paramètres système → Extensions**, activez « Cinnamon Tiling Shell », puis configurez-le. Rechargez Cinnamon avec `Alt` + `F2`, `r`, Entrée (X11), ou reconnectez-vous sous Wayland.

Les raccourcis par défaut évitent les raccourcis natifs `Super` + flèches de Cinnamon et sont entièrement configurables :
- `Super` + `Alt` + flèches : déplacer ou placer la fenêtre active vers une tuile ;
- `Super` + `Alt` + `Retour arrière` : restaurer la géométrie d'origine de la fenêtre (détuiler) ;
- `Super` + `Alt` + `Espace` : changer de disposition active (avec notification à l'écran).

## Feuille de route de portage

1. Éditeur graphique et import/export des dispositions JSON de Tiling Shell.
2. Prévisualisation pendant le déplacement d’une fenêtre et Snap Assistant au bord supérieur.
3. Remplissage des tuiles libres, auto-tiling et navigation directionnelle entre fenêtres.
4. Redimensionnement coordonné de fenêtres adjacentes et tests sur les versions Cinnamon visées.

## Licence

GPL-3.0-or-later. Le projet source d’inspiration, Tiling Shell, est aussi sous GPL-3.0-or-later ; son code GNOME Shell n’est pas directement réutilisable ici.
