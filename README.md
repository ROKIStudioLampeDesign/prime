# Prime

Application web (PWA) de suivi **salle de sport** et **alimentation**, pensée pour l’iPhone,
utilisable **hors connexion**. Aucun compte, aucun serveur : toutes les données restent sur ton
téléphone (pense à les exporter régulièrement : Réglages → Données).

- **Alimentation** : journal du jour, produits (avec scan de code-barres Open Food Facts), plats,
  objectifs.
- **Salle** : séances avec pré-remplissage des charges, minuteur de repos, modèles, calendrier.
- **Corps** : carte des muscles colorée selon le dernier entraînement.
- **Stats** : poids, progression et records, résumé de la semaine.

## Installer sur le téléphone

L’app doit être ouverte depuis son adresse **HTTPS** (voir [DEPLOY.md](DEPLOY.md)).

### iPhone (Safari)

1. Ouvre l’adresse de Prime dans **Safari**.
2. Touche le bouton **Partager** (carré avec une flèche vers le haut).
3. Fais défiler et choisis **Sur l’écran d’accueil**, puis **Ajouter**.
4. Ouvre Prime depuis sa nouvelle icône : elle s’affiche en plein écran, sans barre Safari.

Sur iPhone, l’installation n’est possible que depuis Safari. Une fois installée, Prime garde mieux
ses données (stockage persistant) qu’un simple onglet.

### Android (Chrome)

1. Ouvre l’adresse de Prime dans **Chrome**.
2. Touche **⋮** (menu) puis **Installer l’application** (ou **Ajouter à l’écran d’accueil**).
3. Confirme : Prime apparaît dans le lanceur d’applications.

## Déploiement

Prime est un site statique à servir en HTTPS (déployé sur Cloudflare Workers). Toutes les étapes sont
dans [DEPLOY.md](DEPLOY.md).

## Sauvegarde

Réglages → **Données** → **Exporter** crée un fichier `prime-sauvegarde-AAAA-MM-JJ.json` (photos
incluses). Sur iPhone, choisis « Enregistrer dans Fichiers » ou envoie-le-toi. **Importer** permet de
le restaurer (fusionner ou tout remplacer). Un rappel s’affiche après 14 jours sans sauvegarde.

## Développement

Voir [CLAUDE.md](CLAUDE.md) pour l’architecture, les conventions et la définition de « terminé ».

```sh
npm install
npm run dev       # http://localhost:5173
npm test
npm run lint
npm run build && npm run preview   # tester la PWA et le hors-connexion
```
