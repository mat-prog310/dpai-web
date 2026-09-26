// =============================================================================
// PRICING.JS - Gestion des prix et des achats
// =============================================================================

document.addEventListener('DOMContentLoaded', function() {
    checkStripeSubscriptionStatus();
    initPricingPage();
});

function initPricingPage() {
    initSubscriptionButtons();
    initTokenPackButtons();
    initTokenCalculator();
    initPricingTabs();
    initSubscriptionModals();
}

// =============================================================================
// TABS
// =============================================================================
function initPricingTabs() {
    const tabs = document.querySelectorAll('.pricing-tab');
    
    tabs.forEach(function(tab) {
        tab.addEventListener('click', function() {
            tabs.forEach(function(t) { t.classList.remove('active'); });
            this.classList.add('active');
            
            const tabId = this.getAttribute('data-tab');
            const subscriptionsSection = document.getElementById('subscriptions');
            const tokensSection = document.getElementById('tokens');
            
            if (tabId === 'subscriptions') {
                if (subscriptionsSection) subscriptionsSection.style.display = 'block';
                if (tokensSection) tokensSection.style.display = 'none';
            } else if (tabId === 'tokens') {
                if (subscriptionsSection) subscriptionsSection.style.display = 'none';
                if (tokensSection) tokensSection.style.display = 'block';
            }
        });
    });
}

// =============================================================================
// MODALS
// =============================================================================
function initSubscriptionModals() {
    // Modal abonnement
    const subscriptionModal = document.getElementById('subscriptionModal');
    if (subscriptionModal) {
        const modalConfirm = document.getElementById('modalConfirm');
        const modalCancel = document.getElementById('modalCancel');
        const modalClose = document.getElementById('modalClose');
        
        if (modalConfirm) {
            modalConfirm.onclick = function() {
                const plan = modalConfirm.getAttribute('data-plan');
                const isAnnual = modalConfirm.getAttribute('data-annual') === 'true';
                if (plan) confirmSubscription(plan, isAnnual);
            };
        }
        if (modalCancel) {
            modalCancel.onclick = function() { subscriptionModal.classList.remove('visible'); };
        }
        if (modalClose) {
            modalClose.onclick = function() { subscriptionModal.classList.remove('visible'); };
        }
    }
    
    // Modal pack tokens
    const tokenPackModal = document.getElementById('tokenPackModal');
    if (tokenPackModal) {
        const tokenModalConfirm = document.getElementById('tokenModalConfirm');
        const tokenModalCancel = document.getElementById('tokenModalCancel');
        const tokenModalClose = document.getElementById('tokenModalClose');
        
        if (tokenModalConfirm) {
            tokenModalConfirm.onclick = function() {
                const packId = tokenModalConfirm.getAttribute('data-pack');
                if (packId) confirmTokenPackPurchase(packId);
            };
        }
        if (tokenModalCancel) {
            tokenModalCancel.onclick = function() { tokenPackModal.classList.remove('visible'); };
        }
        if (tokenModalClose) {
            tokenModalClose.onclick = function() { tokenPackModal.classList.remove('visible'); };
        }
    }
}

// =============================================================================
// BOUTONS
// =============================================================================
function initSubscriptionButtons() {
    const subscribeProBtn = document.getElementById('subscribeProBtn');
    const subscribeEnterpriseBtn = document.getElementById('subscribeEnterpriseBtn');
    
    if (subscribeProBtn) {
        subscribeProBtn.onclick = function() {
            const user = window.authService?.currentUser;
            if (!user) {
                showAlert('error', 'Erreur', 'Connectez-vous d\'abord pour souscrire.');
                return;
            }
            const plan = this.getAttribute('data-plan');
            openSubscriptionModal(plan);
        };
    }
    if (subscribeEnterpriseBtn) {
        subscribeEnterpriseBtn.onclick = function() {
            const user = window.authService?.currentUser;
            if (!user) {
                showAlert('error', 'Erreur', 'Connectez-vous d\'abord pour souscrire.');
                return;
            }
            const plan = this.getAttribute('data-plan');
            openSubscriptionModal(plan);
        };
    }
}

function initTokenPackButtons() {
    const buyPackBtns = document.querySelectorAll('#buyPackBtn, .buy-pack-btn');
    
    buyPackBtns.forEach(function(btn) {
        btn.onclick = function() {
            const user = window.authService?.currentUser;
            if (!user) {
                showAlert('error', 'Erreur', 'Connectez-vous d\'abord pour acheter des tokens.');
                return;
            }
            const packId = this.getAttribute('data-pack');
            openTokenPackModal(packId);
        };
    });
}

