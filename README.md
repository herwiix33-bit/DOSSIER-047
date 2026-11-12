# DOSSIER 047 — Escape game QR (version 1.1)

Site statique pour GitHub Pages. Cette version conserve le scanner QR et améliore l'affichage des médias ainsi que le tableau de suivi local des équipes.

## Mise à jour sur GitHub
Remplacer à la racine du dépôt : `index.html`, `app.js`, `styles.css`, `README.md`. Conserver `config.example.js`.

## Ajouter des photos, audios et vidéos
1. Dans le dépôt GitHub, choisir **Add file > Create new file**.
2. Nommer le fichier `media/` puis un nom, par exemple `media/temoin.mp3`.
3. Pour un fichier existant, utiliser **Add file > Upload files** et téléverser le média dans le dossier `media` (créer le dossier avec un premier fichier si nécessaire).
4. Après publication GitHub Pages, l'adresse publique du fichier suit la forme :
   `https://herwiix33-bit.github.io/DOSSIER-047/media/temoin.mp3`
5. Dans Administration > Énigmes & médias > Modifier, choisir le type audio/image/video et coller cette URL dans « Adresse du fichier audio / image / vidéo ». Pour une carte, coller un lien Google Maps ou OpenStreetMap dans le champ carte.
6. Enregistrer. Le QR Code de l'indice ne change pas : il continue à pointer vers `?code=QRxx`.

Formats conseillés : JPG/PNG/WebP pour les images, MP3 pour les audios, MP4 H.264 pour les vidéos. Les fichiers doivent être accessibles publiquement. Attention aux tailles : éviter les vidéos lourdes ; les stocker sur un hébergeur vidéo si nécessaire.

## Tableau des équipes : limite actuelle
Le tableau de bord affiche les équipes, leur progression, le temps restant et les indices demandés **uniquement pour les équipes enregistrées dans le même navigateur**. La version actuelle utilise `localStorage`. Elle ne synchronise pas les téléphones entre eux. Pour afficher en direct les 2 à 4 équipes sur le PC de l'organisateur, il faut connecter Supabase (base de données partagée + règles d'accès). Le fichier `config.example.js` est un exemple et ne connecte pas encore le site à un serveur.

## Scanner QR
Le scanner nécessite HTTPS et une autorisation caméra. GitHub Pages fournit HTTPS. Les QR doivent contenir l'adresse du site suivie de `?code=QR01` à `?code=QR06`.

## Sécurité
Le PIN administrateur actuel est une protection locale de démonstration seulement. Ne pas utiliser ce prototype comme système sécurisé pour des données sensibles ou un événement public sans authentification et règles serveur.
