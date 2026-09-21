# Guide de Test Stripe pour DPAI

## ⚠️ CORRECTION IMPORTANTE

**Les Payment Links de test utilisent aussi `buy.stripe.com`** (pas `buy.stripe.test`).
La différence entre TEST et PRODUCTION est :
- **TEST** : Les Payment Links sont créés dans https://dashboard.stripe.com/**test**/payment-links
- **PRODUCTION** : Les Payment Links sont créés dans https://dashboard.stripe.com/payment-links

## Configuration Actuelle

### Ce qui a été modifié :

1. **`js/stripe-service.js`** : Les Payment Links sont marquées comme devant être remplacées par tes URLs TEST
2. **`js/firebase-config.js`** : La clé publique Stripe est déjà en mode test (`pk_test_...`)

## Comment Tester avec des Cartes de Test Stripe

### Cartes de test valides :

| Numéro de carte | Description |
|----------------|-------------|
| `4242 4242 4242 4242` | Visa - Succès |
| `5555 5555 5555 4444` | Mastercard - Succès |
| `4000 0000 0000 3220` | Visa - 3D Secure requis |
| `4000 0025 0000 3155` | Visa - Échec (fonds insuffisants) |

### Dates et CVC :
- **Date d'expiration** : n'importe quelle date future (ex: 12/30)
- **CVC** : n'importe quel 3 chiffres (ex: 123)

## 🚀 POUR TESTER MAINTENANT (Méthode Recommandée)

### 1. Crée tes Payment Links dans le Dashboard TEST

1. Va sur : https://dashboard.stripe.com/test/payment-links
2. Clique sur "Créer un Payment Link"
3. Crée un Payment Link pour chaque produit avec les montants appropriés

### 2. OU utilise le script automatique

```bash
cd /c/dev/dpai_clean/dpai_web
node create-test-payment-links.js
```
- Quand demandé, entre ta **clé secrète TEST** (commence par `sk_test_...`)
- Le script va créer automatiquement tous les produits, prix et Payment Links dans ton compte TEST
- Il générera un fichier `js/payment-links-config.js` avec les bonnes URLs

### 3. Copie les URLs dans stripe-service.js

Remplace les `https://buy.stripe.com/test_XXXXXXXXXXXXXX` dans `stripe-service.js` par tes vraies URLs de Payment Links TEST.

## Basculer entre TEST et PRODUCTION

### Pour passer en PRODUCTION :
1. Dans `js/stripe-service.js` : remplace les URLs par tes Payment Links créés dans https://dashboard.stripe.com/payment-links
2. Dans `js/firebase-config.js` : remplace la clé par ta `pk_live_...`
3. Utilise des cartes réelles (pas de test)

### Pour revenir en TEST :
1. Dans `js/stripe-service.js` : utilise des Payment Links créés dans https://dashboard.stripe.com/test/payment-links
2. Dans `js/firebase-config.js` : utilise ta clé `pk_test_...`

## Problèmes courants

- **Carte refusée** : Si tu utilises une carte de test (4242...) en production, ça échouera toujours. Vérifie que tes Payment Links sont bien en mode TEST.
- **Payment Link invalide** : Les Payment Links TEST ne fonctionnent qu'avec des clés TEST. Vérifie ta `stripePublishableKey`.
- **3D Secure** : Certaines cartes de test déclenchent 3D Secure. Utilise `4242 4242 4242 4242` pour éviter ça.

## Documentation Stripe
- Cartes de test : https://stripe.com/docs/testing#cards
- Payment Links TEST : https://dashboard.stripe.com/test/payment-links
