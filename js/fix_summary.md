# Résumé des corrections pour la gestion des tokens et des services

## Problèmes identifiés

1. **Mode démo forçant 9999 tokens** : Plusieurs endroits dans le code utilisaient 9999 comme valeur par défaut en mode démo, au lieu d'utiliser les vraies valeurs du dashboard.

2. **Services visibles mais cliquables selon le plan** : La logique était déjà implémentée dans `service-modal.js` mais pouvait être améliorée.

## Corrections apportées

### 1. dashboard.js
- **Lignes 41-81** : Remplacé les mocks qui forçaient `availableTokens` à 9999 par une logique qui :
  - Utilise les vraies valeurs depuis `authService.userData` si disponible
  - Lit depuis localStorage en mode démo
  - Utilise les valeurs par défaut du plan (50 pour free, 500 pour pro, 5000 pour enterprise)
  
- **Ligne 1230** : Remplacé le fallback à 9999 par une récupération depuis userData

- **Ligne 1300** : Remplacé le fallback à 9999 par une récupération depuis userData

- **Lignes 1371-1372** : Remplacé les valeurs fixes 9999 par les vraies valeurs depuis userData

### 2. main.js
- **Lignes 981-1010** : Remplacé toutes les occurrences de 9999 par des valeurs dynamiques basées sur :
  - `TokenManager.availableTokens` si disponible
  - `authService.userData.availableTokens` sinon
  - Valeur par défaut de 50 (plan free) en dernier recours

### 3. token-shop.js
- **Lignes 394, 401, 412-414** : Remplacé 9999 par des valeurs dynamiques similaires

## Fonctionnement attendu après les corrections

### Affichage des tokens
- **En mode connecté** : Affiche le nombre réel de tokens disponibles depuis Firestore
- **En mode démo (file://)** : Affiche les tokens depuis localStorage ou les valeurs par défaut du plan
- **En mode démo sans localStorage** : Affiche les valeurs par défaut (50, 500, ou 5000 selon le plan)

### Services cliquables selon le plan
La logique existante dans `service-modal.js` fonctionne déjà correctement :
- Tous les services sont **visibles** dans l'interface
- Les services qui nécessitent un plan supérieur sont marqués avec un cadenas ❌
- Les services accessibles sont cliquables
- Les services verrouillés ne sont pas cliquables

### Tableau de comparaison (pricing.html)
Le tableau de comparaison est statique et montre correctement :
- ✓ pour les fonctionnalités disponibles dans chaque plan
- ✗ pour les fonctionnalités non disponibles
- Cela permet aux utilisateurs de voir ce qu'ils débloquent en passant à un plan supérieur

## Tests recommandés

1. **En mode production (avec Firebase)** :
   - Se connecter avec un compte gratuit
   - Vérifier que le dashboard affiche le bon nombre de tokens (50 + 1/jour)
   - Essayer de lancer une analyse SWOT (5 tokens) : devrait fonctionner
   - Essayer de lancer une analyse concurrentielle : devrait être bloqué (nécessite Pro)

2. **En mode démo (file://)** :
   - Vérifier que le dashboard affiche 50 tokens (par défaut pour le plan gratuit)
   - Après avoir lancé une analyse, vérifier que les tokens sont bien déduits
   - Vérifier que les services Pro/Entreprise sont visibles mais verrouillés

3. **Passer d'un plan à l'autre** :
   - En mode démo, simuler un changement de plan
   - Vérifier que les services verrouillés/déverrouillés changent correctement
