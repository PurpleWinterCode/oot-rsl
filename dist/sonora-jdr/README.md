# Sonora JDR

**Table de mixage et bibliothèque sonore locale pour les parties de jeu de rôle**  
Application web mobile installable (PWA) — interface en français, sans compte, sans cloud, sans abonnement.

## Ce que l'application sait faire

- **Importer vos propres fichiers audio** MP3, WAV, OGG, M4A, etc. (selon les codecs du navigateur) et les stocker avec IndexedDB.
- **Classer les sons** avec des catégories et des tags libres. Les noms de fichiers courants proposent automatiquement quelques tags (par ex. `porte_bois_phalanges.wav`). La bibliothèque accepte plusieurs filtres de tags simultanés.
- **Définir des sons permanents** accessibles à tout moment.
- **Organiser des campagnes, sessions et scènes**, les renommer, dupliquer des sessions avec leurs scènes et préparer des bruitages ponctuels ou des boucles.
- **Créer des zones sonores superposables** : ambiances continues + événements sonores aléatoires.
- **Définir les poids du tirage** de chaque événement (par ex. branche 30, hibou 10, loup 1) ainsi qu'un intervalle aléatoire minimum et maximum.
- **Mixer les volumes** : général, ambiances, effets, zone, son individuel, son affecté à une zone ou à une scène.
- **Déclencher un effet important** en atténuant temporairement les ambiances.
- **Arrêter toutes les lectures** en un appui, avec un fondu sonore court.
- **Sauvegarder ou restaurer toute la bibliothèque**, y compris les fichiers audio, au format JSON.
- **Fonctionner hors ligne** après la première mise en cache par le navigateur. Les sons importés résident sur l'appareil.
- Charger six **petits sons synthétiques de démonstration** (non représentatifs d'une vraie banque professionnelle de bruitages).

## Démarrer sur un ordinateur

Aucun `npm install` n'est nécessaire. Ouvrez un terminal dans le dossier `sonora-jdr` puis exécutez :

```bash
python -m http.server 8000
```

Dans le navigateur : **http://localhost:8000**

Ne lancez pas `index.html` directement en `file://` : les modules JavaScript et le service worker sont conçus pour HTTP(S).

## Installer sur Android (Chrome) ou iPhone (Safari)

L'application doit être mise en ligne avec **HTTPS** (GitHub Pages, Netlify, etc.). Pour GitHub Pages :

1. Créez un dépôt GitHub, par exemple `sonora-jdr`.
2. Placez **le contenu du dossier** `sonora-jdr` à la racine du dépôt (pas le ZIP ni le dossier parent).
3. Dans **Settings → Pages**, choisissez la publication depuis la branche `main` et le dossier `/ (root)`.
4. Ouvrez l'URL de GitHub Pages sur le téléphone.
5. Sur Android / Chrome : menu du navigateur → **Installer l'application** ou **Ajouter à l'écran d'accueil**.
6. Sur iPhone / Safari : bouton Partager → **Sur l'écran d'accueil**.

Le résultat est une **PWA installable**, pas un fichier APK ou une application publiée sur les stores. Un packaging natif avec Capacitor serait envisageable ultérieurement.

## Premiers pas

1. Réglages → **Installer 6 exemples synthétiques**, pour découvrir les commandes (facultatif).
2. Bibliothèque → **Importer des sons** ; modifier leurs noms, catégories, tags et niveaux audio.
3. Marquer les sons courants comme **Permanents**.
4. Session → créer une **Campagne**, puis une **Session** et une **Scène** ; ajouter les sons de la scène.
5. Pour les scènes, basculer les pistes en **Ambiance** (boucle) ou **Effet** (déclenchement à la demande).
6. Zones → créer une zone, sélectionner des sons, choisir **Boucle** / **Événement**, puis configurer chaque volume et son poids ; activer la zone.
7. Mixage → ajuster les pistes pendant le jeu.
8. Réglages → **Exporter une sauvegarde** après avoir constitué votre bibliothèque.

## Vie privée, limites et précautions

- **Aucune requête à un serveur de collecte** : les sons et les paramètres sont stockés uniquement dans le navigateur utilisé. Il n'y a pas de synchronisation entre appareils.
- Les navigateurs mobiles peuvent **vider le stockage local**, notamment en cas de manque d'espace ou de suppression des données du site. **Exportez régulièrement une sauvegarde** ; le JSON inclut l'audio, il peut être volumineux.
- La place disponible dépend de l'appareil et du navigateur. Pour une bibliothèque très importante, des sauvegardes externes sont indispensables.
- Certains fichiers audio, notamment certains encodages M4A ou FLAC, ne sont pas supportés par tous les navigateurs. L'application affiche une erreur si le décodeur ne les accepte pas.
- Les sons aléatoires déclenchés automatiquement nécessitent une première interaction humaine avec la page (restrictions audio mobiles). Le navigateur peut interrompre les tâches en arrière-plan lorsque le téléphone se verrouille : **gardez l'application ouverte pendant le jeu**.
- L'application ne fournit pas de banque de bruitages commerciaux. Assurez-vous de posséder les droits d'utilisation de vos fichiers.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Entrée de l'application |
| `app.js` | Écrans, contrôles, sessions, tags, zones, export/import |
| `audio.js` | Web Audio API, boucles, mixage et fondus |
| `db.js` | Stockage IndexedDB des sons et paramètres |
| `state.js` | Structure des données, catégories et tags suggérés |
| `styles.css` | Design responsive mobile/desktop |
| `service-worker.js` | Cache applicatif hors ligne |
| `manifest.webmanifest` | Installation comme PWA |
| `samples/` | Fichiers de démonstration synthétiques |

**Projet : Sonora JDR — crédit public : Wind.**