// =============================================================================
// OUVRIR MODAL ABONNEMENT
// =============================================================================
function openSubscriptionModal(plan) {
    const modal = document.getElementById('subscriptionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalConfirm = document.getElementById('modalConfirm');
    
    const planNames = { pro: 'Pro', enterprise: 'Entreprise' };
    const planPrices = {
        pro: '50€/mois ou 500€/an',
        enterprise: '300€/mois ou 3000€/an'
    };
    const planTokens = {
        pro: '500 tokens/mois + 1/jour',
        enterprise: '5000 tokens/mois + 1/jour'
    };
    
    const planFeatures = {
        pro: [
            'Toutes les analyses', 'SWOT complète', 'Porter 5 Forces complète',
            'PESTEL complète', 'Analyse Concurrentielle', 'Rapports détaillés',
            'Projets illimités', '50GB stockage', 'Export PDF', 'Support prioritaire'
        ],
        enterprise: [
            'Tout inclus', 'Toutes les analyses avancées', 'Matrice d\'intégration',
            'Simulateur de négociation', 'Plan d\'action 100 jours',
            'Rapports personnalisés', 'Projets illimités', 'Stockage illimité',
            'Accès API complet', 'Support dédié', 'Formation incluse'
        ]
    };
    
    if (modal && modalTitle && modalBody) {
        modalTitle.textContent = 'Souscrire à ' + (planNames[plan] || plan);
        
        let featuresHtml = '<ul style="text-align: left; margin-top: var(--spacing-lg);">';
        planFeatures[plan].forEach(function(feature) {
            featuresHtml += '<li style="margin-bottom: var(--spacing-sm); color: var(--gray-600);"><i class="fas fa-check" style="color: var(--success); margin-right: var(--spacing-sm);"></i>' + feature + '</li>';
        });
        featuresHtml += '</ul>';
        
        modalBody.innerHTML = 
            '<div class="plan-details">' +
                '<div class="detail-item"><span class="detail-label">Formule</span><span class="detail-value">' + (planNames[plan] || plan) + '</span></div>' +
                '<div class="detail-item"><span class="detail-label">Prix</span><span class="detail-value">' + (planPrices[plan] || 'N/A') + '</span></div>' +
                '<div class="detail-item"><span class="detail-label">Tokens</span><span class="detail-value">' + (planTokens[plan] || 'N/A') + '</span></div>' +
            '</div>' +
            '<div style="margin-top: var(--spacing-lg); padding: var(--spacing-md); background: var(--gray-100); border-radius: 8px;">' +
                '<label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">' +
                    '<input type="radio" name="billing-period" value="monthly" checked>' +
                    '<span>Mensuel</span>' +
                '</label>' +
                '<label style="display: flex; align-items: center; gap: 8px; margin-top: 8px; cursor: pointer;">' +
                    '<input type="radio" name="billing-period" value="annual">' +
                    '<span>Annuel <strong style="color: var(--success);">(2 mois offerts)</strong></span>' +
                '</label>' +
            '</div>' +
            '<h4 style="margin-top: var(--spacing-xl);">Fonctionnalités incluses :</h4>' +
            featuresHtml +
            '<p style="margin-top: var(--spacing-lg); color: var(--gray-600); font-size: var(--font-size-sm);">' +
                'Vous allez être redirigé vers Stripe pour finaliser votre paiement.' +
            '</p>';
        
        if (modalConfirm) {
            modalConfirm.setAttribute('data-plan', plan);
            modalConfirm.setAttribute('data-annual', 'false');
            
            const radios = modalBody.querySelectorAll('input[name="billing-period"]');
            radios.forEach(function(radio) {
                radio.addEventListener('change', function() {
                    modalConfirm.setAttribute('data-annual', this.value === 'annual' ? 'true' : 'false');
                });
            });
        }
        
        modal.classList.add('visible');
    }
}

// =============================================================================
// OUVRIR MODAL PACK TOKENS
// =============================================================================
function openTokenPackModal(packId) {
    const modal = document.getElementById('tokenPackModal');
    const modalTitle = document.getElementById('tokenModalTitle');
    const modalBody = document.getElementById('tokenModalBody');
    const modalConfirm = document.getElementById('tokenModalConfirm');
    
    const packs = window.TokenPacks || [];
    const pack = packs.find(function(p) { return p.id === packId; });
    
    if (modal && modalTitle && modalBody && pack) {
        modalTitle.textContent = 'Acheter le pack ' + pack.name;
        
        const formatPrice = (window.TokenUtils && TokenUtils.formatPrice)
            ? TokenUtils.formatPrice.bind(TokenUtils)
            : function(v) { return Number(v).toFixed(2) + '€'; };
        
        let html = '<div class="pack-details">';
        html += '<div class="detail-item"><span class="detail-label">Nom du pack</span><span class="detail-value">' + pack.name + '</span></div>';
        html += '<div class="detail-item"><span class="detail-label">Nombre de tokens</span><span class="detail-value">' + pack.tokenAmount + '</span></div>';
        html += '<div class="detail-item"><span class="detail-label">Prix</span><span class="detail-value">' + formatPrice(pack.priceEuros) + '</span></div>';
        if (pack.pricePerToken) {
            html += '<div class="detail-item"><span class="detail-label">Prix par token</span><span class="detail-value">' + formatPrice(pack.pricePerToken) + '</span></div>';
        }
        html += '</div>';
        if (pack.description) {
            html += '<p style="margin-top: var(--spacing-lg);">' + pack.description + '</p>';
        }
        html += '<p style="margin-top: var(--spacing-md); color: var(--gray-600); font-size: var(--font-size-sm);">Vous allez être redirigé vers Stripe pour finaliser votre paiement.</p>';
        
        modalBody.innerHTML = html;
        
        if (modalConfirm) modalConfirm.setAttribute('data-pack', packId);
        modal.classList.add('visible');
    } else if (!pack) {
        console.error('❌ Pack introuvable:', packId);
        showAlert('error', 'Erreur', 'Pack introuvable.');
    }
}

// =============================================================================
// CONFIRMER ABONNEMENT
// =============================================================================
async function confirmSubscription(plan, isAnnual) {
    if (isAnnual === undefined) isAnnual = false;
    
    const user = window.authService && window.authService.currentUser;
    
    if (!user) {
        showAlert('error', 'Erreur', 'Vous devez être connecté pour souscrire.');
        return;
    }
    
    if (typeof window.stripeService === 'undefined') {
        console.error('❌ stripeService non chargé');
        showAlert('error', 'Erreur', 'Service de paiement indisponible. Recharge la page.');
        return;
    }
    
    if (typeof window.stripeService.purchaseSubscription !== 'function') {
        console.error('❌ purchaseSubscription manquant');
        showAlert('error', 'Erreur', 'Méthode d\'abonnement indisponible.');
        return;
    }
    
    try {
        const result = await window.stripeService.purchaseSubscription(plan, user.uid, isAnnual);
        
        if (result.success) {
            if (result.isFree) {
                showAlert('success', 'Succès', 'Votre abonnement a été mis à jour !');
                setTimeout(function() { window.location.reload(); }, 1500);
            }
            // result.redirected → redirection en cours
        } else {
            showAlert('error', 'Erreur', result.error || 'Une erreur est survenue.');
        }
    } catch (error) {
        console.error('Erreur confirmSubscription:', error);
        showAlert('error', 'Erreur', error.message || 'Une erreur est survenue.');
    }
}

// =============================================================================
// CONFIRMER ACHAT PACK
// =============================================================================
async function confirmTokenPackPurchase(packId) {
    const user = window.authService && window.authService.currentUser;
    
    if (!user) {
        showAlert('error', 'Erreur', 'Vous devez être connecté pour acheter des tokens.');
        return;
    }
    
    if (typeof window.stripeService === 'undefined') {
        console.error('❌ stripeService non chargé');
        showAlert('error', 'Erreur', 'Service de paiement indisponible. Recharge la page.');
        return;
    }
    
    try {
        const result = await window.stripeService.purchaseTokenPack(packId, user.uid);
        
        if (result.success) {
            if (result.isFree) {
                showAlert('success', 'Succès', 'Vos tokens ont été ajoutés !');
                setTimeout(function() { window.location.reload(); }, 1500);
            }
            // Packs payants → redirection en cours
        } else {
            showAlert('error', 'Erreur', result.error || 'Une erreur est survenue.');
        }
    } catch (error) {
        console.error('Erreur confirmTokenPackPurchase:', error);
        showAlert('error', 'Erreur', error.message || 'Une erreur est survenue.');
    }
}

// =============================================================================
// CALCULATEUR
// =============================================================================
function initTokenCalculator() {
    const analysisTypes = {
        swot: { avg: 7 },
        porter: { avg: 40 },
        pestel: { avg: 30 },
        competitive: { avg: 60 },
        report: { avg: 80 }
    };
    
    function updateTokenCosts() {
        const counts = {
            swot: document.getElementById('swotCount'),
            porter: document.getElementById('porterCount'),
            pestel: document.getElementById('pestelCount'),
            competitive: document.getElementById('competitiveCount'),
            report: document.getElementById('reportCount')
        };
        
        let total = 0;
        
        Object.keys(counts).forEach(function(type) {
            const element = counts[type];
            if (element) {
                const count = parseInt(element.value) || 0;
                const cost = count * analysisTypes[type].avg;
                total += cost;
                
                const calculatorItem = element.closest('.calculator-item');
                if (calculatorItem) {
                    const costEl = calculatorItem.querySelector('.token-cost');
                    if (costEl) costEl.textContent = cost + ' tokens';
                }
            }
        });
        
        const totalEl = document.getElementById('totalTokens');
        if (totalEl) totalEl.textContent = total + ' tokens';
    }
    
    const inputs = ['swotCount', 'porterCount', 'pestelCount', 'competitiveCount', 'reportCount'];
    inputs.forEach(function(id) {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', updateTokenCosts);
            input.addEventListener('input', updateTokenCosts);
        }
    });
    
    updateTokenCosts();
}

