// =============================================================================
// DASHBOARD.JS - Gestion du tableau de bord avec analyses avancées
// =============================================================================

console.log('[DASHBOARD.JS] Script dashboard.js est en cours de chargement...');

// Définir servicesData au niveau global SI ce n'est pas déjà fait (pour éviter les problèmes de cache)
if (typeof window.servicesData === 'undefined') {
    window.servicesData = {
        swot: { id: 'swot', name: 'Analyse SWOT', icon: 'fa-swimming-pool', tokens: '5-10 tokens', limitedInFree: true },
        porter: { id: 'porter', name: 'Porter 5 Forces', icon: 'fa-project-diagram', tokens: '20-120 tokens', limitedInFree: true },
        pestel: { id: 'pestel', name: 'Analyse PESTEL', icon: 'fa-globe-americas', tokens: '15-75 tokens', limitedInFree: true },
        competitive: { id: 'competitive', name: 'Analyse Concurrentielle', icon: 'fa-users', tokens: '20-160 tokens', requiredPlan: 'Pro' },
        reports: { id: 'reports', name: 'Rapports Détaillés', icon: 'fa-file-alt', tokens: '25-250 tokens', requiredPlan: 'Pro' },
        ideal_sector: { id: 'ideal_sector', name: 'Secteur idéal', icon: 'fa-globe', tokens: '35 tokens', requiredPlan: 'Pro' },
        maturity_score: { id: 'maturity_score', name: 'Score de maturité', icon: 'fa-chart-line', tokens: '50 tokens', requiredPlan: 'Pro' },
        integration_matrix: { id: 'integration_matrix', name: 'Matrice Intégration', icon: 'fa-th', tokens: '180 tokens', requiredPlan: 'Entreprise' },
        valuation_simulator: { id: 'valuation_simulator', name: 'Simulateur Valorisation', icon: 'fa-euro-sign', tokens: '200 tokens', requiredPlan: 'Entreprise' },
        due_diligence: { id: 'due_diligence', name: 'Due Diligence', icon: 'fa-check-square', tokens: '100 tokens', requiredPlan: 'Entreprise' },
        loi_generator: { id: 'loi_generator', name: 'Générateur LOI', icon: 'fa-file-contract', tokens: '150 tokens', requiredPlan: 'Entreprise' },
        negotiation_simulator: { id: 'negotiation_simulator', name: 'Simulateur Négociation', icon: 'fa-handshake', tokens: '180 tokens', requiredPlan: 'Entreprise' },
        action_plan_100_days: { id: 'action_plan_100_days', name: 'Plan 100 jours', icon: 'fa-route', tokens: '250 tokens', requiredPlan: 'Entreprise' },
        post_acquisition_dashboard: { id: 'post_acquisition_dashboard', name: 'Dashboard Post-Acquisition', icon: 'fa-chart-area', tokens: '80 tokens/mois', requiredPlan: 'Entreprise' }
    };
    console.log('[DASHBOARD] servicesData défini dans dashboard.js (fallback)');
}

// Références Firebase (exposées par firebase-config.js)
// db est défini globalement dans firebase-config.js

// Mode démo : créer des objets mock si Firebase n'est pas disponible
if (typeof window.authService === 'undefined') {
    console.warn('[DPAI] authService non défini, création d\'un mock pour le mode démo');
    window.authService = {
        currentUser: null,
        userData: null,
        loadUserData: async () => null
    };
}

// Si TokenManager existe mais n'est pas initialisé (mode démo), le configurer
if (typeof window.TokenManager !== 'undefined') {
    // Vérifier si on est en mode démo (file:// ou Firebase non disponible)
    const isFileProtocol = window.location.protocol === 'file:';
    const isFirebaseAvailable = typeof window.firebase !== 'undefined' && window.firebase;
    const isDemoMode = !isFirebaseAvailable || isFileProtocol;
    
    if (isDemoMode && !window.TokenManager.tokenState) {
        console.warn('[DPAI] TokenManager en mode démo, configuration');
        // Remplacer le getter availableTokens pour retourner 9999
        Object.defineProperty(window.TokenManager, 'availableTokens', {
            get: function() { return 9999; },
            configurable: true
        });
        
        // S'assurer que getCost existe et retourne les bons coûts
        if (!window.TokenManager.getCost) {
            window.TokenManager.getCost = (type) => {
                const costs = { swot: 5, porter: 20, pestel: 15, competitive: 20 };
                return costs[type] || 10;
            };
        }
        
        // S'assurer que tokenState existe (pour éviter les erreurs)
        if (!window.TokenManager.tokenState) {
            window.TokenManager.tokenState = null;
        }
    }
} else if (typeof window.TokenManager === 'undefined') {
    console.warn('[DPAI] TokenManager non défini, création d\'un mock complet pour le mode démo');
    window.TokenManager = {
        tokenState: null,
        getCost: (type) => {
            const costs = { swot: 5, porter: 20, pestel: 15, competitive: 20 };
            return costs[type] || 10;
        },
        get availableTokens() {
            return 9999;
        }
    };
}

// Configurer TokenConfig si non défini
if (typeof window.TokenConfig === 'undefined') {
    window.TokenConfig = {
        baseTokenLimits: { free: 50, pro: 500, enterprise: 5000 },
        tokenBonuses: { free: 0.0, pro: 0.20, enterprise: 0.30 },
        welcomeBonus: 10,
        firstAnalysisBonus: 5
    };
}

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
    loadUserData();
});

// Initialiser le dashboard
function initDashboard() {
    // Gérer les boutons d'action rapide (avec délai pour s'assurer que servicesData est chargé)
    setTimeout(initQuickActions, 200);
    
    // Charger l'historique des analyses
    loadAnalysisHistory();
    
    // Charger l'historique des tokens
    loadTokenHistory();
    
    // Mettre à jour les statistiques
    updateDashboardStats();
    
    // Initialiser le formulaire d'analyse
    initAnalysisForm();
    
    // Initialiser les tabs d'analyses
    initAnalysisTabs();
    
    // Charger les analyses récentes
    loadRecentAnalyses();
    
    // Initialiser le bouton "Toutes les analyses"
    const showAllBtn = document.getElementById('showAllAnalyses');
    if (showAllBtn) {
        showAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            showAllAnalyses();
        });
    }
}

// Charger les données utilisateur
async function loadUserData() {
    const user = authService.currentUser;
    
    if (!user) return;
    
    try {
        const userData = await authService.loadUserData(user.uid);
        authService.userData = userData;
        TokenManager.init(userData);
        
        // Mettre à jour l'UI
        updateAuthUI(user, userData);
        updateDashboardStats(userData);
    } catch (error) {
        console.error('Erreur chargement données utilisateur:', error);
    }
}


// Initialiser les actions rapides
function initQuickActions() {
    console.log('[DASHBOARD] initQuickActions appelé');
    console.log('[DASHBOARD] servicesData disponible:', typeof window.servicesData !== 'undefined' ? 'OUI' : 'NON');
    console.log('[DASHBOARD] authService disponible:', typeof authService !== 'undefined' ? 'OUI' : 'NON');
    console.log('[DASHBOARD] authService.userData disponible:', authService?.userData ? 'OUI' : 'NON');
    
    const quickActionsContainer = document.querySelector('.quick-actions');
    
    if (!quickActionsContainer) {
        console.warn('[DASHBOARD] Conteneur .quick-actions non trouvé');
        return;
    }
    
    // Fonction pour essayer de rendre les actions rapides
    function tryRenderQuickActions() {
        console.log('[DASHBOARD] tryRenderQuickActions appelé');
        // Si servicesData existe (depuis service-modal.js), l'utiliser
        const services = typeof window.servicesData !== 'undefined' ? window.servicesData : null;
        console.log('[DASHBOARD] services dans tryRenderQuickActions:', services ? Object.keys(services).length + ' services' : 'NULL');
        
        if (services) {
            // Générer les boutons dynamiquement à partir des services
            // Note: renderQuickActions peut fonctionner même sans userData (affiche avec cadenas)
            renderQuickActions(services);
            return true;
        } else {
            console.warn('[DASHBOARD] servicesData non disponible dans tryRenderQuickActions');
            return false;
        }
    }
    
    // Fonction pour essayer de rendre quand tout est prêt
    function tryRenderWhenReady() {
        // Si servicesData est disponible, on peut afficher les services (même sans userData)
        if (typeof window.servicesData !== 'undefined') {
            tryRenderQuickActions();
            return;
        }
        
        console.log('[DASHBOARD] En attente: servicesData non disponible');
        
        // Afficher un message de chargement
        quickActionsContainer.innerHTML = '<p style="text-align: center; color: #666;"><i class="fas fa-spinner fa-spin"></i> Chargement des services...</p>';
    }
    
    // Fonction pour gérer la disponibilité de servicesData
    function handleServicesDataReady() {
        console.log('[DASHBOARD] Événement servicesDataReady reçu');
        // servicesData est disponible, on peut rendre les services (même sans userData)
        tryRenderQuickActions();
    }
    
    // Fonction pour gérer les changements d'état d'authentification
    function handleAuthStateChanged(event) {
        console.log('[DASHBOARD] Événement authStateChanged reçu, userData disponible:', !!event.detail.userData);
        // userData peut être disponible, on réessaye de rendre (raffraîchira les cadenas)
        if (typeof window.servicesData !== 'undefined') {
            tryRenderQuickActions();
        }
    }
    
    // Fonction pour gérer les mises à jour de userData
    function handleUserDataUpdated(event) {
        console.log('[DASHBOARD] Événement userDataUpdated reçu, userData disponible:', !!event.detail.userData);
        // userData a été mis à jour, on réessaye de rendre (raffraîchira les cadenas)
        if (typeof window.servicesData !== 'undefined') {
            tryRenderQuickActions();
        }
    }
    
    // Écouter l'événement servicesDataReady (déclenché par service-modal.js)
    window.addEventListener('servicesDataReady', handleServicesDataReady);
    
    // Écouter l'événement authStateChanged (déclenché par auth.js)
    window.addEventListener('authStateChanged', handleAuthStateChanged);
    
    // Écouter l'événement userDataUpdated (déclenché par main.js après recharge)
    window.addEventListener('userDataUpdated', handleUserDataUpdated);
    
    // Vérifier si servicesData est déjà disponible (au cas où l'événement aurait été manqué)
    if (typeof window.servicesData !== 'undefined') {
        console.log('[DASHBOARD] servicesData déjà disponible');
        handleServicesDataReady();
    }
    
    // Essayer immédiatement
    tryRenderWhenReady();
    
    // Réessayer toutes les 300ms jusqu'à ce que tout soit prêt
    const checkReady = setInterval(tryRenderWhenReady, 300);
    
    // Timeout après 30 secondes (augmenté car Firestore peut être lent)
    setTimeout(() => {
        clearInterval(checkReady);
        console.warn('[DASHBOARD] Impossible de charger les services après 30 secondes');
        console.warn('[DASHBOARD] État final - servicesData:', typeof window.servicesData !== 'undefined' ? 'disponible' : 'INDISPONIBLE');
        console.warn('[DASHBOARD] État final - userData:', authService?.userData ? 'disponible' : 'INDISPONIBLE');
        console.warn('[DASHBOARD] État final - authService.currentUser:', authService?.currentUser ? 'disponible' : 'INDISPONIBLE');
        tryRenderWhenReady();
    }, 30000);
}

