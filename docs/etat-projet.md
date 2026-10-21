# État du projet et travaux restants

Point de reprise au 21 octobre 2026, fondé sur les fichiers locaux. Cette synthèse n’est pas une recette graphique ni une vérification de l’état distant GitHub.

## Code présent, recette Cinnamon/X11 en attente

- Quatre dispositions, raccourcis configurables et notification OSD.
- Placement des fenêtres, marges, zones de travail et navigation multi-moniteurs.
- Restauration de la géométrie et de l’état maximisé.
- Indicateur de panneau, prévisualisation du drag et Snap Assistant v1.
- Chargement de JSON personnalisés, synchronisation du sélecteur et rechargement depuis le menu.
- Correctifs de cycle de vie et de robustesse consignés dans le plan.
- Contrôles statiques, workflow CI et préparation de paquets/releases en brouillon.

Le [plan technique](plan-implementation.md) conserve les étapes 0 à 2 au statut « code fait, recette à valider ». Les versions Cinnamon de `metadata.json` sont des cibles déclarées; aucun résultat de recette n’a été ajouté par cette réorganisation.

## Prochaines étapes

1. Exécuter [la checklist](recette-cinnamon.md) sur Cinnamon/X11, notamment trois cycles activation/désactivation, drag, restauration et multi-écran. Consigner environnement, résultats et anomalies.
2. Découper `extension.js` en modules à comportement constant (étape 3), en adaptant imports, contrôles et paquet.
3. Ajouter la persistance par moniteur/espace de travail et finaliser l’interopérabilité JSON, dont `groups` et l’export utilisateur (étape 4).
4. Fiabiliser drag/prévisualisation et ajouter le tuilage aux bords (étape 5).
5. Poursuivre auto-tiling, gestion avancée et éditeur selon les étapes 6 à 8.
6. Évaluer les fonctions risquées par prototypes, puis préparer la publication après validation (étapes 9 et 10).

Les propositions et détails restent dans [la roadmap](roadmap.md) et [le plan](plan-implementation.md). Ils ne constituent pas une demande de tout implémenter. La roadmap contient aussi des scénarios de tests souhaités; aucune suite fonctionnelle JavaScriptCore correspondante n’est présente dans le dépôt.

## Organisation documentaire

La documentation est désormais maintenue dans le dépôt, selon [AGENTS.md](../AGENTS.md). Les anciens plans et la checklist ont été déplacés dans `docs/`, leur contenu et leurs cases conservés. Les pages Notion restent historiques; voir [la provenance](README.md#provenance-documentaire).
