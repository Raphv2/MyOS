# MyOS

**Mon portfolio, sous la forme d'un ordinateur rétro.**

![Logo MyOS](logo.png)

Au lieu d'une page qu'on fait défiler, MyOS se visite comme un vieux PC : on allume la TV
cathodique, on se connecte, et on explore un bureau avec ses icônes, ses fenêtres et ses dossiers.
Chaque fichier s'ouvre dans sa propre application : mes illustrations, mes modèles 3D, mon CV,
mes projets et même leur code source.

## Ce qu'on peut faire

- **Allumer et éteindre la TV**, passer en plein écran sans le cadre, ou visiter depuis un téléphone
- **Explorer les dossiers** comme sur un vrai système : `C:/Users/Raphaël Gosset/...`
- **Ouvrir les fichiers** dans des fenêtres qu'on déplace, redimensionne, réduit et empile
- **Regarder mes illustrations** avec zoom et déplacement
- **Faire tourner mes modèles 3D** à la souris ou au doigt
- **Lire mon CV** en PDF, page par page, et le télécharger
- **Voir des vidéos et écouter de la musique** dans des lecteurs rétro
- **Lancer des shaders GLSL** en direct, avec leur code à côté
- **Lire le code de mes projets** dans MyOS Code, un mini IDE avec coloration syntaxique
- **Me contacter** en cliquant sur la spirale

## Comment c'est construit

| Partie | Technologies |
| --- | --- |
| Interface | TypeScript, Vite, HTML / CSS sans framework |
| 3D, PDF, code | three.js, pdf.js, Shiki |
| Serveur | PHP 8.3 (petite API JSON) |
| Données | MySQL / MariaDB |
| Hébergement | Hostinger |

Tout le contenu du bureau vient d'une base de données : deux tables, `folders` et `files`, qui
décrivent l'arborescence comme un vrai disque dur. Ajouter un fichier sur le site, c'est ajouter
une ligne en base.

Le site ne charge que l'essentiel au démarrage. Les visionneuses lourdes (3D, PDF, coloration du
code) ne sont téléchargées qu'au moment où l'on ouvre un fichier qui en a besoin.

## Un admin caché dans le système

Le site a son propre panneau d'administration, intégré au bureau. Il permet de créer des dossiers,
d'envoyer des fichiers par glisser-déposer, d'importer un dossier de code entier et de publier un
projet sur le bureau en quelques clics.

Il est protégé comme il faut : mot de passe chiffré, blocage après plusieurs essais ratés, jeton
anti-falsification sur chaque action, fichiers vérifiés à l'envoi. Le code envoyé n'est jamais
exécuté par le serveur, il est seulement affiché.

## L'histoire du projet

- **Janvier 2025** : premier commit. J'apprends la programmation et je me lance seul dans l'idée
  d'un portfolio qui ne ressemble à aucun autre.
- **Février 2025** : l'explorateur de fichiers branché sur la base de données, puis l'ouverture
  des fichiers selon leur type, la 3D, les PDF et les textes.
- **Mars 2025** : première version en ligne.
- **2026** : refonte complète en TypeScript. Même look, mais un code propre et testé, de nouvelles
  applications (vidéo, musique, IDE, projets) et l'admin intégré.

## Les défis

- Faire vivre un vrai système de fenêtres **à l'intérieur de l'écran d'une TV** dessinée en pixel art.
- Adapter des shaders écrits pour OpenGL sur ordinateur afin qu'ils tournent **dans le navigateur**.
- Tout reconstruire sans jamais toucher à la **structure de la base de données** du site en production.

## Liens

- Le site : [raphaelgosset.fr](https://raphaelgosset.fr)
- Le code : [github.com/Raphv2/MyOS](https://github.com/Raphv2/MyOS)
