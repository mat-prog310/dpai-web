// =============================================================================
// STRIPE-SERVICE.JS - Service de paiement via Payment Links
// Solution ULTRA-SIMPLE : les URLs sont intégrées directement dans ce fichier
// =============================================================================

// Références Firebase (exposées par firebase-config.js)
// db et authService sont définis globalement dans firebase-config.js

// =============================================================================
// CONSTANTES DES PLANS (pour éviter les dépendances externes)
// =============================================================================
const SubscriptionPlans = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
};

// Exposer globalement pour les autres fichiers
window.SubscriptionPlans = SubscriptionPlans;

// =============================================================================
// CONFIGURATION DES PRICE IDs STRIPE
// =============================================================================
const STRIPE_PRICE_IDS = {
  // Abonnements avec tarifs mensuels et annuels
  pro: {
    monthly: 'price_1UHRbdKEd7fefQpsBl8qSJgF',
    annual: 'price_1UHRbeKEd7fefQpsDwenwZFc'
  },
  enterprise: {
    monthly: 'price_1UHRbfKEd7fefQpsTIdk1WEV',
    annual: 'price_1UHRbfKEd7fefQpsGOWXqN6F'
  }
};

// =============================================================================
// CONFIGURATION DES PAYMENT LINKS (pour les packs de tokens ET abonnements)
// MODIFIÉ : Payment Links LIVE - Mode PRODUCTION
// Créés via: https://dashboard.stripe.com/payment-links
// =============================================================================
const PAYMENT_LINKS = {
  // Packs de tokens
  discovery_link: "https://buy.stripe.com/cNi00k2zia4H8cD0FncV200",
  boost_link: "https://buy.stripe.com/9B63cw5Lua4HdwX2NvcV201",
  expert_link: "https://buy.stripe.com/eVq4gA4Hq1yb78zafXcV202",
  unique_report_link: "https://buy.stripe.com/3cIaEYgq86Sv8cD9bTcV203",
  
  // Abonnements (méthode Payment Links - compatible avec l'ancien système)
  pro_monthly_link: "https://buy.stripe.com/dRm14o2zidgT0Kb1JrcV204",
  pro_annual_link: "https://buy.stripe.com/28EdRa0ra3Gj64v5ZHcV205",
  enterprise_monthly_link: "https://buy.stripe.com/00wcN67TC0u778z5ZHcV206",
  enterprise_annual_link: "https://buy.stripe.com/dRm00k8XG0u7csTbk1cV207"
};

class StripeService {
  constructor() {
    // Utilisation des Payment Links Stripe - fonctionne parfaitement sur mobile
    console.log('%c💳 [Stripe] Mode PRODUCTION: Utilise des Payment Links LIVE', 'color: #28a745; font-weight: bold;');
    console.log('%c💳 [Stripe] Paiements réels activés - Cartes de test seront refusées', 'color: #28a745;');
  }

  // Initialisation simplifiée
  async init(publishableKey) {
    // Vérification du mode
    if (publishableKey && publishableKey.startsWith('pk_test_')) {
      console.warn('%c⚠️ [Stripe] ATTENTION: Clé TEST détectée! Passez en LIVE pour les paiements réels!', 'color: #dc3545; font-weight: bold;');
    } else if (publishableKey && publishableKey.startsWith('pk_live_')) {
      console.log('%c✅ [Stripe] Clé PRODUCTION détectée - Paiements réels activés', 'color: #28a745;');
    } else {
      console.warn('%c⚠️ [Stripe] Aucune clé publique Stripe détectée', 'color: #ffc107;');
    }
    return true;
  }