// Générer dynamiquement les boutons d'actions rapides
function renderQuickActions(services) {
    console.log('[DASHBOARD] renderQuickActions appelé avec', Object.keys(services).length, 'services');
    const container = document.querySelector('.quick-actions');
    if (!container) {
        console.warn('[DASHBOARD] Conteneur .quick-actions non trouvé');
        return;
    }
    
    // Effacer le contenu existant
    container.innerHTML = '';
    
    const userPlan = authService?.userData?.plan || 'free';
    const userData = authService?.userData;
    
    // Hiérarchie des plans
    const PlanHierarchy = {
        free: 0,
        pro: 1,
        enterprise: 2
    };
    
    // Créer un bouton pour chaque service dans servicesData
    Object.entries(services).forEach(([serviceId, service]) => {
        // Ignorer certains services internes si nécessaire
        if (serviceId === 'dashboard') return;
        
        const btn = document.createElement('button');
        
        // Déterminer si le service est accessible selon le plan
        let isAccessible = true;
        let showLock = false;
        let requiredPlanLabel = '';
        
        if (userData) {
            // Si on a userData, vérifier selon le plan et requiredPlan
            const requiredPlan = service.requiredPlan;
            
            if (requiredPlan) {
                const requiredPlanLower = requiredPlan.toLowerCase();
                const userPlanIndex = PlanHierarchy[userPlan] || 0;
                const requiredPlanIndex = PlanHierarchy[requiredPlanLower] || 0;
                
                isAccessible = userPlanIndex >= requiredPlanIndex;
                showLock = !isAccessible;
                requiredPlanLabel = requiredPlan;
            }
            // Si pas de requiredPlan, c'est accessible à tous
        } else {
            // Pas de userData encore, vérifier selon requiredPlan
            const requiredPlan = service.requiredPlan;
            if (requiredPlan) {
                isAccessible = false;
                showLock = true;
                requiredPlanLabel = requiredPlan;
            }
            // Sinon accessible
        }
        
        btn.className = `quick-action-btn ${showLock ? 'locked' : ''}`;
        if (isAccessible) {
            btn.onclick = () => {
                const modal = document.getElementById('analysisModal');
                if (modal) {
                    const analysisTypeInput = document.getElementById('analysisType');
                    if (analysisTypeInput) {
                        analysisTypeInput.value = serviceId;
                    }
                    // Mettre à jour le titre si possible
                    const modalTitle = document.getElementById('analysisModalTitle');
                    const analysisNames = {
                        swot: 'Analyse SWOT',
                        porter: 'Porter 5 Forces',
                        pestel: 'Analyse PESTEL',
                        competitive: 'Analyse Concurrentielle',
                        reports: 'Rapports Détaillés',
                        ideal_sector: 'Secteur idéal',
                        maturity_score: 'Score de maturité'
                    };
                    if (modalTitle && analysisNames[serviceId]) {
                        modalTitle.textContent = `Lancer : ${analysisNames[serviceId]}`;
                    } else if (modalTitle) {
                        modalTitle.textContent = `Lancer : ${service.name || serviceId}`;
                    }
                    modal.classList.add('visible');
                }
            };
        } else {
            btn.onclick = null;
        }
        
        const lockIcon = showLock ? '<div class="quick-action-lock"><i class="fas fa-lock"></i></div>' : '';
        const requiresBadge = showLock && requiredPlanLabel ? 
            `<span class="requires-plan-badge">${requiredPlanLabel}</span>` : '';
        
        btn.innerHTML = `
            <div class="quick-action-icon">
                <i class="fas ${service.icon || 'fa-chart-bar'}"></i>
                ${lockIcon}
            </div>
            <span class="quick-action-name">${service.name || serviceId}${requiresBadge}</span>
            <span class="quick-action-tokens">${service.tokens || '5-10'} tokens</span>
        `;
        
        container.appendChild(btn);
    });
    
    // Si aucun bouton n'a été ajouté, afficher un message
    if (container.innerHTML === '') {
        container.innerHTML = '<p style="text-align: center; color: #666;">Aucun service disponible.</p>';
    }
}

