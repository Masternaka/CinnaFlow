# CinnaFlow

CinnaFlow est une extension Cinnamon de gestion de fenêtres en mosaïque. Elle propose des dispositions personnalisables, l'assistant d'ancrage, le redimensionnement de fenêtres adjacentes, les raccourcis clavier, le tiling par les bords et la gestion multi-écran.

## Prérequis

- Cinnamon 5.6 à 6.4 ;
- Node.js et npm, uniquement pour construire l'extension depuis les sources.

## Installation depuis les sources

```sh
npm install
npm run build
npm run install:extension
```

Activez ensuite **CinnaFlow** dans l'application Extensions de Cinnamon. Après une mise à jour, désactivez puis réactivez l'extension, ou redémarrez Cinnamon.

## Développement

```sh
npm run lint
npm run prettier:check
npm run build
```

Les préférences de l'extension permettent de définir les dispositions, les marges, les raccourcis, l'assistant d'ancrage et les comportements de focus.

## Licence

GPL-3.0.
