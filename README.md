# DOSSIER 047 — V4 multi-thèmes synchronisée

Cette version ajoute les trois parcours thématiques et le suivi du thème choisi.

## Fonctionnalités
- Inscription des équipes avec choix obligatoire : USA, Cinéma ou Royauté.
- Six QR Codes par thème (18 au total).
- USA conserve les QR déjà imprimés `?code=QR01` à `?code=QR06`.
- Cinéma : `CIN01` à `CIN06`.
- Royauté : `ROY01` à `ROY06`.
- Le thème d'une équipe est visible dans le suivi organisateur.
- La progression est calculée sur les six indices actifs de son thème.
- Les indices et réponses sont enregistrés dans Supabase.
- Les contenus des QR peuvent être modifiés sans changer leur URL.
- Ajout de QR Codes supplémentaires depuis l'administration.
- Les équipes ne peuvent scanner/résoudre que les indices de leur thème.
- Les modifications de contenu sont conservées dans la base de données.

## Installation — à faire dans cet ordre

### 1. Sauvegarde
Avant modification, télécharge une copie de ton dépôt GitHub et garde les fichiers actuels.

### 2. Migration SQL
Dans Supabase > SQL Editor > New query :
- Ouvre `supabase/migrations/002_themes_usa_cinema_royaute.sql`.
- Copie tout le contenu et colle-le dans l'éditeur SQL.
- Clique sur Run.
- Le script est additif : il ajoute les colonnes thème et les douze indices Cinéma/Royauté. Il conserve les équipes existantes et les six QR USA existants.

### 3. Redéployer l'Edge Function
Dans un terminal ouvert à la racine de ce dossier :
```bash
supabase link --project-ref aheqhjfvehqgjkqbswmx
supabase functions deploy game-api
```
Confirme `Yes` si la CLI le demande. Le warning Docker absent n'empêche pas nécessairement le déploiement distant.

### 4. Publier le site GitHub Pages
Remplace à la racine du dépôt les fichiers :
- `index.html`
- `app.js`
- `styles.css`
- `config.js`
- `README.md`

Ajoute également le dossier `supabase` et sa migration. Conserve la configuration publique `config.js` fournie. Ne publie jamais une clé `service_role` ou `sb_secret_`.

### 5. Vérification
Après le déploiement GitHub Pages (coche verte), ouvre le site avec `Ctrl + F5`.
- Crée une équipe test USA, puis une équipe test Cinéma et Royauté.
- Vérifie que le thème apparaît dans le suivi administrateur.
- Vérifie que chaque équipe ne voit que ses six indices.
- Modifie le titre d'un indice, actualise le site, puis vérifie que la modification est toujours là.
- Imprime les QR Codes seulement après avoir validé leurs adresses.

## Identifiants QR
- USA : QR01 à QR06 (codes historiques conservés)
- Cinéma : CIN01 à CIN06
- Royauté : ROY01 à ROY06

Les QR supplémentaires utilisent le préfixe de leur thème et un numéro disponible. Le code d'un QR créé ne doit pas être renommé après impression.

## Médias
Les médias doivent être téléversés dans le bucket Supabase Storage `dossier047-media`, puis leur URL publique renseignée dans l'éditeur d'énigme. Les politiques d'accès au bucket configurées lors de la V2 restent utilisées.

## Sécurité
La clé `service_role` est utilisée uniquement comme secret géré par Supabase pour l'Edge Function. Elle ne doit jamais être placée dans `config.js`, dans GitHub Pages, ni partagée dans une conversation.
