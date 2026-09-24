// =============================================================================
// STRIPE-SERVICE.JS - Service de paiement via Payment Links
// Solution SIMPLE : utilise des Payment Links Stripe (pas besoin de backend)
// =============================================================================

// =============================================================================
// DÉFINITIONS GLOBALES AVEC FALLBACK (évite toute ReferenceError)
// =============================================================================
var SubscriptionPlans = window.SubscriptionPlans = window.SubscriptionPlans || {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
};

var SubscriptionPlansData = window.SubscriptionPlansData = window.SubscriptionPlansData || [
  { id: 'free',       name: 'Gratuit',    priceEuros: 0,      tokenLimit: 50,   bonusRate: 0.0  },
  { id: 'pro',        name: 'Pro',        priceEuros: 50.00,  tokenLimit: 500,  bonusRate: 0.20 },
  { id: 'enterprise', name: 'Enterprise', priceEuros: 300.00, tokenLimit: 5000, bonusRate: 0.30 }
];

var TokenPacks = window.TokenPacks = window.TokenPacks || [
  { id: 'discovery',     name: 'Découverte',    tokenAmount: 100, priceEuros: 12.00 },
  { id: 'boost',         name: 'Boost',         tokenAmount: 300, priceEuros: 30.00 },
  { id: 'expert',        name: 'Expert',        tokenAmount: 600, priceEuros: 55.00 },
  { id: 'unique_report', name: 'Rapport unique', tokenAmount: 250, priceEuros: 25.00 }
];

// =============================================================================
// CONFIGURATION DES PAYMENT LINKS STRIPE
// =============================================================================
// 1. Va sur https://dashboard.stripe.com/test/payment-links (TEST)
//    ou https://dashboard.stripe.com/payment-links (PRODUCTION)
// 2. Crée un Payment Link pour chaque produit
// 3. Copie les URLs ici
// =============================================================================
const PAYMENT_LINKS = {
  // Packs de tokens
  discovery:     "https://buy.stripe.com/cNi00k2zia4H8cD0FncV200",
  boost:         "https://buy.stripe.com/9B63cw5Lua4HdwX2NvcV201",
  expert:        "https://buy.stripe.com/eVq4gA4Hq1yb78zafXcV202",
  unique_report: "https://buy.stripe.com/3cIaEYgq86Sv8cD9bTcV203",

  // Abonnements
  pro_monthly:        "https://buy.stripe.com/dRm14o2zidgT0Kb1JrcV204",
  pro_annual:         "https://buy.stripe.com/28EdRa0ra3Gj64v5ZHcV205",
  enterprise_monthly: "https://buy.stripe.com/00wcN67TC0u778z5ZHcV206",
  enterprise_annual:  "https://buy.stripe.com/dRm00k8XG0u7csTbk1cV207"
};

// =============================================================================
// HELPER : récupère FieldValue de manière robuste (comme pour les token packs)
// =============================================================================
function getFieldValue() {
  if (window.firebaseDB && window.firebaseDB.FieldValue) return window.firebaseDB.FieldValue;
  if (window.firebase && firebase.firestore) return firebase.firestore.FieldValue;
  throw new Error('Firebase FieldValue introuvable');
}

// =============================================================================
// CLASSE STRIPE SERVICE
// =============================================================================
class StripeService {
  constructor() {
    console.log('%c💳 [Stripe] Utilise Payment Links - Pas besoin de backend', 'color: #6772e5; font-weight: bold;');
  }

  // Initialisation
  async init(publishableKey) {
    if (!publishableKey) {
      console.warn('%c⚠️ [Stripe] Aucune clé publique Stripe détectée', 'color: #ffc107;');
      return false;
    }

    if (publishableKey.startsWith('pk_test_')) {
      console.log('%c🧪 [Stripe] Mode TEST - Cartes de test autorisées', 'color: #28a745; font-weight: bold;');
    } else if (publishableKey.startsWith('pk_live_')) {
      console.log('%c✅ [Stripe] Mode PRODUCTION - Paiements réels', 'color: #28a745;');
    }

    return true;
  }

