# Vérifications

Exécuter les commandes depuis la racine du dépôt.

## Contrôles statiques

```sh
bash scripts/check.sh
git diff --check
```

Le script contrôle :

- la syntaxe d’`extension.js` avec `node --check`, ou JavaScriptCore via `osascript` sur macOS;
- la syntaxe de `settings-schema.json` et `metadata.json`, avec `jq` ou Python 3;
- la présence des fonctions module `init`, `enable` et `disable`.

Vérifier les lignes `SKIP` si des outils manquent : elles ne font pas échouer le script. Aucun de ces contrôles n’exécute les API Cinnamon ni ne valide le fonctionnement des fenêtres.

## Paquet local

```sh
python3 scripts/package-release.py v1 --output-dir dist
```

Adapter `v1` à la version entière positive de `metadata.json`. Vérifier que le ZIP contient un dossier nommé selon l’UUID et les seuls fichiers `extension.js`, `metadata.json`, `settings-schema.json`, `stylesheet.css`, `LICENSE`. Ce contrôle n’installe pas l’extension et ne crée pas de release distante.

## Recette réelle

Suivre [la checklist](recette-cinnamon.md) sous Cinnamon/X11 avant fusion ou livraison d’un changement de l’extension. Remplir son journal avec la version, l’environnement, le testeur et les résultats. Préserver les cases non exécutées.

Tester notamment les activations répétées, fermeture pendant un drag, restauration maximisée, préférences, coexistence Muffin et écrans multiples. Ne pas annoncer ces parcours validés depuis un poste macOS, une simulation ou un résultat CI statique.

Les scénarios de simulations décrits dans la roadmap restent des objectifs; le dépôt ne fournit actuellement pas de suite de tests fonctionnels automatisés.

## Réorganisation du 21 octobre 2026

Les résultats de la vérification de cette réorganisation sont consignés dans [le résumé de session](resume-session.md). La recette Cinnamon/X11, l’installation du ZIP et les workflows distants restent à vérifier dans leurs environnements respectifs.
