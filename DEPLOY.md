# Déploiement — Cloudflare Workers

Prime est un site statique (`dist/` après `npm run build`). Il doit être servi en **HTTPS** : sans
HTTPS, iOS refuse l’accès à la caméra (scan de code-barres), le service worker (mode hors connexion)
et l’installation sur l’écran d’accueil. Cloudflare fournit HTTPS automatiquement.

Prime est déployé en **Cloudflare Workers** (assets statiques, sans code serveur), configuré par
`wrangler.jsonc`.

## Option A — Déploiement automatique depuis GitHub (configuration actuelle)

1. Pousse le dépôt sur GitHub (dépôt privé possible).
2. Sur <https://dash.cloudflare.com> → **Workers & Pages** → **Create** → **Import a repository**,
   puis choisis le dépôt.
3. Réglages de build :
   | Champ          | Valeur                |
   | -------------- | --------------------- |
   | Build command  | `npm run build`       |
   | Deploy command | `npx wrangler deploy` |
4. Chaque `git push` sur `main` construit et redéploie (environ 5 minutes).

## Option B — Déploiement manuel en une commande

```sh
npm ci
npm run deploy   # build + wrangler deploy (Workers, config dans wrangler.jsonc)
```

La première fois, lance `npx wrangler login` (le navigateur s’ouvre pour se connecter).

## Ce qui est déjà configuré

- **Déploiement actuel** : le projet tourne en **Cloudflare Workers** (assets statiques) sur
  <https://prime.thomasrocchi1111.workers.dev>, redéployé à chaque push sur `main`. La config est
  dans `wrangler.jsonc` (`assets.directory = ./dist`).
- **Routes de l’application** : `not_found_handling: "single-page-application"` fait servir
  `index.html` pour toute URL inconnue, donc `/gym/workout/12` fonctionne au rechargement. Le
  service worker fait de même hors connexion.
- **En-têtes** : `public/_headers` est copié dans `dist/` :
  - `sw.js`, `index.html` et le manifest ne sont jamais mis en cache (sinon les mises à jour
    n’arriveraient pas) ;
  - les fichiers de `/assets/` (noms hachés) sont mis en cache un an ;
  - en-têtes de sécurité, dont une CSP qui n’autorise le réseau que vers Open Food Facts, et
    `Permissions-Policy` qui limite la caméra au site lui-même.

## Vérifier après déploiement

1. Ouvre l’URL HTTPS sur l’iPhone dans **Safari** (pas un autre navigateur : sur iOS seul Safari
   installe les PWA avec service worker).
2. Ajoute l’app à l’écran d’accueil (voir le README) et ouvre-la depuis l’icône.
3. Réglages → **Stockage persistant** devrait passer à « Activé » après quelques utilisations.
4. Active le mode avion et rouvre l’app : tout doit fonctionner sauf la recherche de code-barres.
5. Alimentation → Produits → **+** → **Scanner un code-barres** : la caméra arrière doit s’ouvrir.

## Mises à jour

Après un nouveau déploiement, l’app ouverte affiche « **Nouvelle version disponible** ». La mise à jour
n’est appliquée que si tu touches **Mettre à jour** (jamais au milieu d’une séance). Les données
locales (IndexedDB) ne sont pas touchées par une mise à jour.

## Domaine personnalisé (facultatif)

Worker `prime` → **Settings** → **Domains & Routes** → **Add** → **Custom domain**. Attention : changer de domaine
change l’« origine » du site, et **les données locales ne suivent pas**. Exporte une sauvegarde
(Réglages → Données → Exporter) avant, puis importe-la sur la nouvelle adresse.

## Alternative : Vercel

`npm i -g vercel`, puis `vercel` à la racine (Framework : Vite, output : `dist`). Ajoute un
`vercel.json` avec une réécriture `{ "source": "/(.*)", "destination": "/index.html" }` pour les
routes, et reporte les en-têtes de `public/_headers` dans la clé `headers` de ce fichier.
