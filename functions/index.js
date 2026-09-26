// =============================================================================
// Firebase Cloud Functions pour DPAI
// =============================================================================

const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

// =============================================================================
// CONFIGURATION STRIPE
// =============================================================================
const stripeSecretKey = functions.config().stripe.secret || process.env.STRIPE_SECRET_KEY;
const stripe = require('stripe')(stripeSecretKey);
const isStripeTestMode = stripeSecretKey && stripeSecretKey.startsWith('sk_test_');

if (isStripeTestMode) console.log('🧪 [Stripe] Mode TEST activé');
else if (stripeSecretKey && stripeSecretKey.startsWith('sk_live_')) console.log('✅ [Stripe] Mode PRODUCTION activé');

// =============================================================================
// FONCTION: Confirmer un abonnement
// =============================================================================
exports.confirmStripeSubscription = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Non autorisé');

    const { userId, sessionId, purchaseId, planId: paramPlanId, isAnnual: paramIsAnnual } = data;

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') return { success: false, error: 'Paiement non confirmé' };

        let purchaseData;
        if (purchaseId) {
            const purchaseDoc = await db.collection('purchases').doc(purchaseId).get();
            if (!purchaseDoc.exists) return { success: false, error: 'Aucun achat trouvé' };
            purchaseData = purchaseDoc.data();
        } else {
            const pendingDoc = await db.collection('pending_purchases').doc(userId).get();
            if (!pendingDoc.exists) return { success: false, error: 'Aucun achat en attente' };
            purchaseData = pendingDoc.data();
        }

        const planId = paramPlanId || purchaseData.planId || 'pro';
        const isAnnual = paramIsAnnual !== undefined ? paramIsAnnual : (purchaseData.isAnnual || false);
        const planConfigs = { pro: { baseTokens: 500, bonusRate: 0.20 }, enterprise: { baseTokens: 5000, bonusRate: 0.30 } };
        const config = planConfigs[planId] || planConfigs.pro;
        const baseTokens = config.baseTokens;
        const bonusTokens = Math.floor(baseTokens * config.bonusRate);
        const totalTokens = baseTokens + bonusTokens + 10;

        await db.collection('users').doc(userId).update({
            plan: planId,
            subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
            subscriptionEndDate: isAnnual ? admin.firestore.Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) : null,
            hasAccessToPremiumSuggestions: true,
            hasAccessToAdvancedAnalytics: planId === 'pro' || planId === 'enterprise',
            hasAccessToAPI: planId === 'enterprise',
            'tokenState.plan': planId,
            'tokenState.baseTokens': baseTokens,
            'tokenState.bonusTokens': bonusTokens,
            'tokenState.totalTokens': totalTokens,
            'tokenState.availableTokens': totalTokens,
            'tokenState.usedTokens': 0,
            'tokenState.monthlyTokensUsed': 0,
            'tokenState.lastTokenUpdate': admin.firestore.FieldValue.serverTimestamp(),
            'tokenState.lastMonthlyReset': admin.firestore.FieldValue.serverTimestamp(),
            'tokenState.firstAnalysisDone': false
        });

        if (purchaseId) {
            await db.collection('purchases').doc(purchaseId).update({ status: 'completed', stripeSessionId: sessionId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        } else {
            await db.collection('pending_purchases').doc(userId).delete();
        }

        return { success: true, planId, tokenAmount: totalTokens };
    } catch (error) {
        console.error('Erreur confirmation abonnement:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// =============================================================================
// FONCTION: Confirmer achat de tokens
// =============================================================================
exports.confirmTokenPurchase = functions.https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Non autorisé');

    const { userId, sessionId, purchaseId, packId: paramPackId, tokenAmount: paramTokenAmount } = data;

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') return { success: false, error: 'Paiement non confirmé' };

        let purchaseData;
        if (purchaseId) {
            const purchaseDoc = await db.collection('purchases').doc(purchaseId).get();
            if (!purchaseDoc.exists) return { success: false, error: 'Aucun achat trouvé' };
            purchaseData = purchaseDoc.data();
        } else {
            const pendingDoc = await db.collection('pending_purchases').doc(userId).get();
            if (!pendingDoc.exists) return { success: false, error: 'Aucun achat en attente' };
            purchaseData = pendingDoc.data();
        }

        const packId = paramPackId || purchaseData.packId;
        const tokenAmount = paramTokenAmount || purchaseData.tokenAmount || 0;

        await db.collection('users').doc(userId).update({
            'tokenState.availableTokens': admin.firestore.FieldValue.increment(tokenAmount),
            'tokenState.totalTokens': admin.firestore.FieldValue.increment(tokenAmount)
        });

        if (purchaseId) {
            await db.collection('purchases').doc(purchaseId).update({ status: 'completed', stripeSessionId: sessionId, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        } else {
            await db.collection('pending_purchases').doc(userId).delete();
        }

        return { success: true, packId, tokenAmount };
    } catch (error) {
        console.error('Erreur achat tokens:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// =============================================================================
// FONCTION: Webhook Stripe
// =============================================================================
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = functions.config().stripe.webhook || process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
        console.error('❌ [Stripe Webhook] Secret non configuré');
        return res.status(500).send('STRIPE_WEBHOOK_SECRET non défini');
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook Error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Gestion des événements
    if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
        const obj = event.type === 'checkout.session.completed' ? event.data.object : event.data.object;
        let clientRef;

        try {
            if (event.type === 'checkout.session.completed') {
                clientRef = JSON.parse(obj.client_reference_id || '{}');
            } else {
                clientRef = JSON.parse(obj.metadata.client_reference_id || obj.metadata.purchase_id || '{}');
            }
        } catch (e) {
            clientRef = {};
        }

        const userId = clientRef.userId;
        const type = clientRef.type;
        const purchaseId = clientRef.purchaseId;

        if (!userId || !type) return res.status(200).json({ received: true });

        try {
            if (type === 'subscription') {
                const planId = clientRef.planId || 'pro';
                const isAnnual = clientRef.isAnnual || false;
                const planConfigs = { pro: { baseTokens: 500, bonusRate: 0.20 }, enterprise: { baseTokens: 5000, bonusRate: 0.30 } };
                const config = planConfigs[planId] || planConfigs.pro;
                const baseTokens = config.baseTokens;
                const bonusTokens = Math.floor(baseTokens * config.bonusRate);
                const totalTokens = baseTokens + bonusTokens + 10;

                await db.collection('users').doc(userId).update({
                    plan: planId,
                    subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
                    subscriptionEndDate: isAnnual ? admin.firestore.Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) : null,
                    hasAccessToPremiumSuggestions: true,
                    hasAccessToAdvancedAnalytics: planId === 'pro' || planId === 'enterprise',
                    hasAccessToAPI: planId === 'enterprise',
                    'tokenState.plan': planId,
                    'tokenState.baseTokens': baseTokens,
                    'tokenState.bonusTokens': bonusTokens,
                    'tokenState.totalTokens': totalTokens,
                    'tokenState.availableTokens': totalTokens,
                    'tokenState.usedTokens': 0,
                    'tokenState.lastTokenUpdate': admin.firestore.FieldValue.serverTimestamp()
                });

                if (purchaseId) {
                    await db.collection('purchases').doc(purchaseId).update({
                        status: 'completed',
                        stripeId: event.type === 'checkout.session.completed' ? obj.id : obj.id,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
            else if (type === 'token_pack') {
                const packId = clientRef.packId;
                const tokenAmount = clientRef.tokenAmount || 0;

                if (packId && tokenAmount) {
                    await db.collection('users').doc(userId).update({
                        'tokenState.availableTokens': admin.firestore.FieldValue.increment(tokenAmount),
                        'tokenState.totalTokens': admin.firestore.FieldValue.increment(tokenAmount)
                    });

                    if (purchaseId) {
                        await db.collection('purchases').doc(purchaseId).update({
                            status: 'completed',
                            stripeId: event.type === 'checkout.session.completed' ? obj.id : obj.id,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
            }
        } catch (err) {
            console.error('Erreur webhook:', err);
        }
    }

    res.json({ received: true });
});

module.exports = {
    confirmStripeSubscription: exports.confirmStripeSubscription,
    confirmTokenPurchase: exports.confirmTokenPurchase,
    stripeWebhook: exports.stripeWebhook
};
