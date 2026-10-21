# Guide pour les assistants IA

Ces instructions s’appliquent à tout le dépôt. Respecter la demande de l’utilisateur et les instructions plus précises d’un éventuel sous-dossier.

## Comprendre le projet

**CinnaFlow** est une extension de tuilage pour Cinnamon/Muffin, affichée comme **Cinnamon Tiling Shell**. Son UUID est `cinnamon-tiling-shell@local`. La cible déclarée dans `metadata.json` est Cinnamon 6.0, 6.2, 6.4 et 6.6 sous X11. Wayland reste hors périmètre; une version déclarée ne prouve pas un essai réel.

Le projet s’inspire du modèle de Tiling Shell, mais utilise les API Cinnamon. Ne pas transposer directement des modules GNOME Shell, GTK4 ou TypeScript.

## Documentation de référence : Markdown dans le dépôt

Depuis la demande du 21 octobre 2026, **créer et maintenir toute la documentation exclusivement en Markdown dans le dépôt, sans rédaction ni mise à jour dans Notion**. Cette règle reprend l’organisation actuelle de Menu de la semaine.

`README.md` est le point d’entrée, `AGENTS.md` conserve les consignes opérationnelles, et `docs/` rassemble les guides, l’architecture, les plans, le suivi et les résumés de session. Lorsqu’une tâche change le fonctionnement, les commandes, les limites ou les travaux restants, actualiser les documents concernés dans la même tâche.

À la reprise, lire `README.md`, [le résumé de session](docs/resume-session.md), [l’état du projet](docs/etat-projet.md), puis les documents utiles de [l’index](docs/README.md). Vérifier le code et `git status` : un document daté peut devenir obsolète.

