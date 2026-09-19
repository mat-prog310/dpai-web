// =============================================================================
// TOKEN-SHOP.JS - Gestion de la boutique de tokens
// =============================================================================

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    // Vérifier le retour de paiement Stripe
    checkStripePaymentStatus();
    
    initTokenShop();
});

// Initialiser la boutique de tokens
function initTokenShop() {
    // Vérifier l'état d'authentification
    checkAuthStatus();
    
    // Initialiser les boutons d'achat
    initBuyPackButtons();
    
    // Initialiser le calculateur de tokens
    initTokenCalculator();
    
    // Initialiser les FAQ
    initFAQ();
    
    // Initialiser les modaux
    initModals();
    
    // Écouter les changements d'authentification
    window.addEventListener('authStateChanged', function(event) {
        const { user, userData } = event.detail;
        checkAuthStatus(user, userData);
    });
}

// Vérifier l'état d'authentification
function checkAuthStatus(user, userData) {
    const user = user || authService.currentUser;
    const userDataFinal = userData || authService.userData;
    
    const tokenBalanceCard = document.getElementById('tokenBalanceCard');
    const unauthenticatedView = document.getElementById('unauthenticatedTokenShop');
    const tokenPacksSection = document.getElementById('tokenPacksSection');
    const userTokensEl = document.getElementById('userTokens');
    
    if (user && userDataFinal) {
        // Utilisateur connecté
        if (tokenBalanceCard) tokenBalanceCard.style.display = 'flex';
        if (unauthenticatedView) unauthenticatedView.style.display = 'none';
        if (tokenPacksSection) tokenPacksSection.style.display = 'block';
        
        // Mettre à jour les tokens
        if (userTokensEl) {
            const availableTokens = userDataFinal.availableTokens || userDataFinal.tokenState?.availableTokens || 0;
            userTokensEl.textContent = TokenUtils.formatTokens(availableTokens);
        }
        
        // Sauvegarder les données utilisateur
        TokenManager.init(userDataFinal);
        
    } else {
        // Utilisateur non connecté
        if (tokenBalanceCard) tokenBalanceCard.style.display = 'none';
        if (unauthenticatedView) unauthenticatedView.style.display = 'block';
        if (tokenPacksSection) tokenPacksSection.style.display = 'none';
    }
}

// Initialiser les boutons d'achat de packs
function initBuyPackButtons() {
    const buyPackBtns = document.querySelectorAll('[id="buyPackBtn"], button[data-pack]');
    
    buyPackBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const packId = this.getAttribute('data-pack');
            if (packId) {
                openTokenPackModal(packId);
            }
        });
    });
}

// Initialiser le calculateur de tokens
function initTokenCalculator() {
    // Coûts par type d'analyse
    const analysisCosts = {
        swot: TokenManager.getCost('swot', authService.userData?.plan || 'free'),
        porter: TokenManager.getCost('porter', authService.userData?.plan || 'free'),
        pestel: TokenManager.getCost('pestel', authService.userData?.plan || 'free'),
        competitive: TokenManager.getCost('competitive', authService.userData?.plan || 'free'),
        report: TokenManager.getCost('detailed_report', authService.userData?.plan || 'free')
    };
    
    // Mettre à jour les coûts affichés
    function updateTokenCosts() {
        const inputs = ['swotCount', 'porterCount', 'pestelCount', 'competitiveCount', 'reportCount'];
        let total = 0;
        
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                const count = parseInt(input.value) || 0;
                const type = id.replace('Count', '');
                const costPerAnalysis = analysisCosts[type] || AnalysisManager.analysisCosts[type]?.free || 10;
                const cost = count * costPerAnalysis;
                total += cost;
                
                // Mettre à jour le coût affiché
                const costEl = input.closest('.calculator-item').querySelector('.token-cost');
                if (costEl) {
                    costEl.textContent = `${cost} tokens`;
                }
            }
        });
        
        // Mettre à jour le total
        const totalEl = document.getElementById('totalTokens');
        if (totalEl) {
            totalEl.textContent = `${total} tokens`;
        }
        
        // Mettre à jour la recommandation
        updateRecommendation(total);
    }
    
    // Mettre à jour la recommandation de pack
    function updateRecommendation(totalTokens) {
        const recommendationText = document.getElementById('recommendationText');
        const userTokens = authService.userData?.availableTokens || 0;
        
        if (!recommendationText) return;
        
        if (totalTokens === 0) {
            recommendationText.textContent = 'Aucun pack recommandé';
            return;
        }
        
        // Trouver le pack le plus adapté
        let bestPack = null;
        let bestValue = -Infinity;
        
        TokenPacks.forEach(pack => {
            const cost = totalTokens;
            const packTokens = pack.tokenAmount;
            
            // Si le pack couvre exactement ou légèrement plus
            if (packTokens >= cost) {
                const value = packTokens / pack.priceEuros;
                if (value > bestValue) {
                    bestValue = value;
                    bestPack = pack;
                }
            }
        });
        
        if (bestPack) {
            if (userTokens >= totalTokens) {
                recommendationText.textContent = `Vous avez assez de tokens (${TokenUtils.formatTokens(userTokens)} disponibles)`;
            } else {
                const needed = totalTokens - userTokens;
                recommendationText.textContent = `Nous recommandons le pack ${bestPack.name} (${bestPack.tokenAmount} tokens pour ${TokenUtils.formatPrice(bestPack.priceEuros)})`;
            }
        } else {
            // Trouver le pack qui donne le plus de tokens
            const largestPack = TokenPacks.reduce((a, b) => a.tokenAmount > b.tokenAmount ? a : b);
            recommendationText.textContent = `Pour de grandes analyses, le pack ${largestPack.name} (${largestPack.tokenAmount} tokens) est recommandé`;
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
    
    // Initialiser avec les valeurs actuelles
    updateTokenCosts();
}

// Initialiser les FAQ
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        if (question) {
            question.addEventListener('click', function() {
                const isOpen = item.classList.contains('open');
                
                // Fermer toutes les FAQ
                faqItems.forEach(i => i.classList.remove('open'));
                
                // Ouvrir/femer celle cliquée
                if (!isOpen) {
                    item.classList.add('open');
                }
            });
        }
    });
}

