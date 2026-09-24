// functions/index.js
const functions = require('firebase-functions');
const stripe = require('stripe');
const admin = require('firebase-admin');

// ===========================================================================
// INITIALISATION
// ===========================================================================
admin.initializeApp();
const stripeClient = stripe(functions.config().stripe.secret);

// ===========================================================================
// CONFIGURATION DES PLANS (centralisée)
// ===========================================================================
const PLANS = {
  free: {
    tokens: 50,
    tokenPerDay: 1,
    features: [
      'Analyse SWOT (limitée)',
      'Porter 5 Forces (limitée)',
      'PESTEL (limitée)',
      '2GB stockage',
      '3 projets max'
    ],
    allowedAnalyses: ['swot', 'porter', 'pestel'],
    maxProjects: 3,
    storageLimit: '2GB',
    isPremium: false,
    hasUnlimitedAnalyses: false,
    hasAdvancedAnalyses: false,
    canExportPDF: false
  },
  pro: {
    tokens: 500,
    tokenPerDay: 1,
    features: [
      'Analyse SWOT (complète)',
      'Porter 5 Forces (complète)',
      'PESTEL (complète)',
      'Analyse Concurrentielle',
      'Rapports détaillés',
      'Export PDF',
      'Support prioritaire',
      '50GB stockage',
      'Projets illimités'
    ],
    allowedAnalyses: ['swot', 'porter', 'pestel', 'competitive', 'report'],
    maxProjects: null, // Illimité
    storageLimit: '50GB',
    isPremium: true,
    hasUnlimitedAnalyses: true,
    hasAdvancedAnalyses: false,
    canExportPDF: true
  },
  enterprise: {
    tokens: 5000,
    tokenPerDay: 1,
    features: [
      'Analyse SWOT (complète)',
      'Porter 5 Forces (complète)',
      'PESTEL (complète)',
      'Analyse Concurrentielle',
      'Rapports détaillés',
      'Matrice d\'intégration',
      'Simulateur de négociation',
      'Export PDF',
      'Support 24/7',
      'Accès API complet',
      'Formation incluse',
      'Stockage illimité',
      'Projets illimités'
    ],
    allowedAnalyses: ['swot', 'porter', 'pestel', 'competitive', 'report', 'integration_matrix', 'negotiation_simulator'],
    maxProjects: null, // Illimité
    storageLimit: 'Illimité',
    isPremium: true,
    hasUnlimitedAnalyses: true,
    hasAdvancedAnalyses: true,
    canExportPDF: true,
    hasAPIAccess: true
  }
};

