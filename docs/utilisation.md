# Installation et utilisation

Les commandes suivantes sont à lancer depuis la racine du dépôt sur Cinnamon/X11.

Le dossier doit porter le même nom que l’UUID. Depuis ce dépôt :

```sh
mkdir -p ~/.local/share/cinnamon/extensions
ln -s "$(pwd)" ~/.local/share/cinnamon/extensions/cinnamon-tiling-shell@local
```

Ensuite, ouvrez **Paramètres système → Extensions**, activez « Cinnamon Tiling Shell », puis configurez-le. Rechargez Cinnamon avec `Alt` + `F2`, `r`, Entrée (X11). Pour une installation depuis un ZIP de release, extraire le dossier complet, y compris `lib/`, en préservant l’installation existante; voir [releases](releases.md).

Les raccourcis par défaut évitent les raccourcis natifs `Super` + flèches de Cinnamon et sont entièrement configurables :
- `Super` + `Alt` + flèches : déplacer ou placer la fenêtre active vers une tuile ;
- `Super` + `Alt` + `Retour arrière` : restaurer la géométrie d'origine de la fenêtre (détuiler) ;
- `Super` + `Alt` + `Espace` : changer de disposition active (avec notification à l'écran).

## Dispositions et mémoire par espace de travail

La préférence « Disposition par défaut » s’applique aux moniteurs et espaces de travail qui n’ont pas encore de sélection. Choisir une disposition dans le menu de l’indicateur, par le cycle clavier ou par un dépôt sur une carte du Snap Assistant la mémorise pour le moniteur et l’espace de travail courants.

Les sélections sont conservées dans `~/.config/cinnaflow/state.json`. Pour repartir des valeurs par défaut, sauvegarder puis supprimer ce fichier; les dispositions personnalisées dans `layouts/` ne sont pas concernées. Les indices de moniteur et d’espace proviennent de Cinnamon; réorganiser les écrans peut donc changer leur affectation.

## Déplacement, restauration et tuilage aux bords

Lorsqu’une fenêtre tuilée est déplacée de plus de 90 px, elle retrouve par défaut sa taille d’avant le tuilage (`restore-original-size`). La fenêtre n’est alors plus associée à sa tuile; la déposer sur une tuile la réassocie, et la déposer ailleurs la laisse libre. Une fenêtre dont l’état d’origine était maximisé n’est pas redimensionnée par ce mécanisme : utiliser le raccourci de détulage.

Le tuilage aux bords est proposé par `edge-tiling-mode`, désactivé par défaut :

- **Quarts et moitiés** : coins en quarts, bords gauche/droit en moitiés, bord bas en moitié basse, centre du bord haut en maximise ;
- **Colonnes de la disposition** : le bord gauche/droit utilise la colonne correspondante, le bord bas la ligne basse ;
- **Tuile survolée** : la tuile sous le pointeur est utilisée.

Il s’active avec la touche de prévisualisation, dans les 16 px des bords (8 px en haut). Le centre du bord haut maximise ; le Snap Assistant reste accessible juste sous cette bande. Les rectangles de bord couvrent la zone de travail sans appliquer les marges internes. Si Muffin affiche son propre aperçu natif, l’extension annule ses cibles et masque ses aperçus pour éviter un double rendu. Pour utiliser les modes de l’extension à la place du snapping natif sur les mêmes bords, désactiver le tuilage aux bords natif (`org.cinnamon.muffin edge-tiling`); cette coexistence reste à valider.

## Dispositions personnalisées

Les fichiers JSON utilisateur sont chargés depuis `~/.config/cinnaflow/layouts/`. Un fichier peut contenir une disposition seule ou une collection exportée par Tiling Shell (un tableau). Le menu du panneau recharge les fichiers à son ouverture. Préserver ces fichiers lors des essais et des réinstallations.

Le menu propose **Exporter la disposition active (JSON)**. Le fichier est écrit dans `~/.config/cinnaflow/layouts/exports/` sous forme de collection d’une disposition, directement importable dans Tiling Shell. Un nom déjà utilisé reçoit un suffixe au lieu d’être écrasé. Le sous-dossier `exports/` n’est pas chargé automatiquement : pour réutiliser un export dans CinnaFlow, le déplacer dans `layouts/` puis rouvrir le menu.

Les `groups` sont conservés à l’import et à l’export, mais ne déclenchent pas encore le redimensionnement solidaire des tuiles liées. La compatibilité de format est vérifiée par la simulation; la recette Cinnamon/X11 et l’import réel dans Tiling Shell restent à faire. Voir [le plan](plan-implementation.md).

## Référence des préférences

| Clé | Défaut | Rôle |
| --- | --- | --- |
| `layout` | `two-columns` | Disposition par défaut des espaces sans sélection. |
| `gap`, `outer-gap` | `12`, `8` | Marges entre les tuiles et autour de la disposition. |
| `show-indicator` | activé | Affiche l’indicateur dans le panneau. |
| `tile-left`, `tile-right`, `tile-up`, `tile-down` | `Super`+`Alt`+flèches | Placement et déplacement dans les tuiles. |
| `untile` | `Super`+`Alt`+`Retour arrière` | Restaure la géométrie d’origine. |
| `cycle-layout` | `Super`+`Alt`+`Espace` | Passe à la disposition suivante. |
| `enable-snap-preview` | activé | Active l’aperçu et les cibles de drag. |
| `snap-modifier` | `ctrl` | Touche d’activation de l’aperçu (`ctrl`, `alt` ou `always`). |
| `enable-snap-assistant` | activé | Affiche le Snap Assistant au bord haut. |
| `sync-layout-on-snap` | activé | Mémorise la disposition de la carte utilisée. |
| `restore-original-size` | activé | Restaure la taille avant tuilage après 90 px de déplacement. |
| `edge-tiling-mode` | `off` | Tuilage aux bords (`default`, `adaptive`, `granular`). |
| `debug` | désactivé | Active les traces `[CinnaFlow]`. |
| `open-layouts-folder` | bouton | Ouvre `~/.config/cinnaflow/layouts/`. |

Le tuilage aux bords et l’aperçu nécessitent `enable-snap-preview`; ils restent inactifs si celui-ci est décoché.

## Diagnostic

Activer `debug` dans les préférences pour les traces `[CinnaFlow]`. Consulter `~/.xsession-errors` ou Looking Glass (`Alt` + `F2`, puis `lg`). Pour vérifier les interactions, suivre [la checklist](recette-cinnamon.md).
