// =============================================================================
// MAIN.JS - Script principal pour DPAI Web
// =============================================================================

// Références Firebase (exposées par firebase-config.js)
// db est défini globalement dans firebase-config.js

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    initFirebase();
    initAuth();
    initNavigation();
    initScroll();
    initTabs();
    initFAQ();
    // ⚠️ initModals() et initTokenCalculator() sont gérés par pricing.js
    // ⚠️ NE PAS les dupliquer ici pour éviter les doubles handlers
    initForms();
});

// =============================================================================
// INITIALISATION FIREBASE
// =============================================================================
function initFirebase() {
    if (typeof firebase === 'undefined') {
        console.warn('Firebase non chargé. Veuillez vérifier les scripts.');
        return;
    }
    
    try {
        const firebaseRef = window.firebase || firebase;
        if (!firebaseRef.apps.length) {
            console.warn('Firebase non initialisé. Configuration manquante.');
        }
    } catch (error) {
        console.error('Erreur initialisation Firebase:', error);
    }
}

// =============================================================================
// INITIALISATION AUTHENTIFICATION
// =============================================================================
function initAuth() {
    if (typeof authService === 'undefined') {
        console.warn('⚠️ authService non chargé');
        return;
    }
    
    authService.init();
    
    window.addEventListener('authStateChanged', function(event) {
        const { user, userData } = event.detail;
        updateAuthUI(user, userData);
    });
}

function updateAuthUI(user, userData) {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');
    const unauthenticatedView = document.getElementById('unauthenticatedView');
    const dashboardContent = document.getElementById('dashboardContent');
    const dashboardHeader = document.getElementById('dashboardHeader');
    const welcomeUserName = document.getElementById('welcomeUserName');
    const dashboardUserName = document.getElementById('dashboardUserName');
    
    if (user && userData) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (userMenu) userMenu.style.display = 'block';
        if (userName) userName.textContent = user.displayName || user.email || 'Compte';
        if (unauthenticatedView) unauthenticatedView.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'block';
        if (dashboardHeader) dashboardHeader.style.display = 'block';
        if (welcomeUserName) welcomeUserName.textContent = user.displayName || user.email || 'Utilisateur';
        if (dashboardUserName) dashboardUserName.textContent = user.displayName || user.email || 'Utilisateur';
        
        updateDashboardStats(userData);
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (registerBtn) registerBtn.style.display = 'inline-flex';
        if (userMenu) userMenu.style.display = 'none';
        if (unauthenticatedView) unauthenticatedView.style.display = 'block';
        if (dashboardContent) dashboardContent.style.display = 'none';
        if (dashboardHeader) dashboardHeader.style.display = 'none';
    }
    
    if (logoutBtn) {
        logoutBtn.onclick = function(e) {
            e.preventDefault();
            authService.signOut().then(() => {
                window.location.reload();
            });
        };
    }
}

function updateDashboardStats(userData) {
    if (!userData) return;
    
    const planNames = { free: 'Gratuit', pro: 'Pro', enterprise: 'Entreprise' };
    
    const availableTokensEl = document.getElementById('availableTokens');
    const usedTokensEl = document.getElementById('usedTokens');
    const totalTokensEl = document.getElementById('totalTokens');
    const tokenProgressEl = document.getElementById('tokenProgress');
    const userPlanEl = document.getElementById('userPlan');
    
    const format = (window.TokenUtils && TokenUtils.formatTokens) 
        ? TokenUtils.formatTokens.bind(TokenUtils) 
        : (v) => String(v);
    
    if (availableTokensEl) availableTokensEl.textContent = format(userData.availableTokens || 0);
    if (usedTokensEl) usedTokensEl.textContent = format(userData.tokensUsed || 0);
    if (totalTokensEl) totalTokensEl.textContent = format(userData.totalTokens || 0);
    
    if (tokenProgressEl) {
        const percentage = userData.tokenUsagePercentage || 0;
        tokenProgressEl.style.width = `${percentage}%`;
        
        if (percentage > 80) {
            tokenProgressEl.classList.add('error');
            tokenProgressEl.classList.remove('warning');
        } else if (percentage > 50) {
            tokenProgressEl.classList.add('warning');
            tokenProgressEl.classList.remove('error');
        } else {
            tokenProgressEl.classList.remove('warning', 'error');
        }
    }
    if (userPlanEl) userPlanEl.textContent = planNames[userData.plan] || userData.plan || 'Gratuit';
    
    const totalAnalysesEl = document.getElementById('totalAnalyses');
    const monthlyAnalysesEl = document.getElementById('monthlyAnalyses');
    if (totalAnalysesEl) totalAnalysesEl.textContent = userData.totalAnalyses || 0;
    if (monthlyAnalysesEl) monthlyAnalysesEl.textContent = userData.monthlyAnalyses || 0;
    
    const tokenAvailableEl = document.getElementById('tokenAvailable');
    const tokenUsedMonthlyEl = document.getElementById('tokenUsedMonthly');
    const tokenMonthlyLimitEl = document.getElementById('tokenMonthlyLimit');
    if (tokenAvailableEl) tokenAvailableEl.textContent = format(userData.availableTokens || 0);
    if (tokenUsedMonthlyEl) tokenUsedMonthlyEl.textContent = format(userData.tokensUsed || 0);
    if (tokenMonthlyLimitEl) tokenMonthlyLimitEl.textContent = format(userData.tokenLimit || 50);
    
    const loyaltyTokensEl = document.getElementById('loyaltyTokens');
    const loyaltyTotalAnalysesEl = document.getElementById('loyaltyTotalAnalyses');
    const loyaltyMonthlyAnalysesEl = document.getElementById('loyaltyMonthlyAnalyses');
    if (loyaltyTokensEl && userData.loyaltyInfo) loyaltyTokensEl.textContent = format(userData.loyaltyInfo.monthlyLoyaltyTokens || 0);
    if (loyaltyTotalAnalysesEl && userData.loyaltyInfo) loyaltyTotalAnalysesEl.textContent = userData.loyaltyInfo.totalAnalyses || 0;
    if (loyaltyMonthlyAnalysesEl && userData.loyaltyInfo) loyaltyMonthlyAnalysesEl.textContent = userData.loyaltyInfo.monthlyAnalyses || 0;
}

