# Documentation de CinnaFlow

Depuis le 21 octobre 2026, le dépôt est la référence documentaire. Les guides, plans, listes de travaux et résumés sont maintenus ici, en Markdown. Les anciennes pages Notion restent historiques, sans mise à jour.

## Lire selon le besoin

| Document | Contenu |
| --- | --- |
| [README du projet](../README.md) | Présentation et démarrage rapide. |
| [AGENTS.md](../AGENTS.md) | Consignes de travail des assistants. |
| [Utilisation](utilisation.md) | Installation, raccourcis, configuration et diagnostic. |
| [Architecture](architecture.md) | Organisation actuelle du code et du dépôt. |
| [État du projet](etat-projet.md) | Fonctions codées, validations restantes et prochaines étapes. |
| [Roadmap](roadmap.md) | Intentions produit et backlog détaillé. |
| [Plan d’implémentation](plan-implementation.md) | Étapes techniques, historique et architecture future. |
| [Vérifications](verifications.md) | Commandes, couverture et limites des contrôles. |
| [Checklist](recette-cinnamon.md) | Recette manuelle Cinnamon/X11 et journal de résultats. |
| [Releases](releases.md) | Packaging et workflow GitHub. |
| [Résumé de session](resume-session.md) | Derniers changements et reprise du travail. |

Le plan conserve les statuts techniques détaillés; la roadmap conserve les idées et leur priorité. Ses cases non cochées et ses propositions de simulations ne prouvent ni absence de code ni existence de tests. Consulter l’état du projet et le code avant de décider d’un travail. L’arborescence `lib/` du plan est une cible future.

## Structure du dépôt

```text
CinnaFlow/
├── AGENTS.md
├── README.md
├── LICENSE
├── extension.js
├── metadata.json
├── settings-schema.json
├── stylesheet.css
├── docs/                 # guides, plans et suivi
├── scripts/              # vérification et packaging
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/        # CI et release
└── dist/                 # paquets générés, ignorés par Git
```

Les fichiers chargés par Cinnamon et la licence restent à la racine. Aucun dossier source vide n’est ajouté pour anticiper la modularisation. La configuration personnelle reste hors du dépôt.

## Entretien

Mettre à jour le guide concerné lors d’un changement de comportement ou de commande, puis le suivi et le résumé de session si nécessaire. Préserver les réserves de validation, les idées et l’historique. Ajouter les nouveaux documents à cet index; éviter les copies de plans à la racine.

## Provenance documentaire

Les sept pages (accueil et six documents) de l’ancien espace Notion ont été relues le 21 octobre 2026. Elles indiquent une copie du dépôt du 16 octobre au commit `1f6f91ed29047338394b63049f5cee9b992c6c14`. Aucun ajout distinct n’a été repéré lors de cette lecture. Les originaux Markdown du dépôt sont conservés ou déplacés; les pages Notion ne sont ni supprimées ni modifiées.

| Ancienne page Notion | Source d’origine | Destination actuelle |
| --- | --- | --- |
| [CinnaFlow](https://app.notion.com/p/3fb53e9aab05818fab6efcef0659c43a) | Accueil de la copie | Cet index et le README du projet |
| [Installation et utilisation](https://app.notion.com/p/3fb53e9aab058120a02cf0d1729bb4ed) | `README.md` | [README](../README.md), [utilisation](utilisation.md), [releases](releases.md) |
| [Feuille de route](https://app.notion.com/p/3fb53e9aab0581c58b46df1979500d7f) | `ROADMAP.md` | [roadmap.md](roadmap.md) |
| [Plan d’implémentation](https://app.notion.com/p/3fb53e9aab0581a39ed8d8c8274f0ac7) | `PLAN-IMPLEMENTATION.md` | [plan-implementation.md](plan-implementation.md) |
| [Checklist](https://app.notion.com/p/3fb53e9aab0581e58399ed5536e41b57) | `docs/CHECKLIST.md` | [recette-cinnamon.md](recette-cinnamon.md) |
| [Consignes de commit](https://app.notion.com/p/3fb53e9aab0581f8a3b6d4c16339f8b1) | `.github/copilot-instructions.md` | [Consignes Copilot](../.github/copilot-instructions.md) et [AGENTS.md](../AGENTS.md) |
| [Licence](https://app.notion.com/p/3fb53e9aab0581cf9af8ded8e22a341e) | `LICENSE` | [LICENSE](../LICENSE) |

Les chemins des plans et de la checklist ont été harmonisés en minuscules. Aucun `TODO.md` n’existait dans ce dépôt; le travail restant est accessible depuis [l’état du projet](etat-projet.md), sans créer une liste concurrente.
