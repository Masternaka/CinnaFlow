# Paquets et releases GitHub

Les commandes suivantes sont à lancer depuis la racine du dépôt. Les assistants doivent respecter la confirmation préalable définie dans [AGENTS.md](../AGENTS.md) avant toute écriture GitHub ou création de commit/tag.


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
`metadata.json`, `settings-schema.json`, `stylesheet.css`, `LICENSE` et les modules `lib/*.js` (10 actuellement).
Pour une installation depuis le ZIP, extraire ce dossier dans
`~/.local/share/cinnamon/extensions/`, en préservant toute installation existante.

Avant de publier le brouillon depuis GitHub Releases, exécuter la recette
[la checklist](recette-cinnamon.md) sous Cinnamon/X11. La CI ne valide pas
les interactions graphiques. Le workflow ne publie pas sur Cinnamon Spices.
Si une release existe déjà pour ce tag, la création échoue sans la remplacer ;
reprendre le brouillon existant dans GitHub Releases.

Pour vérifier le packaging localement, sans créer de release :

```sh
python3 scripts/package-release.py v1 --output-dir dist
```

