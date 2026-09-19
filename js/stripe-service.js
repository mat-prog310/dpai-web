// =============================================================================
// STRIPE-SERVICE.JS - Service de paiement Stripe
// =============================================================================

// Références Firebase (exposées par firebase-config.js)
// db est défini globalement dans firebase-config.js

class StripeService {
  constructor() {
    this.stripe = null;
    this.elements = null;
    this.cardElement = null;
    this.paymentIntent = null;
    this.stripeInstance = null; // Instance Stripe pour redirectToCheckout
  }

  // Initialisation de Stripe
  async init(publishableKey) {
    if (this.stripe) return;
    
    const key = publishableKey || window.stripePublishableKey;
    if (!key || key === 'pk_test_VOTRE_CLE_STRIPE') {
      console.error('Stripe publishable key non configurée. Ajoutez votre clé dans firebase-config.js');
      return;
    }
    
    this.stripe = Stripe(key);
    this.stripeInstance = this.stripe;
    this.elements = this.stripe.elements();
    
    // Créer l'élément de carte
    const style = {
      base: {
        color: '#32325d',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4'
        }
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    };
    
    this.cardElement = this.elements.create('card', { style: style });
  }

  // Monter l'élément de carte
  mountCardElement(elementId) {
    if (this.cardElement) {
      this.cardElement.mount(`#${elementId}`);
    }
  }

  // Démontage
  unmountCardElement() {
    if (this.cardElement) {
      this.cardElement.unmount();
    }
  }

  // Paiement pour un pack de tokens
  async purchaseTokenPack(packId, userId) {
    try {
      const pack = TokenPacks.find(p => p.id === packId);
      if (!pack) {
        throw new Error('Pack de tokens introuvable');
      }
      
      // Plan gratuit (0 tokens à acheter)
      if (pack.priceEuros === 0) {
        const FieldValue = (window.firebaseDB || firebase.firestore()).FieldValue;
        await db.collection('users').doc(userId).update({
          'tokenState.availableTokens': FieldValue.increment(pack.tokenAmount),
          'tokenState.totalTokens': FieldValue.increment(pack.tokenAmount)
        });
        await loadUserTokenData(userId);
        return { success: true, isFree: true };
      }
      
      // Redirection vers Stripe Checkout
      const user = authService.currentUser;
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }
      
      // Note: Pour utiliser redirectToCheckout, vous devez configurer vos Price IDs dans Stripe Dashboard
      // Remplacez 'VOTRE_PRICE_ID_PACK_XXX' par vos vrais Price IDs
      const priceId = this.getPriceIdForPack(packId);
      
      if (!priceId) {
        throw new Error(`Price ID non configuré pour le pack ${packId}`);
      }
      
      const stripe = this.stripeInstance || Stripe(window.stripePublishableKey);
      const result = await stripe.redirectToCheckout({
        lineItems: [{ price: priceId, quantity: 1 }],
        mode: 'payment',
        successUrl: `${window.location.origin}/token-shop.html?success=true&packId=${packId}&session_id={CHECKOUT_SESSION_ID}&userId=${userId}`,
        cancelUrl: `${window.location.origin}/token-shop.html?canceled=true`,
        customerEmail: user.email,
        clientReferenceId: `${userId}-${packId}`
      });
      
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      
      return { success: true, redirected: true };
      
    } catch (error) {
      console.error('Erreur achat pack tokens:', error);
      return { success: false, error: error.message };
    }
  }

  // Paiement pour un abonnement
  async purchaseSubscription(planId, userId) {
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
      
      // Redirection vers Stripe Checkout
      const user = authService.currentUser;
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }
      
      // Note: Pour utiliser redirectToCheckout, vous devez configurer vos Price IDs dans Stripe Dashboard
      // Remplacez 'VOTRE_PRICE_ID_PRO' et 'VOTRE_PRICE_ID_ENTERPRISE' par vos vrais Price IDs
      const priceId = this.getPriceIdForPlan(planId);
      
      if (!priceId) {
        throw new Error(`Price ID non configuré pour le plan ${planId}`);
      }
      
      const stripe = this.stripeInstance || Stripe(window.stripePublishableKey);
      const result = await stripe.redirectToCheckout({
        lineItems: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        successUrl: `${window.location.origin}/pricing.html?success=true&planId=${planId}&session_id={CHECKOUT_SESSION_ID}&userId=${userId}`,
        cancelUrl: `${window.location.origin}/pricing.html?canceled=true`,
        customerEmail: user.email,
        clientReferenceId: `${userId}-${planId}`
      });
      
      if (result.error) {
        return { success: false, error: result.error.message };
      }
      
      return { success: true, redirected: true };
      
    } catch (error) {
      console.error('Erreur achat abonnement:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtenir le Price ID pour un plan d'abonnement
  getPriceIdForPlan(planId) {
    const planPriceIds = {
      pro: 'VOTRE_PRICE_ID_PRO',
      enterprise: 'VOTRE_PRICE_ID_ENTERPRISE'
    };
    return planPriceIds[planId];
  }

  // Obtenir le Price ID pour un pack de tokens
  getPriceIdForPack(packId) {
    const packPriceIds = {
      discovery: 'VOTRE_PRICE_ID_DISCOVERY',
      boost: 'VOTRE_PRICE_ID_BOOST',
      expert: 'VOTRE_PRICE_ID_EXPERT',
      unique_report: 'VOTRE_PRICE_ID_UNIQUE_REPORT',
      // Anciennes clés pour compatibilité
      pack_100: 'VOTRE_PRICE_ID_PACK_100',
      pack_500: 'VOTRE_PRICE_ID_PACK_500',
      pack_1000: 'VOTRE_PRICE_ID_PACK_1000'
    };
    return packPriceIds[packId];
  }

  // Gérer les erreurs de carte
  handleCardError(error) {
    const errorElement = document.getElementById('card-errors');
    if (errorElement) {
      errorElement.textContent = error.message;
    }
  }

  // Effacer les erreurs
  clearErrors() {
    const errorElement = document.getElementById('card-errors');
    if (errorElement) {
      errorElement.textContent = '';
    }
  }

  // Récupérer le nom du client
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
