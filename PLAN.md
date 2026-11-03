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
- [ ] **Déploiement Cloudflare Pages** — mise en ligne pour tester CSP et Lighthouse en
      conditions réelles (nécessite la connexion Wrangler).
- [ ] **6. Vérification finale** — e2e, Lighthouse sur l'URL réelle, revue de code par sous-agent.
      _Skills : verification-before-completion, requesting-code-review._

## Identité visuelle (étape 2)

Deux pistes étudiées ; la piste A est retenue (choix délégué, cf. « n'attends plus mes OK ») :

- **A. Fonte et craie (retenue)** : encre bleu-nuit `#10151F`, surfaces `#182030` / `#222C3F`,
  craie `#EEF0F4`, jaune des disques étalonnés `#FFC42E` (ocre `#8A5C00` pour le texte en thème
  clair). Titres et grands chiffres en Barlow Condensed (affichage de salle), texte courant en
  police système. Un seul élément fort : les chiffres condensés ; le reste reste sobre.
  Libellés en casse normale, jamais en capitales.
- **B. Carnet d'entraînement** : papier clair par défaut, encre graphite, rouge pointé pour les
  records, chiffres manuscrits. Écartée : l'app est surtout utilisée le soir et en salle, où un
  thème sombre par défaut est plus confortable (et c'est la règle du projet).

Contrastes vérifiés (WCAG AA, ≥ 4,8:1 pour tous les couples texte/fond, dans les deux thèmes).

## Risques et changements

- L'apparence change entièrement (couleurs, police ; ~40 kB de police mis en cache hors ligne).
- Régressions possibles pendant le découpage : couvertes par l'étape 0.
- Dépendances ajoutées : uniquement des outils de test.
