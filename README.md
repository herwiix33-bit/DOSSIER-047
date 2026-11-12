# DOSSIER 047 — Escape game QR

Site statique compatible GitHub Pages. Cette version ajoute un véritable scanner QR intégré au navigateur grâce à html5-qrcode.

## Publication GitHub Pages
1. Déposer `index.html`, `styles.css`, `app.js`, `config.example.js` et `README.md` à la racine du dépôt.
2. Dans Settings > Pages, sélectionner `Deploy from a branch`, branche `main`, dossier `/ (root)`.
3. Ouvrir l'adresse HTTPS du site.

## Scanner
- Depuis le tableau de mission, cliquer sur **Scanner un QR Code**.
- Autoriser l'accès à la caméra.
- Scanner un QR Code généré depuis l'onglet Administration > QR Codes.
- Le code doit contenir l'URL du site avec `?code=QR01` à `?code=QR06`.
- La caméra nécessite HTTPS (GitHub Pages fournit HTTPS) et une autorisation du navigateur.

La caméra intégrée est une facilité de jeu. Un QR code contenant une URL peut aussi être ouvert avec l'appareil photo natif du téléphone ou en saisissant cette URL : le navigateur ne peut pas distinguer ces méthodes d'accès.

## Limites de cette version
Les équipes, réponses et modifications sont encore enregistrées dans `localStorage` sur un seul navigateur/appareil. Ce prototype n'est pas encore synchronisé entre plusieurs téléphones. Le PIN administrateur est également local et ne constitue pas une authentification sécurisée pour un site public. Une base de données et une authentification côté serveur sont nécessaires avant une partie multi-équipe réelle.
