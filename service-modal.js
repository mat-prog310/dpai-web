// =============================================================================
// SERVICE-MODAL.JS - Gestion des modales de détails des services
// =============================================================================

// Utiliser la constante SubscriptionPlans définie dans stripe-service.js
// Si elle n'existe pas encore, la définir globalement ici pour éviter les erreurs
if (typeof window.SubscriptionPlans === 'undefined') {
    var SubscriptionPlans = window.SubscriptionPlans = {
        FREE: 'free',
        PRO: 'pro',
        ENTERPRISE: 'enterprise'
    };
} else {
    var SubscriptionPlans = window.SubscriptionPlans;
}

// Hiérarchie des plans (index plus élevé = meilleur plan)
const PlanHierarchy = {
    free: 0,
    pro: 1,
    enterprise: 2
};

// Données des services
const servicesData = {
    swot: {
        id: 'swot',
        name: 'Analyse SWOT',
        icon: 'fa-swimming-pool',
        difficulty: 'Débutant',
        tokens: '5-10 tokens',
        description: `L'analyse SWOT (Forces, Faiblesses, Opportunités, Menaces) est un outil fondamental pour évaluer la situation actuelle de votre entreprise ou de votre cible d'acquisition. Elle vous permet d'identifier les facteurs internes et externes qui influencent votre stratégie.`,
        whatYouGet: [
            'Identification des forces internes',
            'Analyse des faiblesses à corriger',
            'Cartographie des opportunités de marché',
            'Identification des menaces concurrentielles',
            'Matrice SWOT visuelle et interactive',
            'Recommandations stratégiques basées sur l\'analyse'
        ],
        useCases: [
            'Évaluation d\'une cible d\'acquisition',
            'Analyse de la position concurrentielle de votre entreprise',
            'Préparation à une levée de fonds',
            'Planification stratégique annuelle'
        ],
        requiredPlan: 'free'
    },
    porter: {
        id: 'porter',
        name: 'Porter 5 Forces',
        icon: 'fa-project-diagram',
        difficulty: 'Avancé',
        tokens: '20-120 tokens',
        description: `Le modèle des 5 Forces de Porter est un cadre d'analyse fondamental en stratégie qui permet d'évaluer la compétitivité et l'attrait d'un secteur. En analysant ces cinq forces, vous pouvez comprendre la rentabilité potentielle et les défis d'un secteur.`,
        whatYouGet: [
            'Rivalité entre concurrents existants',
            'Pouvoir de négociation des fournisseurs',
            'Pouvoir de négociation des clients',
            'Menace des nouveaux entrants',
            'Menace des produits de substitution'
        ],
        useCases: [
            'Analyse de l\'attrait d\'un nouveau marché',
            'Évaluation de la compétitivité d\'un secteur',
            'Décision d\'entrée ou de sortie d\'un marché',
            'Identification des barrières à l\'entrée'
        ],
        requiredPlan: 'free'
    },
    pestel: {
        id: 'pestel',
        name: 'Analyse PESTEL',
        icon: 'fa-globe-americas',
        difficulty: 'Intermédiaire',
        tokens: '15-75 tokens',
        description: `L'analyse PESTEL permet d'évaluer les facteurs externes qui influencent votre entreprise ou votre projet. Contrairement à SWOT qui se concentre sur des aspects internes et externes spécifiques, PESTEL examine des facteurs macro-environnementaux plus larges.`,
        whatYouGet: [
            '<strong>P</strong>olitique : stabilité, réglementations, fiscalité',
            '<strong>E</strong>conomique : croissance, inflation, taux de change',
            '<strong>S</strong>ocioculturel : démographie, valeurs, tendances',
            '<strong>T</strong>echnologique : innovation, R&D, disruption',
            '<strong>E</strong>cologique : environnement, développement durable',
            '<strong>L</strong>égal : lois, réglementations, conformité'
        ],
        useCases: [
            'Analyse de l\'environnement d\'un nouveau marché',
            'Évaluation des risques externes pour un projet',
            'Planification stratégique long terme',
            'Identification des opportunités émergentes'
        ],
        requiredPlan: 'free'
    },
    competitive: {
        id: 'competitive',
        name: 'Analyse Concurrentielle',
        icon: 'fa-users',
        difficulty: 'Avancé',
        tokens: '20-160 tokens',
        description: `L'analyse concurrentielle vous permet de comprendre en profondeur vos concurrents, leurs forces, leurs faiblesses, et leurs stratégies. Cette analyse est cruciale pour positionner efficacement votre entreprise et identifier vos avantages concurrentiels.`,
        whatYouGet: [
            'Positionnement de chaque concurrent',
            'Analyse SWOT de chaque concurrent',
            'Comparaison des parts de marché',
            'Analyse des stratégies marketing',
            'Benchmark des produits/services',
            'Évaluation des forces financières'
        ],
        useCases: [
            'Analyse avant le lancement d\'un nouveau produit',
            'Préparation à une guerre des prix',
            'Identification des concurrents directs et indirects',
            'Évaluation des barrières à l\'entrée'
        ],
        requiredPlan: 'pro'
    },
    reports: {
        id: 'reports',
        name: 'Rapports Détaillés',
        icon: 'fa-file-alt',
        difficulty: 'Expert',
        tokens: '25-250 tokens',
        description: `Nos rapports détaillés combinent plusieurs analyses pour vous fournir une vision complète et actionnable. Chaque rapport est personnalisé selon vos besoins spécifiques et inclut des recommandations stratégiques concrètes.`,
        whatYouGet: [
            'Rapport de due diligence',
            'Étude de marché complète',
            'Analyse de synergie',
            'Plan stratégique 100 jours',
            'Analyse de chaîne de valeur',
            'Benchmark sectoriel'
        ],
        useCases: [
            'Synthèse exécutive avec recommandations clés',
            'Analyses visuelles et graphiques',
            'Comparatifs et benchmarks',
            'Plan d\'action détaillé avec échéancier',
            'Export en PDF et Excel',
            'Présentation prête à l\'emploi'
        ],
        requiredPlan: null
    },
    dashboard: {
        id: 'dashboard',
        name: 'Tableau de Bord',
        icon: 'fa-chart-line',
        difficulty: 'Tous niveaux',
        tokens: 'Gratuit',
        description: `Notre tableau de bord intuitif vous permet de suivre toutes vos analyses, vos tokens et vos performances en temps réel. Centralisez toutes vos données stratégiques en un seul endroit.`,
        whatYouGet: [
            'Vue d\'ensemble de toutes vos analyses',
            'Suivi de vos tokens disponibles et utilisés',
            'Historique complet des analyses réalisées',
            'Statistiques et indicateurs de performance',
            'Accès rapide aux actions fréquentes',
            'Programme de fidélité intégré'
        ],
        useCases: [
            'Suivi de votre activité d\'analyse',
            'Gestion de vos projets stratégiques',
            'Optimisation de l\'utilisation de vos tokens',
            'Prise de décision basée sur les données'
        ]
    },
    // =============================================================================
    // SERVICES DE STRATEGIE DE CROISSANCE EXTERNE
    // =============================================================================
    
    // Phase 1: PREPARATION - Pro et Entreprise
    ideal_sector: {
        id: 'ideal_sector',
        name: 'Secteur d\'activité idéal',
        icon: 'fa-globe',
        difficulty: 'Intermédiaire',
        tokens: '35 tokens',
        description: `Cet outil vous aide à identifier et à trouver des cibles d'acquisition dans les secteurs les plus porteurs pour votre stratégie de croissance externe. Analysez les opportunités de marché et affinez votre cible en fonction de critères précis.`,
        whatYouGet: [
            'Analyse sectorielle complète',
            'Identification des secteurs porteurs',
            'Critères de sélection personnalisables',
            'Liste de cibles potentielles',
            'Analyse de compatibilité stratégique',
            'Recommandations de priorisation'
        ],
        useCases: [
            'Recherche de cibles d\'acquisition',
            'Diversification sectorielle',
            'Optimisation de portefeuille d\'activités',
            'Veille stratégique sectorielle'
        ],
        requiredPlan: 'pro',
        category: 'Stratégie - Phase 1: Préparation'
    },
    maturity_score: {
        id: 'maturity_score',
        name: 'Score de maturité',
        icon: 'fa-chart-line',
        difficulty: 'Intermédiaire',
        tokens: '50 tokens',
        description: `Évaluez votre niveau de préparation à une opération de croissance externe. Le score de maturité analyse vos capacités internes, votre expérience passée et votre readiness opérationnelle pour déterminer si vous êtes prêt à acheter une entreprise.`,
        whatYouGet: [
            'Évaluation complète de votre maturité',
            'Analyse des capacités financières',
            'Audit de l\'expérience de votre équipe',
            'Évaluation des processus internes',
            'Score global et recommandations',
            'Plan de préparation personnalisé'
        ],
        useCases: [
            'Préparation à une première acquisition',
            'Évaluation avant lancement d\'un processus M&A',
            'Benchmark de maturité interne',
            'Identification des axes d\'amélioration'
        ],
        requiredPlan: 'pro',
        category: 'Stratégie - Phase 1: Préparation'
    },
    
    // Phase 2: RECHERCHE & EVALUATION - Entreprise uniquement
    integration_matrix: {
        id: 'integration_matrix',
        name: 'Matrice d\'intégration',
        icon: 'fa-th',
        difficulty: 'Avancé',
        tokens: '180 tokens',
        description: `La matrice d'intégration vous permet d'anticiper les risques et les opportunités post-rachat. Cet outil analyse la compatibilité entre votre entreprise et la cible, identifie les synergies potentielles et évalue les défis d'intégration.`,
        whatYouGet: [
            'Analyse de compatibilité culturelle',
            'Évaluation des synergies opérationnelles',
            'Identification des risques d\'intégration',
            'Matrice visuelle des compatibilités',
            'Plan d\'intégration prévisionnel',
            'Estimation des coûts d\'intégration'
        ],
        useCases: [
            'Due diligence approfondie',
            'Préparation à l\'intégration post-acquisition',
            'Évaluation de la compatibilité stratégique',
            'Optimisation des processus de fusion'
        ],
        requiredPlan: 'enterprise',
        category: 'Stratégie - Phase 2: Recherche & Évaluation'
    },
    valuation_simulator: {
        id: 'valuation_simulator',
        name: 'Simulateur de valorisation',
        icon: 'fa-euro-sign',
        difficulty: 'Expert',
        tokens: '200 tokens',
        description: `Estimez le prix d'achat d'une entreprise cible avec notre simulateur de valorisation. Cet outil prend en compte les multiples sectoriels, la santé financière de la cible, les synergies potentielles et les conditions de marché pour vous fournir une fourchette de valorisation réaliste.`,
        whatYouGet: [
            'Calcul des multiples sectoriels',
            'Analyse financière de la cible',
            'Évaluation des synergies',
            'Simulation de scénarios de valorisation',
            'Comparaison avec les transactions similaires',
            'Rapport de valorisation détaillé'
        ],
        useCases: [
            'Détermination du prix d\'offre',
            'Négociation d\'acquisition',
            'Évaluation de cibles potentielles',
            'Benchmark de valorisation'
        ],
        requiredPlan: 'enterprise',
        category: 'Stratégie - Phase 2: Recherche & Évaluation'
    },
    due_diligence: {
        id: 'due_diligence',
        name: 'Checklist Due Diligence',
        icon: 'fa-check-square',
        difficulty: 'Avancé',
        tokens: '100 tokens',
        description: `Notre checklist complète de due diligence vous guide à travers tous les aspects à vérifier avant une acquisition. De l'analyse financière à l'audit juridique, en passant par l'évaluation des ressources humaines et de la propriété intellectuelle, cette checklist vous assure de ne rien oublier.`,
        whatYouGet: [
            'Checklist financière complète',
            'Audit juridique et contractuel',
            'Évaluation des ressources humaines',
            'Analyse de la propriété intellectuelle',
            'Vérification des actifs et passifs',
            'Évaluation des risques cachés'
        ],
        useCases: [
            'Due diligence complète avant acquisition',
            'Audit pré-acquisition',
            'Identification des red flags',
            'Préparation des documents de transaction'
        ],
        requiredPlan: 'enterprise',
        category: 'Stratégie - Phase 2: Recherche & Évaluation'
    },
    
    // Phase 3: NEGOCIATION & SIGNATURE - Entreprise uniquement
    loi_generator: {
        id: 'loi_generator',
        name: 'Générateur de LOI',
        icon: 'fa-file-contract',
        difficulty: 'Expert',
        tokens: '150 tokens',
        description: `Générez une Letter of Intent (LOI) professionnelle et complète avec notre outil dédié. Formalisez votre offre d'achat avec tous les éléments nécessaires : prix, conditions, calendriers, garanties et clauses spécifiques.`,
        whatYouGet: [
            'Modèle de LOI personnalisable',
            'Génération automatique des clauses standards',
            'Adaptation aux spécificités sectorielles',
            'Intégration des conditions financières',
            'Clauses de confidentialité',
            'Calendrier de transaction pré-rempli'
        ],
        useCases: [
            'Rédaction rapide de LOI',
            'Standardisation des documents',
            'Préparation des offres d\'achat',
            'Négociation professionnelle'
        ],
        requiredPlan: 'enterprise',
        category: 'Stratégie - Phase 3: Négociation & Signature'
    },
    negotiation_simulator: {
        id: 'negotiation_simulator',
        name: 'Simulateur de négociation',
        icon: 'fa-handshake',
        difficulty: 'Expert',
        tokens: '180 tokens',
        description: `Entraînez-vous à négocier avec notre simulateur interactif. Préparez vos arguments, anticipez les objections du vendeur et testez différentes stratégies de négociation pour obtenir le meilleur accord possible.`,
        whatYouGet: [
            'Simulation de scénarios de négociation',
            'Base de données d\'arguments et contre-arguments',
            'Analyse des points de levier',
            'Calcul des zones d\'accord (ZOPA)',
            'Stratégies de négociation personnalisées',
            'Rapport de préparation à la négociation'
        ],
        useCases: [
            'Préparation des négociations d\'acquisition',
            'Formation des équipes de M&A',
            'Test de différentes stratégies',
            'Optimisation des résultats de négociation'
        ],
        requiredPlan: 'enterprise',
        category: 'Stratégie - Phase 3: Négociation & Signature'
    },
    
    // Phase 4: INTEGRATION & SUIVI - Entreprise uniquement
    action_plan_100_days: {
        id: 'action_plan_100_days',
        name: 'Plan d\'action 100 jours',
        icon: 'fa-route',
        difficulty: 'Expert',
        tokens: '250 tokens',
        description: `Créez une feuille de route opérationnelle détaillée pour les 100 premiers jours post-acquisition. Ce plan d'action vous guide à travers toutes les étapes critiques de l'intégration, avec des objectifs clairs, des responsables désignés et un calendrier précis.`,
        whatYouGet: [
            'Feuille de route complète sur 100 jours',
            'Objectifs SMART par phase',
            'Attribution des responsabilités',
            'Calendrier détaillé avec jalons',
            'Indicateurs de succès',
            'Plan de communication interne et externe'
        ],
        useCases: [
            'Intégration post-acquisition',
            'Lancement de synergies opérationnelles',
            'Alignement des équipes',
            'Suivi de la progression'
        ],
        requiredPlan: 'enterprise',
        category: 'Stratégie - Phase 4: Intégration & Suivi'
    },
    post_acquisition_dashboard: {
        id: 'post_acquisition_dashboard',
        name: 'Dashboard Post-Acquisition',
        icon: 'fa-chart-area',
        difficulty: 'Expert',
        tokens: '80 tokens/mois',
        description: `Surveillez la performance de votre acquisition en temps réel avec notre dashboard dédié. Suivez les indicateurs clés, comparez les résultats avec vos objectifs et identifiez rapidement les écarts pour prendre des actions correctives.`,
        whatYouGet: [
            'Tableau de bord personnalisable',
            'Suivi des KPIs post-acquisition',
            'Comparaison avec les objectifs initiaux',
            'Alertes sur les écarts de performance',
            'Analyse des synergies réalisées',
            'Rapport mensuel automatique'
        ],
        useCases: [
            'Suivi de la performance post-acquisition',
            'Identification des axes d\'amélioration',
            'Rapport aux actionnaires',
            'Optimisation de la valeur créée'
        ],
        requiredPlan: 'enterprise',
        category: 'Stratégie - Phase 4: Intégration & Suivi'
    }
};

