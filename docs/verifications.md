# Vérifications

Exécuter les commandes depuis la racine du dépôt.

## Contrôles statiques et simulation

```sh
bash scripts/check.sh
git diff --check
```

Le script contrôle :

- la syntaxe d’`extension.js` et de `lib/*.js` avec `node --check`, ou JavaScriptCore via `osascript` sur macOS;
- la syntaxe de `settings-schema.json` et `metadata.json`, avec `jq` ou Python 3;
- la présence des fonctions module `init`, `enable` et `disable`;
- l’exécution de `scripts/simulation.js`, avec Node (préféré) ou JavaScriptCore.

La simulation charge les modules `lib/` avec des imports Cinnamon simulés, un importeur GJS simulé et un système de fichiers en mémoire. Elle vérifie le moteur de dispositions, `LayoutState`, la géométrie de drag et l’orchestrateur :

- chargement de `extension.js` et des 10 modules par `Extension.getCurrentExtension().imports`;
- import d’une disposition seule et d’une collection Tiling Shell;
- conservation des `groups`, champs `w`/`h`, normalisation des coordonnées;
- JSON invalide ignoré, identifiants en double non écrasés;
- export en collection, propriétés `id`/`tiles` et réimport;
- sélection par moniteur/espace de travail, priorité sur la préférence par défaut, relecture, indices invalides et fichier corrompu;
- chemin d’export du menu, création du sous-dossier `exports/` et absence d’écrasement;
- géométrie des trois modes de tuilage aux bords et maximise au bord haut;
- restauration de la taille d’origine avec conservation du point saisi;
- cycle de vie simulé de `TilingExtension` sans acteur Cinnamon.

Elle ne simule ni les acteurs St, ni le menu, ni la boucle de grab, ni les signaux Muffin, ni le multi-écran. Vérifier les lignes `SKIP` si des outils manquent : elles ne font pas échouer le script. Aucun de ces contrôles ne valide le fonctionnement réel des fenêtres.

Pour lancer uniquement la simulation :

```sh
node scripts/simulation.js
# ou, sans Node sur macOS :
osascript -l JavaScript scripts/simulation.js
```

## Paquet local

```sh
python3 scripts/package-release.py v1 --output-dir dist
```

Adapter `v1` à la version entière positive de `metadata.json`. Vérifier que le ZIP contient un dossier nommé selon l’UUID, les cinq fichiers racine `extension.js`, `metadata.json`, `settings-schema.json`, `stylesheet.css`, `LICENSE`, et les modules `lib/*.js` (10 actuellement). Ce contrôle n’installe pas l’extension et ne crée pas de release distante. Le script de simulation et la documentation ne font pas partie du paquet.

## Recette réelle

Suivre [la checklist](recette-cinnamon.md) sous Cinnamon/X11 avant fusion ou livraison d’un changement de l’extension. Remplir son journal avec la version, l’environnement, le testeur et les résultats. Préserver les cases non exécutées.

Tester notamment les activations répétées, le chargement des modules, la fermeture pendant un drag, la restauration de la taille d’origine, le tuilage aux bords dans les trois modes, la priorité de l’aperçu Muffin, la restauration maximisée, les préférences, les écrans multiples, la persistance par espace de travail et l’import/export JSON. Ne pas annoncer ces parcours validés depuis un poste macOS, une simulation ou un résultat CI statique.

La simulation couvre une partie des scénarios JSON, état, chargement des modules et géométrie de drag de la roadmap. Les interactions réelles de Snap Assistant, de grab Muffin, d’edge tiling et de multi-écran restent à exécuter manuellement.

## Réorganisation du 21 octobre 2026

La réorganisation documentaire et ses vérifications sont conservées dans l’historique Git (commit `eaa2cb9`). Le [résumé de session](resume-session.md) actuel porte sur la session du 27 octobre. La recette Cinnamon/X11, l’installation du ZIP et les workflows distants restent à vérifier dans leurs environnements respectifs.
