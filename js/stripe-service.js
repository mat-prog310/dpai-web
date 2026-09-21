// =============================================================================
// STRIPE-SERVICE.JS - Service de paiement via Payment Links
// Solution ULTRA-SIMPLE : les URLs sont intégrées directement dans ce fichier
// =============================================================================

// Références Firebase (exposées par firebase-config.js)
// db et authService sont définis globalement dans firebase-config.js

// =============================================================================
// CONFIGURATION DES PAYMENT LINKS (intégrée directement)
// MODIFIÉ : Payment Links LIVE - Mode PRODUCTION
// Créés via: https://dashboard.stripe.com/payment-links
// =============================================================================
const PAYMENT_LINKS = {
  // Packs de tokens
  discovery_link: "https://buy.stripe.com/cNi00k2zia4H8cD0FncV200",
  boost_link: "https://buy.stripe.com/9B63cw5Lua4HdwX2NvcV201",
  expert_link: "https://buy.stripe.com/eVq4gA4Hq1yb78zafXcV202",
  unique_report_link: "https://buy.stripe.com/3cIaEYgq86Sv8cD9bTcV203",
  
  // Abonnements
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
  // ACHAT D'UN ABONNEMENT (via Payment Link)
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
        await db.collection('users').doc(userId).update({
          plan: planId,
          subscriptionStartDate: new Date().toISOString(),
          subscriptionEndDate: null,
          tokenState: TokenManager.createTokenState(userId, planId)
        });
        return { success: true, isFree: true };
      }

      // Vérifier que l'utilisateur est connecté
      const user = authService.currentUser;
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Trouver le plan
      const plan = SubscriptionPlans.find(p => p.id === planId);
      if (!plan) {
        throw new Error(`Plan ${planId} introuvable.`);
      }

      // Récupérer l'URL du Payment Link
      const linkKey = `${planId}_${isAnnual ? 'annual' : 'monthly'}_link`;
      const paymentUrl = PAYMENT_LINKS[linkKey];
      
      if (!paymentUrl) {
        throw new Error(`Payment Link non trouvé pour ${planId} ${isAnnual ? 'annuel' : 'mensuel'}`);
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

      // Rediriger vers le Payment Link Stripe
      window.location.href = paymentUrl;
      
      return { success: true, redirected: true };

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
