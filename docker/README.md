# Serveur de test local (Docker)

Reproduit la prod Hostinger : Apache + PHP 8.3 avec les `.htaccess`, MariaDB 11 chargée avec le
dump de prod. Tout reste local (identifiants factices).

## Préparer (une fois)

```bash
mkdir -p docker/.data
cp "chemin/vers/le_dump_de_prod.sql" docker/.data/init.sql
cp -r img docker/.data/img                      # copie des médias (les envois de test y vont)
npm run admin:password                          # choisir un mot de passe de test
```

Créer `docker/.data/env` :

```
DB_HOST=db
DB_NAME=file_explorer
DB_USER=myos
DB_PASS=myos-local-dev
ADMIN_PASSWORD_HASH='…la ligne générée…'
```

## Lancer

```bash
npm run build
docker compose -f docker/compose.yml up -d --build
```

Site : http://localhost:8080 — l'admin s'ouvre depuis le menu Start (bouton clé).

Après une modification du front : `npm run build` suffit (dist/ est monté dans le conteneur).

## Remettre la base à zéro

```bash
docker compose -f docker/compose.yml down -v
docker compose -f docker/compose.yml up -d
```
