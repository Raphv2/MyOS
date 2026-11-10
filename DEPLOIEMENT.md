# Mettre MyOS v2 en ligne sur Hostinger

Tout se fait depuis **hPanel → Fichiers → Gestionnaire de fichiers** (et phpMyAdmin pour la sauvegarde).
La base de données n'est **pas modifiée** : ni le schéma, ni les données. On peut revenir en arrière
à tout moment (étape 6).

## 0. Sécurité - à faire tout de suite, même sans déployer

1. Supprimer `public_html/public_html (1).zip` : il est téléchargeable par n'importe qui et contient le `.env`.
2. Supprimer `public_html/error_log.txt` (public lui aussi).
3. Changer le mot de passe de l'utilisateur MySQL (hPanel → Bases de données), puis mettre à jour `DB_PASS` dans le `.env`.
4. Supprimer `public_html/node_modules/` (restes de l'ancien backend Node, inutile).

## 1. Sauvegarder

- phpMyAdmin → la base → **Exporter** → SQL. Garder le fichier sur ton PC.
- Gestionnaire de fichiers → créer le dossier `domains/raphaelgosset.fr/backup-v1/` (**au-dessus** de `public_html`, donc jamais public).

## 2. Préparer le `.env` (au-dessus de public_html)

1. Sur ton PC : `npm run admin:password` → choisis un mot de passe solide → copie la ligne `ADMIN_PASSWORD_HASH='…'`.
2. Crée `domains/raphaelgosset.fr/.env` avec le contenu de l'ancien `public_html/.env` **plus** cette ligne
   (modèle : [.env.example](.env.example)).
3. Laisse l'ancien `public_html/.env` en place pour l'instant (sert au retour arrière). Il pourra être supprimé à la fin.

Optionnel : hPanel → Avancé → **Configuration PHP** → `upload_max_filesize` / `post_max_size` à 256M
pour pouvoir envoyer de grosses vidéos depuis l'admin.

## 3. Construire

```bash
npm install
npm test
npm run build
```

Le dossier `dist/` contient tout le nouveau site : `index.html`, `assets/`, `api/`, `data.json`, `.htaccess`.
(Les médias `img/` sont déjà sur le serveur : ils ne sont pas dans `dist/`.)

## 4. Remplacer l'ancien site

1. Déplacer **dans `backup-v1/`** les anciens fichiers de `public_html` :
   `index.php`, `db.php`, `pdoconfig.php`, `.htaccess`, `data.json`, `package.json`, `package-lock.json`,
   `README.md`, et les dossiers `css/`, `js/`, `vues/`, `static/`, `html/`, `inc/`, `modele/`, `.git/`, `.trash/`.
   **Ne pas toucher** à `img/`.
2. Envoyer le **contenu** de `dist/` dans `public_html/` (activer l'affichage des fichiers cachés pour voir `.htaccess`).

## 5. Vérifier

- https://raphaelgosset.fr → démarrage, LOGIN, bureau identique.
- https://raphaelgosset.fr/api/tree.php → du JSON (sinon : vérifier le `.env`).
- https://raphaelgosset.fr/index.php?page=accueil → redirige vers le bureau (anciens liens OK).
- https://raphaelgosset.fr/.env et https://raphaelgosset.fr/api/_lib/bootstrap.php → **403**.
- Menu Start → bouton clé → connexion admin.

## 6. Retour arrière (si besoin)

Supprimer de `public_html` : `index.html`, `assets/`, `api/`, `.htaccess`, puis remettre
les fichiers de `backup-v1/` à leur place. L'ancien site repart tel quel (la base n'a pas changé).

## Mises à jour suivantes

`npm run build`, puis renvoyer le contenu de `dist/` (écraser). Les envois faits depuis l'admin vont
dans `img/` et en base : ils ne sont jamais écrasés par un déploiement.
