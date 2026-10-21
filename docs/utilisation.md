# Installation et utilisation

Les commandes suivantes sont à lancer depuis la racine du dépôt sur Cinnamon/X11.


Le dossier doit porter le même nom que l’UUID. Depuis ce dépôt :

```sh
mkdir -p ~/.local/share/cinnamon/extensions
ln -s "$(pwd)" ~/.local/share/cinnamon/extensions/cinnamon-tiling-shell@local
```

Ensuite, ouvrez **Paramètres système → Extensions**, activez « Cinnamon Tiling Shell », puis configurez-le. Rechargez Cinnamon avec `Alt` + `F2`, `r`, Entrée (X11).

Les raccourcis par défaut évitent les raccourcis natifs `Super` + flèches de Cinnamon et sont entièrement configurables :
- `Super` + `Alt` + flèches : déplacer ou placer la fenêtre active vers une tuile ;
- `Super` + `Alt` + `Retour arrière` : restaurer la géométrie d'origine de la fenêtre (détuiler) ;
- `Super` + `Alt` + `Espace` : changer de disposition active (avec notification à l'écran).

## Dispositions personnalisées

Les fichiers JSON utilisateur sont chargés depuis `~/.config/cinnaflow/layouts/`. Le menu du panneau permet leur rechargement. Préserver ces fichiers lors des essais et des réinstallations. Le chargement existant ne constitue pas une compatibilité complète avec le format Tiling Shell; voir [le plan](plan-implementation.md).

## Diagnostic

Activer `debug` dans les préférences pour les traces `[CinnaFlow]`. Consulter `~/.xsession-errors` ou Looking Glass (`Alt` + `F2`, puis `lg`). Pour vérifier les interactions, suivre [la checklist](recette-cinnamon.md).
