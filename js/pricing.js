// =============================================================================
// PRICING.JS - Gestion des prix et des achats
// =============================================================================

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier le retour de paiement Stripe
    checkStripeSubscriptionStatus();
    
    initPricingPage();
});

// Initialiser la page des prix
function initPricingPage() {
    // Initialiser les boutons d'abonnement
    initSubscriptionButtons();
    
    // Initialiser les boutons d'achat de packs
    initTokenPackButtons();
    
    // Initialiser le calculateur de tokens
    initTokenCalculator();
    
    // Initialiser les tabs
    initPricingTabs();
    
    // Initialiser les modaux
    initSubscriptionModals();
}

// Initialiser les tabs de tarification
function initPricingTabs() {
    const tabs = document.querySelectorAll('.pricing-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Retirer la classe active de tous les tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Ajouter la classe active au tab cliqué
            this.classList.add('active');
            
            // Afficher/masquer les sections
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

// Initialiser les modaux d'abonnement et de packs
function initSubscriptionModals() {
    // Modal d'abonnement
    const subscriptionModal = document.getElementById('subscriptionModal');
    if (subscriptionModal) {
        const modalConfirm = document.getElementById('modalConfirm');
        const modalCancel = document.getElementById('modalCancel');
        const modalClose = document.getElementById('modalClose');
        
        // Confirmer l'abonnement
        if (modalConfirm) {
            modalConfirm.onclick = function() {
                const plan = modalConfirm.getAttribute('data-plan');
                if (plan) {
                    confirmSubscription(plan);
                }
            };
        }
        
        // Fermer le modal
        if (modalCancel) {
            modalCancel.onclick = function() {
                subscriptionModal.classList.remove('visible');
            };
        }
        
        if (modalClose) {
            modalClose.onclick = function() {
                subscriptionModal.classList.remove('visible');
            };
        }
    }
    
    // Modal de pack de tokens
    const tokenPackModal = document.getElementById('tokenPackModal');
    if (tokenPackModal) {
        const tokenModalConfirm = document.getElementById('tokenModalConfirm');
        const tokenModalCancel = document.getElementById('tokenModalCancel');
        const tokenModalClose = document.getElementById('tokenModalClose');
        
        // Confirmer l'achat de pack
        if (tokenModalConfirm) {
            tokenModalConfirm.onclick = function() {
                const packId = tokenModalConfirm.getAttribute('data-pack');
                if (packId) {
                    confirmTokenPackPurchase(packId);
                }
            };
        }
        
        // Fermer le modal
        if (tokenModalCancel) {
            tokenModalCancel.onclick = function() {
                tokenPackModal.classList.remove('visible');
            };
        }
        
        if (tokenModalClose) {
            tokenModalClose.onclick = function() {
                tokenPackModal.classList.remove('visible');
            };
        }
    }
}

// Initialiser les boutons d'abonnement
function initSubscriptionButtons() {
    const subscribeProBtn = document.getElementById('subscribeProBtn');
    const subscribeEnterpriseBtn = document.getElementById('subscribeEnterpriseBtn');
    
    if (subscribeProBtn) {
        subscribeProBtn.onclick = function() {
            const plan = this.getAttribute('data-plan');
            openSubscriptionModal(plan);
        };
    }
    
    if (subscribeEnterpriseBtn) {
        subscribeEnterpriseBtn.onclick = function() {
            const plan = this.getAttribute('data-plan');
            openSubscriptionModal(plan);
        };
    }
}

// Initialiser les boutons d'achat de packs
function initTokenPackButtons() {
    const buyPackBtns = document.querySelectorAll('#buyPackBtn');
    
    buyPackBtns.forEach(btn => {
        btn.onclick = function() {
            const packId = this.getAttribute('data-pack');
            openTokenPackModal(packId);
        };
    });
}

// Ouvrir le modal d'abonnement
function openSubscriptionModal(plan) {
    const modal = document.getElementById('subscriptionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalConfirm = document.getElementById('modalConfirm');
    
    const planNames = {
        pro: 'Pro',
        enterprise: 'Entreprise'
    };
    const planPrices = {
        pro: '50€/mois',
        enterprise: '300€/mois'
    };
    const planTokens = {
        pro: '500 tokens/mois + 1/jour',
        enterprise: '5000 tokens/mois + 1/jour'
    };
    
    const planFeatures = {
        pro: [
            'Toutes les analyses',
            'SWOT complète',
            'Porter 5 Forces complète',
            'PESTEL complète',
            'Analyse Concurrentielle',
            'Rapports détaillés',
            'Projets illimités',
            '50GB stockage',
            'Export PDF',
            'Support prioritaire'
        ],
        enterprise: [
            'Tout inclus',
            'Toutes les analyses avancées',
            'Matrice d\'intégration',
            'Simulateur de négociation',
            'Plan d\'action 100 jours',
            'Rapports personnalisés',
            'Projets illimités',
            'Stockage illimité',
            'Accès API complet',
            'Support dédié',
            'Formation incluse'
        ]
    };
    
    if (modal && modalTitle && modalBody) {
        modalTitle.textContent = `Souscrire à ${planNames[plan] || plan}`;
        
        let featuresHtml = '<ul style="text-align: left; margin-top: var(--spacing-lg);">';
        planFeatures[plan].forEach(feature => {
            featuresHtml += `<li style="margin-bottom: var(--spacing-sm); color: var(--gray-600);"><i class="fas fa-check" style="color: var(--success); margin-right: var(--spacing-sm);"></i>${feature}</li>`;
        });
        featuresHtml += '</ul>';
        
        modalBody.innerHTML = `
            <div class="plan-details">
                <div class="detail-item">
                    <span class="detail-label">Formule</span>
                    <span class="detail-value">${planNames[plan] || plan}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Prix</span>
                    <span class="detail-value">${planPrices[plan] || 'N/A'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Tokens</span>
                    <span class="detail-value">${planTokens[plan] || 'N/A'}</span>
                </div>
            </div>
            <h4 style="margin-top: var(--spacing-xl);">Fonctionnalités incluses :</h4>
            ${featuresHtml}
            <p style="margin-top: var(--spacing-lg);">
                Vous allez être redirigé vers Stripe pour finaliser votre paiement.
            </p>
        `;
        
        if (modalConfirm) {
            modalConfirm.setAttribute('data-plan', plan);
        }
        
        modal.classList.add('visible');
    }
}

// Ouvrir le modal d'achat de pack de tokens
function openTokenPackModal(packId) {
    const modal = document.getElementById('tokenPackModal');
    const modalTitle = document.getElementById('tokenModalTitle');
    const modalBody = document.getElementById('tokenModalBody');
    const modalConfirm = document.getElementById('tokenModalConfirm');
    
    const pack = TokenPacks.find(p => p.id === packId);
    
    if (modal && modalTitle && modalBody && pack) {
        modalTitle.textContent = `Acheter le pack ${pack.name}`;
        
        modalBody.innerHTML = `
            <div class="pack-details">
                <div class="detail-item">
                    <span class="detail-label">Nom du pack</span>
                    <span class="detail-value">${pack.name}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Nombre de tokens</span>
                    <span class="detail-value">${pack.tokenAmount}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Prix</span>
                    <span class="detail-value">${TokenUtils.formatPrice(pack.priceEuros)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Prix par token</span>
                    <span class="detail-value">${TokenUtils.formatPrice(pack.pricePerToken)}</span>
                </div>
            </div>
            <p style="margin-top: var(--spacing-lg);">${pack.description}</p>
            <p style="margin-top: var(--spacing-md); color: var(--gray-600); font-size: var(--font-size-sm);">
                Vous allez être redirigé vers Stripe pour finaliser votre paiement.
            </p>
        `;
        
        if (modalConfirm) {
            modalConfirm.setAttribute('data-pack', packId);
        }
        
        modal.classList.add('visible');
    }
}

// Confirmer l'abonnement
async function confirmSubscription(plan) {
    const user = authService.currentUser;
    
    if (!user) {
        showAlert('error', 'Erreur', 'Vous devez être connecté pour souscrire.');
        return;
    }
    
    try {
        const result = await stripeService.purchaseSubscription(plan, user.uid);
        
        if (result.success) {
            if (result.isFree) {
                showAlert('success', 'Succès', 'Votre abonnement a été mis à jour avec succès !');
                setTimeout(() => window.location.reload(), 1500);
            } else if (result.redirected) {
                // La redirection vers Stripe a déjà été effectuée
                // Ne rien faire, on est déjà parti
            } else {
                showAlert('success', 'Succès', 'Votre abonnement a été lancé.');
            }
        } else {
            showAlert('error', 'Erreur', result.error || 'Une erreur est survenue.');
        }
    } catch (error) {
        // Si on attrpe une erreur, c'est probablement que la redirection a échoué
        // Mais avec redirectToCheckout, on ne devrait pas arriver ici
        console.error('Erreur dans confirmSubscription:', error);
        showAlert('error', 'Erreur', error.message || 'Une erreur est survenue.');
    }
}

// Confirmer l'achat de pack de tokens
async function confirmTokenPackPurchase(packId) {
    const user = authService.currentUser;
    
    if (!user) {
        showAlert('error', 'Erreur', 'Vous devez être connecté pour acheter des tokens.');
        return;
    }
    
    try {
        const result = await stripeService.purchaseTokenPack(packId, user.uid);
        
        if (result.success) {
            showAlert('success', 'Succès', `Vos tokens ont été ajoutés à votre compte !`);
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showAlert('error', 'Erreur', result.error || 'Une erreur est survenue.');
        }
    } catch (error) {
        showAlert('error', 'Erreur', error.message || 'Une erreur est survenue.');
    }
}

// Initialiser le calculateur de tokens
function initTokenCalculator() {
    const analysisTypes = {
        swot: { min: 5, max: 10, avg: 7 },
        porter: { min: 20, max: 120, avg: 40 },
        pestel: { min: 15, max: 75, avg: 30 },
        competitive: { min: 20, max: 160, avg: 60 },
        report: { min: 25, max: 250, avg: 80 }
    };
    
    // Mettre à jour le coût affiché
    function updateTokenCosts() {
        const counts = {
            swot: document.getElementById('swotCount'),
            porter: document.getElementById('porterCount'),
            pestel: document.getElementById('pestelCount'),
            competitive: document.getElementById('competitiveCount'),
            report: document.getElementById('reportCount')
        };
        
        let total = 0;
        
        for (const [type, element] of Object.entries(counts)) {
            if (element) {
                const count = parseInt(element.value) || 0;
                const cost = count * analysisTypes[type].avg;
                total += cost;
                
                // Mettre à jour le coût affiché
                const costEl = element.closest('.calculator-item').querySelector('.token-cost');
                if (costEl) {
                    costEl.textContent = `${cost} tokens`;
                }
            }
        }
        
        // Mettre à jour le total
        const totalEl = document.getElementById('totalTokens');
        if (totalEl) {
            totalEl.textContent = `${total} tokens`;
        }
    }
    
    // Ajouter des écouteurs aux inputs
    const inputs = ['swotCount', 'porterCount', 'pestelCount', 'competitiveCount', 'reportCount'];
    inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('change', updateTokenCosts);
            input.addEventListener('input', updateTokenCosts);
        }
    });
    
    // Initialiser
    updateTokenCosts();
}

