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
    maxProjects: null,
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
    maxProjects: null,
    storageLimit: 'Illimité',
    isPremium: true,
    hasUnlimitedAnalyses: true,
    hasAdvancedAnalyses: true,
    canExportPDF: true,
    hasAPIAccess: true
  }
};

// ===========================================================================
// HELPER : Applique un plan à un utilisateur (utilisé partout)
// ===========================================================================
async function applyPlanToUser(uid, planId, isAnnual = false, extraData = {}) {
  const plan = PLANS[planId];
  if (!plan) throw new Error(`Plan invalide: ${planId}`);

  const userRef = admin.firestore().collection('users').doc(uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) throw new Error(`Utilisateur ${uid} introuvable`);

  await userRef.update({
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
    ...extraData,
    tokenState: {
      availableTokens: plan.tokens,
      totalTokens: plan.tokens,
      baseTokens: plan.tokens,
      usedTokens: 0,
      lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp()
    }
  });

  console.log(`✅ Plan ${planId} appliqué à ${uid} (${isAnnual ? 'annuel' : 'mensuel'})`);
}

// ===========================================================================
// HELPER : Crédite des tokens à un utilisateur
// ===========================================================================
async function creditTokens(uid, tokenAmount, metadata = {}) {
  await admin.firestore().collection('users').doc(uid).update({
    'tokenState.availableTokens': admin.firestore.FieldValue.increment(tokenAmount),
    'tokenState.totalTokens': admin.firestore.FieldValue.increment(tokenAmount),
    lastTokenPurchase: admin.firestore.FieldValue.serverTimestamp(),
    ...metadata
  });
  console.log(`✅ +${tokenAmount} tokens crédités à ${uid}`);
}

// ===========================================================================
// HELPER : Parse le client_reference_id (userId OU JSON encodé)
// ===========================================================================
function parseClientReference(clientRef) {
  if (!clientRef) return {};
  try {
    const parsed = JSON.parse(clientRef);
    if (typeof parsed === 'object') return parsed;
  } catch (e) {
    // Pas du JSON, c'est juste un userId
  }
  return { userId: clientRef };
}