  // ===========================================================================
  // ACHAT DE PACKS DE TOKENS (via Payment Link) - FONCTIONNE
  // ===========================================================================
  async purchaseTokenPack(packId, userId) {
    try {
      const pack = TokenPacks.find(p => p.id === packId);
      if (!pack) {
        throw new Error('Pack de tokens introuvable');
      }

      // Pack gratuit (0€)
      if (pack.priceEuros === 0) {
        const FieldValue = getFieldValue();
        await db.collection('users').doc(userId).update({
          'tokenState.availableTokens': FieldValue.increment(pack.tokenAmount),
          'tokenState.totalTokens': FieldValue.increment(pack.tokenAmount)
        });
        if (typeof loadUserTokenData === 'function') {
          await loadUserTokenData(userId);
        }
        return { success: true, isFree: true };
      }

      // Vérifier que l'utilisateur est connecté
      const user = authService.currentUser;
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Récupérer l'URL du Payment Link
      const paymentUrl = PAYMENT_LINKS[packId];

      if (!paymentUrl) {
        throw new Error(`Payment Link non configuré pour ${packId}. Configure PAYMENT_LINKS dans stripe-service.js`);
      }

      // Stocker l'intention d'achat dans Firestore
      const FieldValue = getFieldValue();
      await db.collection('pending_purchases').doc(user.uid).set({
        userId: user.uid,
        packId: packId,
        tokenAmount: pack.tokenAmount,
        type: 'token_pack',
        createdAt: FieldValue.serverTimestamp(),
        status: 'pending'
      });

      // Rediriger vers Stripe
      window.location.href = paymentUrl;
      return { success: true, redirected: true };

    } catch (error) {
      console.error('Erreur achat pack tokens:', error);
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // ACHAT D'UN ABONNEMENT (via Payment Link) - MÊME LOGIQUE QUE TOKEN PACK
  // ===========================================================================
  async purchaseSubscription(planId, userId, isAnnual = false) {
    try {
      const plan = SubscriptionPlansData.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Plan introuvable');
      }

      // Plan gratuit (0€) - activation directe, pas de paiement
      if (plan.priceEuros === 0) {
        const baseTokens = plan.tokenLimit;
        const bonusTokens = Math.floor(baseTokens * plan.bonusRate);
        const welcomeBonus = 10;

        await db.collection('users').doc(userId).update({
          plan: planId,
          subscriptionStartDate: new Date().toISOString(),
          subscriptionEndDate: null,
          tokenState: {
            userId: userId,
            plan: planId,
            baseTokens: baseTokens,
            bonusTokens: bonusTokens,
            totalTokens: baseTokens + bonusTokens + welcomeBonus,
            usedTokens: 0,
            availableTokens: baseTokens + bonusTokens + welcomeBonus,
            lastTokenUpdate: new Date().toISOString(),
            firstAnalysisDone: false,
            monthlyTokensUsed: 0,
            lastMonthlyReset: new Date().toISOString()
          }
        });

        if (typeof loadUserTokenData === 'function') {
          await loadUserTokenData(userId);
        }

        return { success: true, isFree: true };
      }

      // Vérifier que l'utilisateur est connecté
      const user = authService.currentUser;
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Récupérer l'URL du Payment Link (même logique que token pack)
      const linkKey = isAnnual ? `${planId}_annual` : `${planId}_monthly`;
      const paymentUrl = PAYMENT_LINKS[linkKey];

      if (!paymentUrl) {
        throw new Error(`Payment Link non configuré pour ${linkKey}. Configure PAYMENT_LINKS dans stripe-service.js`);
      }

      // Stocker l'intention d'abonnement dans Firestore
      const FieldValue = getFieldValue();
      await db.collection('pending_purchases').doc(user.uid).set({
        userId: user.uid,
        planId: planId,
        isAnnual: isAnnual,
        type: 'subscription',
        createdAt: FieldValue.serverTimestamp(),
        status: 'pending'
      });

      // Rediriger vers Stripe
      window.location.href = paymentUrl;
      return { success: true, redirected: true };

    } catch (error) {
      console.error('Erreur achat abonnement:', error);
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // FONCTIONS UTILITAIRES
  // ===========================================================================

  handleCardError(error) {
    const errorElement = document.getElementById('card-errors');
    if (errorElement) {
      errorElement.textContent = error.message;
    }
  }

  clearErrors() {
    const errorElement = document.getElementById('card-errors');
    if (errorElement) {
      errorElement.textContent = '';
    }
  }

  getCustomerName() {
    const user = authService.currentUser;
    if (user && user.displayName) {
      return user.displayName;
    }
    return 'Client DPAI';
  }
}

// Instance singleton
const stripeService = new StripeService();            bonusTokens: bonusTokens,
            totalTokens: baseTokens + bonusTokens + welcomeBonus,
            usedTokens: 0,
            availableTokens: baseTokens + bonusTokens + welcomeBonus,
            lastTokenUpdate: new Date().toISOString(),
            firstAnalysisDone: false,
            monthlyTokensUsed: 0,
            lastMonthlyReset: new Date().toISOString()
          }
        });
        return { success: true, isFree: true };
      }

      // Vérifier que l'utilisateur est connecté
      const user = authService.currentUser;
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Récupérer l'URL du Payment Link
      const linkKey = isAnnual ? `${planId}_annual` : `${planId}_monthly`;
      const paymentUrl = PAYMENT_LINKS[linkKey];
      
      if (!paymentUrl) {
        throw new Error(`Payment Link non configuré pour ${linkKey}. Configure PAYMENT_LINKS dans stripe-service.js`);
      }

      // Stocker l'intention d'abonnement dans Firestore
      await db.collection('pending_purchases').doc(user.uid).set({
        userId: user.uid,
        planId: planId,
        isAnnual: isAnnual,
        type: 'subscription',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'pending'
      });

      // Rediriger vers Stripe
      window.location.href = paymentUrl;
      return { success: true, redirected: true };

    } catch (error) {
      console.error('Erreur achat abonnement:', error);
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // FONCTIONS UTILITAIRES
  // ===========================================================================
  
  handleCardError(error) {
    const errorElement = document.getElementById('card-errors');
    if (errorElement) {
      errorElement.textContent = error.message;
    }
  }

  clearErrors() {
    const errorElement = document.getElementById('card-errors');
    if (errorElement) {
      errorElement.textContent = '';
    }
  }

  getCustomerName() {
    const user = authService.currentUser;
    if (user && user.displayName) {
      return user.displayName;
    }
    return 'Client DPAI';
  }
}

// Instance singleton
const stripeService = new StripeService();
