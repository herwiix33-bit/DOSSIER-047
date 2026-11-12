# DOSSIER 047 — Escape game QR

Prototype web responsive en français pour un escape game d'enquête. Le mode actuel est une **démonstration locale** : les données sont conservées dans le navigateur (`localStorage`). Il permet de tester le parcours, les pages QR, la validation des réponses et l'administration sur un même appareil.

## Lancer le prototype

- Ouvrir `index.html` dans un navigateur récent (ou servir le dossier avec un petit serveur local).
- Accueil : `index.html`
- Administration : `index.html#admin`
- Code PIN de démonstration : `0470`
- Test d'un indice : `index.html?code=QR01` (créer d'abord une équipe sur ce navigateur).

Les QR Codes sont générés dans l'onglet **QR Codes** de l'administration. Renseigner l'URL publique définitive dans le champ « Adresse publique du site » avant impression.

## Important avant une vraie partie

Cette version est un prototype mono-navigateur. Elle ne synchronise pas les équipes entre plusieurs téléphones et le PIN de démonstration n'est pas une authentification sécurisée. **Ne publiez pas ce prototype comme service multi-équipe réel sans ajouter un backend et une authentification serveur.** Les réponses et contenus présents dans `app.js` sont des exemples à remplacer. Les médias doivent être hébergés sur des URL HTTPS publiques accessibles aux joueurs.

## Hébergement statique gratuit (prototype)

Le site peut être hébergé gratuitement sur GitHub Pages ou Cloudflare Pages :

1. Créer un dépôt GitHub privé ou public selon votre préférence.
2. Ajouter `index.html`, `styles.css`, `app.js` et éventuellement `config.example.js`.
3. Activer GitHub Pages dans les paramètres du dépôt (branche `main`, dossier `/root`) ou importer le dépôt dans Cloudflare Pages.
4. Copier l'URL HTTPS fournie par l'hébergeur.
5. Ouvrir `/#admin`, aller dans **QR Codes**, coller l'URL et imprimer.

Un hébergement statique seul ne suffit pas pour partager l'état des équipes entre téléphones. Pour la version opérationnelle multi-appareils, prévoir Supabase (Auth + base de données + fonctions serveur) et remplacer le stockage local par des appels sécurisés. Ne jamais mettre une clé `service_role` dans le navigateur.

## QR Codes

Les identifiants sont stables : `QR01` à `QR06`. Les liens sont construits sous la forme `https://votre-site/?code=QR01`. Le contenu associé peut être modifié sans changer l'identifiant du QR Code, donc sans le réimprimer, tant que le domaine et le chemin du site restent identiques.

## Personnalisation

Dans l'administration :
- **Énigmes & médias** : modifier titre, type, texte, URL audio/image/vidéo, URL de carte, réponse et indice.
- **Paramètres** : titre, durée et PIN de démonstration.
- **QR Codes** : générer et imprimer les six codes.

Pour remplacer les contenus de démonstration, définir des réponses cohérentes avec les énigmes réellement installées sur le terrain.