// ===========================================================================
// FONCTION POUR CONFIRMER UN ACHAT APRÈS RETOUR DE STRIPE
// ===========================================================================
exports.confirmPurchase = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Utilisateur non authentifié');
  }

  const { userId, sessionId, pendingData } = data;
  const uid = context.auth.uid;

  if (userId && userId !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'Utilisateur non autorisé');
  }

  try {
    // Récupérer la session Stripe
    const session = await stripeClient.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return { success: false, error: 'Paiement non effectué' };
    }

    // Récupérer les données en attente
    let finalPendingData = pendingData;
    if (!finalPendingData) {
      const pendingDoc = await admin.firestore().collection('pending_purchases').doc(uid).get();
      if (pendingDoc.exists) {
        finalPendingData = pendingDoc.data();
      }
    }

    if (!finalPendingData) {
      return { success: false, error: 'Données d\'achat manquantes. Veuillez réessayer.' };
    }

    // ------- CAS 1 : PACK DE TOKENS -------
    if (finalPendingData.type === 'token_pack') {
      await creditTokens(uid, finalPendingData.tokenAmount, {
        lastTokenPackId: finalPendingData.packId
      });
      await admin.firestore().collection('pending_purchases').doc(uid).delete();
      return { success: true, type: 'token_pack' };
    }

    // ------- CAS 2 : ABONNEMENT -------
    if (finalPendingData.type === 'subscription') {
      // Vérifier si déjà actif
      const userDoc = await admin.firestore().collection('users').doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        if (userData.plan === finalPendingData.planId && userData.subscriptionStartDate) {
          const endDate = userData.subscriptionEndDate?.toDate
            ? userData.subscriptionEndDate.toDate()
            : new Date(userData.subscriptionEndDate);
          if (endDate > new Date()) {
            console.log(`ℹ️ Abonnement déjà actif pour ${uid}`);
            await admin.firestore().collection('pending_purchases').doc(uid).delete();
            return { success: true, type: 'subscription', planId: finalPendingData.planId, alreadyActive: true };
          }
        }
      }

      // Appliquer le plan
      await applyPlanToUser(uid, finalPendingData.planId, finalPendingData.isAnnual === true);
      await admin.firestore().collection('pending_purchases').doc(uid).delete();

      return { success: true, type: 'subscription', planId: finalPendingData.planId };
    }

    return { success: false, error: 'Type d\'achat inconnu' };

  } catch (error) {
    console.error('❌ Erreur confirmPurchase:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ===========================================================================
// FONCTION POUR CRÉER UNE SESSION CHECKOUT STRIPE
// ===========================================================================
exports.createStripeCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Utilisateur non authentifié');
  }

  const { userId, priceId, planId, isAnnual, successUrl, cancelUrl } = data;
  const uid = context.auth.uid;

  if (userId && userId !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'Utilisateur non autorisé');
  }

  if (!priceId) {
    throw new functions.https.HttpsError('invalid-argument', 'priceId manquant');
  }

  try {
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: successUrl || `${functions.config().app.url}/pricing.html?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${functions.config().app.url}/pricing.html?canceled=true&session_id={CHECKOUT_SESSION_ID}`,
      client_reference_id: uid,
      metadata: {
        userId: uid,
        planId: planId,
        isAnnual: String(isAnnual === true),
        type: 'subscription'
      }
    });

    console.log(`✅ Session Checkout créée: ${session.id} pour ${uid} (plan: ${planId})`);

    return {
      success: true,
      sessionId: session.id,
      url: session.url
    };

  } catch (error) {
    console.error('❌ Erreur createStripeCheckoutSession:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ===========================================================================
// ALIAS DE COMPATIBILITÉ
// ===========================================================================
exports.confirmStripeSubscription = functions.https.onCall(async (data, context) => {
  return exports.confirmPurchase(data, context);
});

exports.confirmStripePayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Utilisateur non authentifié');
  }

  const { sessionId, userId } = data;
  const uid = userId || context.auth.uid;

  try {
    const session = await stripeClient.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return { success: false, error: 'Paiement non effectué' };
    }

    const pendingDoc = await admin.firestore().collection('pending_purchases').doc(uid).get();
    const pendingData = pendingDoc.exists ? pendingDoc.data() : null;

    if (pendingData && pendingData.type === 'token_pack') {
      await creditTokens(uid, pendingData.tokenAmount, {
        lastTokenPackId: pendingData.packId
      });
      await pendingDoc.ref.delete();
      return {
        success: true,
        tokensAdded: pendingData.tokenAmount,
        packId: pendingData.packId
      };
    }

    return { success: false, error: 'Aucune donnée d\'achat en attente' };

  } catch (error) {
    console.error('❌ Erreur confirmStripePayment:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ===========================================================================
// WEBHOOK STRIPE
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

  console.log(`📩 Webhook reçu: ${event.type}`);

  try {
    // =======================================================================
    // CHECKOUT SESSION COMPLETED (Payment Links ET Checkout Sessions)
    // =======================================================================
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata || {};

      // ✅ Récupère userId depuis metadata OU client_reference_id
      const clientRef = parseClientReference(session.client_reference_id);
      let uid = metadata.userId || clientRef.userId;

      // Fallback : chercher par email
      if (!uid && session.customer_details?.email) {
        const q = await admin.firestore()
          .collection('users')
          .where('email', '==', session.customer_details.email)
          .limit(1)
          .get();
        if (!q.empty) uid = q.docs[0].id;
      }

      if (!uid) {
        console.warn(`⚠️ Webhook: userId introuvable pour session ${session.id}`);
        return res.json({ received: true, warning: 'userId introuvable' });
      }

      // Détecter le type
      const type = metadata.type || clientRef.type;
      const planId = metadata.planId || clientRef.planId;
      const isAnnual = metadata.isAnnual === 'true'
                    || metadata.isAnnual === true
                    || clientRef.isAnnual === true
                    || clientRef.isAnnual === 'true';

      // ------- ABONNEMENT -------
      if (type === 'subscription' || session.mode === 'subscription') {
        if (!planId || !PLANS[planId]) {
          console.error(`❌ Webhook: planId invalide "${planId}" pour ${uid}`);
          return res.json({ received: true, error: 'planId invalide' });
        }

        await applyPlanToUser(uid, planId, isAnnual, {
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription
        });

        await admin.firestore().collection('pending_purchases').doc(uid).delete();

        console.log(`✅ Webhook: Abonnement ${planId} activé pour ${uid}`);
        return res.json({ received: true, activated: 'subscription', planId });
      }

      // ------- PACK DE TOKENS -------
      // Récupérer depuis pending_purchases
      const pendingDoc = await admin.firestore().collection('pending_purchases').doc(uid).get();
      const pendingData = pendingDoc.exists ? pendingDoc.data() : null;

      if (pendingData && pendingData.type === 'token_pack') {
        await creditTokens(uid, pendingData.tokenAmount, {
          lastTokenPackId: pendingData.packId
        });
        await pendingDoc.ref.delete();
        console.log(`✅ Webhook: +${pendingData.tokenAmount} tokens pour ${uid}`);
        return res.json({ received: true, activated: 'token_pack' });
      }

      console.log(`ℹ️ Webhook: Session ${session.id} traitée (aucune action)`);
    }

    // =======================================================================
    // RÉSILIATION D'ABONNEMENT
    // =======================================================================
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const subscriptionId = subscription.id;

      // Chercher par stripeSubscriptionId en priorité
      let userQuery = await admin.firestore()
        .collection('users')
        .where('stripeSubscriptionId', '==', subscriptionId)
        .limit(1)
        .get();

      // Fallback : stripeCustomerId
      if (userQuery.empty) {
        userQuery = await admin.firestore()
          .collection('users')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();
      }

      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
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
          hasAPIAccess: false,
          subscriptionEndDate: admin.firestore.FieldValue.serverTimestamp(),
          subscriptionType: null,
          stripeSubscriptionId: null,
          tokenState: {
            availableTokens: freePlan.tokens,
            totalTokens: freePlan.tokens,
            baseTokens: freePlan.tokens,
            usedTokens: 0,
            lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp()
          }
        });
        console.log(`✅ Webhook: ${userDoc.id} → plan Free (résiliation)`);
      } else {
        console.warn(`⚠️ Webhook: Résiliation mais utilisateur introuvable (customer: ${customerId})`);
      }
    }

    res.json({ received: true });

  } catch (err) {
    console.error('❌ Erreur traitement webhook:', err);
    res.status(500).json({ error: err.message });
  }
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