// Afficher une alerte
function showAlert(type, title, message) {
    // Utiliser la fonction showAlert de main.js (si elle existe et est différente)
    if (typeof window.showAlert === 'function' && window.showAlert !== showAlert) {
        window.showAlert(type, title, message);
    } else {
        // Fallback
        alert(`${title}: ${message}`);
    }
}

// Vérifier le statut de l'abonnement Stripe au chargement de la page
async function checkStripeSubscriptionStatus() {
    // Analyser les paramètres de l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const planId = urlParams.get('planId');
    const sessionId = urlParams.get('session_id');
    
    // Si on revient d'un paiement réussi
    if (success === 'true' && planId) {
        const user = authService.currentUser;
        if (!user) {
            showAlert('error', 'Erreur', 'Vous devez être connecté pour activer votre abonnement.');
            // Nettoyer l'URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        
        // Vérifier si on est en mode démo
        const isFileProtocol = window.location.protocol === 'file:';
        const isFirebaseAvailable = typeof window.firebase !== 'undefined' && window.firebase;
        const isDemoMode = !isFirebaseAvailable || isFileProtocol;
        
        if (isDemoMode) {
            // Mode démo : activer l'abonnement automatiquement
            try {
                // Mettre à jour le plan de l'utilisateur en mode démo
                if (authService.userData) {
                    authService.userData.plan = planId;
                    
                    // Définir un délai d'expiration pour l'abonnement démo (30 jours)
                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + 30);
                    authService.userData.subscriptionExpiry = expirationDate.toISOString();
                    
                    showAlert('success', 'Succès', `Abonnement ${planId.toUpperCase()} activé ! (mode démo - 30 jours)`);
                } else {
                    showAlert('error', 'Erreur', 'Impossible de mettre à jour l\'abonnement en mode démo.');
                }
            } catch (error) {
                console.error('[STRIPE] Erreur mode démo abonnement:', error);
                showAlert('error', 'Erreur', 'Impossible d\'activer l\'abonnement en mode démo.');
            }
        } else {
            // Mode production : vérifier le paiement via Stripe
            try {
                // Créer une référence Firebase Functions
                const functions = firebase.functions();
                
                // Appeler la fonction pour vérifier l'abonnement
                const confirmSubscription = functions.httpsCallable('confirmStripeSubscription');
                const result = await confirmSubscription({ 
                  userId: user.uid, 
                  sessionId: sessionId, 
                  planId: planId 
                });
                
                if (result.data.success) {
                    showAlert('success', 'Succès', `Abonnement ${planId.toUpperCase()} activé !`);
                    
                    // Recharger les données utilisateur
                    if (typeof authService.loadUserData === 'function') {
                        await authService.loadUserData(user.uid);
                    }
                    
                    // Déclencher une mise à jour de l'UI pour que le dashboard se rafraîchisse
                    if (typeof authService.updateUI === 'function') {
                        authService.updateUI();
                    }
                    
                    // Recharger la page pour appliquer les changements de plan
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    showAlert('error', 'Erreur', result.data.error || 'Abonnement non activé.');
                }
            } catch (error) {
                console.error('[STRIPE] Erreur vérification abonnement:', error);
                showAlert('warning', 'Attention', 'Abonnement peut-être activé. Veuillez rafraîchir la page ou contacter le support.');
            }
        }
        
        // Nettoyer l'URL après traitement
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (success === 'false' || urlParams.get('canceled') === 'true') {
        showAlert('warning', 'Paiement annulé', 'Vous avez annulé l\'abonnement.');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Rendre les fonctions disponibles globalement
window.openSubscriptionModal = openSubscriptionModal;
window.openTokenPackModal = openTokenPackModal;
window.confirmSubscription = confirmSubscription;
window.confirmTokenPackPurchase = confirmTokenPackPurchase;
window.increment = increment;
window.decrement = decrement;
window.scrollToSubscriptions = scrollToSubscriptions;
