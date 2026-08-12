# Recommandations de suivi

## État actuel

Les principaux problèmes de nettoyage des signaux et de cycle de vie ont été corrigés. Le projet n'a toutefois pas été construit ni testé dans l'environnement actuel, car Node.js/npm n'y sont pas disponibles.

Les modifications locales doivent encore être validées puis commit.

## Priorité 1 — Validation locale sous Cinnamon

Sur une machine disposant de Node.js/npm et Cinnamon :

```sh
npm install
npm run lint
npm run prettier:check
npm run build
npm run install:extension
```

Tester ensuite manuellement :

- l'activation et la désactivation répétées de l'extension ;
- le branchement, débranchement et réagencement de plusieurs écrans ;
- le Snap Assist et les suggestions de fenêtres ;
- les bordures de fenêtre ;
- les raccourcis clavier ;
- l'Alt-Tab personnalisé ;
- le tiling par les bords et le redimensionnement de fenêtres adjacentes.

Tester au minimum sur les versions de Cinnamon déclarées dans `metadata.json`.

## Priorité 2 — Fiabiliser l'intégration continue

- Ajouter un lockfile (`package-lock.json`) après l'installation des dépendances, afin de rendre les builds reproductibles.
- Mettre en place une CI GitHub qui exécute `npm ci`, le lint, la vérification Prettier et le build à chaque pull request.
- Conserver `dist/` et `node_modules/` hors du dépôt ; ils sont désormais ignorés par Git.

## Priorité 3 — Tests automatisés

Ajouter des tests unitaires pour la logique indépendante de Cinnamon :

- calcul et validation des dispositions ;
- sélection des layouts par écran et espace de travail ;
- calculs de tuiles voisines ;
- comportement du Masonry layout ;
- sérialisation et récupération des réglages.

Les composants nécessitant Cinnamon/GJS devront conserver une validation manuelle ou utiliser des mocks dédiés.

## Priorité 4 — Qualité et maintenance

- Remplacer progressivement les `any` par des types GJS/Cinnamon plus précis.
- Limiter les logs restants ou les réserver à un mode débogage.
- Mettre à jour le README si de nouvelles fonctionnalités, dépendances ou versions de Cinnamon sont prises en charge.
- Vérifier régulièrement que les versions déclarées dans `metadata.json` correspondent aux versions réellement testées.

## Avant une publication

- Vérifier visuellement l'indicateur dans le panneau Cinnamon.
- Tester la désactivation de l'extension sans avertissement dans les journaux Cinnamon.
- Vérifier les journaux avec `npm run logs:cinnamon` pendant les scénarios principaux.
- Créer un commit décrivant les corrections effectuées.
