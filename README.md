# MyOS

Bienvenue sur **MyOS** ! Un portfolio interactif qui simule un ordinateur rétro : écran cathodique,
bureau, fenêtres, explorateur de fichiers… Découvrez mes compétences et mes projets à travers une
interface immersive.

> En ligne : https://raphaelgosset.fr

## Fonctionnalités

- **Interface immersive** : TV cathodique, démarrage, bureau, fenêtres déplaçables / redimensionnables,
  barre des tâches, menu Start avec fichiers récents, mode plein écran, version mobile.
- **Explorateur de fichiers** branché sur une vraie base MySQL (`folders` / `files`).
- **Applications** selon l'extension du fichier :
  | Type | Application |
  | --- | --- |
  | png, jpg, gif, webp | visionneuse (zoom molette / pinch, glisser) |
  | pdf | lecteur PDF multi-pages (pdf.js) + téléchargement |
  | blend / glb | modèle 3D (three.js) |
  | mp4, webm | lecteur vidéo rétro |
  | mp3, wav, ogg | lecteur audio avec visualiseur |
  | glsl, frag, vert | shader en direct (WebGL2) + onglet code |
  | ts, js, py, php, c, … | **MyOS Code** : mini IDE (arborescence, onglets, coloration VS Code) |
  | md | document Markdown |
  | project | **fenêtre Projet** : logo, présentation, galerie, PDF, vidéos, code |
  | .exe (github, linkedin, lien) | ouverture du lien avec animation ASCII |
- **Admin intégré** (menu Start → bouton clé, ou `Ctrl+Alt+A`) : dossiers, envois de fichiers
  (glisser-déposer, dossiers de code entiers), raccourcis, liens, et assistant **Nouveau projet**.

## Technologies

- **TypeScript** + **Vite** (aucun framework : DOM natif)
- three.js, pdf.js, Shiki (coloration), marked + DOMPurify
- **PHP 8.3** (API) + **MariaDB/MySQL**, hébergement mutualisé Hostinger

## Organisation

```
index.html            page unique (cadre TV + #app)
src/
  main.ts             démarrage, navigation start / bureau / TV éteinte, plein écran
  config.ts           liens, textes, grille des icônes
  types.ts            types = schéma SQL de prod (ne pas modifier)
  core/               arborescence (VirtualFS), API, icônes, utilitaires DOM
  os/                 bureau, fenêtres, curseur, widgets, menus
  apps/               une application par type de fichier
  admin/              admin intégré (chargé seulement à l'ouverture)
  styles/legacy.css   l'ancien home.css (le look du site)
  styles/os.css       styles de la v2
public/
  api/                API PHP (tree, auth, admin) — _lib/ n'est pas accessible depuis le web
  os-icons/           icônes pixel des nouveaux types (générées : npm run icons)
  .htaccess           sécurité + redirection des anciennes URLs
  data.json           instantané de secours de l'arborescence
img/                  médias du site (non versionnés, déjà sur le serveur)
docker/               serveur de test local identique à la prod
```

## Développement

```bash
npm install
npm run dev        # http://localhost:5173 (sans PHP : lit public/data.json)
npm test           # tests
npm run build      # → dist/ (à déployer)
```

Pour tester avec la vraie API PHP + base + admin : voir [docker/README.md](docker/README.md).
Pour mettre en ligne : voir [DEPLOIEMENT.md](DEPLOIEMENT.md).

## Ajouter un projet sur le bureau

Depuis l'admin → **★ Projet** : nom, logo, description (Markdown), PDF de présentation, images /
vidéos et le dossier de code. MyOS crée le dossier, envoie tout et pose l'icône (le logo) sur le
bureau. Aucune modification de la base : un projet est une ligne `files` d'extension `project`
dont le nom est celui du dossier du projet.
