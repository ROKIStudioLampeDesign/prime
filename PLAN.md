# Plan de refonte de Prime

Refonte **en place** (pas de réécriture). Stack conservée : Vite, React 19, TypeScript strict,
Tailwind CSS 4, Dexie, React Router 7, Recharts, vite-plugin-pwa. Aucun changement de schéma de
données : les données existantes sont conservées sans migration.

Règles : une étape = un commit, tests lancés et verts à chaque étape. Depuis l'étape 1, les
étapes s'enchaînent sans validation intermédiaire (à ta demande). Skills utilisés indiqués pour chaque étape (`.claude/skills/`).

## Étapes

- [x] **0. Socle de tests** — tests de composants (Testing Library + jsdom + axe-core) et tests
      end-to-end Playwright versionnés dans le dépôt (navigation, hors connexion, journal, séance).
      _Skills : react-testing, test-driven-development._
- [x] **1. Robustesse et sécurité** — validation de chaque ligne à l'import d'une sauvegarde,
      _focus trap_ des bottom sheets, « Aujourd'hui » qui suit le changement de jour, arrêt du
      minuteur de mise à jour, état de chargement de « Dernière sauvegarde ».
      _Skills : typescript-patterns, frontend-a11y, test-driven-development._
- [x] **2. Nouvelle identité visuelle** — 2 pistes proposées (palette, typographie, principes,
      mini aperçu) ; après choix : jetons de design, composants de base, finitions.
      _Skills : frontend-design, tailwind-design-system, make-interfaces-feel-better._
- [x] **3. Qualité du code** — découpage des gros composants, contrôle segmenté unique, logique
      pure déplacée dans le domaine, tests de composants.
      _Skills : react-best-practices, typescript-patterns, react-testing._
- [x] **4. Performance** — mesure, chargement à la demande, listes longues, requêtes ciblées.
      _Skills : react-best-practices._
      Mesures : bundle principal 162 → 119 kB (écrans rares en chargement différé) ; lignes de
      listes longues en `content-visibility: auto` ; recherche différée (`useDeferredValue`).
      Requêtes : 5 ans simulés (750 séances, 15 000 séries) = ~120–140 ms sur fake-indexeddb
      (borne haute) pour la carte du corps et les records : gardées telles quelles, à revoir si
      les données grossissent vraiment.
- [x] **5. Écran « Aujourd'hui »** — vrai résumé du jour (repas, séance, poids).
      _Skills : test-driven-development, frontend-design._
- [x] **Déploiement Cloudflare Workers** — Workers Builds redéploie à chaque push sur `main`
      (`wrangler.jsonc`) : <https://prime.thomasrocchi1111.workers.dev>.
- [x] **6. Vérification finale** — e2e, Lighthouse sur l'URL réelle, revue de code par sous-agent.
      _Skills : verification-before-completion, requesting-code-review._
      Sur l'URL réelle : en-têtes de sécurité et CSP servis, aucune violation CSP ni erreur
      console, service worker actif, lien profond rechargé sans service worker = 200, écrans
      (y compris chargés à la demande) disponibles hors connexion. Lighthouse (mobile, 1er
      chargement à froid) : accessibilité 100, bonnes pratiques 100, performance 68 (démarrage
      de React et création de la base au premier lancement ; ensuite l'app vient du cache).
      Revue de code : rien de critique ; corrigés : date de la pesée figée après minuit,
      variation « en 7 jours » comparée à une pesée trop ancienne, test aller-retour des
      sauvegardes passant par tous les écrivains, horodatages hors limites, verrou de défilement
      et test des feuilles imbriquées, bandeau de mise à jour sous les feuilles, contrastes
      (danger sur fond teinté, repères d'état en thème clair), chargement annoncé, listes
      longues, « Commencer une séance » depuis l'accueil, horloge `useToday` partagée.

## Identité visuelle (étape 2)

Première version (« Fonte et craie » : bleu-nuit, jaune des disques, Barlow Condensed) choisie
sans toi, puis refusée (« pas assez moderne »). Trois pistes dessinées sur l'écran « Aujourd'hui »,
en sombre et en clair (<https://claude.ai/artifact/RTkyfy1UfApp5u91CQaA2t>) : A. Natif (noir façon
Apple), B. Bento, C. Halo (verre et halo violet). **Tu as choisi B. Bento** :

- Fond graphite `#17171C` (clair : `#F6F5F1`), surfaces neutres, texte `#F5F5F7` / `#17171C`.
- Une tuile pastel par domaine : Alimentation pêche `#FFC4A3`, protéines lilas `#D7C6FF`, poids et
  Corps menthe `#B8EBD3`, Salle ciel `#BFDDFF` ; texte encre `#17171C` dessus, dans les deux thèmes.
- Boutons principaux en pilule inversée (clair sur sombre, encre sur clair), barre d'onglets
  flottante, coins arrondis (24 px pour les cartes, 32 px pour les tuiles).
- Police Plus Jakarta Sans (variable, 27 kB, hors connexion), grands chiffres extra-gras.

Contrastes vérifiés (WCAG AA) : texte ≥ 4,5:1 sur tous les fonds, tuiles comprises (texte
secondaire `ink/75` ≥ 5,6:1) ; en thème clair, traits et courbes en variantes foncées ≥ 4,3:1.

Ensuite, à ta demande, six autres pistes (D à I) puis la piste E déclinée sur tous les écrans
(page « Grand format, tous les écrans » du même lien). **Tu as validé E. Grand format**, qui
remplace Bento dans l'app :

- Fond noir (clair : blanc), bandeaux pleine largeur aux angles droits, aucun arrondi sauf les
  boutons ronds de l'en-tête.
- Jaune `#F4E04D` pour l'Alimentation et les actions principales, cobalt `#2340FF` pour la Salle
  (texte blanc), blanc « papier » pour le poids, le Corps et les chiffres secondaires (`#EDEDED`
  en clair, pour se détacher de la page).
- Police Archivo (variable, largeurs 62 à 125 %, 90 kB, hors connexion) : titres et grands chiffres
  élargis et extra-gras ; un grand chiffre rétrécit selon son nombre de caractères pour tenir sur
  une ligne à 375 px.
- Onglets soulignés, barre d'onglets pleine largeur avec un repère jaune, listes en lignes sur la
  page, champs soulignés, boutons et puces carrés.

Écarts assumés avec les maquettes : le sélecteur de jour du Journal garde ses flèches (pas de
bande de 7 jours) et la carte du corps garde son dégradé de couleurs (vert → rouge, seuils
réglables) plutôt que trois teintes.

Contrastes vérifiés (WCAG AA) : texte ≥ 4,5:1 sur le noir, le jaune, le cobalt et le papier, dans
les deux thèmes ; traits et contours d'état ≥ 3:1.

## Risques et changements

- L'apparence change entièrement (couleurs, police ; ~40 kB de police mis en cache hors ligne).
- Régressions possibles pendant le découpage : couvertes par l'étape 0.
- Dépendances ajoutées : uniquement des outils de test.
