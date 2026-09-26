// =============================================================================
// Firebase Cloud Functions pour DPAI
// Gestion des confirmations de paiement Stripe
// =============================================================================

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialiser Firebase Admin SDK si ce n'est pas déjà fait
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// =============================================================================
// CONFIGURATION STRIPE - Mode TEST ou PRODUCTION
// =============================================================================
const stripeSecretKey = functions.config().stripe.secret || process.env.STRIPE_SECRET_KEY;
const stripe = require('stripe')(stripeSecretKey);

// Détection du mode en fonction de la clé secrète
const isStripeTestMode = stripeSecretKey && stripeSecretKey.startsWith('sk_test_');

// Log du mode au démarrage
if (isStripeTestMode) {
    console.log('🧪 [Stripe] Mode TEST activé - Clé: ' + stripeSecretKey.substring(0, 10) + '...');
} else if (stripeSecretKey && stripeSecretKey.startsWith('sk_live_')) {
    console.log('✅ [Stripe] Mode PRODUCTION activé - Clé: ' + stripeSecretKey.substring(0, 10) + '...');
} else {
    console.warn('⚠️ [Stripe] Clé secrète non configurée ou invalide');
}

// =============================================================================
// FONCTION: Confirmer un abonnement après paiement Stripe
// =============================================================================
exports.confirmStripeSubscription = functions.https.onCall(async (data, context) => {
    // Vérifier l'authentification
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Non autorisé');
    }
    
    const { userId, sessionId, purchaseId, planId: paramPlanId, isAnnual: paramIsAnnual } = data;
    
    try {
        // 1. Récupérer la session Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        // Vérifier que le paiement a réussi
        if (session.payment_status !== 'paid') {
            console.log('Paiement non confirmé pour session:', sessionId);
            return { success: false, error: 'Paiement non confirmé' };
        }
        
        // 2. Récupérer les données de l'achat (nouveau système avec purchaseId)
        let purchaseData;
        if (purchaseId) {
            // Nouveau système: utiliser purchases collection
            const purchaseDoc = await db.collection('purchases').doc(purchaseId).get();
            if (!purchaseDoc.exists) {
                console.log('Aucun achat trouvé pour purchaseId:', purchaseId);
                return { success: false, error: 'Aucun achat trouvé' };
            }
            purchaseData = purchaseDoc.data();
        } else {
            // Ancien système: utiliser pending_purchases (pour rétrocompatibilité)
            const pendingDoc = await db.collection('pending_purchases').doc(userId).get();
            if (!pendingDoc.exists) {
                console.log('Aucun achat en attente trouvé pour:', userId);
                return { success: false, error: 'Aucun achat en attente trouvé' };
            }
            purchaseData = pendingDoc.data();
        }
        
        // Utiliser les paramètres passés ou les données du document
        const planId = paramPlanId || purchaseData.planId || 'pro';
        const isAnnual = paramIsAnnual !== undefined ? paramIsAnnual : (purchaseData.isAnnual || false);
        
        // 3. Configurer les tokens selon le plan
        const planConfigs = {
            pro: { baseTokens: 500, bonusRate: 0.20, monthlyTokenRate: 1 },
            enterprise: { baseTokens: 5000, bonusRate: 0.30, monthlyTokenRate: 1 }
        };
        
        const config = planConfigs[planId] || planConfigs.pro;
        const baseTokens = config.baseTokens;
        const bonusTokens = Math.floor(baseTokens * config.bonusRate);
        const welcomeBonus = 10;
        const totalTokens = baseTokens + bonusTokens + welcomeBonus;
        
        // 4. Mettre à jour l'utilisateur dans Firestore
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            plan: planId,
            subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
            subscriptionEndDate: isAnnual 
                ? admin.firestore.Timestamp.fromDate(
                    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                ) 
                : null,
            // Débloquer les services selon le plan
            hasAccessToPremiumSuggestions: true,
            hasAccessToAdvancedAnalytics: planId === 'pro' || planId === 'enterprise',
            hasAccessToAPI: planId === 'enterprise',
            // Mettre à jour le tokenState
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
        
        // 5. Nettoyer l'achat en attente
        await db.collection('pending_purchases').doc(userId).delete();
        
        // Mettre à jour le statut de l'achat si purchaseId existe
        if (purchaseId) {
            await db.collection('purchases').doc(purchaseId).update({
                status: 'completed',
                stripeSessionId: sessionId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Nettoyer l'ancien système
            await db.collection('pending_purchases').doc(userId).delete();
        }
        
        console.log('Abonnement confirmé pour:', userId, 'Plan:', planId);
        return { success: true, planId, tokenAmount: totalTokens };
        
    } catch (error) {
        console.error('Erreur confirmation abonnement:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// =============================================================================
// FONCTION: Confirmer un achat de pack de tokens après paiement Stripe
// =============================================================================
exports.confirmTokenPurchase = functions.https.onCall(async (data, context) => {
    // Vérifier l'authentification
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Non autorisé');
    }
    
    const { userId, sessionId, purchaseId, packId: paramPackId, tokenAmount: paramTokenAmount } = data;
    
    try {
        // 1. Récupérer la session Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        // Vérifier que le paiement a réussi
        if (session.payment_status !== 'paid') {
            console.log('Paiement non confirmé pour session:', sessionId);
            return { success: false, error: 'Paiement non confirmé' };
        }
        
        // 2. Récupérer les données de l'achat (nouveau système avec purchaseId)
        let purchaseData;
        if (purchaseId) {
            // Nouveau système: utiliser purchases collection
            const purchaseDoc = await db.collection('purchases').doc(purchaseId).get();
            if (!purchaseDoc.exists) {
                console.log('Aucun achat trouvé pour purchaseId:', purchaseId);
                return { success: false, error: 'Aucun achat trouvé' };
            }
            purchaseData = purchaseDoc.data();
        } else {
            // Ancien système: utiliser pending_purchases (pour rétrocompatibilité)
            const pendingDoc = await db.collection('pending_purchases').doc(userId).get();
            if (!pendingDoc.exists) {
                console.log('Aucun achat en attente trouvé pour:', userId);
                return { success: false, error: 'Aucun achat en attente trouvé' };
            }
            purchaseData = pendingDoc.data();
        }
        
        // Utiliser les paramètres passés ou les données du document
        const packId = paramPackId || purchaseData.packId;
        const tokenAmount = paramTokenAmount || purchaseData.tokenAmount || 0;
        
        // 3. Ajouter les tokens à l'utilisateur
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            'tokenState.availableTokens': admin.firestore.FieldValue.increment(tokenAmount),
            'tokenState.totalTokens': admin.firestore.FieldValue.increment(tokenAmount)
        });
        
        // 4. Mettre à jour le statut de l'achat si purchaseId existe
        if (purchaseId) {
            await db.collection('purchases').doc(purchaseId).update({
                status: 'completed',
                stripeSessionId: sessionId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Nettoyer l'ancien système
            await db.collection('pending_purchases').doc(userId).delete();
        }
        
        console.log('Pack de tokens confirmé pour:', userId, 'Pack:', packId, 'Tokens:', tokenAmount);
        return { success: true, packId, tokenAmount };
        
    } catch (error) {
        console.error('Erreur confirmation achat tokens:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

// =============================================================================
// FONCTION: Webhook Stripe (pour une confirmation en temps réel)
// =============================================================================
// Cette fonction est appelée par Stripe via un webhook
// Elle permet de confirmer les paiements sans passer par le frontend
// ⚠️ IMPORTANT: En mode TEST, utilisez un secret de webhook TEST (whsec_test_...)
//    En mode PRODUCTION, utilisez un secret de webhook LIVE (whsec_...)
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = functions.config().stripe.webhook || process.env.STRIPE_WEBHOOK_SECRET;
    
    // Vérifier que le secret du webhook est configuré
    if (!endpointSecret) {
        console.error('❌ [Stripe Webhook] Secret du webhook non configuré');
        return res.status(500).send('STRIPE_WEBHOOK_SECRET non défini');
    }
    
    // Log du mode
    const webhookMode = endpointSecret.startsWith('whsec_test_') ? 'TEST' : 'PRODUCTION';
    console.log(`🔌 [Stripe Webhook] Mode: ${webhookMode} - Événement reçu`);
    
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Gérer l'événement de paiement réussi
    // Les Payment Links peuvent envoyer soit checkout.session.completed soit payment_intent.succeeded
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        // Extraire les données du client_reference_id
        let clientRef;
        try {
            clientRef = JSON.parse(session.client_reference_id || '{}');
        } catch (e) {
            clientRef = {};
        }
        
        const userId = clientRef.userId;
        const type = clientRef.type;
        
        if (!userId || !type) {
            console.log('Données manquantes dans client_reference_id');
            return res.status(200).json({ received: true });
        }
        
        try {
            const purchaseId = clientRef.purchaseId;
            
            if (type === 'subscription') {
                const planId = clientRef.planId || 'pro';
                const isAnnual = clientRef.isAnnual || false;
                
                // Mettre à jour l'utilisateur (même logique que confirmStripeSubscription)
                const planConfigs = {
                    pro: { baseTokens: 500, bonusRate: 0.20 },
                    enterprise: { baseTokens: 5000, bonusRate: 0.30 }
                };
                const config = planConfigs[planId] || planConfigs.pro;
                const baseTokens = config.baseTokens;
                const bonusTokens = Math.floor(baseTokens * config.bonusRate);
                const welcomeBonus = 10;
                const totalTokens = baseTokens + bonusTokens + welcomeBonus;
                
                await db.collection('users').doc(userId).update({
                    plan: planId,
                    subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
                    subscriptionEndDate: isAnnual 
                        ? admin.firestore.Timestamp.fromDate(
                            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                        ) 
                        : null,
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
                
                // Mettre à jour le statut de l'achat
                if (purchaseId) {
                    await db.collection('purchases').doc(purchaseId).update({
                        status: 'completed',
                        stripeSessionId: session.id,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                
            } else if (type === 'token_pack') {
                const packId = clientRef.packId;
                const tokenAmount = clientRef.tokenAmount || 0;
                
                if (packId && tokenAmount) {
                    await db.collection('users').doc(userId).update({
                        'tokenState.availableTokens': admin.firestore.FieldValue.increment(tokenAmount),
                        'tokenState.totalTokens': admin.firestore.FieldValue.increment(tokenAmount)
                    });
                    
                    // Mettre à jour le statut de l'achat
                    if (purchaseId) {
                        await db.collection('purchases').doc(purchaseId).update({
                            status: 'completed',
                            stripeSessionId: session.id,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
            }
            
            console.log('Webhook traité avec succès pour:', userId);
        } catch (err) {
            console.error('Erreur traitement webhook:', err);
        }
    }
    // Gérer payment_intent.succeeded (pour les Payment Links)
    else if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        
        // Extraire les données du client_reference_id
        let clientRef;
        try {
            clientRef = JSON.parse(paymentIntent.metadata.client_reference_id || paymentIntent.metadata.purchase_id || '{}');
        } catch (e) {
            clientRef = {};
        }
        
        const userId = clientRef.userId;
        const type = clientRef.type;
        const purchaseId = clientRef.purchaseId;
        
        if (!userId || !type) {
            console.log('Données manquantes dans payment_intent pour:', paymentIntent.id);
            res.json({ received: true });
            return;
        }
        
        try {
            if (type === 'subscription') {
                const planId = clientRef.planId || 'pro';
                const isAnnual = clientRef.isAnnual || false;
                
                // Mettre à jour l'utilisateur
                const planConfigs = {
                    pro: { baseTokens: 500, bonusRate: 0.20 },
                    enterprise: { baseTokens: 5000, bonusRate: 0.30 }
                };
                const config = planConfigs[planId] || planConfigs.pro;
                const baseTokens = config.baseTokens;
                const bonusTokens = Math.floor(baseTokens * config.bonusRate);
                const welcomeBonus = 10;
                const totalTokens = baseTokens + bonusTokens + welcomeBonus;
                
                await db.collection('users').doc(userId).update({
                    plan: planId,
                    subscriptionStartDate: admin.firestore.FieldValue.serverTimestamp(),
                    subscriptionEndDate: isAnnual 
                        ? admin.firestore.Timestamp.fromDate(
                            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                        ) 
                        : null,
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
                
                // Mettre à jour le statut de l'achat
                if (purchaseId) {
                    await db.collection('purchases').doc(purchaseId).update({
                        status: 'completed',
                        stripePaymentIntentId: paymentIntent.id,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                
            } else if (type === 'token_pack') {
                const packId = clientRef.packId;
                const tokenAmount = clientRef.tokenAmount || 0;
                
                if (packId && tokenAmount) {
                    await db.collection('users').doc(userId).update({
                        'tokenState.availableTokens': admin.firestore.FieldValue.increment(tokenAmount),
                        'tokenState.totalTokens': admin.firestore.FieldValue.increment(tokenAmount)
                    });
                    
                    // Mettre à jour le statut de l'achat
                    if (purchaseId) {
                        await db.collection('purchases').doc(purchaseId).update({
                            status: 'completed',
                            stripePaymentIntentId: paymentIntent.id,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                }
            }
            
            console.log('Webhook payment_intent.succeeded traité pour:', userId);
        } catch (err) {
            console.error('Erreur traitement webhook payment_intent:', err);
        }
    }
    
    // Répondre avec un statut 200 pour indiquer que l'événement a été reçu
    res.json({ received: true });
});

// =============================================================================
// EXPORT POUR TESTS LOCAUX
// =============================================================================
module.exports = {
    confirmStripeSubscription: exports.confirmStripeSubscription,
    confirmTokenPurchase: exports.confirmTokenPurchase,
    stripeWebhook: exports.stripeWebhook
};