// Vérifier si un service est accessible avec le plan actuel
function isServiceAccessible(service, userPlan) {
    if (!userPlan) return true; // Si pas d'utilisateur, on montre tout
    
    const serviceRequiredPlan = service.requiredPlan;
    if (!serviceRequiredPlan) return true; // Pas de restriction = accessible à tous
    
    const userPlanIndex = PlanHierarchy[userPlan] || 0;
    const requiredPlanIndex = PlanHierarchy[serviceRequiredPlan.toLowerCase()] || 0;
    
    return userPlanIndex >= requiredPlanIndex;
}

// Obtenir l'icône du plan
function getPlanIcon(plan) {
    const planIcons = {
        free: 'fa-user',
        pro: 'fa-star',
        enterprise: 'fa-building'
    };
    return planIcons[plan?.toLowerCase()] || 'fa-lock';
}

// Obtenir le libellé du plan
function getPlanLabel(plan) {
    const planLabels = {
        free: 'Gratuit',
        pro: 'Pro',
        enterprise: 'Entreprise'
    };
    return planLabels[plan?.toLowerCase()] || plan || 'Unknown';
}

// Mettre à jour l'affichage des services selon le plan
function updateServicesByPlan() {
    const userPlan = authService?.userData?.plan;
    
    if (!userPlan) {
        // Pas d'utilisateur connecté, on montre tout
        return;
    }
    
    // Mettre à jour les cartes de service dans services.html
    const serviceArticles = document.querySelectorAll('article.service-detail[id]');
    
    serviceArticles.forEach(article => {
        const serviceId = article.getAttribute('id');
        const service = servicesData[serviceId];
        
        if (service) {
            const isAccessible = isServiceAccessible(service, userPlan);
            
            if (!isAccessible) {
                // Ajouter la classe locked
                article.classList.add('service-locked');
                
                // Ajouter un cadenas dans l'en-tête
                const header = article.querySelector('.service-detail-header');
                if (header) {
                    const lockIcon = document.createElement('div');
                    lockIcon.className = 'service-lock-icon';
                    lockIcon.innerHTML = '<i class="fas fa-lock"></i>';
                    header.appendChild(lockIcon);
                }
                
                // Ajouter un badge de plan requis
                const metaDiv = article.querySelector('.service-detail-meta');
                if (metaDiv && service.requiredPlan) {
                    const requiredBadge = document.createElement('span');
                    requiredBadge.className = 'service-requires-plan';
                    requiredBadge.innerHTML = `<i class="fas fa-${getPlanIcon(service.requiredPlan)}"></i> ${getPlanLabel(service.requiredPlan)} requis`;
                    metaDiv.appendChild(requiredBadge);
                }
            } else {
                // Retirer la classe locked
                article.classList.remove('service-locked');
                
                // Retirer les éléments de verrouillage
                const lockIcon = article.querySelector('.service-lock-icon');
                if (lockIcon) lockIcon.remove();
                
                const requiredBadge = article.querySelector('.service-requires-plan');
                if (requiredBadge) requiredBadge.remove();
            }
        }
    });
}

