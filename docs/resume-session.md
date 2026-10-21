# Résumé de session — 21 octobre 2026

## Demande

Appliquer à CinnaFlow l’organisation documentaire et les conventions de dépôt actuelles de Menu de la semaine, et créer `AGENTS.md`.

## Modifications

- Création d’`AGENTS.md` : documentation Markdown locale, architecture, règles Cinnamon/GJS, préservation des données, vérifications et confirmation avant commit/push ou écriture GitHub.
- Documentation regroupée dans `docs/` : déplacement de `ROADMAP.md`, `PLAN-IMPLEMENTATION.md` et `docs/CHECKLIST.md` vers les noms en minuscules de l’index.
- README recentré sur le démarrage; installation détaillée et releases déplacées dans leurs guides.
- Ajout d’un index, de l’architecture actuelle, de l’état du projet et des limites de vérification.
- Lecture de l’accueil Notion et de ses six pages documentaires; conservation des liens de provenance. Ces pages restent historiques, sans modification distante.
- Alignement des consignes Copilot sur `AGENTS.md`.

Les fichiers de l’extension, la licence, les scripts, les workflows et la version restent inchangés. L’architecture modulaire `lib/` est future.

## Vérifications

- `bash scripts/check.sh` : syntaxe JavaScriptCore, JSON et points d’entrée Cinnamon réussis, sans `SKIP`.
- `git diff --check` : réussi.
- Liens Markdown locaux : 70 chemins vérifiés, tous existants.
- Roadmap, plan et recette : comparaison intégrale avec les originaux Git réussie après normalisation des seuls chemins déplacés; titres, cases et contenu conservés.
- ZIP `v1` généré dans un dossier temporaire : les cinq fichiers attendus sont présents et leurs octets sont identiques aux originaux Git. Aucun artefact ajouté au dépôt.

La recette graphique Cinnamon/X11, l’installation du paquet et les workflows GitHub distants ne sont pas exécutés sur ce poste macOS.

## Reprise

Lire [AGENTS.md](../AGENTS.md), [l’état du projet](etat-projet.md) et le [plan](plan-implementation.md). La priorité de validation reste la recette Cinnamon/X11; ne pas confondre les fonctions codées avec des interactions validées. Aucun commit ni push n’est effectué dans cette tâche.
