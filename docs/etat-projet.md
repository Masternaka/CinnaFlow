# État du projet et travaux restants

Point de reprise au 27 octobre 2026, fondé sur les fichiers locaux. Cette synthèse n’est pas une recette graphique ni une vérification de l’état distant GitHub.

## Code présent, recette Cinnamon/X11 en attente

- Quatre dispositions, raccourcis configurables et notification OSD.
- Placement des fenêtres, marges, zones de travail et navigation multi-moniteurs.
- Restauration de la géométrie et de l’état maximisé.
- Indicateur de panneau, prévisualisation du drag et Snap Assistant v1.
- Chargement de JSON personnalisés, collections Tiling Shell, conservation des `groups`, export depuis le menu et rechargement depuis l’indicateur.
- Sélection de disposition mémorisée par moniteur et par espace de travail dans `~/.config/cinnaflow/state.json`; la préférence `layout` sert de valeur par défaut.
- Correctifs de cycle de vie et de robustesse consignés dans le plan.
- Découpage modulaire : `extension.js` ne garde que les points d’entrée; les classes et l’orchestrateur sont dans `lib/`.
- Restauration de la taille d’origine au déplacement d’une fenêtre tuilée (seuil 90 px, option activée par défaut).
- Tuilage aux bords/coins à trois modes et maximise au bord haut, en option (`edge-tiling-mode`, désactivé par défaut); suivi des aperçus natifs Muffin.
- Contrôles statiques, simulation portable, workflow CI et préparation de paquets/releases en brouillon.

Le [plan technique](plan-implementation.md) place les étapes 0 à 4 au statut « code fait, recette à valider » et l’étape 5 au statut « code partiel ». Les versions Cinnamon de `metadata.json` sont des cibles déclarées; aucun résultat de recette n’a été ajouté par cette session.

## Limites connues

- Les sélections sont indexées par numéro de moniteur et d’espace de travail, pas par nom de connecteur; réorganiser les écrans peut donc changer leur affectation.
- Les `groups` sont préservés à l’import/export, mais ne déclenchent pas encore le redimensionnement solidaire des tuiles liées (étapes 7 et 8).
- L’export écrit un tableau d’une disposition, format attendu par l’import de Tiling Shell. Il ne réalise pas de sélection de fichier interactive.
- Le chargement multi-fichiers GJS et le découpage ne sont pas encore validés sous Cinnamon/X11.
- La boucle de grab reste dans `lib/tilingExtension.js`; la géométrie de restauration est dans `lib/dragController.js` et celle des bords dans `lib/edgeTiling.js`.
- Le tuilage aux bords est désactivé par défaut et n’applique pas les marges internes. Sa priorité face au snapping natif de Muffin n’est pas validée.
- La restauration de la taille ignore les fenêtres dont l’état d’origine était maximisé, et n’utilise pas la reprise de grab Muffin.

## Prochaines étapes

1. Exécuter [la checklist](recette-cinnamon.md) sur Cinnamon/X11, notamment trois cycles activation/désactivation, chargement des modules, drag, restauration, bords, priorité Muffin, multi-écran, persistance par espace de travail et import/export. Consigner environnement, résultats et anomalies.
2. Valider et terminer l’étape 5 : grab réel, priorité Muffin, trois modes de bords, reprise de grab si nécessaire, puis extraire complètement la boucle de drag.
3. Poursuivre auto-tiling, gestion avancée et éditeur selon les étapes 6 à 8, en utilisant les `groups` pour le redimensionnement solidaire.
4. Évaluer les fonctions risquées par prototypes, puis préparer la publication après validation (étapes 9 et 10).

Les propositions et détails restent dans [la roadmap](roadmap.md) et [le plan](plan-implementation.md). Ils ne constituent pas une demande de tout implémenter. La roadmap contient aussi des scénarios de tests souhaités; la simulation actuelle couvre le JSON, l’état, le chargement des modules, la géométrie des bords et de restauration ainsi que le chemin d’export, mais pas les interactions Cinnamon.

## Organisation documentaire

La documentation est désormais maintenue dans le dépôt, selon [AGENTS.md](../AGENTS.md). Les anciens plans et la checklist ont été déplacés dans `docs/`, leur contenu et leurs cases conservés. Les pages Notion restent historiques; voir [la provenance](README.md#provenance-documentaire).