// =============================================================================
// INITIALISATION NAVIGATION
// =============================================================================
function initNavigation() {
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    const navActions = document.querySelector('.nav-actions');
    const navbar = document.querySelector('.navbar');
    
    if (mobileToggle && navLinks) {
        mobileToggle.onclick = function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
            if (navActions) navActions.classList.toggle('active');
        };
    }
    
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
        });
    }
    
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        link.addEventListener('click', function() {
            if (mobileToggle && mobileToggle.classList.contains('active')) {
                mobileToggle.classList.remove('active');
                if (navLinks) navLinks.classList.remove('active');
                if (navActions) navActions.classList.remove('active');
            }
        });
    });
}

// =============================================================================
// INITIALISATION SCROLL
// =============================================================================
function initScroll() {
    const backToTop = document.getElementById('backToTop');
    
    if (backToTop) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) backToTop.classList.add('visible');
            else backToTop.classList.remove('visible');
        });
        
        backToTop.onclick = function(e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    }
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }
        });
    });
}

// =============================================================================
// INITIALISATION TABS
// =============================================================================
function initTabs() {
    // ⚠️ géré par pricing.js si tu es sur pricing.html
    // Ici on garde pour la page index.html
    const tabs = document.querySelectorAll('.pricing-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const section = document.getElementById(tabId);
            if (section) section.scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// =============================================================================
// INITIALISATION FAQ
// =============================================================================
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', function() {
                const isOpen = item.classList.contains('open');
                faqItems.forEach(i => i.classList.remove('open'));
                if (!isOpen) item.classList.add('open');
            });
        }
    });
}

// =============================================================================
// ❌ SUPPRIMÉ : initModals() - doublon avec pricing.js
// ❌ SUPPRIMÉ : openSubscriptionModal() - doublon
// ❌ SUPPRIMÉ : openTokenPackModal() - doublon
// ❌ SUPPRIMÉ : purchaseSubscription() - doublon
// ❌ SUPPRIMÉ : purchaseTokenPack() - doublon
// ❌ SUPPRIMÉ : initTokenCalculator() - doublon
// ❌ SUPPRIMÉ : increment() / decrement() - gérés par pricing.js
// ❌ SUPPRIMÉ : scrollToSubscriptions() - gérés par pricing.js
// =============================================================================

// =============================================================================
// INITIALISATION FORMS
// =============================================================================
function initForms() {
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.onclick = function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        };
    });
    
    const passwordInput = document.getElementById('registerPassword');
    const passwordStrength = document.getElementById('passwordStrength');
    const passwordStrengthText = document.getElementById('passwordStrengthText');
    
    if (passwordInput && passwordStrength) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            passwordStrength.style.width = `${strength.percent}%`;
            passwordStrength.style.backgroundColor = strength.color;
            if (passwordStrengthText) {
                passwordStrengthText.textContent = strength.label;
                passwordStrengthText.style.color = strength.color;
            }
        });
    }
    
    const confirmPasswordInput = document.getElementById('registerConfirmPassword');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    
    if (confirmPasswordInput && passwordInput && confirmPasswordError) {
        confirmPasswordInput.addEventListener('input', function() {
            if (this.value !== passwordInput.value) {
                confirmPasswordError.style.display = 'block';
                this.classList.add('error');
            } else {
                confirmPasswordError.style.display = 'none';
                this.classList.remove('error');
            }
        });
    }
}

function calculatePasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 10;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;
    score = Math.min(score, 100);
    
    let color, label;
    if (score < 30) { color = '#ef4444'; label = 'Faible'; }
    else if (score < 60) { color = '#f59e0b'; label = 'Moyen'; }
    else if (score < 80) { color = '#10b981'; label = 'Bon'; }
    else { color = '#10b981'; label = 'Excellente'; }
    
    return { score, percent: score, color, label };
}

// =============================================================================
// ANALYSE FONCTIONS
// =============================================================================
function startAnalysis(type) {
    const modal = document.getElementById('analysisModal');
    if (modal) {
        const analysisTypeInput = document.getElementById('analysisType');
        if (analysisTypeInput) analysisTypeInput.value = type;
        updateAnalysisEstimation(type);
        modal.classList.add('visible');
    }
}