// Charger l'historique des analyses
async function loadAnalysisHistory() {
    const user = authService.currentUser;
    const recentAnalysesEl = document.getElementById('recentAnalyses');
    
    if (!recentAnalysesEl) return;
    
    // Vérifier si on est en mode démo
    const isFileProtocol = window.location.protocol === 'file:';
    const isFirebaseAvailable = typeof window.firebase !== 'undefined' && window.firebase;
    const isDemoMode = !isFirebaseAvailable || isFileProtocol;
    
    try {
        let analyses = [];
        
        if (!isDemoMode && user) {
            // Mode normal : charger depuis Firestore
            const analysesSnapshot = await db.collection('users')
                .doc(user.uid)
                .collection('analyses')
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();
            
            if (analysesSnapshot.empty) {
                recentAnalysesEl.innerHTML = `
                    <div class="empty-state small">
                        <div class="empty-state-icon">
                            <i class="fas fa-chart-bar"></i>
                        </div>
                        <p>Vous n'avez pas encore réalisé d'analyse.</p>
                        <p class="empty-state-message">Commencez par lancer votre première analyse !</p>
                    </div>
                `;
                return;
            }
            
            analysesSnapshot.forEach(doc => {
                analyses.push({ id: doc.id, ...doc.data() });
            });
        } else if (isDemoMode) {
            // Mode démo : charger depuis localStorage
            try {
                const demoAnalyses = JSON.parse(localStorage.getItem('dpai_demo_analyses') || '[]');
                console.log('[DPAI] Chargement historique démo:', demoAnalyses.length, 'analyses');
            if (demoAnalyses.length === 0) {
                console.warn('[DPAI] Aucune analyse trouvée dans localStorage. Lancez une nouvelle analyse pour voir l\'historique.');
            }
                analyses = demoAnalyses.slice(0, 5);
            } catch (e) {
                console.error('[DPAI] Erreur chargement historique démo:', e);
                analyses = [];
            }
        }
        
        if (analyses.length === 0) {
            recentAnalysesEl.innerHTML = `
                <div class="empty-state small">
                    <div class="empty-state-icon">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                    <p>Vous n'avez pas encore réalisé d'analyse.</p>
                    <p class="empty-state-message">Commencez par lancer votre première analyse !</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        analyses.forEach(analysis => {
            const date = formatDate(analysis.createdAt);
            
            // Déterminer l'icône et la classe en fonction du type
            const analysisTypes = {
                swot: { icon: 'fa-swimming-pool', name: 'SWOT' },
                porter: { icon: 'fa-project-diagram', name: 'Porter 5 Forces' },
                pestel: { icon: 'fa-globe-americas', name: 'PESTEL' },
                competitive: { icon: 'fa-users', name: 'Analyse Concurrentielle' }
            };
            
            const typeInfo = analysisTypes[analysis.type] || { icon: 'fa-chart-line', name: analysis.type };
            
            // Déterminer le statut
            const statusClass = analysis.status === 'completed' ? 'success' : 
                              analysis.status === 'processing' ? 'warning' : 'error';
            const statusIcon = analysis.status === 'completed' ? 'fa-check-circle' : 
                               analysis.status === 'processing' ? 'fa-spinner fa-pulse' : 'fa-exclamation-circle';
            const statusText = analysis.status === 'completed' ? 'Complété' : 
                               analysis.status === 'processing' ? 'En cours' : 'Échoué';
            
            // Générer le HTML pour chaque analyse
            html += `
                <div class="analysis-card" data-id="${analysis.id}" data-type="${analysis.type}">
                    <div class="analysis-card-header">
                        <div class="analysis-card-type">
                            <i class="fas ${typeInfo.icon}"></i>
                            <span class="analysis-type-badge">${typeInfo.name}</span>
                        </div>
                        <div class="analysis-card-title-wrapper">
                            <span class="analysis-card-title">${analysis.name || 'Analyse sans nom'}</span>
                            <span class="analysis-card-date">${date}</span>
                        </div>
                    </div>
                    <div class="analysis-card-meta">
                        <div class="analysis-card-meta-item">
                            <i class="fas fa-coins"></i>
                            <span>${analysis.cost || 0} tokens</span>
                        </div>
                        <div class="analysis-card-meta-item">
                            <i class="fas fa-chart-line"></i>
                            <span>${analysis.type || 'Inconnu'}</span>
                        </div>
                        <div class="analysis-card-meta-item">
                            <i class="fas fa-${statusIcon}"></i>
                            <span class="status-${statusClass}">${statusText}</span>
                        </div>
                    </div>
                    <div class="analysis-card-preview">
                        ${truncateText(analysis.description || 'Aucune description', 100)}
                    </div>
                    <div class="analysis-card-score">
                        <div class="score-bar">
                            <div class="score-bar-fill" style="width: ${analysis.score || 0}%;"></div>
                        </div>
                        <span class="score-value">Score: ${analysis.score || 0}/100</span>
                    </div>
                    <div class="analysis-card-actions">
                        <button class="btn btn-sm btn-outline view-analysis-btn" 
                                onclick="viewAnalysis('${doc.id}', '${analysis.type}')">
                            <i class="fas fa-eye"></i> Voir
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="exportAnalysis('${doc.id}')">
                            <i class="fas fa-download"></i> Exporter
                        </button>
                        <button class="btn btn-sm btn-ghost delete-analysis-btn" 
                                onclick="deleteAnalysis('${doc.id}')">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                    </div>
                </div>
            `;
        });
        
        recentAnalysesEl.innerHTML = html;
        
        // Initialiser les boutons de vue d'analyse
        initViewAnalysisButtons();
        
    } catch (error) {
        console.error('Erreur chargement historique des analyses:', error);
        recentAnalysesEl.innerHTML = `
            <div class="empty-state small">
                <div class="empty-state-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <p>Erreur lors du chargement des analyses.</p>
            </div>
        `;
    }
}

// Charger l'historique des tokens
async function loadTokenHistory() {
    const user = authService.currentUser;
    const tokenHistoryEl = document.getElementById('tokenHistory');
    
    if (!user || !tokenHistoryEl) return;
    
    try {
        // Charger l'historique des transactions depuis Firestore
        const transactionsSnapshot = await db.collection('users')
            .doc(user.uid)
            .collection('tokenTransactions')
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();
        
        if (transactionsSnapshot.empty) {
            // Afficher un historique par défaut
            const html = `
                <div class="token-history-item">
                    <span class="token-history-date">${formatDate(new Date().toISOString())}</span>
                    <span class="token-history-description">Inscription - 50 tokens offerts</span>
                    <span class="token-history-amount positive">+50</span>
                </div>
                <div class="token-history-item">
                    <span class="token-history-date">${formatDate(new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())}</span>
                    <span class="token-history-description">Bonus quotidien</span>
                    <span class="token-history-amount positive">+1</span>
                </div>
            `;
            tokenHistoryEl.innerHTML = html;
            return;
        }
        
        let html = '';
        transactionsSnapshot.forEach(doc => {
            const transaction = doc.data();
            const amount = transaction.amount || 0;
            const type = transaction.type || 'unknown';
            const isPositive = amount > 0;
            
            const descriptions = {
                purchase: 'Achat de tokens',
                subscription: 'Abonnement',
                analysis: 'Utilisation pour analyse',
                bonus: 'Bonus quotidien',
                referral: 'Parrainage',
                welcome: 'Inscription - Tokens offerts'
            };
            
            const icons = {
                purchase: 'fa-shopping-cart',
                subscription: 'fa-credit-card',
                analysis: 'fa-chart-line',
                bonus: 'fa-gift',
                referral: 'fa-users',
                welcome: 'fa-star'
            };
            
            const description = descriptions[type] || transaction.description || type;
            const icon = icons[type] || 'fa-coins';
            
            html += `
                <div class="token-history-item">
                    <span class="token-history-date">${formatDate(transaction.createdAt)}</span>
                    <span class="token-history-description"><i class="fas ${icon}"></i> ${description}</span>
                    <span class="token-history-amount ${isPositive ? 'positive' : 'negative'}">
                        ${isPositive ? '+' : ''}${amount}
                    </span>
                </div>
            `;
        });
        
        tokenHistoryEl.innerHTML = html;
        
    } catch (error) {
        console.error('Erreur chargement historique des tokens:', error);
    }
}

// Formater une date
function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Moins d'une heure
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `Il y a ${minutes} min`;
    }
    
    // Moins d'un jour
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `Il y a ${hours}h`;
    }
    
    // Moins d'une semaine
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `Il y a ${days} jours`;
    }
    
    // Format date complète
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Tronquer un texte
function truncateText(text, length) {
    if (!text) return 'Aucune description';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

// Mettre à jour les statistiques du dashboard
function updateDashboardStats(userData) {
    if (!userData) {
        // Si pas de données, essayer de les récupérer
        const user = authService.currentUser;
        if (user) {
            setTimeout(() => updateDashboardStats(authService.userData), 1000);
        }
        return;
    }
    
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
    
    const availableTokens = userData.availableTokens || 
                          (userData.tokenState ? userData.tokenState.availableTokens : 0) || 0;
    const usedTokens = userData.tokensUsed || 
                      (userData.tokenState ? userData.tokenState.usedTokens : 0) || 0;
    const totalTokens = userData.totalTokens || 
                       (userData.tokenState ? userData.tokenState.totalTokens : 0) || 0;
    const tokenLimit = userData.tokenLimit || 
                       (userData.tokenState ? userData.tokenState.baseTokens : TokenConfig.baseTokenLimits.free) || 
                       TokenConfig.baseTokenLimits.free;
    
    if (availableTokensEl) {
        availableTokensEl.textContent = TokenUtils.formatTokens(availableTokens);
    }
    if (usedTokensEl) {
        usedTokensEl.textContent = TokenUtils.formatTokens(usedTokens);
    }
    if (totalTokensEl) {
        totalTokensEl.textContent = TokenUtils.formatTokens(totalTokens);
    }
    if (tokenProgressEl) {
        const percentage = Math.min(100, (usedTokens / tokenLimit) * 100);
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
    
    const totalAnalyses = userData.totalAnalyses || 
                         (userData.loyaltyInfo ? userData.loyaltyInfo.totalAnalyses : 0) || 0;
    const monthlyAnalyses = userData.monthlyAnalyses || 
                           (userData.loyaltyInfo ? userData.loyaltyInfo.monthlyAnalyses : 0) || 0;
    
    if (totalAnalysesEl) {
        totalAnalysesEl.textContent = TokenUtils.formatTokens(totalAnalyses);
    }
    if (monthlyAnalysesEl) {
        monthlyAnalysesEl.textContent = TokenUtils.formatTokens(monthlyAnalyses);
    }
    
    // Mettre à jour le résumé des tokens
    const tokenAvailableEl = document.getElementById('tokenAvailable');
    const tokenUsedMonthlyEl = document.getElementById('tokenUsedMonthly');
    const tokenMonthlyLimitEl = document.getElementById('tokenMonthlyLimit');
    
    if (tokenAvailableEl) {
        tokenAvailableEl.textContent = TokenUtils.formatTokens(availableTokens);
    }
    if (tokenUsedMonthlyEl) {
        tokenUsedMonthlyEl.textContent = TokenUtils.formatTokens(usedTokens);
    }
    if (tokenMonthlyLimitEl) {
        tokenMonthlyLimitEl.textContent = TokenUtils.formatTokens(tokenLimit);
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

// Mettre à jour les champs spécifiques selon le type d'analyse
function updateSpecificFields(type, container) {
    if (!container) return;
    
    // Vider le conteneur
    container.innerHTML = '';
    
    // Ajouter une section pour les champs spécifiques
    const section = document.createElement('div');
    section.className = 'analysis-specific-section';
    
    let html = '<h4>Données spécifiques pour l\'analyse</h4>';
    
    switch (type) {
        case 'swot':
            html += `
                <div class="specific-fields-grid">
                    <div class="form-group">
                        <label class="form-label">Nom de l'entreprise</label>
                        <input type="text" class="form-input" id="companyName" placeholder="Nom de votre entreprise">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Secteur d'activité</label>
                        <input type="text" class="form-input" id="companyIndustry" placeholder="Ex: Technologie, Retail, etc.">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Chiffre d'affaires (€)</label>
                        <input type="number" class="form-input" id="companyRevenue" placeholder="0" min="0" step="1000">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nombre d'employés</label>
                        <input type="number" class="form-input" id="companyEmployees" placeholder="0" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Part de marché (%)</label>
                        <input type="number" class="form-input" id="companyMarketShare" placeholder="0" min="0" max="100" step="0.1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Niveau de technologie</label>
                        <select class="form-select" id="companyTechnology">
                            <option value="">Sélectionnez...</option>
                            <option value="innovant">Innovant</option>
                            <option value="moderne">Moderne</option>
                            <option value="standard">Standard</option>
                            <option value="vieillissant">Vieillissant</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Satisfaction client (1-10)</label>
                        <input type="number" class="form-input" id="companyCustomerSatisfaction" placeholder="0" min="1" max="10">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Notoriété de la marque (1-10)</label>
                        <input type="number" class="form-input" id="companyBrandRecognition" placeholder="0" min="1" max="10">
                    </div>
                </div>
                <p class="form-hint"><i class="fas fa-info-circle"></i> Plus vous fournissez d'informations, plus l'analyse sera précise et personnalisée.</p>
            `;
            break;
            
        case 'porter':
            html += `
                <div class="specific-fields-grid">
                    <div class="form-group">
                        <label class="form-label">Nom de l'entreprise</label>
                        <input type="text" class="form-input" id="companyName" placeholder="Nom de votre entreprise">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Secteur d'activité</label>
                        <input type="text" class="form-input" id="companyIndustry" placeholder="Ex: Technologie, Retail, etc.">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Stratégie principale</label>
                        <select class="form-select" id="companyStrategy">
                            <option value="">Sélectionnez...</option>
                            <option value="differentiation">Différenciation</option>
                            <option value="cost_leadership">Leadership par les coûts</option>
                            <option value="focus">Focus</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Différenciation produit</label>
                        <select class="form-select" id="companyProductDifferentiation">
                            <option value="">Sélectionnez...</option>
                            <option value="high">Élevée</option>
                            <option value="medium">Moyenne</option>
                            <option value="low">Faible</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nombre de concurrents</label>
                        <input type="number" class="form-input" id="companyCompetitorCount" placeholder="0" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Barrières à l'entrée</label>
                        <select class="form-select" id="companyEntryBarriers">
                            <option value="">Sélectionnez...</option>
                            <option value="high">Élevées</option>
                            <option value="medium">Moyennes</option>
                            <option value="low">Faibles</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Pouvoir des fournisseurs</label>
                        <select class="form-select" id="companySupplierPower">
                            <option value="">Sélectionnez...</option>
                            <option value="high">Élevé</option>
                            <option value="medium">Moyen</option>
                            <option value="low">Faible</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Pouvoir des clients</label>
                        <select class="form-select" id="companyBuyerPower">
                            <option value="">Sélectionnez...</option>
                            <option value="high">Élevé</option>
                            <option value="medium">Moyen</option>
                            <option value="low">Faible</option>
                        </select>
                    </div>
                </div>
                <p class="form-hint"><i class="fas fa-info-circle"></i> Décrivez votre position concurrentielle pour une analyse Porter précise.</p>
            `;
            break;
            
        case 'pestel':
            html += `
                <div class="specific-fields-grid">
                    <div class="form-group">
                        <label class="form-label">Nom de l'entreprise</label>
                        <input type="text" class="form-input" id="companyName" placeholder="Nom de votre entreprise">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Secteur d'activité</label>
                        <input type="text" class="form-input" id="companyIndustry" placeholder="Ex: Technologie, Retail, etc.">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Marché géo. principal</label>
                        <input type="text" class="form-input" id="companyGeographicCoverage" placeholder="Ex: Europe, France, International">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Croissance du marché</label>
                        <select class="form-select" id="companyMarketGrowth">
                            <option value="">Sélectionnez...</option>
                            <option value="high">Élevée</option>
                            <option value="medium">Moyenne</option>
                            <option value="low">Faible</option>
                            <option value="negative">Négative</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Stabilité politique</label>
                        <select class="form-select" id="companyPoliticalStability">
                            <option value="">Sélectionnez...</option>
                            <option value="stable">Stable</option>
                            <option value="moderate">Modérée</option>
                            <option value="unstable">Instable</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Croissance économique</label>
                        <select class="form-select" id="companyEconomicGrowth">
                            <option value="">Sélectionnez...</option>
                            <option value="expansion">Expansion</option>
                            <option value="stable">Stable</option>
                            <option value="recession">Récession</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Impact technologique</label>
                        <select class="form-select" id="companyTechImpact">
                            <option value="">Sélectionnez...</option>
                            <option value="high">Élevé</option>
                            <option value="medium">Moyen</option>
                            <option value="low">Faible</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Impact environnemental</label>
                        <select class="form-select" id="companyEnvironmentalImpact">
                            <option value="">Sélectionnez...</option>
                            <option value="high">Élevé</option>
                            <option value="medium">Moyen</option>
                            <option value="low">Faible</option>
                        </select>
                    </div>
                </div>
                <p class="form-hint"><i class="fas fa-info-circle"></i> Analysez l'environnement macro-économique de votre entreprise.</p>
            `;
            break;
            
        case 'competitive':
            html += `
                <div class="specific-fields-grid">
                    <div class="form-group">
                        <label class="form-label">Nom de l'entreprise</label>
                        <input type="text" class="form-input" id="companyName" placeholder="Nom de votre entreprise">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Secteur d'activité</label>
                        <input type="text" class="form-input" id="companyIndustry" placeholder="Ex: Technologie, Retail, etc.">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Prix relatif (vs concurrents)</label>
                        <select class="form-select" id="companyPrice">
                            <option value="">Sélectionnez...</option>
                            <option value="premium">Premium (+20%)</option>
                            <option value="high">Élevé (+10%)</option>
                            <option value="competitive">Compétitif (même niveau)</option>
                            <option value="low">Bas (-10%)</option>
                            <option value="very_low">Très bas (-20%)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Qualité (1-10)</label>
                        <input type="number" class="form-input" id="companyQuality" placeholder="0" min="1" max="10">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Innovation (1-10)</label>
                        <input type="number" class="form-input" id="companyInnovation" placeholder="0" min="1" max="10">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Service client (1-10)</label>
                        <input type="number" class="form-input" id="companyCustomerService" placeholder="0" min="1" max="10">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Forces de distribution</label>
                        <select class="form-select" id="companyDistribution">
                            <option value="">Sélectionnez...</option>
                            <option value="strong">Forte</option>
                            <option value="medium">Moyenne</option>
                            <option value="weak">Faible</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Noms des concurrents (séparés par virgule)</label>
                        <input type="text" class="form-input" id="companyCompetitors" placeholder="Ex: Concurrent A, Concurrent B">
                    </div>
                </div>
                <p class="form-hint"><i class="fas fa-info-circle"></i> Comparez votre position par rapport à vos concurrents directs.</p>
            `;
            break;
            
        default:
            html += '<p>Aucun champ spécifique pour ce type d\'analyse.</p>';
    }
    
    section.innerHTML = html;
    container.appendChild(section);
}

// Collecter les données d'analyse selon le type
function collectAnalysisData(type) {
    const companyData = {
        name: document.getElementById('companyName')?.value || 'Mon Entreprise',
        industry: document.getElementById('companyIndustry')?.value || 'Non spécifié'
    };
    
    // Charger les valeurs par défaut depuis mock data
    const defaultData = AnalysisManager.generateMockCompanyData();
    
    switch (type) {
        case 'swot':
            // Récupérer les valeurs du formulaire SWOT
            if (document.getElementById('companyRevenue')?.value) {
                companyData.revenue = parseFloat(document.getElementById('companyRevenue').value) || defaultData.revenue;
            }
            if (document.getElementById('companyEmployees')?.value) {
                companyData.employees = parseInt(document.getElementById('companyEmployees').value) || defaultData.employees;
            }
            if (document.getElementById('companyMarketShare')?.value) {
                companyData.marketShare = parseFloat(document.getElementById('companyMarketShare').value / 100) || defaultData.marketShare;
            }
            if (document.getElementById('companyTechnology')?.value) {
                companyData.technology = document.getElementById('companyTechnology').value || defaultData.technology;
            }
            if (document.getElementById('companyCustomerSatisfaction')?.value) {
                companyData.customerSatisfaction = parseInt(document.getElementById('companyCustomerSatisfaction').value) || defaultData.customerSatisfaction;
            }
            if (document.getElementById('companyBrandRecognition')?.value) {
                companyData.brandRecognition = parseInt(document.getElementById('companyBrandRecognition').value) || defaultData.brandRecognition;
            }
            // Ajouter d'autres champs par défaut pour SWOT
            companyData.quality = defaultData.quality;
            companyData.price = defaultData.price;
            companyData.innovation = defaultData.innovation;
            companyData.brandStrength = defaultData.brandStrength;
            companyData.distribution = defaultData.distribution;
            break;
            
        case 'porter':
            // Récupérer les valeurs du formulaire Porter
            if (document.getElementById('companyStrategy')?.value) {
                companyData.strategy = document.getElementById('companyStrategy').value || defaultData.strategy;
            }
            if (document.getElementById('companyProductDifferentiation')?.value) {
                companyData.productDifferentiation = document.getElementById('companyProductDifferentiation').value || defaultData.productDifferentiation;
            }
            if (document.getElementById('companyCompetitorCount')?.value) {
                companyData.competitorCount = parseInt(document.getElementById('companyCompetitorCount').value) || defaultData.competitorCount;
            }
            if (document.getElementById('companyEntryBarriers')?.value) {
                companyData.entryBarriers = document.getElementById('companyEntryBarriers').value || defaultData.entryBarriers;
            }
            if (document.getElementById('companySupplierPower')?.value) {
                companyData.supplierPower = document.getElementById('companySupplierPower').value || defaultData.supplierPower;
            }
            if (document.getElementById('companyBuyerPower')?.value) {
                companyData.buyerPower = document.getElementById('companyBuyerPower').value || defaultData.buyerPower;
            }
            // Ajouter d'autres champs par défaut pour Porter
            companyData.revenue = defaultData.revenue;
            companyData.employees = defaultData.employees;
            companyData.marketShare = defaultData.marketShare;
            companyData.quality = defaultData.quality;
            companyData.price = defaultData.price;
            companyData.innovation = defaultData.innovation;
            companyData.customerService = defaultData.customerService;
            companyData.brandStrength = defaultData.brandStrength;
            companyData.distribution = defaultData.distribution;
            companyData.economiesOfScale = defaultData.economiesOfScale;
            companyData.capitalRequirements = defaultData.capitalRequirements;
            companyData.brandLoyalty = defaultData.brandLoyalty;
            companyData.entrySwitchingCosts = defaultData.entrySwitchingCosts;
            companyData.accessToDistribution = defaultData.accessToDistribution;
            companyData.regulatoryBarriers = defaultData.regulatoryBarriers;
            companyData.substituteAvailability = defaultData.substituteAvailability;
            companyData.competitors = defaultData.competitors;
            break;
            
        case 'pestel':
            // Récupérer les valeurs du formulaire PESTEL
            if (document.getElementById('companyGeographicCoverage')?.value) {
                companyData.geographicCoverage = document.getElementById('companyGeographicCoverage').value || defaultData.geographicCoverage;
            }
            if (document.getElementById('companyMarketGrowth')?.value) {
                companyData.industryGrowth = document.getElementById('companyMarketGrowth').value || defaultData.industryGrowth;
            }
            if (document.getElementById('companyPoliticalStability')?.value) {
                companyData.governmentStability = document.getElementById('companyPoliticalStability').value || defaultData.governmentStability;
            }
            if (document.getElementById('companyEconomicGrowth')?.value) {
                companyData.economicTrends = document.getElementById('companyEconomicGrowth').value || defaultData.economicTrends;
            }
            if (document.getElementById('companyTechImpact')?.value) {
                companyData.technologicalAdoption = document.getElementById('companyTechImpact').value || defaultData.technologicalAdoption;
            }
            if (document.getElementById('companyEnvironmentalImpact')?.value) {
                companyData.climateChangeImpact = document.getElementById('companyEnvironmentalImpact').value || defaultData.climateChangeImpact;
            }
            // Ajouter d'autres champs par défaut pour PESTEL
            companyData.revenue = defaultData.revenue;
            companyData.employees = defaultData.employees;
            companyData.marketShare = defaultData.marketShare;
            companyData.taxationPolicy = defaultData.taxationPolicy;
            companyData.tradeRegulations = defaultData.tradeRegulations;
            companyData.foreignInvestmentPolicy = defaultData.foreignInvestmentPolicy;
            companyData.subsidies = defaultData.subsidies;
            companyData.politicalRisks = defaultData.politicalRisks;
            companyData.gdpGrowth = defaultData.gdpGrowth;
            companyData.inflationRate = defaultData.inflationRate;
            companyData.interestRates = defaultData.interestRates;
            companyData.unemploymentRate = defaultData.unemploymentRate;
            companyData.exchangeRates = defaultData.exchangeRates;
            companyData.consumerSpending = defaultData.consumerSpending;
            companyData.populationGrowth = defaultData.populationGrowth;
            companyData.educationLevel = defaultData.educationLevel;
            companyData.culturalTrends = defaultData.culturalTrends;
            companyData.lifestyleChanges = defaultData.lifestyleChanges;
            companyData.rndInvestment = defaultData.rndInvestment;
            companyData.digitalTransformation = defaultData.digitalTransformation;
            companyData.sustainabilityTrends = defaultData.sustainabilityTrends;
            companyData.environmentalRegulations = defaultData.environmentalRegulations;
            companyData.laborLaws = defaultData.laborLaws;
            companyData.consumerProtection = defaultData.consumerProtection;
            companyData.dataProtection = defaultData.dataProtection;
            companyData.industryRegulations = defaultData.industryRegulations;
            break;
            
        case 'competitive':
            // Récupérer les valeurs du formulaire Concurrentiel
            if (document.getElementById('companyPrice')?.value) {
                const priceMap = { premium: 1.2, high: 1.1, competitive: 1.0, low: 0.9, very_low: 0.8 };
                companyData.price = priceMap[document.getElementById('companyPrice').value] || defaultData.price;
            }
            if (document.getElementById('companyQuality')?.value) {
                companyData.quality = parseInt(document.getElementById('companyQuality').value) || defaultData.quality;
            }
            if (document.getElementById('companyInnovation')?.value) {
                companyData.innovation = parseInt(document.getElementById('companyInnovation').value) || defaultData.innovation;
            }
            if (document.getElementById('companyCustomerService')?.value) {
                companyData.customerService = parseInt(document.getElementById('companyCustomerService').value) || defaultData.customerService;
            }
            if (document.getElementById('companyDistribution')?.value) {
                companyData.distribution = parseInt(document.getElementById('companyDistribution').value) || defaultData.distribution;
            }
            if (document.getElementById('companyCompetitors')?.value) {
                const competitors = document.getElementById('companyCompetitors').value.split(',')
                    .map(c => c.trim()).filter(c => c);
                if (competitors.length > 0) {
                    companyData.competitors = competitors.map((name, index) => ({
                        name: name,
                        marketShare: defaultData.competitors[index]?.marketShare || 0.15,
                        qualityIndex: defaultData.competitors[index]?.qualityIndex || 7,
                        priceIndex: defaultData.competitors[index]?.priceIndex || 1.0,
                        featureScore: defaultData.competitors[index]?.featureScore || 6,
                        innovationScore: defaultData.competitors[index]?.innovationScore || 5
                    }));
                }
            }
            // Ajouter d'autres champs par défaut pour Competitive
            companyData.revenue = defaultData.revenue;
            companyData.employees = defaultData.employees;
            companyData.marketShare = defaultData.marketShare;
            companyData.brandStrength = defaultData.brandStrength;
            companyData.productDifferentiation = defaultData.productDifferentiation;
            companyData.serviceDifferentiation = defaultData.serviceDifferentiation;
            companyData.brandDifferentiation = defaultData.brandDifferentiation;
            companyData.strategy = defaultData.strategy;
            break;
            
        default:
            // Utiliser les données par défaut
            return defaultData;
    }
    
    return { ...defaultData, ...companyData };
}

// Initialiser le formulaire d'analyse
function initAnalysisForm() {
    console.log('[DPAI] initAnalysisForm appelée');
    const analysisForm = document.getElementById('analysisForm');
    const analysisTypeSelect = document.getElementById('analysisType');
    const specificFieldsContainer = document.getElementById('analysisSpecificFields');
    
    console.log('[DPAI] analysisForm:', analysisForm ? 'trouvé' : 'NON TROUVÉ');
    console.log('[DPAI] analysisTypeSelect:', analysisTypeSelect ? 'trouvé' : 'NON TROUVÉ');
    
    if (analysisForm && analysisTypeSelect) {
        console.log('[DPAI] Initialisation du formulaire...');
        // Mettre à jour l'estimation et les champs spécifiques quand le type change
        analysisTypeSelect.addEventListener('change', function() {
            console.log('[DPAI] Type changé:', this.value);
            updateAnalysisEstimation(this.value);
            updateSpecificFields(this.value, specificFieldsContainer);
        });
        
        // Initialiser avec le type actuel
        console.log('[DPAI] Initialisation avec type:', analysisTypeSelect.value);
        updateAnalysisEstimation(analysisTypeSelect.value);
        updateSpecificFields(analysisTypeSelect.value, specificFieldsContainer);
        
        // Soumission du formulaire
        analysisForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('[DPAI] Formulaire soumis !');
            
            const type = analysisTypeSelect.value;
            const name = document.getElementById('analysisName').value;
            const description = document.getElementById('analysisDescription').value;
            console.log('[DPAI] Type:', type, 'Nom:', name, 'Description:', description);
            
            if (!type) {
                showAlert('error', 'Erreur', 'Veuillez sélectionner un type d\'analyse.');
                return;
            }
            
            const plan = authService.userData?.plan || 'free';
            const cost = (TokenManager && TokenManager.getCost) ? TokenManager.getCost(type, plan) : 5;
            const available = (TokenManager && TokenManager.availableTokens) ? (TokenManager.availableTokens || 0) : 9999;
            
            if (available < cost) {
                showAlert('error', 'Erreur', `Vous n'avez pas assez de tokens pour cette analyse. Nécessaire: ${cost}, Disponible: ${available}`);
                return;
            }
            
            // Récupérer les données spécifiques selon le type
            const companyData = collectAnalysisData(type);
            
            // Fermer le modal
            const modal = document.getElementById('analysisModal');
            if (modal) modal.classList.remove('visible');
            
            // Lancer l'analyse avec les données personnalisées
            launchAnalysis(type, name, description, cost, companyData);
        });
        
        // Gérer le bouton Annuler
        const cancelBtn = document.getElementById('analysisModalCancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                const modal = document.getElementById('analysisModal');
                if (modal) modal.classList.remove('visible');
            });
        }
    }
}

