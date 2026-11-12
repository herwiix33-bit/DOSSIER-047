# DOSSIER 047 — version 2 synchronisée

Cette version remplace le stockage local des équipes par Supabase. Le tableau organisateur se rafraîchit automatiquement toutes les 5 secondes. Les réponses attendues restent côté serveur (hash SHA-256) et les opérations passent par une Edge Function.

## Contenu
- `index.html`, `styles.css`, `app.js` : site web.
- `config.js` : URL Supabase et publishable key publique déjà renseignées.
- `supabase/migrations/001_dossier047_v2.sql` : migration SQL, sécurité et bucket policies.
- `supabase/functions/game-api/index.ts` : API serveur pour équipes, indices, réponses et administration.\n- `supabase/config.toml` : désactive la vérification JWT automatique de la passerelle ; l'API vérifie elle-même le compte admin et le jeton d'équipe.
- `media/` : emplacement de vos médias (le stockage réel est dans Supabase Storage).

## Avant de commencer
1. Faites une sauvegarde de votre dépôt GitHub actuel (téléchargez le ZIP ou créez une branche).
2. Ne publiez jamais `sb_secret_...`, `service_role`, mot de passe de base de données ou fichier `.env`.
3. Votre bucket `dossier047-media` doit déjà exister et être PUBLIC pour que les joueurs puissent lire les fichiers. La migration ajoute des règles pour réserver l'envoi/suppression aux comptes administrateurs.
4. Le projet Supabase doit être celui configuré dans `config.js`.

## Étape 1 — Exécuter la migration SQL
1. Supabase > SQL Editor > New query.
2. Ouvrir `supabase/migrations/001_dossier047_v2.sql` sur votre ordinateur avec un éditeur de texte.
3. Copier tout le contenu et le coller dans SQL Editor.
4. Cliquer Run.
5. Vérifier qu'il n'y a pas d'erreur rouge.

La migration conserve les tables déjà créées, ajoute les champs manquants, crée la session `047-2026`, ajoute les six indices de démonstration et définit les règles de stockage.

Réponses de démonstration initiales : QR01 HORLOGE, QR02 ROSE, QR03 BANC, QR04 MARTIN, QR05 MARTIN, QR06 047. Modifiez-les depuis l'administration avant l'événement.

## Étape 2 — Créer le compte administrateur
1. Supabase > Authentication > Users > Add user.
2. Créer un utilisateur avec votre propre adresse e-mail et un mot de passe fort.
3. Ouvrir l'utilisateur créé et copier son UUID (User UID).
4. Supabase > SQL Editor > New query, exécuter en remplaçant l'UUID :

```sql
insert into public.admin_users(user_id)
values ('COLLER-ICI-LE-UUID-AUTH')
on conflict (user_id) do nothing;
```

Ne partagez pas ce mot de passe. La connexion administrateur se fait depuis `https://herwiix33-bit.github.io/DOSSIER-047/#admin`.

## Étape 3 — Déployer la fonction serveur game-api
La clé service_role reste uniquement dans les secrets gérés par Supabase. Ne la copiez jamais dans `config.js`.

Méthode recommandée avec Supabase CLI (sur un ordinateur avec Node.js et Git installés) :

```bash
npm install -g supabase
supabase login
supabase link --project-ref aheqhjfvehqgjkqbswmx
supabase functions deploy game-api
```

Depuis le dossier extrait du ZIP, exécutez ces commandes dans le dossier contenant `supabase/`. Le fichier `supabase/config.toml` configure `verify_jwt = false` pour cette fonction publique ; les contrôles d'accès sont effectués dans le code de la fonction (jeton d'équipe pour les joueurs, session Auth + table `admin_users` pour l'administration). Les variables SUPABASE_URL, SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY sont fournies à la fonction par l'environnement Supabase. Ne créez pas de secret côté navigateur.

Si vous ne souhaitez pas installer la CLI, ouvrez Supabase > Edge Functions > Deploy a new function, nommez-la `game-api`, puis copiez le contenu de `supabase/functions/game-api/index.ts` dans l'éditeur web et déployez. Vérifiez que la fonction est déployée et qu'elle utilise les variables d'environnement Supabase intégrées.

## Étape 4 — Mettre les fichiers du site sur GitHub
Dans le dépôt `herwiix33-bit/DOSSIER-047`, remplacez à la racine :
- `index.html`
- `app.js`
- `styles.css`
- `config.js`

Ajoutez aussi le dossier `supabase/` (migration + fonction). Vous pouvez conserver `config.example.js` et `README.md` existants, mais remplacez le README par celui-ci si souhaité. Ne téléversez pas de clés secrètes.
GitHub Pages doit publier depuis `main` et `/ (root)`.

## Étape 5 — Ajouter des médias dans Supabase Storage
1. Supabase > Storage > dossier047-media > Upload files.
2. Téléversez un média avec un nom simple, sans espaces ni accents (ex. `temoin.mp3`).
3. Copiez son Public URL. Elle ressemble à :
`https://aheqhjfvehqgjkqbswmx.supabase.co/storage/v1/object/public/dossier047-media/temoin.mp3`
4. Connectez-vous comme admin sur le site > `#admin` > Énigmes & médias > Modifier.
5. Choisissez le type, collez l'URL publique, saisissez la réponse et enregistrez.

## Étape 6 — Test de bout en bout
1. Connectez-vous à `.../DOSSIER-047/#admin`.
2. Dans « Partie », laissez le code de partie `047-2026`. Cliquez Démarrer la partie si nécessaire.
3. Ouvrez le site sur un téléphone, créez une équipe avec le code `047-2026`.
4. Sur un deuxième téléphone, créez une autre équipe.
5. Dans le centre organisateur, ouvrez Vue d'ensemble : les équipes doivent apparaître et l'écran se rafraîchit toutes les 5 secondes.
6. Testez les QR : ils doivent contenir l'adresse GitHub Pages suivie de `?code=QR01` ... `?code=QR06`.

## QR Codes permanents
Base du site :
`https://herwiix33-bit.github.io/DOSSIER-047/`
QR01 :
`https://herwiix33-bit.github.io/DOSSIER-047/?code=QR01`
... jusqu'à QR06. Les QR ne changent pas quand vous remplacez les médias ou les textes.

## Limites et points à savoir
- Le chronomètre de chaque équipe démarre à son inscription, pour 30 minutes. Il est calculé côté serveur à partir de `started_at`.
- Le tableau se met à jour automatiquement toutes les 5 secondes (polling), pas par WebSocket instantané.
- Le code d'équipe est un jeton secret conservé dans le stockage local du navigateur : ne videz pas les données du navigateur pendant la partie.
- Le compte administrateur doit être autorisé dans `admin_users`.
- La fonction limite la partie à quatre équipes. Pour réinitialiser une session pour un nouvel événement, il faudra ajouter une action de réinitialisation contrôlée ou recréer la session depuis SQL après archivage.
- Les contenus et QR codes sont publics. Ne placez pas d'informations personnelles ou confidentielles réelles dans les indices.
- Les réponses par défaut sont des exemples à remplacer. Le site ne doit pas être utilisé le jour de l'événement avant d'avoir testé toutes les étapes sur deux téléphones différents.