// =============================================================================
// ALERT
// =============================================================================
function showAlert(type, title, message) {
    if (typeof window.showGlobalAlert === 'function') {
        window.showGlobalAlert(type, title, message);
    } else if (typeof window._mainShowAlert === 'function') {
        window._mainShowAlert(type, title, message);
    } else {
        alert(title + ': ' + message);
    }
}

// =============================================================================
// VÉRIF STATUT RETOUR STRIPE (Abonnements + Packs de tokens)
// =============================================================================
async function checkStripeSubscriptionStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const sessionId = urlParams.get('session_id');
    const canceled = urlParams.get('canceled');
    
    // Nettoyer l'URL immédiatement
    window.history.replaceState({}, document.title, window.location.pathname);
    
    if (success !== 'true' && success !== 'false' && canceled !== 'true') return;
    
    const user = window.authService && window.authService.currentUser;
    if (!user) {
        showAlert('error', 'Erreur', 'Vous devez être connecté pour finaliser votre achat.');
        return;
    }
    
    const isFileProtocol = window.location.protocol === 'file:';
    const isFirebaseAvailable = typeof window.firebase !== 'undefined' && window.firebase;
    const isDemoMode = !isFirebaseAvailable || isFileProtocol;
    
    if (success === 'true') {
        try {
            // Récupérer purchaseId depuis sessionStorage (stocké avant redirection)
            const purchaseId = sessionStorage.getItem('stripe_purchase_id');
            const purchaseType = sessionStorage.getItem('stripe_purchase_type');
            
            // Nettoyer sessionStorage
            sessionStorage.removeItem('stripe_purchase_id');
            sessionStorage.removeItem('stripe_purchase_type');
            sessionStorage.removeItem('stripe_purchase_planId');
            sessionStorage.removeItem('stripe_purchase_isAnnual');
            sessionStorage.removeItem('stripe_purchase_packId');
            
            // Si pas de purchaseId en sessionStorage, essayer l'ancien système
            if (!purchaseId) {
                console.log('⚠️ [Stripe] Pas de purchaseId en sessionStorage, utilisation de pending_purchases');
                const pendingDoc = await db.collection('pending_purchases').doc(user.uid).get();
                if (!pendingDoc.exists) {
                    showAlert('warning', 'Attention', 'Aucun achat en attente trouvé. Le paiement peut déjà être activé.');
                    return;
                }
                
                const purchaseData = pendingDoc.data();
                const type = purchaseData.type; // 'subscription' ou 'token_pack'
                const functions = firebase.functions();
                
                // Appeler la fonction de confirmation avec l'ancien système
                let confirmFn, params;
                if (type === 'subscription') {
                    confirmFn = functions.httpsCallable('confirmStripeSubscription');
                    params = { userId: user.uid, sessionId: sessionId, planId: purchaseData.planId };
                } else if (type === 'token_pack') {
                    confirmFn = functions.httpsCallable('confirmTokenPurchase');
                    params = { userId: user.uid, sessionId: sessionId, packId: purchaseData.packId };
                } else {
                    showAlert('error', 'Erreur', 'Type d\'achat inconnu.');
                    return;
                }
                
                const result = await confirmFn(params);
                
                if (result.data.success) {
                    const message = type === 'subscription'
                        ? 'Abonnement ' + (result.data.planId || purchaseData.planId || '').toUpperCase() + ' activé !'
                        : (result.data.tokenAmount || purchaseData.tokenAmount || '0') + ' tokens ajoutés !';
                    showAlert('success', 'Succès', message);
                    
                    if (typeof window.authService.loadUserData === 'function') {
                        await window.authService.loadUserData(user.uid);
                    }
                    if (typeof window.authService.updateUI === 'function') {
                        window.authService.updateUI();
                    }
                } else {
                    showAlert('error', 'Erreur', result.data.error || 'Erreur de confirmation');
                }
                return;
            }
            
            // Nouveau système avec purchaseId
            const planId = sessionStorage.getItem('stripe_purchase_planId');
            const isAnnual = sessionStorage.getItem('stripe_purchase_isAnnual') === 'true';
            const packId = sessionStorage.getItem('stripe_purchase_packId');
            const tokenAmount = sessionStorage.getItem('stripe_purchase_tokenAmount');
            
            const functions = firebase.functions();
            
            if (isDemoMode) {
                // Mode démo : simuler la confirmation
                if (purchaseType === 'subscription') {
                    if (planId && window.authService.userData) {
                        window.authService.userData.plan = planId;
                        const expirationDate = new Date();
                        expirationDate.setDate(expirationDate.getDate() + 30);
                        window.authService.userData.subscriptionExpiry = expirationDate.toISOString();
                        showAlert('success', 'Succès', 'Abonnement ' + planId.toUpperCase() + ' activé ! (démo - 30 jours)');
                        setTimeout(() => window.location.reload(), 1500);
                        return;
                    }
                } else if (purchaseType === 'token_pack') {
                    showAlert('success', 'Succès', tokenAmount + ' tokens ajoutés ! (démo)');
                    setTimeout(() => window.location.reload(), 1500);
                    return;
                }
                showAlert('error', 'Erreur', 'Impossible de finaliser en mode démo.');
                return;
            }
            
            // Mode production : appeler la Cloud Function appropriée
            let confirmFn, params;
            if (purchaseType === 'subscription') {
                confirmFn = functions.httpsCallable('confirmStripeSubscription');
                params = { userId: user.uid, sessionId: sessionId, planId: planId, isAnnual: isAnnual, purchaseId: purchaseId };
            } else if (purchaseType === 'token_pack') {
                confirmFn = functions.httpsCallable('confirmTokenPurchase');
                params = { userId: user.uid, sessionId: sessionId, packId: packId, tokenAmount: parseInt(tokenAmount) || 0, purchaseId: purchaseId };
            } else {
                showAlert('error', 'Erreur', 'Type d\'achat inconnu.');
                return;
            }
            
            const result = await confirmFn(params);
            
            if (result.data.success) {
                const message = purchaseType === 'subscription'
                    ? 'Abonnement ' + (result.data.planId || planId || '').toUpperCase() + ' activé !'
                    : (result.data.tokenAmount || tokenAmount || '0') + ' tokens ajoutés !';
                showAlert('success', 'Succès', message);
                
                // Recharger les données utilisateur
                if (typeof window.authService.loadUserData === 'function') {
                    await window.authService.loadUserData(user.uid);
                }
                if (typeof window.authService.updateUI === 'function') {
                    window.authService.updateUI();
                }
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showAlert('error', 'Erreur', result.data.error || 'Confirmation échouée.');
            }
        } catch (error) {
            console.error('[STRIPE] Erreur vérification:', error);
            showAlert('warning', 'Attention', 'Paiement peut-être activé. Rafraîchissez la page.');
        }
    } else if (success === 'false' || canceled === 'true') {
        showAlert('warning', 'Paiement annulé', 'Vous avez annulé le paiement.');
    }
}

// =============================================================================
// UTILITAIRES CALCULATEUR
// =============================================================================
function increment(inputId) {
    const el = document.getElementById(inputId);
    if (el) {
        el.value = (parseInt(el.value) || 0) + 1;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function decrement(inputId) {
    const el = document.getElementById(inputId);
    if (el) {
        el.value = Math.max(0, (parseInt(el.value) || 0) - 1);
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function scrollToSubscriptions() {
    const el = document.getElementById('subscriptions');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// =============================================================================
// EXPOSITION GLOBALE
// =============================================================================
window.openSubscriptionModal = openSubscriptionModal;
window.openTokenPackModal = openTokenPackModal;
window.confirmSubscription = confirmSubscription;
window.confirmTokenPackPurchase = confirmTokenPackPurchase;
window.increment = increment;
window.decrement = decrement;
window.scrollToSubscriptions = scrollToSubscriptions;
window.checkStripeSubscriptionStatus = checkStripeSubscriptionStatus;

console.log('%c💰 [pricing.js] Prêt', 'color: #28a745; font-weight: bold;');