// Initialiser les tabs d'analyses
function initAnalysisTabs() {
    const analysisTabBtns = document.querySelectorAll('.analysis-tab-btn');
    
    if (analysisTabBtns.length === 0) return;
    
    analysisTabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Retirer la classe active de tous les tabs
            analysisTabBtns.forEach(b => b.classList.remove('active'));
            
            // Ajouter la classe active au tab cliqué
            this.classList.add('active');
            
            // Afficher/masquer les contenus
            const tabContents = document.querySelectorAll('.analysis-tab-content');
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            
            const targetTab = document.getElementById(`analysis-${tabId}-content`);
            if (targetTab) {
                targetTab.style.display = 'block';
            }
        });
    });
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
    const cost = (TokenManager && TokenManager.getCost) ? TokenManager.getCost(type, plan) : 5;
    const available = (TokenManager && TokenManager.availableTokens) ? (TokenManager.availableTokens || 0) : 9999;
    const canAfford = available >= cost;
    
    if (estimatedAnalysisTypeEl) {
        const analysisNames = {
            swot: 'Analyse SWOT',
            porter: 'Porter 5 Forces',
            pestel: 'Analyse PESTEL',
            competitive: 'Analyse Concurrentielle',
            basic: 'Analyse de base',
            advanced: 'Analyse avancée',
            detailed_report: 'Rapport détaillé'
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
            if (startAnalysisBtn) startAnalysisBtn.disabled = true;
        } else {
            insufficientTokensAlert.style.display = 'none';
            if (startAnalysisBtn) startAnalysisBtn.disabled = false;
        }
    }
}