function updateAnalysisEstimation(type) {
    const estimatedAnalysisTypeEl = document.getElementById('estimatedAnalysisType');
    const estimatedTokensEl = document.getElementById('estimatedTokens');
    const userAvailableTokensEl = document.getElementById('userAvailableTokens');
    const insufficientTokensAlert = document.getElementById('insufficientTokensAlert');
    const startAnalysisBtn = document.getElementById('startAnalysisBtn');
    
    if (typeof TokenManager === 'undefined') {
        console.warn('⚠️ TokenManager non chargé');
        return;
    }
    
    const plan = authService.userData?.plan || 'free';
    const cost = TokenManager.getCost(type, plan);
    const available = authService.userData?.availableTokens || 0;
    const canAfford = available >= cost;
    
    if (estimatedAnalysisTypeEl) {
        const analysisNames = {
            swot: 'Analyse SWOT',
            porter: 'Porter 5 Forces',
            pestel: 'Analyse PESTEL',
            competitive: 'Analyse Concurrentielle'
        };
        estimatedAnalysisTypeEl.textContent = analysisNames[type] || type;
    }
    if (estimatedTokensEl) estimatedTokensEl.textContent = cost;
    if (userAvailableTokensEl) userAvailableTokensEl.textContent = available;
    
    if (insufficientTokensAlert) {
        insufficientTokensAlert.style.display = canAfford ? 'none' : 'flex';
        if (startAnalysisBtn) startAnalysisBtn.disabled = !canAfford;
    }
}

function initAnalysisForm() {
    const analysisForm = document.getElementById('analysisForm');
    const analysisTypeSelect = document.getElementById('analysisType');
    
    if (analysisForm && analysisTypeSelect) {
        analysisTypeSelect.addEventListener('change', function() {
            updateAnalysisEstimation(this.value);
        });
        
        analysisForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const type = analysisTypeSelect.value;
            const name = document.getElementById('analysisName').value;
            const description = document.getElementById('analysisDescription').value;
            
            if (!type) {
                showAlert('error', 'Erreur', 'Veuillez sélectionner un type d\'analyse.');
                return;
            }
            
            const plan = authService.userData?.plan || 'free';
            const cost = TokenManager.getCost(type, plan);
            const available = authService.userData?.availableTokens || 0;
            
            if (available < cost) {
                showAlert('error', 'Erreur', 'Vous n\'avez pas assez de tokens pour cette analyse.');
                return;
            }
            
            const modal = document.getElementById('analysisModal');
            if (modal) modal.classList.remove('visible');
            
            launchAnalysis(type, name, description, cost);
        });
    }
}

async function launchAnalysis(type, name, description, cost, companyData) {
    const isFileProtocol = window.location.protocol === 'file:';
    const isFirebaseAvailable = typeof window.firebase !== 'undefined' && window.firebase;
    const isDemoMode = !isFirebaseAvailable || isFileProtocol;
    
    try {
        let analysisData = null;
        
        if (!isDemoMode) {
            await TokenManager.useTokens(cost, type);
            const user = authService.currentUser;
            if (user) {
                const docRef = await db.collection('users').doc(user.uid).collection('analyses').add({
                    type, name, description, cost,
                    status: 'completed',
                    createdAt: new Date().toISOString(),
                    results: generateMockResults(type)
                });
                analysisData = {
                    id: docRef.id, type, name, description, cost,
                    status: 'completed',
                    createdAt: new Date().toISOString(),
                    results: generateMockResults(type),
                    score: 75
                };
            }
        } else {
            if (window.TokenManager) {
                const currentAvailable = window.TokenManager.availableTokens || 9999;
                const newAvailable = currentAvailable - cost;
                
                if (!window.TokenManager._demoTokens) window.TokenManager._demoTokens = currentAvailable;
                window.TokenManager._demoTokens = newAvailable;
                
                Object.defineProperty(window.TokenManager, 'availableTokens', {
                    get: function() { return window.TokenManager._demoTokens || 9999; },
                    configurable: true
                });
                
                if (!window.TokenManager.userData) window.TokenManager.userData = {};
                if (!window.TokenManager.userData.tokenState) {
                    window.TokenManager.userData.tokenState = { availableTokens: 9999, usedTokens: 0, totalTokens: 9999 };
                }
                window.TokenManager.userData.tokenState.availableTokens = newAvailable;
                window.TokenManager.userData.tokenState.usedTokens = 9999 - newAvailable;
            }
            
            analysisData = {
                id: 'demo-' + Date.now(),
                type, name: name || `Analyse ${type}`, description: description || '',
                cost, status: 'completed',
                createdAt: new Date().toISOString(),
                results: generateMockResults(type),
                score: 75
            };
            
            try {
                let demoAnalyses = JSON.parse(localStorage.getItem('dpai_demo_analyses') || '[]');
                demoAnalyses.unshift(analysisData);
                if (demoAnalyses.length > 5) demoAnalyses = demoAnalyses.slice(0, 5);
                localStorage.setItem('dpai_demo_analyses', JSON.stringify(demoAnalyses));
            } catch (e) {
                console.error('[DPAI] Erreur sauvegarde historique démo:', e);
            }
        }
        
        showAlert('success', 'Succès', `Votre analyse ${name} a été lancée avec succès !`);
        
        if (typeof showAnalysisResults === 'function' && analysisData) {
            showAnalysisResults(analysisData);
        }
        
        if (typeof updateAfterAnalysis === 'function') {
            updateAfterAnalysis(type, name, description, cost);
        }
    } catch (error) {
        console.error('[DPAI] Erreur dans launchAnalysis:', error);
        showAlert('error', 'Erreur', error.message || 'Une erreur est survenue.');
    }
}

