# Cinnamon Tiling Shell

MVP de gestion de tuiles pour Cinnamon, inspiré de l’architecture et des fonctionnalités de [Tiling Shell](https://github.com/domferr/tilingshell), mais réécrit pour les API Cinnamon/Muffin.

## Fonctionnalités actuelles

- quatre dispositions : deux ou trois colonnes, colonne principale avec pile et grille 2 × 2 ;
- raccourcis configurables pour déplacer la fenêtre active entre les tuiles ;
- prise en charge de plusieurs moniteurs, de leur zone de travail et des marges ;
- indicateur de panneau pour choisir une disposition ;
- restauration de la géométrie initiale de la fenêtre.

## Installation de développement

Le dossier doit porter le même nom que l’UUID. Depuis ce dépôt :

```sh
mkdir -p ~/.local/share/cinnamon/extensions
ln -s "$(pwd)" ~/.local/share/cinnamon/extensions/cinnamon-tiling-shell@local
```

Ensuite, ouvrez **Paramètres système → Extensions**, activez « Cinnamon Tiling Shell », puis configurez-le. Rechargez Cinnamon avec `Alt` + `F2`, `r`, Entrée (X11), ou reconnectez-vous sous Wayland.

Les raccourcis par défaut sont `Super` + `Alt` + flèches. Ils évitent volontairement les raccourcis natifs `Super` + flèches de Cinnamon.

## Feuille de route de portage

1. Éditeur graphique et import/export des dispositions JSON de Tiling Shell.
2. Prévisualisation pendant le déplacement d’une fenêtre et Snap Assistant au bord supérieur.
3. Remplissage des tuiles libres, auto-tiling et navigation directionnelle entre fenêtres.
4. Redimensionnement coordonné de fenêtres adjacentes et tests sur les versions Cinnamon visées.

## Licence

GPL-3.0-or-later. Le projet source d’inspiration, Tiling Shell, est aussi sous GPL-3.0-or-later ; son code GNOME Shell n’est pas directement réutilisable ici.