// Initialiser les modaux
function initModals() {
    const tokenPackModal = document.getElementById('tokenPackModal');
    
    if (tokenPackModal) {
        const tokenModalClose = document.getElementById('tokenModalClose');
        const tokenModalCancel = document.getElementById('tokenModalCancel');
        const tokenModalConfirm = document.getElementById('tokenModalConfirm');
        
        // Fermer le modal
        if (tokenModalClose) {
            tokenModalClose.onclick = function() {
                tokenPackModal.classList.remove('visible');
            };
        }
        
        if (tokenModalCancel) {
            tokenModalCancel.onclick = function() {
                tokenPackModal.classList.remove('visible');
            };
        }
        
        // Confirmer l'achat
        if (tokenModalConfirm) {
            tokenModalConfirm.onclick = function() {
                const packId = tokenModalConfirm.getAttribute('data-pack');
                if (packId) {
                    purchaseTokenPack(packId);
                }
            };
        }
    }
}

// Ouvrir le modal d'achat de pack de tokens
function openTokenPackModal(packId) {
    const modal = document.getElementById('tokenPackModal');
    const modalTitle = document.getElementById('tokenModalTitle');
    const modalBody = document.getElementById('tokenModalBody');
    const modalConfirm = document.getElementById('tokenModalConfirm');
    
    const user = authService.currentUser;
    
    if (!user) {
        showAlert('error', 'Erreur', 'Vous devez être connecté pour acheter des tokens.');
        return;
    }
    
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
                ${pack.isBestValue ? '<div class="best-value-badge"><i class="fas fa-star"></i> Meilleur rapport qualité-prix</div>' : ''}
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

// Acheter un pack de tokens
async function purchaseTokenPack(packId) {
    const user = authService.currentUser;
    
    if (!user) {
        showAlert('error', 'Erreur', 'Vous devez être connecté pour acheter des tokens.');
        return;
    }
    
    const pack = TokenPacks.find(p => p.id === packId);
    if (!pack) {
        showAlert('error', 'Erreur', 'Pack de tokens introuvable.');
        return;
    }
    
    try {
        const result = await stripeService.purchaseTokenPack(packId, user.uid);
        
        if (result.success) {
            // Fermer le modal
            const modal = document.getElementById('tokenPackModal');
            if (modal) modal.classList.remove('visible');
            
            showAlert('success', 'Succès', `Votre achat de ${pack.tokenAmount} tokens a été traité avec succès !`);
            
            // Recharger la page pour mettre à jour les tokens
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showAlert('error', 'Erreur', result.error || 'Une erreur est survenue lors de l\'achat.');
        }
    } catch (error) {
        showAlert('error', 'Erreur', error.message || 'Une erreur est survenue.');
    }
}

// Fonctions pour le calculateur
function increment(id) {
    const input = document.getElementById(id);
    if (input) {
        let value = parseInt(input.value) || 0;
        input.value = value + 1;
        const event = new Event('change');
        input.dispatchEvent(event);
    }
}

function decrement(id) {
    const input = document.getElementById(id);
    if (input) {
        let value = parseInt(input.value) || 0;
        input.value = Math.max(0, value - 1);
        const event = new Event('change');
        input.dispatchEvent(event);
    }
}

// Afficher une alerte
function showAlert(type, title, message) {
    if (typeof window.showAlert === 'function') {
        window.showAlert(type, title, message);
    } else {
        alert(`${title}: ${message}`);
    }
}

// Vérifier le statut du paiement Stripe au chargement de la page
async function checkStripePaymentStatus() {
    // Analyser les paramètres de l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const packId = urlParams.get('packId');
    const sessionId = urlParams.get('session_id');
    
    // Si on revient d'un paiement réussi
    if (success === 'true' && packId) {
        const user = authService.currentUser;
        if (!user) {
            showAlert('error', 'Erreur', 'Vous devez être connecté pour recevoir vos tokens.');
            // Nettoyer l'URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        
        // Vérifier si on est en mode démo
        const isFileProtocol = window.location.protocol === 'file:';
        const isFirebaseAvailable = typeof window.firebase !== 'undefined' && window.firebase;
        const isDemoMode = !isFirebaseAvailable || isFileProtocol;
        
        if (isDemoMode) {
            // Mode démo : créditer les tokens automatiquement
            try {
                const pack = TokenPacks.find(p => p.id === packId);
                if (pack) {
                    // Simuler l'ajout des tokens en mode démo
                    if (window.TokenManager) {
                        const currentAvailable = window.TokenManager._demoTokens || 9999;
                        const newAvailable = currentAvailable + pack.tokenAmount;
                        window.TokenManager._demoTokens = newAvailable;
                        
                        // Redéfinir le getter
                        Object.defineProperty(window.TokenManager, 'availableTokens', {
                            get: function() { 
                                return window.TokenManager._demoTokens || 9999; 
                            },
                            configurable: true
                        });
                        
                        // Mettre à jour userData
                        if (!window.TokenManager.userData) {
                            window.TokenManager.userData = {};
                        }
                        if (!window.TokenManager.userData.tokenState) {
                            window.TokenManager.userData.tokenState = {
                                availableTokens: 9999,
                                usedTokens: 0,
                                totalTokens: 9999
                            };
                        }
                        window.TokenManager.userData.tokenState.availableTokens = newAvailable;
                        window.TokenManager.userData.tokenState.totalTokens += pack.tokenAmount;
                        
                        // Mettre à jour l'UI
                        if (typeof updateTokenDisplay === 'function') {
                            updateTokenDisplay();
                        }
                        
                        showAlert('success', 'Succès', `Paiement simulé ! ${pack.tokenAmount} tokens ajoutés à votre compte (mode démo).`);
                    }
                } else {
                    showAlert('error', 'Erreur', `Pack ${packId} introuvable.`);
                }
            } catch (error) {
                console.error('[STRIPE] Erreur mode démo:', error);
                showAlert('error', 'Erreur', 'Impossible de créditer les tokens en mode démo.');
            }
        } else {
            // Mode production : vérifier le paiement via Stripe
            try {
                // Créer une référence Firebase Functions
                const functions = firebase.functions();
                
                // Appeler la fonction pour vérifier le paiement
                const confirmPayment = functions.httpsCallable('confirmStripePayment');
                const result = await confirmPayment({ sessionId: sessionId });
                
                if (result.data.success) {
                    showAlert('success', 'Succès', `Paiement validé ! ${result.data.tokensAdded} tokens ajoutés à votre compte.`);
                    
                    // Recharger les données utilisateur
                    if (typeof loadUserTokenData === 'function') {
                        await loadUserTokenData(user.uid);
                    }
                    
                    // Mettre à jour l'UI
                    if (typeof updateTokenDisplay === 'function') {
                        updateTokenDisplay();
                    }
                } else {
                    showAlert('error', 'Erreur', result.data.error || 'Paiement non validé.');
                }
            } catch (error) {
                console.error('[STRIPE] Erreur vérification paiement:', error);
                showAlert('warning', 'Attention', 'Paiement peut-être réussi. Veuillez rafraîchir la page ou contacter le support si les tokens ne sont pas crédités.');
            }
        }
        
        // Nettoyer l'URL après traitement
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (success === 'false' || urlParams.get('canceled') === 'true') {
        showAlert('warning', 'Paiement annulé', 'Vous avez annulé le paiement.');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Rendre les fonctions disponibles globalement
window.openTokenPackModal = openTokenPackModal;
window.purchaseTokenPack = purchaseTokenPack;
window.increment = increment;
window.decrement = decrement;
