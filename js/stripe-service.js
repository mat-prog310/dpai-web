// =============================================================================
// STRIPE-SERVICE.JS - VERSION CORRIGÉE (25/09/2026)
// =============================================================================

// =============================================================================
// DÉFINITIONS GLOBALES AVEC FALLBACK
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
  { id: 'discovery',     name: 'Découverte',     tokenAmount: 100, priceEuros: 12.00 },
  { id: 'boost',         name: 'Boost',          tokenAmount: 300, priceEuros: 30.00 },
  { id: 'expert',        name: 'Expert',         tokenAmount: 600, priceEuros: 55.00 },
  { id: 'unique_report', name: 'Rapport unique', tokenAmount: 250, priceEuros: 25.00 }
];

// =============================================================================
// HELPERS
// =============================================================================
function getFieldValue() {
  if (window.firebaseDB && window.firebaseDB.FieldValue) return window.firebaseDB.FieldValue;
  if (window.firebase && firebase.firestore) return firebase.firestore.FieldValue;
  throw new Error('Firebase FieldValue introuvable');
}

function getPaymentLink(key) {
  const links = window.PAYMENT_LINKS || {};
  return links[key + '_link'] || links[key] || null;
}

/**
 * Construit l'URL finale avec client_reference_id + prefilled_email
 */
function buildPaymentUrl(baseUrl, data) {
  const params = [];
  const ref = encodeURIComponent(JSON.stringify(data));
  params.push('client_reference_id=' + ref);
  if (data.email) {
    params.push('prefilled_email=' + encodeURIComponent(data.email));
  }
  const separator = baseUrl.includes('?') ? '&' : '?';
  return baseUrl + separator + params.join('&');
}

// =============================================================================
// CLASSE STRIPE SERVICE
// =============================================================================
class StripeService {
  constructor() {
    console.log('%c💳 [Stripe] Service initialisé - Payment Links', 'color: #6772e5; font-weight: bold;');
  }

  async init(publishableKey) {
    if (!publishableKey) {
      console.warn('%c⚠️ [Stripe] Aucune clé publique détectée', 'color: #ffc107;');
      return false;
    }
    if (publishableKey.startsWith('pk_test_')) {
      console.log('%c🧪 [Stripe] Mode TEST activé', 'color: #28a745; font-weight: bold;');
    } else if (publishableKey.startsWith('pk_live_')) {
      console.log('%c✅ [Stripe] Mode PRODUCTION activé', 'color: #28a745;');
    }
    return true;
  }

  // ===========================================================================
  // ACHAT DE PACKS DE TOKENS - CORRIGÉ
  // ===========================================================================
  async purchaseTokenPack(packId, userId) {
    try {
      const pack = TokenPacks.find(p => p.id === packId);
      if (!pack) throw new Error('Pack de tokens introuvable');

      // Pack gratuit - Traiter immédiatement
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

      // Pack payant - Créer document et rediriger
      const user = authService.currentUser;
      if (!user) throw new Error('Utilisateur non connecté');

      const paymentUrl = getPaymentLink(packId);
      if (!paymentUrl) {
        throw new Error(`Payment Link non configuré pour ${packId}. Vérifie js/payment-links-config.js`);
      }

      const FieldValue = getFieldValue();

      // ✅ CORRECTION: Utilise .add() pour créer un document UNIQUE
      const purchaseRef = await db.collection('purchases').add({
        userId: user.uid,
        packId: packId,
        tokenAmount: pack.tokenAmount,
        type: 'token_pack',
        status: 'pending',
        stripeSessionId: null,
        stripePaymentIntentId: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      // ✅ CORRECTION: Ajoute purchaseId pour le webhook
      const finalUrl = buildPaymentUrl(paymentUrl, {
        userId: user.uid,
        packId: packId,
        tokenAmount: pack.tokenAmount, // Ajout pour le webhook
        type: 'token_pack',
        purchaseId: purchaseRef.id, // ⬅️ CRITIQUE
        email: user.email || ''
      });

      console.log('🔗 [Stripe] Redirection vers:', finalUrl);
      window.location.href = finalUrl;
      return { success: true, redirected: true, purchaseId: purchaseRef.id };

    } catch (error) {
      console.error('❌ [Stripe] Erreur achat pack tokens:', error);
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // ACHAT D'UN ABONNEMENT - CORRIGÉ
  // ===========================================================================
  async purchaseSubscription(planId, userId, isAnnual) {
    if (isAnnual === undefined) isAnnual = false;

    try {
      const plan = SubscriptionPlansData.find(p => p.id === planId);
      if (!plan) throw new Error('Plan introuvable');

      // Plan gratuit - Traiter immédiatement
      if (plan.priceEuros === 0) {
        const baseTokens = plan.tokenLimit;
        const bonusTokens = Math.floor(baseTokens * plan.bonusRate);
        const welcomeBonus = 10;

        await db.collection('users').doc(userId).update({
          plan: planId,
          subscriptionStartDate: new Date().toISOString(),
          subscriptionEndDate: null,
          hasAccessToPremiumSuggestions: planId === 'pro' || planId === 'enterprise',
          hasAccessToAdvancedAnalytics: planId === 'pro' || planId === 'enterprise',
          hasAccessToAPI: planId === 'enterprise',
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

      // Plan payant - Créer document et rediriger
      const user = authService.currentUser;
      if (!user) throw new Error('Utilisateur non connecté');

      const linkKey = isAnnual ? (planId + '_annual') : (planId + '_monthly');
      const paymentUrl = getPaymentLink(linkKey);
      if (!paymentUrl) {
        throw new Error(`Payment Link non configuré pour ${linkKey}. Vérifie js/payment-links-config.js`);
      }

      const FieldValue = getFieldValue();

      // ✅ CORRECTION: Utilise .add() pour créer un document UNIQUE
      const purchaseRef = await db.collection('purchases').add({
        userId: user.uid,
        planId: planId,
        isAnnual: isAnnual,
        type: 'subscription',
        status: 'pending',
        stripeSessionId: null,
        stripePaymentIntentId: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });

      // ✅ CORRECTION: Ajoute purchaseId pour le webhook
      const finalUrl = buildPaymentUrl(paymentUrl, {
        userId: user.uid,
        planId: planId,
        isAnnual: isAnnual,
        type: 'subscription',
        purchaseId: purchaseRef.id, // ⬅️ CRITIQUE
        email: user.email || ''
      });

      console.log('🔗 [Stripe] Redirection vers:', finalUrl);
      window.location.href = finalUrl;
      return { success: true, redirected: true, purchaseId: purchaseRef.id };

    } catch (error) {
      console.error('❌ [Stripe] Erreur achat abonnement:', error);
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // FONCTIONS UTILITAIRES
  // ===========================================================================
  handleCardError(error) {
    const el = document.getElementById('card-errors');
    if (el) el.textContent = error.message;
  }

  clearErrors() {
    const el = document.getElementById('card-errors');
    if (el) el.textContent = '';
  }

  getCustomerName() {
    const user = authService.currentUser;
    return user && user.displayName ? user.displayName : 'Client DPAI';
  }
}

// =============================================================================
// EXPOSITION GLOBALE
// =============================================================================
window.stripeService = new StripeService();
var stripeService = window.stripeService;
console.log('%c💳 [stripe-service.js] Service exposé en global - Prêt !', 'color: #6772e5; font-weight: bold;');