  // ===========================================================================
  // ACHAT DE PACKS DE TOKENS (via Payment Link)
  // ===========================================================================
  async purchaseTokenPack(packId, userId) {
    try {
      // Définition locale des packs de tokens (évite la dépendance externe)
      const TokenPacks = [
        { id: 'discovery', name: 'Découverte', tokenAmount: 100, priceEuros: 12.00 },
        { id: 'boost', name: 'Boost', tokenAmount: 300, priceEuros: 30.00 },
        { id: 'expert', name: 'Expert', tokenAmount: 600, priceEuros: 55.00 },
        { id: 'unique_report', name: 'Rapport unique', tokenAmount: 250, priceEuros: 25.00 }
      ];
      
      const pack = TokenPacks.find(p => p.id === packId);
      if (!pack) {
        throw new Error('Pack de tokens introuvable');
      }

      // Pack gratuit (0€)
      if (pack.priceEuros === 0) {
        const FieldValue = (window.firebaseDB || firebase.firestore()).FieldValue;
        await db.collection('users').doc(userId).update({
          'tokenState.availableTokens': FieldValue.increment(pack.tokenAmount),
          'tokenState.totalTokens': FieldValue.increment(pack.tokenAmount)
        });
        await loadUserTokenData(userId);
        return { success: true, isFree: true };
      }

      // Vérifier que l'utilisateur est connecté
      const user = authService.currentUser;
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Récupérer l'URL du Payment Link pour ce pack
      const linkKey = `${packId}_link`;
      const paymentUrl = PAYMENT_LINKS[linkKey];
      
      if (!paymentUrl) {
        throw new Error(`Payment Link non trouvé pour le pack ${packId}`);
      }

      // Stocker l'intention d'achat dans Firestore
      await db.collection('pending_purchases').doc(user.uid).set({
        userId: user.uid,
        packId: packId,
        tokenAmount: pack.tokenAmount,
        type: 'token_pack',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'pending'
      });

      // Rediriger vers le Payment Link Stripe
      window.location.href = paymentUrl;
      
      return { success: true, redirected: true };

    } catch (error) {
      console.error('Erreur achat pack tokens:', error);
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // ACHAT D'UN ABONNEMENT (méthode hybride : Price IDs OU Payment Links)
  // ===========================================================================
  async purchaseSubscription(planId, userId, isAnnual = false) {
    try {
      const planPrices = {
        free: 0,
        pro: 50.00,
        enterprise: 300.00
      };
      
      const price = planPrices[planId];
      if (price === undefined) {
        throw new Error('Plan introuvable');
      }

      // Plan gratuit
      if (price === 0) {
        // Créer le tokenState manuellement (sans dépendre de TokenManager qui n'existe pas dans le backend)
        const tokenLimits = { free: 50, pro: 500, enterprise: 5000 };
        const tokenBonuses = { free: 0.0, pro: 0.20, enterprise: 0.30 };
        const baseTokens = tokenLimits[planId] || tokenLimits.free;
        const bonusTokens = Math.floor(baseTokens * (tokenBonuses[planId] || 0));
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
        return { success: true, isFree: true };
      }

      // Vérifier que l'utilisateur est connecté
      const user = authService.currentUser;
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // ================================================================
      // MÉTHODE HYBRIDE : Price IDs (prioritaire) OU Payment Links (fallback)
      // ================================================================
      const priceId = STRIPE_PRICE_IDS[planId]?.[isAnnual ? 'annual' : 'monthly'];
      const linkKey = `${planId}_${isAnnual ? 'annual' : 'monthly'}_link`;
      const paymentUrl = PAYMENT_LINKS[linkKey];
      
      if (priceId) {
        // ===== NOUVELLE MÉTHODE : Checkout Sessions avec Price IDs =====
        // Stocker l'intention d'abonnement dans Firestore
        await db.collection('pending_purchases').doc(user.uid).set({
          userId: user.uid,
          planId: planId,
          priceId: priceId,
          isAnnual: isAnnual,
          type: 'subscription',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          status: 'pending'
        });

        // Créer une session Checkout via Cloud Function
        const functions = firebase.functions();
        const createSession = functions.httpsCallable('createStripeCheckoutSession');
        
        const result = await createSession({
          userId: user.uid,
          priceId: priceId,
          planId: planId,
          isAnnual: isAnnual,
          successUrl: `${window.location.origin}/pricing.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/pricing.html?canceled=true&session_id={CHECKOUT_SESSION_ID}`
        });

        if (result.data.success && result.data.sessionId) {
          // Rediriger vers Stripe Checkout
          const stripe = Stripe(window.stripePublishableKey || 'pk_live_51TaGALKEd7fefQpsxCOkbQw5qkmOorwI9UbdKv2TBeLzSouvPbaRdusfCVVCVb5YwqUdWgkm1qvqh6nq4PnPy1FB00jvv10lRc');
          await stripe.redirectToCheckout({ sessionId: result.data.sessionId });
          return { success: true, redirected: true };
        } else {
          throw new Error(result.data.error || 'Impossible de créer la session de paiement');
        }
      } else if (paymentUrl) {
        // ===== ANCIENNE MÉTHODE : Payment Links (fallback) =====
        // Stocker l'intention d'abonnement dans Firestore
        await db.collection('pending_purchases').doc(user.uid).set({
          userId: user.uid,
          planId: planId,
          isAnnual: isAnnual,
          type: 'subscription',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          status: 'pending'
        });

        // Rediriger vers le Payment Link Stripe
        window.location.href = paymentUrl;
        return { success: true, redirected: true };
      } else {
        throw new Error(`Aucune méthode de paiement disponible pour ${planId} ${isAnnual ? 'annuel' : 'mensuel'}`);
      }

    } catch (error) {
      console.error('Erreur achat abonnement:', error);
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // FONCTIONS UTILITAIRES (conservées pour compatibilité)
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