Les anciennes pages Notion restent des sources historiques. Préserver les notes et idées de l’utilisateur, sans les traiter comme des demandes d’implémentation. La [provenance](docs/README.md#provenance-documentaire) relie les anciennes pages aux fichiers actuels. Ne pas créer de doubles locaux concurrents ni réintroduire les tâches terminées dans le travail restant. Signaler toute source manquante sans inventer son contenu.

## Structure et fichiers à modifier

| Chemin | Responsabilité |
| --- | --- |
| `extension.js` | Code GJS : moteur de dispositions, fenêtres, indicateur, prévisualisation, Snap Assistant et cycle de vie. |
| `metadata.json` | UUID, nom, version entière et versions Cinnamon déclarées. |
| `settings-schema.json` | Préférences, raccourcis et callbacks exposés à Cinnamon. |
| `stylesheet.css` | Styles de l’extension. |
| `scripts/check.sh` | Contrôles statiques locaux et CI. |
| `scripts/package-release.py` | Validation du tag `vN` et génération du ZIP installable. |
| `.github/workflows/` | CI sur `main`/PR et préparation des releases en brouillon. |
| `docs/` | Documentation et recette manuelle. |

Conserver `extension.js`, `metadata.json`, `settings-schema.json`, `stylesheet.css` et `LICENSE` à la racine : Cinnamon et le script de packaging utilisent ces chemins. Garder les outils dans `scripts/`, les workflows dans `.github/workflows/`, les artefacts générés dans `dist/` (ignoré par Git).

L’extension est actuellement monolithique. `lib/` est une architecture future décrite dans le plan, pas une structure déjà implémentée. Un découpage ultérieur doit adapter les imports GJS, les vérifications et le packaging, puis être validé sous Cinnamon. Ne pas mélanger une réorganisation documentaire avec un changement de comportement.

## Démarrer et vérifier

Suivre [le guide d’installation](docs/utilisation.md) sur une machine Cinnamon/X11. Le nom du dossier d’installation doit correspondre à l’UUID. Préserver toute installation existante avant d’ajouter un lien symbolique ou d’extraire un paquet.

Depuis la racine du dépôt :

```sh
bash scripts/check.sh
git diff --check
```

Le script utilise Node.js, ou JavaScriptCore via `osascript` sur macOS, pour compiler la syntaxe sans exécuter les API Cinnamon. Il vérifie aussi les JSON avec `jq` ou Python 3 et la présence des fonctions module `init`, `enable`, `disable`. Signaler les contrôles marqués `SKIP`; un code de sortie nul ne prouve pas qu’ils ont tous été exécutés.

Pour une modification documentaire, vérifier les liens, les chemins, les commandes et les différences. Pour une modification de logique, effectuer les contrôles statiques et une vérification pertinente du comportement. Les simulations fonctionnelles évoquées dans la roadmap restent à construire; ne pas annoncer une suite de tests existante.

Avant fusion ou livraison d’un changement de l’extension, exécuter [la recette](docs/recette-cinnamon.md) sur Cinnamon/X11 et consigner l’environnement et les résultats. Si cet environnement est indisponible, indiquer explicitement la validation restante. Les contrôles sur macOS et la CI ne valident pas les API GJS, les interactions graphiques ou le multi-écran.

## Comportements et données à préserver

- Garder `init`, `enable`, `disable` au niveau module et les callbacks de préférences accessibles depuis l’objet retourné par `enable()`.
- Créer les acteurs visuels lors de l’activation; nettoyer acteurs, signaux, timers, raccourcis et préférences lors de la désactivation. Vérifier activation → désactivation → réactivation, y compris après fermeture d’une fenêtre pendant un drag.
- Préserver les quatre dispositions intégrées, les raccourcis configurables, les marges, les zones de travail par moniteur et la restauration de la géométrie et de l’état maximisé.
- Conserver les options de prévisualisation, de modificateur et de Snap Assistant, ainsi que `sync-layout-on-snap`. Vérifier la coexistence avec le snapping natif de Muffin.
- Détecter les API privées avant usage et prévoir une dégradation explicite. Ne pas modifier globalement les styles ou les éléments des autres extensions/panneaux.
- Préserver les dispositions utilisateur dans `~/.config/cinnaflow/layouts/` et les préférences Cinnamon. Employer des données temporaires pour les essais; ne pas supprimer ou remplacer la configuration personnelle.
- Le chargement JSON existe, mais la persistance par moniteur/espace de travail et l’interopérabilité complète avec Tiling Shell restent futures. Ne pas confondre code présent, interface exposée et fonctionnalité validée.
- Conserver des libellés et messages utilisateur en français, ainsi que la préférence `debug` et les traces `[CinnaFlow]`.
- Ne pas placer de secrets, de données personnelles ou d’artefacts générés dans Git.

## Commits et publication

**Ne jamais créer de commit ni effectuer de push automatiquement.** Préparer les changements, examiner les différences et exécuter les vérifications pertinentes; obtenir une confirmation explicite avant commit ou push. Une demande de modification ou de documentation ne vaut pas autorisation. Une autorisation de commit seule n’autorise pas le push.

Pour ces opérations, lire et appliquer le skill **github-commit-push** s’il est disponible; signaler son absence. Écrire les messages de commit en français, avec un titre court et une description concise expliquant la raison du changement. Demander également confirmation avant toute autre écriture GitHub, notamment PR, fusion, tag ou Release.

Un push autorisé sur `main` déclenche la CI. Un push de tag `v*`, ou un lancement manuel du workflow Release, prépare un brouillon et un ZIP après vérifications. Le tag `vN` doit correspondre exactement à la version entière positive de `metadata.json`. Le workflow manuel peut créer le tag; un tag existant sur un autre commit ne doit pas être déplacé. Une release existante ne doit pas être remplacée.

Expliquer ces effets avant une publication autorisée. La publication du brouillon et Cinnamon Spices restent des actions distinctes. Ne pas modifier la version pour une simple réorganisation documentaire. Distinguer paquet local, CI distante, brouillon créé et version publiée réellement vérifiés; voir [le guide de release](docs/releases.md).

## Compte rendu

Répondre en français. Indiquer le résultat, les fichiers importants, les vérifications effectuées et leurs limites, ainsi que les validations restantes. Mettre à jour [le résumé de session](docs/resume-session.md) pour permettre la reprise sans dépendre de la conversation.
