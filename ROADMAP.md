# Feuille de route — Cinnamon Tiling Shell

Le MVP actuel couvre les dispositions prédéfinies, les raccourcis clavier, les marges, le multi-écran et le choix de disposition dans le panneau. Il reprend le principe de tuiles normalisées de [Tiling Shell](https://github.com/domferr/tilingshell), mais son code est réécrit pour Cinnamon et Muffin.

## Écart fonctionnel avec Tiling Shell

| Fonctionnalité | État dans le MVP Cinnamon |
| --- | --- |
| Dispositions personnalisées et éditeur graphique | À faire |
| Import/export JSON de dispositions | À faire |
| Prévisualisation des tuiles pendant le déplacement | À faire |
| Activation avec `Ctrl` pendant un glisser-déposer | À faire |
| Snap Assistant au bord supérieur | À faire |
| Sélection de plusieurs tuiles avec `Alt` | À faire |
| Tuilage aux bords de l’écran | À faire |
| Auto-tiling des nouvelles fenêtres | À faire |
| Suggestions pour remplir les tuiles libres | À faire |
| Disposition par espace de travail et moniteur | À faire |
| Redimensionnement intelligent des fenêtres adjacentes | À faire |
| Navigation directionnelle entre fenêtres | À faire |
| Menu contextuel des fenêtres | À faire |
| Groupement dans Alt-Tab, bordure de fenêtre et réglages visuels avancés | À faire |
| Raccourcis pour déplacer une fenêtre entre tuiles | Disponible |
| Menu de sélection de disposition | Disponible |
| Marges et zone de travail par moniteur | Disponible |

## Ordre de développement recommandé

### 1. Dispositions personnalisées

- Définir un format JSON compatible autant que possible avec les fichiers de disposition de Tiling Shell.
- Ajouter l’import/export.
- Créer un éditeur simple : division horizontale ou verticale, suppression et redimensionnement d’une tuile.

Cette étape sépare le moteur de tuilage des quatre dispositions codées en dur et rend le projet immédiatement utile.

### 2. Prévisualisation au déplacement

- Écouter les opérations de déplacement de fenêtre fournies par Muffin.
- Dessiner une surcouche semi-transparente dans la zone de travail du moniteur concerné.
- Identifier la tuile sous le pointeur et l’appliquer lorsque l’utilisateur relâche la fenêtre.
- Employer `Ctrl` comme touche d’activation, configurable dans les préférences.

C’est la priorité ergonomique : elle fait passer l’extension d’un gestionnaire utilisable au clavier à une expérience de tiling visuelle.

### 3. Snap Assistant et tuilage aux bords

- Afficher les dispositions lorsque la fenêtre approchée atteint le bord supérieur.
- Ajouter une zone sensible et configurable aux bords gauche, droit et supérieur.
- Ne pas interférer avec le tuilage natif de Cinnamon : détecter ses réglages et documenter le comportement choisi.

### 4. Automatisation et espaces de travail

- Conserver la disposition sélectionnée par moniteur et par espace de travail.
- Proposer le meilleur emplacement disponible à l’ouverture d’une fenêtre.
- Après un tuilage, suggérer les fenêtres pouvant occuper les tuiles libres.

### 5. Gestion avancée des fenêtres

- Permettre de sélectionner plusieurs tuiles adjacentes avec `Alt`.
- Ajouter le redimensionnement coordonné des fenêtres voisines.
- Ajouter le changement de focus directionnel et le menu contextuel de tuilage.
- Évaluer ensuite les améliorations visuelles : bordure de fenêtre active et intégration Alt-Tab.

## Vérification à chaque étape

- Tester avec une, deux et trois sorties, y compris des résolutions et échelles différentes.
- Tester sur X11 et Wayland lorsque Cinnamon/Muffin le permet.
- Vérifier les fenêtres normales, maximisées, plein écran, dialogues et fenêtres toujours au-dessus.
- S’assurer que la désactivation de l’extension supprime tous les raccourcis, acteurs et signaux créés.
