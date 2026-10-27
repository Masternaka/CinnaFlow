# CinnaFlow — Cinnamon Tiling Shell

Extension de gestion de tuiles pour Cinnamon/Muffin, inspirée de [Tiling Shell](https://github.com/domferr/tilingshell), réimplémentée pour les API Cinnamon. Son nom dans les paramètres reste **Cinnamon Tiling Shell** et son UUID reste `cinnamon-tiling-shell@local`.

## Fonctionnalités actuelles

- quatre dispositions : deux ou trois colonnes, colonne principale avec pile et grille 2 × 2 ;
- prévisualisation visuelle semi-transparente et ancrage au glisser-déposer de fenêtre (en maintenant `Ctrl`, `Alt` ou toujours, selon la préférence) ;
- raccourcis configurables pour déplacer la fenêtre active entre les tuiles et naviguer fluidement entre moniteurs ;
- gestion du multi-écran, des zones de travail respectives et des marges intérieures/extérieures symétriques ;
- indicateur de panneau interactif pour choisir une disposition ou restaurer la fenêtre ;
- notification OSD à l'écran lors du changement rapide de disposition ;
- restauration fidèle de la géométrie initiale et de l'état maximisé de la fenêtre ;
- restauration de la taille d'origine au début du déplacement d'une fenêtre tuilée (option) ;
- tuilage aux bords/coins à trois modes, avec maximise au bord haut (option) ;
- Snap Assistant v1 au bord supérieur, activable dans les préférences ;
- chargement de dispositions JSON depuis `~/.config/cinnaflow/layouts/`, y compris les collections exportées par Tiling Shell ;
- conservation des `groups` et export de la disposition active au format Tiling Shell ;
- mémorisation de la disposition par moniteur et par espace de travail dans `~/.config/cinnaflow/state.json`.

> Cible actuelle : Cinnamon 6.0 à 6.6 sous X11. La recette runtime reste à réaliser
> sur une machine Cinnamon ; voir [`docs/recette-cinnamon.md`](docs/recette-cinnamon.md).
> Les `groups` sont préservés à l’import/export, mais ne pilotent pas encore le
> redimensionnement solidaire prévu aux étapes 7 et 8 du plan.


## Démarrer

Sur une machine Cinnamon/X11, depuis la racine du dépôt :

```sh
mkdir -p ~/.local/share/cinnamon/extensions
ln -s "$(pwd)" ~/.local/share/cinnamon/extensions/cinnamon-tiling-shell@local
```

Activer ensuite **Cinnamon Tiling Shell** dans **Paramètres système → Extensions**. Si le dossier de destination existe déjà, examiner et préserver cette installation avant de continuer. Voir [installation, raccourcis et diagnostic](docs/utilisation.md).

## Documentation

La documentation de référence est maintenue **en Markdown dans ce dépôt**. Les anciennes pages Notion restent historiques et ne sont plus mises à jour.

- [Index et structure du dépôt](docs/README.md)
- [Instructions pour les assistants](AGENTS.md)
- [Architecture actuelle](docs/architecture.md)
- [État du projet et travaux restants](docs/etat-projet.md)
- [Feuille de route](docs/roadmap.md) et [plan technique](docs/plan-implementation.md)
- [Vérifications](docs/verifications.md) et [recette Cinnamon/X11](docs/recette-cinnamon.md)
- [Paquets et releases](docs/releases.md)
- [Résumé de session](docs/resume-session.md)

## Vérifier

```sh
bash scripts/check.sh
```

Ces contrôles vérifient la syntaxe JavaScript de `extension.js` et `lib/`, les fichiers JSON, les points d’entrée Cinnamon et exécutent une simulation du moteur de dispositions, de l’import/export, de l’état persistant, du chargement des modules et de la géométrie de drag/bords. Ils ne valident pas les interactions dans Cinnamon.

## Licence

[GPL-3.0-or-later](LICENSE). Tiling Shell est également sous GPL-3.0-or-later; son code GNOME Shell ne se réutilise pas directement avec les API Cinnamon.
