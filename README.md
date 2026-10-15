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
- Snap Assistant v1 au bord supérieur, activable dans les préférences ;
- chargement de dispositions JSON depuis `~/.config/cinnaflow/layouts/`.

> Cible actuelle : Cinnamon 6.0 à 6.6 sous X11. La recette runtime reste à réaliser
> sur une machine Cinnamon ; voir [`docs/CHECKLIST.md`](docs/CHECKLIST.md).


## Installation de développement

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

## Releases GitHub

Le workflow `.github/workflows/release.yml` prépare une **release en brouillon**
à chaque push d'un tag `vN`, où `N` correspond exactement à la version entière
positive de `metadata.json` (actuellement `1`, donc `v1`). Les vérifications
statiques doivent réussir avant la création du ZIP et de la release.

Depuis le site GitHub, ouvrir **Actions → Release → Run workflow**, choisir
la branche `main`, saisir `v1` dans le champ du tag, puis cliquer sur
**Run workflow**. Après les vérifications, le workflow crée le tag sur le commit
sélectionné et prépare le brouillon avec son ZIP dans **Releases**. Un tag
existant sur un autre commit provoque un échec ; il n'est jamais déplacé.

Depuis un terminal, après avoir intégré les changements sur `main`, on peut
aussi déclencher le workflow en poussant le tag sur le commit à livrer :

```sh
git switch main
git pull --ff-only
bash scripts/check.sh
git tag v1
git push origin v1
```

Pour la release suivante, incrémenter d'abord `version` dans `metadata.json`
et utiliser le tag correspondant, par exemple `v2`. Ne pas déplacer un tag déjà
publié. Aucun secret supplémentaire n'est nécessaire : le workflow utilise le
jeton GitHub Actions avec la permission `contents: write`.

La release contient des notes générées automatiquement et `CinnaFlow-vN.zip`.
L'archive contient le dossier `cinnamon-tiling-shell@local` avec `extension.js`,
`metadata.json`, `settings-schema.json`, `stylesheet.css` et `LICENSE`.
Pour une installation depuis le ZIP, extraire ce dossier dans
`~/.local/share/cinnamon/extensions/`, en préservant toute installation existante.

Avant de publier le brouillon depuis GitHub Releases, exécuter la recette
[`docs/CHECKLIST.md`](docs/CHECKLIST.md) sous Cinnamon/X11. La CI ne valide pas
les interactions graphiques. Le workflow ne publie pas sur Cinnamon Spices.
Si une release existe déjà pour ce tag, la création échoue sans la remplacer ;
reprendre le brouillon existant dans GitHub Releases.

Pour vérifier le packaging localement, sans créer de release :

```sh
python3 scripts/package-release.py v1 --output-dir dist
```

## Feuille de route de portage

1. Valider le MVP sur Cinnamon/X11 et maintenir le cycle activation → désactivation → réactivation.
2. Modulariser l’extension, puis rendre les dispositions persistantes et compatibles avec Tiling Shell.
3. Ajouter edge tiling et auto-tiling.
4. Ajouter smart resize, sélection multi-tuiles et éditeur graphique.

Le détail technique et le statut de référence sont dans [`PLAN-IMPLEMENTATION.md`](PLAN-IMPLEMENTATION.md).

## Licence

GPL-3.0-or-later. Le projet source d’inspiration, Tiling Shell, est aussi sous GPL-3.0-or-later ; son code GNOME Shell n’est pas directement réutilisable ici.