// Mettre à jour l'interface après une analyse réussie
async function updateAfterAnalysis(type, name, description, cost) {
    try {
        // Vérifier si on est en mode démo
        const isFileProtocol = window.location.protocol === 'file:';
        const isFirebaseAvailable = typeof window.firebase !== 'undefined' && window.firebase;
        const isDemoMode = !isFirebaseAvailable || isFileProtocol;
        
        const user = authService.currentUser;
        
        // Mettre à jour les tokens affichés
        const availableTokensEl = document.getElementById('availableTokens');
        const usedTokensEl = document.getElementById('usedTokens');
        const totalTokensEl = document.getElementById('totalTokens');
        const tokenProgressEl = document.getElementById('tokenProgress');
        const tokenAvailableEl = document.getElementById('tokenAvailable');
        
        let availableTokens, usedTokens, totalTokens, tokenLimit;
        
        if (!isDemoMode && user) {
            // Mode normal : recharger les données utilisateur pour avoir les dernières valeurs
            const userData = await authService.loadUserData(user.uid);
            authService.userData = userData;
            TokenManager.init(userData);
            
            availableTokens = userData.availableTokens || 
                                  (userData.tokenState ? userData.tokenState.availableTokens : 0) || 0;
            usedTokens = userData.tokensUsed || 
                              (userData.tokenState ? userData.tokenState.usedTokens : 0) || 0;
            totalTokens = userData.totalTokens || 
                               (userData.tokenState ? userData.tokenState.totalTokens : 0) || 0;
            tokenLimit = userData.tokenLimit || 
                         (userData.tokenState ? userData.tokenState.baseTokens : TokenConfig.baseTokenLimits.free) || 
                         TokenConfig.baseTokenLimits.free;
        } else if (isDemoMode) {
            // Mode démo : utiliser les valeurs simulées
            const currentAvailable = window.TokenManager._demoTokens || 9999;
            const initialTokens = 9999; // Valeur initiale en mode démo
            const demoUsedTokens = initialTokens - currentAvailable;
            
            availableTokens = currentAvailable;
            usedTokens = demoUsedTokens;
            totalTokens = initialTokens;
            tokenLimit = TokenConfig.baseTokenLimits.free || 50;
        } else {
            // Mode non connecté ou autre cas
            availableTokens = TokenManager.availableTokens || 0;
            usedTokens = 0;
            totalTokens = TokenConfig.baseTokenLimits.free || 50;
            tokenLimit = TokenConfig.baseTokenLimits.free || 50;
        }
        
        if (availableTokensEl) {
            availableTokensEl.textContent = TokenUtils.formatTokens(availableTokens);
        }
        if (usedTokensEl) {
            usedTokensEl.textContent = TokenUtils.formatTokens(usedTokens);
        }
        if (totalTokensEl) {
            totalTokensEl.textContent = TokenUtils.formatTokens(totalTokens);
        }
        if (tokenProgressEl) {
            const percentage = Math.min(100, (usedTokens / tokenLimit) * 100);
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
        if (tokenAvailableEl) {
            tokenAvailableEl.textContent = TokenUtils.formatTokens(availableTokens);
        }
        
        // Mettre à jour les stats d'analyses
        const totalAnalysesEl = document.getElementById('totalAnalyses');
        const monthlyAnalysesEl = document.getElementById('monthlyAnalyses');
        
        const totalAnalyses = userData.totalAnalyses || 
                             (userData.loyaltyInfo ? userData.loyaltyInfo.totalAnalyses : 0) || 0;
        const monthlyAnalyses = userData.monthlyAnalyses || 
                               (userData.loyaltyInfo ? userData.loyaltyInfo.monthlyAnalyses : 0) || 0;
        
        if (totalAnalysesEl) {
            totalAnalysesEl.textContent = TokenUtils.formatTokens(totalAnalyses);
        }
        if (monthlyAnalysesEl) {
            monthlyAnalysesEl.textContent = TokenUtils.formatTokens(monthlyAnalyses);
        }
        
        // Ajouter l'analyse à la liste des analyses récentes
        await loadRecentAnalyses();
        
        // Mettre à jour l'historique des tokens
        await loadTokenHistory();
        
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
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour après analyse:', error);
        // Si erreur, recharger la page pour être sûr
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }
}

// Afficher les résultats de l'analyse dans une nouvelle fenêtre
function showAnalysisResults(analysisData) {
    console.log('[DPAI] showAnalysisResults appelé avec:', analysisData);
    
    // Stocker les données dans localStorage pour la nouvelle page
    try {
        localStorage.setItem('dpai_analysis_results', JSON.stringify(analysisData));
        console.log('[DPAI] Données sauvegardées dans localStorage');
        
        // Ouvrir la page des résultats dans un nouvel onglet
        const resultsWindow = window.open('analysis-results.html', '_blank');
        if (!resultsWindow) {
            console.error('[DPAI] window.open a été bloqué par le navigateur');
            alert('Impossible d\'ouvrir les résultats dans une nouvelle fenêtre. Veuillez autoriser les pop-ups pour ce site et réessayer.');
        } else {
            console.log('[DPAI] Nouvelle fenêtre ouverte avec succès');
        }
    } catch (error) {
        console.error('[DPAI] Erreur lors de l\'ouverture des résultats:', error);
        alert('Impossible d\'ouvrir les résultats. Veuillez réessayer.');
    }
}
function initViewAnalysisButtons() {
    const viewBtns = document.querySelectorAll('.view-analysis-btn');
    
    viewBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const analysisId = this.closest('.analysis-card').getAttribute('data-id');
            const analysisType = this.closest('.analysis-card').getAttribute('data-type');
            viewAnalysis(analysisId, analysisType);
        });
    });
}