// ===========================================================================
// FONCTION POUR CONFIRMER UN ACHAT APRÈS RETOUR DE STRIPE
// Appelée par le frontend quand l'utilisateur revient de Stripe
// ===========================================================================
exports.confirmPurchase = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Utilisateur non authentifié');
  }

  const { userId, sessionId, pendingData } = data;
  const uid = context.auth.uid;

  // Vérifier que l'utilisateur correspond
  if (userId && userId !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'Utilisateur non autorisé');
  }

  try {
    // Récupérer la session Stripe
    const session = await stripeClient.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      return { success: false, error: 'Paiement non effectué' };
    }

    // Récupérer les données en attente depuis Firestore si non fournies
    let finalPendingData = pendingData;
    if (!finalPendingData) {
      const pendingDoc = await admin.firestore().collection('pending_purchases').doc(uid).get();
      if (pendingDoc.exists) {
        finalPendingData = pendingDoc.data();
      }
    }

    // Si on a des données en attente (stockées avant la redirection)
    if (finalPendingData) {
      if (finalPendingData.type === 'token_pack') {
        await admin.firestore().collection('users').doc(uid).update({
          'tokenState.availableTokens': admin.firestore.FieldValue.increment(finalPendingData.tokenAmount),
          'tokenState.totalTokens': admin.firestore.FieldValue.increment(finalPendingData.tokenAmount),
          lastTokenPurchase: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Nettoyer les données en attente
        await admin.firestore().collection('pending_purchases').doc(uid).delete();
        
        console.log(`✅ Tokens crédités: +${finalPendingData.tokenAmount} pour ${uid} (pack: ${finalPendingData.packId})`);
        return { success: true, type: 'token_pack' };
      }
      
      if (finalPendingData.type === 'subscription') {
        const plan = PLANS[finalPendingData.planId];
        if (!plan) {
          return { success: false, error: 'Plan invalide' };
        }
        
        // Vérifier si l'abonnement est déjà actif (traité par le webhook)
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          // Vérifier si l'utilisateur a déjà ce plan actif
          if (userData.plan === finalPendingData.planId && 
              userData.subscriptionStartDate) {
            // Vérifier si la date d'expiration est dans le futur
            const now = new Date();
            const endDate = userData.subscriptionEndDate?.toDate ? userData.subscriptionEndDate.toDate() : new Date(userData.subscriptionEndDate);
            if (endDate > now) {
              // Abonnement déjà activé et valide
              console.log(`ℹ️ Abonnement déjà activé pour ${uid} (plan: ${finalPendingData.planId}, expire: ${endDate})`);
              await admin.firestore().collection('pending_purchases').doc(uid).delete();
              return { success: true, type: 'subscription', planId: finalPendingData.planId, alreadyActive: true };
            }
          }
        }
        
        // Copier toutes les propriétés du plan vers l'utilisateur
        await admin.firestore().collection('users').doc(uid).update({
          plan: finalPendingData.planId,
          isPremium: plan.isPremium,
          features: plan.features,
          allowedAnalyses: plan.allowedAnalyses,
          maxProjects: plan.maxProjects,
          storageLimit: plan.storageLimit,
          tokenPerDay: plan.tokenPerDay,
          hasUnlimitedAnalyses: plan.hasUnlimitedAnalyses,
          hasAdvancedAnalyses: plan.hasAdvancedAnalyses,
          canExportPDF: plan.canExportPDF,
          hasAPIAccess: plan.hasAPIAccess || false,
          subscriptionType: finalPendingData.isAnnual ? 'annual' : 'monthly',
          subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
          subscriptionEndDate: finalPendingData.isAnnual ? getAnnualEndDate() : getMonthlyEndDate(),
          tokenState: {
            availableTokens: plan.tokens,
            totalTokens: plan.tokens,
            baseTokens: plan.tokens,
            usedTokens: 0,
            lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp()
          }
        });
        
        // Nettoyer les données en attente
        await admin.firestore().collection('pending_purchases').doc(uid).delete();
        
        console.log(`✅ Abonnement activé: ${uid} → Plan ${finalPendingData.planId}`);
        return { success: true, type: 'subscription', planId: finalPendingData.planId };
      }
    }

    // Si pas de données en attente, on ne peut pas déterminer l'achat
    return { success: false, error: 'Données d\'achat manquantes. Veuillez réessayer.' };
    
  } catch (error) {
    console.error('❌ Erreur confirmPurchase:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ===========================================================================
// FONCTION POUR CRÉER UNE SESSION CHECKOUT STRIPE (pour les abonnements)
// ===========================================================================
exports.createStripeCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Utilisateur non authentifié');
  }

  const { userId, priceId, planId, isAnnual, successUrl, cancelUrl } = data;
  const uid = context.auth.uid;

  // Vérifier que l'utilisateur correspond
  if (userId && userId !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'Utilisateur non autorisé');
  }

  try {
    // Créer la session Checkout Stripe
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: successUrl || `${functions.config().app.url}/pricing.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${functions.config().app.url}/pricing.html?canceled=true&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        userId: uid,
        planId: planId,
        isAnnual: isAnnual,
        type: 'subscription'
      }
    });

    console.log(`✅ Session Checkout créée: ${session.id} pour ${uid} (plan: ${planId}, ${isAnnual ? 'annuel' : 'mensuel'})`);
    
    return { 
      success: true, 
      sessionId: session.id 
    };

  } catch (error) {
    console.error('❌ Erreur createStripeCheckoutSession:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ===========================================================================
// FONCTION POUR VÉRIFIER L'ABONNEMENT (compatibilité)
// ===========================================================================
exports.confirmStripeSubscription = functions.https.onCall(async (data, context) => {
  return exports.confirmPurchase(data, context);
});

// ===========================================================================
// FONCTION POUR VÉRIFIER UN PAIEMENT DE TOKENS (compatibilité avec token-shop.js)
// ===========================================================================
exports.confirmStripePayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Utilisateur non authentifié');
  }

  const { sessionId, userId } = data;
  const uid = userId || context.auth.uid;

  try {
    // Récupérer la session Stripe
    const session = await stripeClient.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      return { success: false, error: 'Paiement non effectué' };
    }

    // Récupérer les données en attente depuis Firestore
    const pendingDoc = await admin.firestore().collection('pending_purchases').doc(uid).get();
    const pendingData = pendingDoc.exists ? pendingDoc.data() : null;
    
    if (pendingData && pendingData.type === 'token_pack') {
      await admin.firestore().collection('users').doc(uid).update({
        'tokenState.availableTokens': admin.firestore.FieldValue.increment(pendingData.tokenAmount),
        'tokenState.totalTokens': admin.firestore.FieldValue.increment(pendingData.tokenAmount),
        lastTokenPurchase: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Nettoyer
      await pendingDoc.ref.delete();
      
      console.log(`✅ Tokens crédités: +${pendingData.tokenAmount} pour ${uid}`);
      return { 
        success: true, 
        tokensAdded: pendingData.tokenAmount,
        packId: pendingData.packId 
      };
    }

    return { success: false, error: 'Aucune données d\'achat en attente trouvée' };
    
  } catch (error) {
    console.error('❌ Erreur confirmStripePayment:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ===========================================================================
// WEBHOOK POUR LES ABONNEMENTS (gère les résiliations)
// ===========================================================================
exports.handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = functions.config().stripe.webhook_secret;

  let event;
  try {
    event = stripeClient.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('❌ Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const userId = event.data.object.metadata?.userId;

  // =========================================================================
  // GESTION DES RÉSILIATIONS D'ABONNEMENTS
  // =========================================================================
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    
    // Trouver l'utilisateur via customerId ou userId dans metadata
    let userQuery;
    if (userId) {
      userQuery = await admin.firestore().collection('users').where('userId', '==', userId).limit(1).get();
    } else {
      userQuery = await admin.firestore().collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
    }
    
    if (!userQuery.empty) {
      const userDoc = userQuery.docs[0];
      const uid = userDoc.id;
      const freePlan = PLANS.free;
      
      await userDoc.ref.update({
        plan: 'free',
        isPremium: freePlan.isPremium,
        features: freePlan.features,
        allowedAnalyses: freePlan.allowedAnalyses,
        maxProjects: freePlan.maxProjects,
        storageLimit: freePlan.storageLimit,
        tokenPerDay: freePlan.tokenPerDay,
        hasUnlimitedAnalyses: freePlan.hasUnlimitedAnalyses,
        hasAdvancedAnalyses: freePlan.hasAdvancedAnalyses,
        canExportPDF: freePlan.canExportPDF,
        hasAPIAccess: freePlan.hasAPIAccess || false,
        subscriptionEndDate: admin.firestore.FieldValue.serverTimestamp(),
        subscriptionType: null,
        tokenState: {
          availableTokens: freePlan.tokens,
          totalTokens: freePlan.tokens,
          baseTokens: freePlan.tokens,
          usedTokens: 0,
          lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp()
        }
      });
      console.log(`✅ Webhook: ${uid} repasse au plan Free (résiliation)`);
    }
  }

  // =========================================================================
  // GESTION DES PAIEMENTS (Payment Links et Checkout Sessions)
  // =========================================================================
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const metadata = session.metadata || {};
    
    // Si c'est une subscription avec userId dans metadata
    if (metadata.type === 'subscription' && metadata.userId) {
      const uid = metadata.userId;
      const planId = metadata.planId;
      const isAnnual = metadata.isAnnual === 'true' || metadata.isAnnual === true;
      const plan = PLANS[planId];
      
      if (!plan) {
        console.error(`❌ Webhook: Plan invalide ${planId} pour ${uid}`);
        return;
      }
      
      // Trouver l'utilisateur
      const userDoc = await admin.firestore().collection('users').doc(uid).get();
      if (!userDoc.exists) {
        console.error(`❌ Webhook: Utilisateur ${uid} non trouvé`);
        return;
      }
      
      // Mettre à jour l'utilisateur avec l'abonnement
      await userDoc.ref.update({
        plan: planId,
        isPremium: plan.isPremium,
        features: plan.features,
        allowedAnalyses: plan.allowedAnalyses,
        maxProjects: plan.maxProjects,
        storageLimit: plan.storageLimit,
        tokenPerDay: plan.tokenPerDay,
        hasUnlimitedAnalyses: plan.hasUnlimitedAnalyses,
        hasAdvancedAnalyses: plan.hasAdvancedAnalyses,
        canExportPDF: plan.canExportPDF,
        hasAPIAccess: plan.hasAPIAccess || false,
        subscriptionType: isAnnual ? 'annual' : 'monthly',
        subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
        subscriptionEndDate: isAnnual ? getAnnualEndDate() : getMonthlyEndDate(),
        stripeCustomerId: session.customer,
        tokenState: {
          availableTokens: plan.tokens,
          totalTokens: plan.tokens,
          baseTokens: plan.tokens,
          usedTokens: 0,
          lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp()
        }
      });
      
      // Nettoyer les données en attente si elles existent
      await admin.firestore().collection('pending_purchases').doc(uid).delete();
      
      console.log(`✅ Webhook: Abonnement activé pour ${uid} → Plan ${planId} (${isAnnual ? 'annuel' : 'mensuel'}) via session ${session.id}`);
    } else {
      // Pour les Payment Links (sans userId), le crédit est géré par confirmPurchase appelée par le frontend
      console.log(`ℹ️ Paiement reçu via Payment Link: ${session.id} (crédit géré par frontend)`);
    }
  }

  res.json({received: true});
});

// ===========================================================================
// UTILITAIRES
// ===========================================================================
function getAnnualEndDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return admin.firestore.Timestamp.fromDate(date);
}

function getMonthlyEndDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return admin.firestore.Timestamp.fromDate(date);
}