function generateMockResults(type) {
    const results = {
        swot: {
            strengths: ['Forte notoriété', 'Équipe expérimentée', 'Technologie avancée'],
            weaknesses: ['Coûts élevés', 'Dépendance à un client'],
            opportunities: ['Nouveau marché', 'Partenariat stratégique'],
            threats: ['Concurrence accrue', 'Changement réglementaire']
        },
        porter: {
            supplierPower: 'Moyen', buyerPower: 'Élevé', newEntrants: 'Faible',
            substitutes: 'Moyen', rivalry: 'Élevé'
        },
        pestel: {
            political: 'Stable', economic: 'Croissance', social: 'Favorable',
            technological: 'Innovant', environmental: 'Réglementé', legal: 'Conforme'
        },
        competitive: {
            competitors: ['Competitor A', 'Competitor B'],
            comparison: { price: 'Compétitif', quality: 'Supérieur', features: 'Complet' }
        }
    };
    return results[type] || {};
}

// =============================================================================
// ALERTS (fallback si showGlobalAlert n'existe pas)
// =============================================================================
function showAlert(type, title, message) {
    if (typeof window.showGlobalAlert === 'function' && window.showGlobalAlert !== showAlert) {
        window.showGlobalAlert(type, title, message);
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <div class="alert-content">
            <span class="alert-title">${title}</span>
            <span class="alert-message">${message}</span>
        </div>
        <button type="button" class="alert-close">&times;</button>
    `;
    alert.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        max-width: 400px; animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(alert);
    
    if (type !== 'error') {
        setTimeout(() => {
            alert.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    }
    
    const closeBtn = alert.querySelector('.alert-close');
    if (closeBtn) {
        closeBtn.onclick = function() {
            alert.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => alert.remove(), 300);
        };
    }
}

// Exposer globalement
window.startAnalysis = startAnalysis;
window.launchAnalysis = launchAnalysis;
window.showAlert = showAlert;
// =============================================================================
// INITIALISATION FIREBASE
// =============================================================================

function initFirebase() {
    // Vérifier si Firebase est déjà initialisé
    if (typeof firebase === 'undefined') {
        console.warn('Firebase non chargé. Veuillez vérifier les scripts.');
        return;
    }
    
    try {
        // Firebase devrait être initialisé dans firebase-config.js
        // On vérifie juste qu'il est disponible
        const firebaseRef = window.firebase || firebase;
        if (!firebaseRef.apps.length) {
            console.warn('Firebase non initialisé. Configuration manquante.');
        }
    } catch (error) {
        console.error('Erreur initialisation Firebase:', error);
    }
}

// =============================================================================
// INITIALISATION AUTHENTIFICATION
// =============================================================================

function initAuth() {
    // Initialiser le service d'authentification
    authService.init();
    
    // Écouter les changements d'état d'authentification
    window.addEventListener('authStateChanged', function(event) {
        const { user, userData } = event.detail;
        updateAuthUI(user, userData);
    });
}

// Mettre à jour l'UI selon l'état d'authentification
function updateAuthUI(user, userData) {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');
    const unauthenticatedView = document.getElementById('unauthenticatedView');
    const dashboardContent = document.getElementById('dashboardContent');
    const dashboardHeader = document.getElementById('dashboardHeader');
    const welcomeUserName = document.getElementById('welcomeUserName');
    const dashboardUserName = document.getElementById('dashboardUserName');
    
    if (user && userData) {
        // Utilisateur connecté
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (userMenu) userMenu.style.display = 'block';
        if (userName) userName.textContent = user.displayName || user.email || 'Compte';
        if (unauthenticatedView) unauthenticatedView.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'block';
        if (dashboardHeader) dashboardHeader.style.display = 'block';
        if (welcomeUserName) welcomeUserName.textContent = user.displayName || user.email || 'Utilisateur';
        if (dashboardUserName) dashboardUserName.textContent = user.displayName || user.email || 'Utilisateur';
        
        // Mettre à jour les stats du dashboard
        updateDashboardStats(userData);
    } else {
        // Utilisateur non connecté
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (registerBtn) registerBtn.style.display = 'inline-flex';
        if (userMenu) userMenu.style.display = 'none';
        if (unauthenticatedView) unauthenticatedView.style.display = 'block';
        if (dashboardContent) dashboardContent.style.display = 'none';
        if (dashboardHeader) dashboardHeader.style.display = 'none';
    }
    
    // Gérer le bouton de déconnexion
    if (logoutBtn) {
        logoutBtn.onclick = function(e) {
            e.preventDefault();
            authService.signOut().then(() => {
                window.location.reload();
            });
        };
    }
}

// Mettre à jour les statistiques du dashboard
function updateDashboardStats(userData) {
    if (!userData) return;
    
    const planNames = {
        free: 'Gratuit',
        pro: 'Pro',
        enterprise: 'Entreprise'
    };
    
    // Mettre à jour les tokens
    const availableTokensEl = document.getElementById('availableTokens');
    const usedTokensEl = document.getElementById('usedTokens');
    const totalTokensEl = document.getElementById('totalTokens');
    const tokenProgressEl = document.getElementById('tokenProgress');
    const userPlanEl = document.getElementById('userPlan');
    
    if (availableTokensEl) {
        availableTokensEl.textContent = TokenUtils.formatTokens(userData.availableTokens || 0);
    }
    if (usedTokensEl) {
        usedTokensEl.textContent = TokenUtils.formatTokens(userData.tokensUsed || 0);
    }
    if (totalTokensEl) {
        totalTokensEl.textContent = TokenUtils.formatTokens(userData.totalTokens || 0);
    }
    if (tokenProgressEl) {
        const percentage = userData.tokenUsagePercentage || 0;
        tokenProgressEl.style.width = `${percentage}%`;
        
        // Changer la couleur selon le pourcentage
        if (percentage > 80) {
            tokenProgressEl.classList.add('error');
            tokenProgressEl.classList.remove('warning');
        } else if (percentage > 50) {
            tokenProgressEl.classList.add('warning');
            tokenProgressEl.classList.remove('error');
        } else {
            tokenProgressEl.classList.remove('warning', 'error');
        }
    }
    if (userPlanEl) {
        userPlanEl.textContent = planNames[userData.plan] || userData.plan || 'Gratuit';
    }
    
    // Mettre à jour les analyses
    const totalAnalysesEl = document.getElementById('totalAnalyses');
    const monthlyAnalysesEl = document.getElementById('monthlyAnalyses');
    
    if (totalAnalysesEl) {
        totalAnalysesEl.textContent = userData.totalAnalyses || 0;
    }
    if (monthlyAnalysesEl) {
        monthlyAnalysesEl.textContent = userData.monthlyAnalyses || 0;
    }
    
    // Mettre à jour le résumé des tokens
    const tokenAvailableEl = document.getElementById('tokenAvailable');
    const tokenUsedMonthlyEl = document.getElementById('tokenUsedMonthly');
    const tokenMonthlyLimitEl = document.getElementById('tokenMonthlyLimit');
    
    if (tokenAvailableEl) {
        tokenAvailableEl.textContent = TokenUtils.formatTokens(userData.availableTokens || 0);
    }
    if (tokenUsedMonthlyEl) {
        tokenUsedMonthlyEl.textContent = TokenUtils.formatTokens(userData.tokensUsed || 0);
    }
    if (tokenMonthlyLimitEl) {
        tokenMonthlyLimitEl.textContent = TokenUtils.formatTokens(userData.tokenLimit || 50);
    }
    
    // Mettre à jour la fidélité
    const loyaltyTokensEl = document.getElementById('loyaltyTokens');
    const loyaltyTotalAnalysesEl = document.getElementById('loyaltyTotalAnalyses');
    const loyaltyMonthlyAnalysesEl = document.getElementById('loyaltyMonthlyAnalyses');
    
    if (loyaltyTokensEl && userData.loyaltyInfo) {
        loyaltyTokensEl.textContent = TokenUtils.formatTokens(userData.loyaltyInfo.monthlyLoyaltyTokens || 0);
    }
    if (loyaltyTotalAnalysesEl && userData.loyaltyInfo) {
        loyaltyTotalAnalysesEl.textContent = userData.loyaltyInfo.totalAnalyses || 0;
    }
    if (loyaltyMonthlyAnalysesEl && userData.loyaltyInfo) {
        loyaltyMonthlyAnalysesEl.textContent = userData.loyaltyInfo.monthlyAnalyses || 0;
    }
}

// =============================================================================
// INITIALISATION NAVIGATION
// =============================================================================

function initNavigation() {
    const mobileToggle = document.getElementById('mobileToggle');
    const navLinks = document.getElementById('navLinks');
    const navActions = document.querySelector('.nav-actions');
    const navbar = document.querySelector('.navbar');
    
    // Toggle mobile menu
    if (mobileToggle && navLinks) {
        mobileToggle.onclick = function() {
            this.classList.toggle('active');
            navLinks.classList.toggle('active');
            if (navActions) navActions.classList.toggle('active');
        };
    }
    
    // Scroll effect for navbar
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
    
    // Close mobile menu when clicking a link
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        link.addEventListener('click', function() {
            if (mobileToggle && mobileToggle.classList.contains('active')) {
                mobileToggle.classList.remove('active');
                if (navLinks) navLinks.classList.remove('active');
                if (navActions) navActions.classList.remove('active');
            }
        });
    });
}

// =============================================================================
// INITIALISATION SCROLL
// =============================================================================

function initScroll() {
    const backToTop = document.getElementById('backToTop');
    
    if (backToTop) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });
        
        backToTop.onclick = function(e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    }
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// =============================================================================
// INITIALISATION TABS
// =============================================================================

function initTabs() {
    const tabs = document.querySelectorAll('.pricing-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Enlever la classe active de tous les tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Ajouter la classe active au tab cliqué
            this.classList.add('active');
            
            // Faire défiler vers la section correspondante
            const section = document.getElementById(tabId);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// =============================================================================
// INITIALISATION FAQ
// =============================================================================

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

// =============================================================================
// INITIALISATION MODALS
// =============================================================================

function initModals() {
    // Get all modals
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
        const closeBtn = modal.querySelector('.modal-close');
        
        // Close on button click
        if (closeBtn) {
            closeBtn.onclick = function() {
                modal.classList.remove('visible');
            };
        }
        
        // Close on backdrop click
        modal.onclick = function(e) {
            if (e.target === modal) {
                modal.classList.remove('visible');
            }
        };
        
        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('visible')) {
                modal.classList.remove('visible');
            }
        });
    });
    
    // Specific modal handlers
    const subscriptionModal = document.getElementById('subscriptionModal');
    const tokenPackModal = document.getElementById('tokenPackModal');
    
    if (subscriptionModal) {
        const subscribeProBtn = document.getElementById('subscribeProBtn');
        const subscribeEnterpriseBtn = document.getElementById('subscribeEnterpriseBtn');
        const modalClose = document.getElementById('modalClose');
        const modalCancel = document.getElementById('modalCancel');
        const modalConfirm = document.getElementById('modalConfirm');
        
        // Open modal on button click
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
        
        // Close modal
        if (modalClose) modalClose.onclick = function() { subscriptionModal.classList.remove('visible'); };
        if (modalCancel) modalCancel.onclick = function() { subscriptionModal.classList.remove('visible'); };
        
        // Confirm subscription
        if (modalConfirm) {
            modalConfirm.onclick = function() {
                const plan = modalConfirm.getAttribute('data-plan');
                purchaseSubscription(plan);
            };
        }
    }
    
    if (tokenPackModal) {
        const buyPackBtns = document.querySelectorAll('#buyPackBtn');
        const tokenModalClose = document.getElementById('tokenModalClose');
        const tokenModalCancel = document.getElementById('tokenModalCancel');
        const tokenModalConfirm = document.getElementById('tokenModalConfirm');
        
        // Open modal on button click
        buyPackBtns.forEach(btn => {
            btn.onclick = function() {
                const packId = this.getAttribute('data-pack');
                openTokenPackModal(packId);
            };
        });
        
        // Close modal
        if (tokenModalClose) tokenModalClose.onclick = function() { tokenPackModal.classList.remove('visible'); };
        if (tokenModalCancel) tokenModalCancel.onclick = function() { tokenPackModal.classList.remove('visible'); };
        
        // Confirm purchase
        if (tokenModalConfirm) {
            tokenModalConfirm.onclick = function() {
                const packId = tokenModalConfirm.getAttribute('data-pack');
                purchaseTokenPack(packId);
            };
        }
    }
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
    
    if (modal && modalTitle && modalBody) {
        modalTitle.textContent = `Souscrire à ${planNames[plan] || plan}`;
        
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

// Acheter un abonnement
async function purchaseSubscription(plan) {
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
            } else {
                // Redirection vers Stripe
                window.location.href = result.return_url || './dashboard.html';
            }
        } else {
            showAlert('error', 'Erreur', result.error || 'Une erreur est survenue.');
        }
    } catch (error) {
        showAlert('error', 'Erreur', error.message || 'Une erreur est survenue.');
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
            <p style="margin-top: var(--spacing-lg);">
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

// =============================================================================
// CALCULATEUR DE TOKENS
// =============================================================================

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

// Fonctions pour le calculateur
function increment(id) {
    const input = document.getElementById(id);
    if (input) {
        let value = parseInt(input.value) || 0;
        input.value = value + 1;
        // Déclencher l'événement change pour mettre à jour
        const event = new Event('change');
        input.dispatchEvent(event);
    }
}

function decrement(id) {
    const input = document.getElementById(id);
    if (input) {
        let value = parseInt(input.value) || 0;
        input.value = Math.max(0, value - 1);
        // Déclencher l'événement change pour mettre à jour
        const event = new Event('change');
        input.dispatchEvent(event);
    }
}

// Scroll vers les abonnements
function scrollToSubscriptions() {
    const section = document.getElementById('subscriptions');
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// =============================================================================
// INITIALISATION FORMS
// =============================================================================

function initForms() {
    // Toggle password visibility
    const togglePasswordBtns = document.querySelectorAll('.toggle-password');
    togglePasswordBtns.forEach(btn => {
        btn.onclick = function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        };
    });
    
    // Password strength
    const passwordInput = document.getElementById('registerPassword');
    const passwordStrength = document.getElementById('passwordStrength');
    const passwordStrengthText = document.getElementById('passwordStrengthText');
    
    if (passwordInput && passwordStrength) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            
            passwordStrength.style.width = `${strength.percent}%`;
            passwordStrength.style.backgroundColor = strength.color;
            
            if (passwordStrengthText) {
                passwordStrengthText.textContent = strength.label;
                passwordStrengthText.style.color = strength.color;
            }
        });
    }
    
    // Confirm password matching
    const confirmPasswordInput = document.getElementById('registerConfirmPassword');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    
    if (confirmPasswordInput && passwordInput && confirmPasswordError) {
        confirmPasswordInput.addEventListener('input', function() {
            if (this.value !== passwordInput.value) {
                confirmPasswordError.style.display = 'block';
                this.classList.add('error');
            } else {
                confirmPasswordError.style.display = 'none';
                this.classList.remove('error');
            }
        });
    }
}

// Calculer la force du mot de passe
function calculatePasswordStrength(password) {
    let score = 0;
    
    // Longueur
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 10;
    
    // Majuscules
    if (/[A-Z]/.test(password)) score += 15;
    
    // Minuscules
    if (/[a-z]/.test(password)) score += 15;
    
    // Chiffres
    if (/[0-9]/.test(password)) score += 15;
    
    // Caractères spéciaux
    if (/[^A-Za-z0-9]/.test(password)) score += 20;
    
    // Limiter à 100
    score = Math.min(score, 100);
    
    let color, label;
    
    if (score < 30) {
        color = '#ef4444';
        label = 'Faible';
    } else if (score < 60) {
        color = '#f59e0b';
        label = 'Moyen';
    } else if (score < 80) {
        color = '#10b981';
        label = 'Bon';
    } else {
        color = '#10b981';
        label = 'Excellente';
    }
    
    return {
        score: score,
        percent: score,
        color: color,
        label: label
    };
}

// =============================================================================
// ANALYSE FONCTIONS
// =============================================================================

// Lancer une analyse
function startAnalysis(type) {
    const modal = document.getElementById('analysisModal');
    
    if (modal) {
        // Définir le type d'analyse
        const analysisTypeInput = document.getElementById('analysisType');
        if (analysisTypeInput) {
            analysisTypeInput.value = type;
        }
        
        // Mettre à jour l'estimation
        updateAnalysisEstimation(type);
        
        // Ouvrir le modal
        modal.classList.add('visible');
    }
}

// Mettre à jour l'estimation des tokens
function updateAnalysisEstimation(type) {
    const analysisTypeSelect = document.getElementById('analysisType');
    const estimatedAnalysisTypeEl = document.getElementById('estimatedAnalysisType');
    const estimatedTokensEl = document.getElementById('estimatedTokens');
    const userAvailableTokensEl = document.getElementById('userAvailableTokens');
    const insufficientTokensAlert = document.getElementById('insufficientTokensAlert');
    const startAnalysisBtn = document.getElementById('startAnalysisBtn');
    
    const plan = authService.userData?.plan || 'free';
    const cost = TokenManager.getCost(type, plan);
    const available = authService.userData?.availableTokens || 0;
    const canAfford = available >= cost;
    
    if (estimatedAnalysisTypeEl) {
        const analysisNames = {
            swot: 'Analyse SWOT',
            porter: 'Porter 5 Forces',
            pestel: 'Analyse PESTEL',
            competitive: 'Analyse Concurrentielle'
        };
        estimatedAnalysisTypeEl.textContent = analysisNames[type] || type;
    }
    
    if (estimatedTokensEl) {
        estimatedTokensEl.textContent = cost;
    }
    
    if (userAvailableTokensEl) {
        userAvailableTokensEl.textContent = available;
    }
    
    if (insufficientTokensAlert) {
        if (!canAfford) {
            insufficientTokensAlert.style.display = 'flex';
            startAnalysisBtn.disabled = true;
        } else {
            insufficientTokensAlert.style.display = 'none';
            startAnalysisBtn.disabled = false;
        }
    }
}

// Gérer la soumission du formulaire d'analyse
function initAnalysisForm() {
    const analysisForm = document.getElementById('analysisForm');
    const analysisTypeSelect = document.getElementById('analysisType');
    const insufficientTokensAlert = document.getElementById('insufficientTokensAlert');
    const startAnalysisBtn = document.getElementById('startAnalysisBtn');
    
    if (analysisForm && analysisTypeSelect) {
        // Mettre à jour l'estimation quand le type change
        analysisTypeSelect.addEventListener('change', function() {
            updateAnalysisEstimation(this.value);
        });
        
        // Soumission du formulaire
        analysisForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const type = analysisTypeSelect.value;
            const name = document.getElementById('analysisName').value;
            const description = document.getElementById('analysisDescription').value;
            
            if (!type) {
                showAlert('error', 'Erreur', 'Veuillez sélectionner un type d\'analyse.');
                return;
            }
            
            const plan = authService.userData?.plan || 'free';
            const cost = TokenManager.getCost(type, plan);
            const available = authService.userData?.availableTokens || 0;
            
            if (available < cost) {
                showAlert('error', 'Erreur', 'Vous n\'avez pas assez de tokens pour cette analyse.');
                return;
            }
            
            // Fermer le modal
            const modal = document.getElementById('analysisModal');
            if (modal) modal.classList.remove('visible');
            
            // Lancer l'analyse (à implémenter)
            launchAnalysis(type, name, description, cost);
        });
    }
}

// Lancer l'analyse (simulation)
async function launchAnalysis(type, name, description, cost, companyData) {
    // Vérifier si on est en mode démo (file:// ou Firebase non disponible)
    const isFileProtocol = window.location.protocol === 'file:';
    const isFirebaseAvailable = typeof window.firebase !== 'undefined' && window.firebase;
    const isDemoMode = !isFirebaseAvailable || isFileProtocol;
    
    try {
        let analysisData = null;
        
        if (!isDemoMode) {
            // Mode normal : utiliser les tokens et sauvegarder dans Firestore
            await TokenManager.useTokens(cost, type);
            
            const user = authService.currentUser;
            if (user) {
                const docRef = await db.collection('users').doc(user.uid).collection('analyses').add({
                    type: type,
                    name: name,
                    description: description,
                    cost: cost,
                    status: 'completed',
                    createdAt: new Date().toISOString(),
                    results: generateMockResults(type)
                });
                analysisData = {
                    id: docRef.id,
                    type: type,
                    name: name,
                    description: description,
                    cost: cost,
                    status: 'completed',
                    createdAt: new Date().toISOString(),
                    results: generateMockResults(type),
                    score: 75
                };
            }
        } else {
            // Mode démo : simuler la déduction des tokens et générer les résultats
            // Met à jour manuellement le tokenState pour le mode démo
            if (window.TokenManager) {
                const currentAvailable = window.TokenManager.availableTokens || 9999;
                const newAvailable = currentAvailable - cost;
                
                // Mettre à jour l'état local pour le mode démo
                if (!window.TokenManager._demoTokens) {
                    window.TokenManager._demoTokens = currentAvailable;
                }
                window.TokenManager._demoTokens = newAvailable;
                
                // Redéfinir le getter availableTokens pour retourner la nouvelle valeur
                Object.defineProperty(window.TokenManager, 'availableTokens', {
                    get: function() { 
                        return window.TokenManager._demoTokens || 9999; 
                    },
                    configurable: true
                });
                
                // Sauvegarder aussi dans userData pour l'UI
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
                window.TokenManager.userData.tokenState.usedTokens = 9999 - newAvailable;
            }
            
            // Générer les données d'analyse pour le mode démo
            analysisData = {
                id: 'demo-' + Date.now(),
                type: type,
                name: name || `Analyse ${type}`,
                description: description || '',
                cost: cost,
                status: 'completed',
                createdAt: new Date().toISOString(),
                results: generateMockResults(type),
                score: 75
            };
            
            // Sauvegarder dans localStorage pour l'historique en mode démo
            try {
                let demoAnalyses = JSON.parse(localStorage.getItem('dpai_demo_analyses') || '[]');
                demoAnalyses.unshift(analysisData);
                // Garder seulement les 5 dernières
                if (demoAnalyses.length > 5) {
                    demoAnalyses = demoAnalyses.slice(0, 5);
                }
                localStorage.setItem('dpai_demo_analyses', JSON.stringify(demoAnalyses));
            } catch (e) {
                console.error('[DPAI] Erreur sauvegarde historique démo:', e);
            }
        }
        
        console.log('[DPAI] Analyse terminée, affichage des résultats...');
        showAlert('success', 'Succès', `Votre analyse ${name} a été lancée avec succès !`);
        
        // Afficher les résultats dans une nouvelle fenêtre au lieu de recharger
        if (typeof showAnalysisResults === 'function' && analysisData) {
            console.log('[DPAI] Appel de showAnalysisResults avec:', analysisData);
            showAnalysisResults(analysisData);
        } else {
            console.error('[DPAI] showAnalysisResults non disponible ou analysisData vide');
        }
        
        // Mettre à jour les stats sans recharger la page
        if (typeof updateAfterAnalysis === 'function') {
            updateAfterAnalysis(type, name, description, cost);
        }
    } catch (error) {
        console.error('[DPAI] Erreur dans launchAnalysis:', error);
        showAlert('error', 'Erreur', error.message || 'Une erreur est survenue.');
    }
}

// Générer des résultats mock
function generateMockResults(type) {
    const results = {
        swot: {
            strengths: ['Forte notoriété', 'Équipe expérimentée', 'Technologie avancée'],
            weaknesses: ['Coûts élevés', 'Dépendance à un client'],
            opportunities: ['Nouveau marché', 'Partenariat stratégique'],
            threats: ['Concurrence accrue', 'Changement réglementaire']
        },
        porter: {
            supplierPower: 'Moyen',
            buyerPower: 'Élevé',
            newEntrants: 'Faible',
            substitutes: 'Moyen',
            rivalry: 'Élevé'
        },
        pestel: {
            political: 'Stable',
            economic: 'Croissance',
            social: 'Favorable',
            technological: 'Innovant',
            environmental: 'Réglementé',
            legal: 'Conforme'
        },
        competitive: {
            competitors: ['Competitor A', 'Competitor B'],
            comparison: { price: 'Compétitif', quality: 'Supérieur', features: 'Complet' }
        }
    };
    
    return results[type] || {};
}

// =============================================================================
// ALERTS
// =============================================================================

function showAlert(type, title, message) {
    // Créer une alerte dynamique
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <div class="alert-content">
            <span class="alert-title">${title}</span>
            <span class="alert-message">${message}</span>
        </div>
        <button type="button" class="alert-close">&times;</button>
    `;
    
    // Styles pour l'alerte
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    
    // Ajouter à la page
    document.body.appendChild(alert);
    
    // Fermer après 5 secondes (sauf si c'est une erreur)
    if (type !== 'error') {
        setTimeout(() => {
            alert.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    }
    
    // Fermer sur clic
    const closeBtn = alert.querySelector('.alert-close');
    if (closeBtn) {
        closeBtn.onclick = function() {
            alert.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => alert.remove(), 300);
        };
    }
}

// Initialiser le formulaire d'analyse quand le DOM est chargé
// NOTE: Désactivé car géré par dashboard.js pour éviter les conflits
// if (document.readyState === 'complete' || document.readyState === 'interactive') {
//     initAnalysisForm();
// } else {
//     document.addEventListener('DOMContentLoaded', initAnalysisForm);
// }