// Voir une analyse
async function viewAnalysis(analysisId, analysisType) {
    const user = authService.currentUser;
    if (!user) return;
    
    try {
        const analysisDoc = await db.collection('users')
            .doc(user.uid)
            .collection('analyses')
            .doc(analysisId)
            .get();
        
        if (!analysisDoc.exists) {
            showAlert('error', 'Erreur', 'Analyse introuvable.');
            return;
        }
        
        const analysis = analysisDoc.data();
        
        // Afficher le modal de visualisation
        showAnalysisModal(analysis, analysisType);
        
    } catch (error) {
        showAlert('error', 'Erreur', error.message || 'Une erreur est survenue.');
    }
}

// Afficher le modal de visualisation d'analyse dans une nouvelle fenêtre
function showAnalysisModal(analysis, analysisType) {
    // Ouvrir dans une nouvelle fenêtre
    showAnalysisResults(analysis);
}

// Générer le HTML pour une analyse SWOT
function generateSWOTAnalysisHTML(analysis) {
    const results = analysis.results || {};
    
    return `
        <div class="analysis-view">
            <div class="analysis-meta">
                <div class="analysis-meta-item">
                    <i class="fas fa-calendar-day"></i>
                    <span>${formatDate(analysis.createdAt)}</span>
                </div>
                <div class="analysis-meta-item">
                    <i class="fas fa-coins"></i>
                    <span>${analysis.cost || 0} tokens</span>
                </div>
                <div class="analysis-meta-item">
                    <i class="fas fa-chart-line"></i>
                    <span>Score: ${analysis.score || 0}/100</span>
                </div>
            </div>
            
            <p class="analysis-description">${analysis.description || 'Aucune description'}</p>
            
            <div class="swot-grid">
                <div class="swot-quadrant positive internal">
                    <h4><i class="fas fa-plus-circle"></i> Forces</h4>
                    <ul>
                        ${(results.strengths || []).map(s => `<li>${s}</li>`).join('')}
                    </ul>
                </div>
                <div class="swot-quadrant negative internal">
                    <h4><i class="fas fa-minus-circle"></i> Faiblesses</h4>
                    <ul>
                        ${(results.weaknesses || []).map(w => `<li>${w}</li>`).join('')}
                    </ul>
                </div>
                <div class="swot-quadrant positive external">
                    <h4><i class="fas fa-plus-circle"></i> Opportunités</h4>
                    <ul>
                        ${(results.opportunities || []).map(o => `<li>${o}</li>`).join('')}
                    </ul>
                </div>
                <div class="swot-quadrant negative external">
                    <h4><i class="fas fa-minus-circle"></i> Menaces</h4>
                    <ul>
                        ${(results.threats || []).map(t => `<li>${t}</li>`).join('')}
                    </ul>
                </div>
            </div>
            
            ${results.strategicInsights ? `
                <div class="strategic-insights">
                    <h4><i class="fas fa-lightbulb"></i> Insights Stratégiques</h4>
                    <div class="insights-grid">
                        <div class="insight-card">
                            <h5>SO (Forces-Opportunités)</h5>
                            <ul>
                                ${(results.strategicInsights.SO || []).map(i => `<li>${i}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="insight-card">
                            <h5>ST (Forces-Menaces)</h5>
                            <ul>
                                ${(results.strategicInsights.ST || []).map(i => `<li>${i}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="insight-card">
                            <h5>WO (Faiblesses-Opportunités)</h5>
                            <ul>
                                ${(results.strategicInsights.WO || []).map(i => `<li>${i}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="insight-card">
                            <h5>WT (Faiblesses-Menaces)</h5>
                            <ul>
                                ${(results.strategicInsights.WT || []).map(i => `<li>${i}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            ${results.summary ? `
                <div class="analysis-summary">
                    <h4><i class="fas fa-summary"></i> Résumé</h4>
                    <p>${results.summary.assessment || 'Aucun résumé disponible'}</p>
                </div>
            ` : ''}
            
            ${(analysis.recommendations || []).length > 0 ? `
                <div class="analysis-recommendations">
                    <h4><i class="fas fa-recommend"></i> Recommandations</h4>
                    <ul>
                        ${analysis.recommendations.map(rec => `
                            <li class="recommendation-item priority-${rec.priority || 'medium'}">
                                <span class="recommendation-type">${rec.category || 'Général'}</span>
                                <span class="recommendation-text">${rec.action || rec}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
}

// Générer le HTML pour une analyse Porter 5 Forces
function generatePorterAnalysisHTML(analysis) {
    const results = analysis.results || {};
    
    return `
        <div class="analysis-view">
            <div class="analysis-meta">
                <div class="analysis-meta-item">
                    <i class="fas fa-calendar-day"></i>
                    <span>${formatDate(analysis.createdAt)}</span>
                </div>
                <div class="analysis-meta-item">
                    <i class="fas fa-coins"></i>
                    <span>${analysis.cost || 0} tokens</span>
                </div>
                <div class="analysis-meta-item">
                    <i class="fas fa-chart-line"></i>
                    <span>Score: ${analysis.score || 0}/100</span>
                </div>
            </div>
            
            <p class="analysis-description">${analysis.description || 'Aucune description'}</p>
            
            <div class="porter-forces">
                <h4><i class="fas fa-balance-scale"></i> Analyse des 5 Forces de Porter</h4>
                
                <div class="force-card">
                    <div class="force-header">
                        <h5><i class="fas fa-industry"></i> Pouvoir des fournisseurs</h5>
                        <span class="force-score ${getScoreClass(results.supplierPower?.score || 0)}">
                            ${results.supplierPower?.score || 0}/100 - ${results.supplierPower?.level || 'Inconnu'}
                        </span>
                    </div>
                    <p>${results.supplierPower?.assessment || 'Aucune évaluation disponible'}</p>
                </div>
                
                <div class="force-card">
                    <div class="force-header">
                        <h5><i class="fas fa-shopping-cart"></i> Pouvoir des acheteurs</h5>
                        <span class="force-score ${getScoreClass(results.buyerPower?.score || 0)}">
                            ${results.buyerPower?.score || 0}/100 - ${results.buyerPower?.level || 'Inconnu'}
                        </span>
                    </div>
                    <p>${results.buyerPower?.assessment || 'Aucune évaluation disponible'}</p>
                </div>
                
                <div class="force-card">
                    <div class="force-header">
                        <h5><i class="fas fa-user-plus"></i> Menace des nouveaux entrants</h5>
                        <span class="force-score ${getScoreClass(results.newEntrants?.barrierScore || (100 - (results.newEntrants?.score || 0)))}">
                            ${results.newEntrants?.score || 0}/100 - ${results.newEntrants?.level || 'Inconnu'}
                        </span>
                    </div>
                    <p>${results.newEntrants?.assessment || 'Aucune évaluation disponible'}</p>
                </div>
                
                <div class="force-card">
                    <div class="force-header">
                        <h5><i class="fas fa-exchange-alt"></i> Menace des substituts</h5>
                        <span class="force-score ${getScoreClass(results.substitutes?.score || 0)}">
                            ${results.substitutes?.score || 0}/100 - ${results.substitutes?.level || 'Inconnu'}
                        </span>
                    </div>
                    <p>${results.substitutes?.assessment || 'Aucune évaluation disponible'}</p>
                </div>
                
                <div class="force-card">
                    <div class="force-header">
                        <h5><i class="fas fa-fire"></i> Intensité de la rivalité</h5>
                        <span class="force-score ${getScoreClass(results.rivalry?.score || 0)}">
                            ${results.rivalry?.score || 0}/100 - ${results.rivalry?.level || 'Inconnu'}
                        </span>
                    </div>
                    <p>${results.rivalry?.assessment || 'Aucune évaluation disponible'}</p>
                </div>
            </div>
            
            ${results.industryAttractiveness ? `
                <div class="attractiveness-summary">
                    <h4><i class="fas fa-chart-bar"></i> Attractivité de l'industrie</h4>
                    <div class="attractiveness-card">
                        <div class="attractiveness-score ${getAttractivenessClass(results.industryAttractiveness.score || 0)}">
                            ${results.industryAttractiveness.score || 0}/100
                        </div>
                        <div class="attractiveness-level">
                            ${results.industryAttractiveness.level || 'Inconnu'}
                        </div>
                        <p>${results.industryAttractiveness.recommendation || results.summary?.recommendation || ''}</p>
                    </div>
                </div>
            ` : ''}
            
            ${results.strategicImplications ? `
                <div class="strategic-implications">
                    <h4><i class="fas fa-cog"></i> Implications Stratégiques</h4>
                    <ul>
                        ${results.strategicImplications.map(imp => `
                            <li class="implication-item priority-${imp.priority || 'medium'}">
                                <span class="implication-type">${imp.type || 'Général'}</span>
                                <span class="implication-text">${imp.action || ''}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
}

// Générer le HTML pour une analyse PESTEL
function generatePESTELAnalysisHTML(analysis) {
    const results = analysis.results || {};
    
    return `
        <div class="analysis-view">
            <div class="analysis-meta">
                <div class="analysis-meta-item">
                    <i class="fas fa-calendar-day"></i>
                    <span>${formatDate(analysis.createdAt)}</span>
                </div>
                <div class="analysis-meta-item">
                    <i class="fas fa-coins"></i>
                    <span>${analysis.cost || 0} tokens</span>
                </div>
                <div class="analysis-meta-item">
                    <i class="fas fa-chart-line"></i>
                    <span>Score: ${analysis.score || 0}/100</span>
                </div>
            </div>
            
            <p class="analysis-description">${analysis.description || 'Aucune description'}</p>
            
            <div class="pestel-grid">
                <div class="pestel-factor ${results.political?.impact || 'neutral'}">
                    <h4><i class="fas fa-landmark"></i> Politique</h4>
                    <div class="factor-score">${results.political?.score || 0}/100 - ${results.political?.level || 'Inconnu'}</div>
                    <p>${results.political?.assessment || 'Aucune évaluation disponible'}</p>
                </div>
                
                <div class="pestel-factor ${results.economic?.impact || 'neutral'}">
                    <h4><i class="fas fa-chart-line"></i> Économique</h4>
                    <div class="factor-score">${results.economic?.score || 0}/100 - ${results.economic?.level || 'Inconnu'}</div>
                    <p>${results.economic?.assessment || 'Aucune évaluation disponible'}</p>
                </div>
                
                <div class="pestel-factor ${results.social?.impact || 'neutral'}">
                    <h4><i class="fas fa-users"></i> Social</h4>
                    <div class="factor-score">${results.social?.score || 0}/100 - ${results.social?.level || 'Inconnu'}</div>
                    <p>${results.social?.assessment || 'Aucune évaluation disponible'}</p>
                </div>
                
                <div class="pestel-factor ${results.technological?.impact || 'neutral'}">
                    <h4><i class="fas fa-cog"></i> Technologique</h4>
                    <div class="factor-score">${results.technological?.score || 0}/100 - ${results.technological?.level || 'Inconnu'}</div>
                    <p>${results.technological?.assessment || 'Aucune évaluation disponible'}</p>
                </div>
                
                <div class="pestel-factor ${results.environmental?.impact || 'neutral'}">
                    <h4><i class="fas fa-leaf"></i> Environnemental</h4>
                    <div class="factor-score">${results.environmental?.score || 0}/100 - ${results.environmental?.level || 'Inconnu'}</div>
                    <p>${results.environmental?.assessment || 'Aucune évaluation disponible'}</p>
                </div>
                
                <div class="pestel-factor ${results.legal?.impact || 'neutral'}">
                    <h4><i class="fas fa-gavel"></i> Légal</h4>
                    <div class="factor-score">${results.legal?.score || 0}/100 - ${results.legal?.level || 'Inconnu'}</div>
                    <p>${results.legal?.assessment || 'Aucune évaluation disponible'}</p>
                </div>
            </div>
            
            ${results.impactAssessment ? `
                <div class="impact-assessment">
                    <h4><i class="fas fa-balance-scale"></i> Évaluation d'impact global</h4>
                    <div class="impact-balance">
                        <div class="impact-positive">
                            <h5>Facteurs positifs (${results.impactAssessment.positiveFactors.length})</h5>
                            <ul>
                                ${results.impactAssessment.positiveFactors.map(f => `
                                    <li>${f.factor}: ${f.score}/100 - ${f.level}</li>
                                `).join('')}
                            </ul>
                        </div>
                        <div class="impact-negative">
                            <h5>Facteurs négatifs (${results.impactAssessment.negativeFactors.length})</h5>
                            <ul>
                                ${results.impactAssessment.negativeFactors.map(f => `
                                    <li>${f.factor}: ${f.score}/100 - ${f.level}</li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                    <div class="overall-impact">
                        <span>Impact global: <strong>${results.impactAssessment.overallImpact || 'Neutre'}</strong></span>
                        <span>Balance: <strong>${results.impactAssessment.balance >= 0 ? '+' : ''}${results.impactAssessment.balance}</strong></span>
                    </div>
                </div>
            ` : ''}
            
            ${results.summary ? `
                <div class="analysis-summary">
                    <h4><i class="fas fa-summary"></i> Résumé</h4>
                    <p>${results.summary.recommendation || 'Aucun résumé disponible'}</p>
                </div>
            ` : ''}
        </div>
    `;
}

// Générer le HTML pour une analyse concurrentielle
function generateCompetitiveAnalysisHTML(analysis) {
    const results = analysis.results || {};
    
    return `
        <div class="analysis-view">
            <div class="analysis-meta">
                <div class="analysis-meta-item">
                    <i class="fas fa-calendar-day"></i>
                    <span>${formatDate(analysis.createdAt)}</span>
                </div>
                <div class="analysis-meta-item">
                    <i class="fas fa-coins"></i>
                    <span>${analysis.cost || 0} tokens</span>
                </div>
                <div class="analysis-meta-item">
                    <i class="fas fa-chart-line"></i>
                    <span>Score: ${analysis.score || 0}/100</span>
                </div>
            </div>
            
            <p class="analysis-description">${analysis.description || 'Aucune description'}</p>
            
            ${results.marketShare ? `
                <div class="market-share-summary">
                    <h4><i class="fas fa-chart-pie"></i> Part de marché</h4>
                    <div class="market-share-value">
                        ${(results.marketShare.companyMarketShare * 100).toFixed(2)}%
                    </div>
                    <p>${results.marketShare.assessment || 'Aucune évaluation disponible'}</p>
                    <p>Concentration du marché: <strong>${results.marketShare.marketConcentration || 'Inconnu'}</strong></p>
                </div>
            ` : ''}
            
            ${results.competitivePosition ? `
                <div class="competitive-position">
                    <h4><i class="fas fa-trophy"></i> Position Concurrentielle</h4>
                    <div class="position-value ${results.competitivePosition.position || 'average'}">
                        ${results.competitivePosition.position ? results.competitivePosition.position.charAt(0).toUpperCase() + results.competitivePosition.position.slice(1) : 'Inconnu'}
                    </div>
                    <p>${results.competitivePosition.assessment || 'Aucune évaluation disponible'}</p>
                    
                    <div class="position-details">
                        <div class="position-strengths">
                            <h5><i class="fas fa-plus"></i> Forces</h5>
                            <ul>
                                ${(results.competitivePosition.strengths || []).map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="position-weaknesses">
                            <h5><i class="fas fa-minus"></i> Faiblesses</h5>
                            <ul>
                                ${(results.competitivePosition.weaknesses || []).map(w => `<li>${w}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            ${results.competitorBenchmark ? `
                <div class="benchmark-summary">
                    <h4><i class="fas fa-chart-bar"></i> Benchmark Concurrentiel</h4>
                    <div class="benchmark-grid">
                        <div class="benchmark-item">
                            <h5>Prix</h5>
                            <span class="benchmark-value ${results.competitorBenchmark.priceComparison || 'average'}">
                                ${results.competitorBenchmark.priceComparison ? results.competitorBenchmark.priceComparison.replace(/_/g, ' ') : 'Inconnu'}
                            </span>
                            <p>Votre: ${results.competitorBenchmark.companyVsAverage?.price || 'N/A'}</p>
                            <p>Moyenne: ${results.competitorBenchmark.industryAverage?.price || 'N/A'}</p>
                        </div>
                        <div class="benchmark-item">
                            <h5>Qualité</h5>
                            <span class="benchmark-value ${results.competitorBenchmark.qualityComparison || 'average'}">
                                ${results.competitorBenchmark.qualityComparison ? results.competitorBenchmark.qualityComparison.replace(/_/g, ' ') : 'Inconnu'}
                            </span>
                            <p>Votre: ${results.competitorBenchmark.companyVsAverage?.quality || 'N/A'}</p>
                            <p>Moyenne: ${results.competitorBenchmark.industryAverage?.quality || 'N/A'}</p>
                        </div>
                        <div class="benchmark-item">
                            <h5>Fonctionnalités</h5>
                            <span class="benchmark-value ${results.competitorBenchmark.featureComparison || 'average'}">
                                ${results.competitorBenchmark.featureComparison ? results.competitorBenchmark.featureComparison.replace(/_/g, ' ') : 'Inconnu'}
                            </span>
                            <p>Votre: ${results.competitorBenchmark.companyVsAverage?.features || 'N/A'}</p>
                            <p>Moyenne: ${results.competitorBenchmark.industryAverage?.features || 'N/A'}</p>
                        </div>
                        <div class="benchmark-item">
                            <h5>Innovation</h5>
                            <span class="benchmark-value ${results.competitorBenchmark.innovationComparison || 'average'}">
                                ${results.competitorBenchmark.innovationComparison ? results.competitorBenchmark.innovationComparison.replace(/_/g, ' ') : 'Inconnu'}
                            </span>
                            <p>Votre: ${results.competitorBenchmark.companyVsAverage?.innovation || 'N/A'}</p>
                            <p>Moyenne: ${results.competitorBenchmark.industryAverage?.innovation || 'N/A'}</p>
                        </div>
                    </div>
                    <p>${results.competitorBenchmark.assessment || 'Aucune évaluation disponible'}</p>
                </div>
            ` : ''}
            
            ${results.competitiveAdvantage ? `
                <div class="competitive-advantage">
                    <h4><i class="fas fa-bolt"></i> Avantages Concurrentiels</h4>
                    <div class="advantage-score ${getScoreClass(results.competitiveAdvantage.score || 0)}">
                        ${results.competitiveAdvantage.score || 0}/100 - ${results.competitiveAdvantage.level || 'Inconnu'}
                    </div>
                    
                    <div class="advantages-grid">
                        <div class="advantages-list">
                            <h5><i class="fas fa-check-circle"></i> Avantages</h5>
                            <ul>
                                ${(results.competitiveAdvantage.advantages || []).map(a => `<li>${a}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="disadvantages-list">
                            <h5><i class="fas fa-times-circle"></i> Désavantages</h5>
                            <ul>
                                ${(results.competitiveAdvantage.disadvantages || []).map(d => `<li>${d}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            ${results.summary ? `
                <div class="analysis-summary">
                    <h4><i class="fas fa-summary"></i> Résumé</h4>
                    <p>${results.summary.recommendation || 'Aucun résumé disponible'}</p>
                </div>
            ` : ''}
        </div>
    `;
}

// Générer le HTML par défaut pour une analyse
function generateDefaultAnalysisHTML(analysis) {
    return `
        <div class="analysis-view">
            <div class="analysis-meta">
                <div class="analysis-meta-item">
                    <i class="fas fa-calendar-day"></i>
                    <span>${formatDate(analysis.createdAt)}</span>
                </div>
                <div class="analysis-meta-item">
                    <i class="fas fa-coins"></i>
                    <span>${analysis.cost || 0} tokens</span>
                </div>
            </div>
            
            <h4>${analysis.name || 'Analyse sans nom'}</h4>
            <p class="analysis-description">${analysis.description || 'Aucune description'}</p>
            
            <div class="empty-state small">
                <div class="empty-state-icon">
                    <i class="fas fa-chart-bar"></i>
                </div>
                <p>Format d'analyse non reconnu.</p>
            </div>
        </div>
    `;
}

// Afficher les résultats d'analyse dans une nouvelle fenêtre (fallback)
function showAnalysisResultsFallback(analysis, analysisType) {
    // Stocker les données dans localStorage pour la nouvelle page
    try {
        localStorage.setItem('dpai_analysis_results', JSON.stringify(analysis));
        // Ouvrir la page des résultats dans un nouvel onglet
        window.open('analysis-results.html', '_blank');
    } catch (error) {
        console.error('[DPAI] Erreur lors de l\'ouverture des résultats:', error);
        // Fallback: afficher dans une alerte
        let message = `Analyse: ${analysis.name || analysisType}\n`;
        message += `Date: ${formatDate(analysis.createdAt)}\n`;
        message += `Coût: ${analysis.cost || 0} tokens\n`;
        message += `Score: ${analysis.score || 0}/100\n\n`;
        message += `Résultats: ${JSON.stringify(analysis.results, null, 2)}`;
        alert(message);
    }
}

// Exporter une analyse
async function exportAnalysis(analysisId) {
    const user = authService.currentUser;
    if (!user) return;
    
    try {
        const analysisDoc = await db.collection('users')
            .doc(user.uid)
            .collection('analyses')
            .doc(analysisId)
            .get();
        
        if (!analysisDoc.exists) {
            showAlert('error', 'Erreur', 'Analyse introuvable.');
            return;
        }
        
        const analysis = analysisDoc.data();
        
        // Créer un objet à exporter
        const exportData = {
            id: analysisId,
            type: analysis.type,
            name: analysis.name,
            description: analysis.description,
            cost: analysis.cost,
            score: analysis.score,
            confidence: analysis.confidence,
            createdAt: analysis.createdAt,
            results: analysis.results,
            recommendations: analysis.recommendations,
            companyData: analysis.companyData
        };
        
        // Télécharger en JSON
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `analyse-${analysis.type}-${analysisId}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showAlert('success', 'Succès', 'Votre analyse a été exportée avec succès !');
        
    } catch (error) {
        showAlert('error', 'Erreur', error.message || 'Une erreur est survenue.');
    }
}

// Supprimer une analyse
async function deleteAnalysis(analysisId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette analyse ? Cette action est irréversible.')) {
        return;
    }
    
    const user = authService.currentUser;
    if (!user) return;
    
    try {
        await db.collection('users')
            .doc(user.uid)
            .collection('analyses')
            .doc(analysisId)
            .delete();
        
        showAlert('success', 'Succès', 'Votre analyse a été supprimée avec succès !');
        
        // Recharger l'historique
        loadAnalysisHistory();
        
    } catch (error) {
        showAlert('error', 'Erreur', error.message || 'Une erreur est survenue.');
    }
}

// Charger les analyses récentes
async function loadRecentAnalyses() {
    await loadAnalysisHistory();
}

// Afficher toutes les analyses
async function showAllAnalyses() {
    const user = authService.currentUser;
    const recentAnalysesEl = document.getElementById('recentAnalyses');
    
    if (!recentAnalysesEl) return;
    
    // Vérifier si on est en mode démo
    const isFileProtocol = window.location.protocol === 'file:';
    const isFirebaseAvailable = typeof window.firebase !== 'undefined' && window.firebase;
    const isDemoMode = !isFirebaseAvailable || isFileProtocol;
    
    try {
        let analyses = [];
        
        if (!isDemoMode && user) {
            // Mode normal : charger TOUTES les analyses depuis Firestore
            const analysesSnapshot = await db.collection('users')
                .doc(user.uid)
                .collection('analyses')
                .orderBy('createdAt', 'desc')
                .get();
            
            if (analysesSnapshot.empty) {
                recentAnalysesEl.innerHTML = `
                    <div class="empty-state small">
                        <div class="empty-state-icon">
                            <i class="fas fa-chart-bar"></i>
                        </div>
                        <p>Vous n'avez pas encore réalisé d'analyse.</p>
                    </div>
                `;
                return;
            }
            
            analysesSnapshot.forEach(doc => {
                analyses.push({ id: doc.id, ...doc.data() });
            });
        } else if (isDemoMode) {
            // Mode démo : charger TOUTES les analyses depuis localStorage
            try {
                const demoAnalyses = JSON.parse(localStorage.getItem('dpai_demo_analyses') || '[]');
                analyses = demoAnalyses;
            } catch (e) {
                console.error('[DPAI] Erreur chargement historique démo:', e);
                analyses = [];
            }
        }
        
        if (analyses.length === 0) {
            recentAnalysesEl.innerHTML = `
                <div class="empty-state small">
                    <div class="empty-state-icon">
                        <i class="fas fa-chart-bar"></i>
                    </div>
                    <p>Vous n'avez pas encore réalisé d'analyse.</p>
                </div>
            `;
            return;
        }
        
        // Afficher TOUTES les analyses
        let html = '<h4 style="margin-bottom: var(--spacing-md);">Toutes vos analyses</h4>';
        
        analyses.forEach(analysis => {
            const date = formatDate(analysis.createdAt);
            
            const analysisTypes = {
                swot: { icon: 'fa-swimming-pool', name: 'SWOT' },
                porter: { icon: 'fa-project-diagram', name: 'Porter 5 Forces' },
                pestel: { icon: 'fa-globe-americas', name: 'PESTEL' },
                competitive: { icon: 'fa-users', name: 'Analyse Concurrentielle' }
            };
            
            const typeInfo = analysisTypes[analysis.type] || { icon: 'fa-chart-line', name: analysis.type };
            
            const statusClass = analysis.status === 'completed' ? 'success' : 
                              analysis.status === 'processing' ? 'warning' : 'error';
            const statusIcon = analysis.status === 'completed' ? 'fa-check-circle' : 
                               analysis.status === 'processing' ? 'fa-spinner fa-pulse' : 'fa-exclamation-circle';
            const statusText = analysis.status === 'completed' ? 'Complété' : 
                               analysis.status === 'processing' ? 'En cours' : 'Échoué';
            
            html += `
                <div class="analysis-card" data-id="${analysis.id}" data-type="${analysis.type}">
                    <div class="analysis-card-header">
                        <div class="analysis-card-type">
                            <i class="fas ${typeInfo.icon}"></i>
                            <span class="analysis-type-badge">${typeInfo.name}</span>
                        </div>
                        <div class="analysis-card-title-wrapper">
                            <span class="analysis-card-title">${analysis.name || 'Analyse sans nom'}</span>
                            <span class="analysis-card-date">${date}</span>
                        </div>
                    </div>
                    <div class="analysis-card-meta">
                        <div class="analysis-card-meta-item">
                            <i class="fas fa-coins"></i>
                            <span>${analysis.cost || 0} tokens</span>
                        </div>
                        <div class="analysis-card-meta-item">
                            <i class="fas fa-chart-line"></i>
                            <span>Score: ${analysis.score || 0}/100</span>
                        </div>
                        <div class="analysis-card-meta-item">
                            <i class="fas fa-circle ${statusClass}"></i>
                            <span>${statusText}</span>
                        </div>
                    </div>
                    <div class="analysis-card-actions">
                        <button class="btn btn-sm btn-outline view-analysis-btn" data-id="${analysis.id}">
                            <i class="fas fa-eye"></i> Voir les résultats
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '<div style="margin-top: var(--spacing-md);"><a href="#" onclick="loadRecentAnalyses(); return false;" class="btn btn-outline"><i class="fas fa-arrow-left"></i> Retour aux récentes</a></div>';
        
        recentAnalysesEl.innerHTML = html;
        
        // Réattaché les événements de visionnage
        initViewAnalysisButtons();
        
    } catch (error) {
        console.error('[DPAI] Erreur chargement de toutes les analyses:', error);
        showAlert('error', 'Erreur', 'Impossible de charger toutes les analyses.');
    }
}

// Obtenir la classe CSS en fonction du score
function getScoreClass(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'average';
    if (score >= 20) return 'poor';
    return 'very-poor';
}

// Obtenir la classe CSS en fonction de l'attractivité
function getAttractivenessClass(score) {
    if (score >= 80) return 'very-attractive';
    if (score >= 65) return 'attractive';
    if (score >= 50) return 'neutral';
    if (score >= 35) return 'unattractive';
    return 'very-unattractive';
}

// Générer des résultats mock (pour la compatibilité avec l'existant)
function generateMockResults(type) {
    // Cette fonction est maintenant définie dans analyses.js
    // On garde cette version pour la rétrocompatibilité
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

// Lancer une analyse (fonction globale pour les boutons d'action rapide)
function startAnalysis(type) {
    console.log('[DPAI] startAnalysis appelé avec type:', type);
    const modal = document.getElementById('analysisModal');
    const modalTitle = document.getElementById('analysisModalTitle');
    
    if (modal) {
        console.log('[DPAI] Modal trouvé, ouverture...');
        // Définir le type d'analyse
        const analysisTypeInput = document.getElementById('analysisType');
        if (analysisTypeInput) {
            analysisTypeInput.value = type;
        }
        
        // Mettre à jour le titre du modal selon le type
        const analysisNames = {
            swot: 'Analyse SWOT',
            porter: 'Porter 5 Forces',
            pestel: 'Analyse PESTEL',
            competitive: 'Analyse Concurrentielle'
        };
        if (modalTitle && analysisNames[type]) {
            modalTitle.textContent = `Lancer : ${analysisNames[type]}`;
        } else if (modalTitle) {
            modalTitle.textContent = 'Lancer une analyse';
        }
        
        // Mettre à jour l'estimation et les champs spécifiques
        updateAnalysisEstimation(type);
        const specificFieldsContainer = document.getElementById('analysisSpecificFields');
        updateSpecificFields(type, specificFieldsContainer);
        
        // Ouvrir le modal
        modal.classList.add('visible');
        console.log('[DPAI] Modal ouvert, classe visible ajoutée');
    } else {
        console.error('[DPAI] Modal analysisModal non trouvé !');
    }
}

// Rendre les fonctions disponibles globalement
window.startAnalysis = startAnalysis;
window.viewAnalysis = viewAnalysis;
window.exportAnalysis = exportAnalysis;
window.deleteAnalysis = deleteAnalysis;
window.showAnalysisModal = showAnalysisModal;
window.generateMockResults = generateMockResults;
window.updateSpecificFields = updateSpecificFields;
window.collectAnalysisData = collectAnalysisData;