// Initialisation de la modal
function initServiceModal() {
    // Créer la modal si elle n'existe pas
    if (!document.getElementById('serviceModal')) {
        createServiceModal();
    }
    
    // Attacher les événements aux liens "En savoir plus"
    attachServiceLinks();
    
    // Mettre à jour l'affichage selon le plan
    updateServicesByPlan();
}

// Créer la modal de service
function createServiceModal() {
    const modalHTML = `
    <div class="modal" id="serviceModal">
        <div class="modal-content service-modal-content">
            <div class="modal-header">
                <h3 id="serviceModalTitle">Détails du service</h3>
                <button class="modal-close" id="serviceModalClose">&times;</button>
            </div>
            <div class="modal-body" id="serviceModalBody">
                <!-- Le contenu sera dynamique -->
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-ghost" id="serviceModalCancel">Fermer</button>
                <a href="register.html" class="btn btn-primary" id="serviceModalStart">
                    <i class="fas fa-rocket"></i> Commencer maintenant
                </a>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Attacher les événements de la modal
    const modal = document.getElementById('serviceModal');
    const closeBtn = document.getElementById('serviceModalClose');
    const cancelBtn = document.getElementById('serviceModalCancel');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeServiceModal);
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeServiceModal);
    }
    
    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeServiceModal();
        }
    });
}

// Attacher les événements aux liens "En savoir plus"
function attachServiceLinks() {
    // Gérer les liens avec data-service attribute
    const serviceLinks = document.querySelectorAll('.service-link[data-service]');
    
    serviceLinks.forEach(link => {
        const serviceId = link.getAttribute('data-service');
        
        if (serviceId && servicesData[serviceId]) {
            link.href = 'javascript:void(0)';
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showServiceModal(serviceId);
            });
        }
    });
    
    // Pour la rétrocompatibilité, gérer aussi les anciens liens
    const oldServiceLinks = document.querySelectorAll('.feature-link[href^="services.html"]');
    
    oldServiceLinks.forEach(link => {
        const href = link.getAttribute('href');
        const serviceId = href.split('#')[1];
        
        if (serviceId && servicesData[serviceId] && !link.getAttribute('data-service')) {
            link.href = 'javascript:void(0)';
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showServiceModal(serviceId);
            });
        }
    });
    
    // Gérer les liens dans services.html (les articles service-detail avec id)
    const serviceArticles = document.querySelectorAll('article.service-detail[id]');
    
    serviceArticles.forEach(article => {
        const serviceId = article.getAttribute('id');
        
        if (serviceId && servicesData[serviceId]) {
            // Ajouter un événement click pour ouvrir la modal
            article.style.cursor = 'pointer';
            article.addEventListener('click', function(e) {
                // Ne pas déclencher si on a cliqué sur un lien à l'intérieur
                if (e.target.tagName !== 'A' && e.target.closest('a') === null) {
                    e.preventDefault();
                    showServiceModal(serviceId);
                }
            });
        }
    });
}

// Afficher la modal de service
function showServiceModal(serviceId) {
    const service = servicesData[serviceId];
    
    if (!service) {
        console.error('Service non trouvé:', serviceId);
        return;
    }
    
    const modal = document.getElementById('serviceModal');
    const modalTitle = document.getElementById('serviceModalTitle');
    const modalBody = document.getElementById('serviceModalBody');
    
    // Mettre à jour le titre
    if (modalTitle) {
        modalTitle.innerHTML = `<i class="fas ${service.icon}"></i> ${service.name}`;
    }
    
    // Créer le contenu du corps
    const contentHTML = `
        <div class="service-modal-content">
            <div class="service-modal-header">
                <div class="service-modal-meta">
                    <span class="service-difficulty">${service.difficulty}</span>
                    <span class="service-tokens">${service.tokens}</span>
                </div>
            </div>
            
            <div class="service-modal-description">
                <p>${service.description}</p>
            </div>
            
            <div class="service-modal-section">
                <h4>Ce que vous obtiendrez :</h4>
                <ul class="service-features">
                    ${service.whatYouGet.map(item => `<li><i class="fas fa-check"></i> ${item}</li>`).join('')}
                </ul>
            </div>
            
            <div class="service-modal-section">
                <h4>Cas d'usage :</h4>
                <ul>
                    ${service.useCases.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
    
    if (modalBody) {
        modalBody.innerHTML = contentHTML;
    }
    
    // Ouvrir la modal
    if (modal) {
        modal.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }
}

// Fermer la modal de service
function closeServiceModal() {
    const modal = document.getElementById('serviceModal');
    
    if (modal) {
        modal.classList.remove('visible');
        document.body.style.overflow = '';
    }
}

// Initialiser au chargement de la page
document.addEventListener('DOMContentLoaded', initServiceModal);

// Écouter les changements d'authentification
if (typeof authService !== 'undefined') {
    // Si authService est déjà initialisé
    if (authService.authStateListener) {
        // On peut ajouter notre propre écouteur
        authService.auth.onAuthStateChanged((user) => {
            updateServicesByPlan();
        });
    }
}

// Mettre à jour quand on charge auth.js
function setupAuthListener() {
    if (typeof authService !== 'undefined' && authService.auth) {
        authService.auth.onAuthStateChanged((user) => {
            setTimeout(updateServicesByPlan, 500); // Petit délai pour laisser le temps à userData de se charger
        });
    }
}

// Appeler après un court délai pour s'assurer que authService est chargé
setTimeout(setupAuthListener, 1000);

// Rendre les données des services disponibles globalement
window.servicesData = servicesData;

// Déclencher un événement pour indiquer que servicesData est prêt
// Cela permet aux autres modules de savoir quand les services sont disponibles
if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('servicesDataReady', {
        detail: { servicesData: servicesData }
    }));
}

// Rendre les fonctions disponibles globalement
window.showServiceModal = showServiceModal;
window.closeServiceModal = closeServiceModal;
window.updateServicesByPlan = updateServicesByPlan;
window.isServiceAccessible = isServiceAccessible;
