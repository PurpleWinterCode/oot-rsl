# OOT RSL · Race Notes

Carnet de course Ocarina of Time Randomizer : notes, settings, inventaire, checks et skulls.

## Publication

Dans Settings → Pages, sélectionner **GitHub Actions** comme source. Le workflow publie `dist/` à chaque push sur `main`.

Adresse prévue : https://purplewintercode.github.io/oot-rsl/

## Sauvegardes personnelles

Les notes sont conservées uniquement dans le localStorage du navigateur. Elles ne sont pas envoyées dans ce dépôt. Un même profil de navigateur partage la même sauvegarde. Il n’y a pas de synchronisation entre appareils.

Changer de domaine ne transfère pas automatiquement les anciennes notes. L’ancien site conserve sa sauvegarde sur son adresse d’origine.

## Développement

Le site statique prêt à publier se trouve dans `dist/`. Après modification du moteur dans `src/` :

```sh
npm ci
npm run build:checks
npm run test:checks
```

Conserver les fichiers de licences livrés dans `dist/`.
