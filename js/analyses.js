// =============================================================================
// ANALYSES.JS - Système d'analyses stratégiques avancées
// =============================================================================

// Références Firebase (exposées par firebase-config.js)
// db est défini globalement dans firebase-config.js

// =============================================================================
// CLASSE DE BASE POUR LES ANALYSES
// =============================================================================

class Analysis {
    constructor(type, name, description, companyData) {
        this.type = type;
        this.name = name || `Analyse ${type} - ${new Date().toLocaleDateString('fr-FR')}`;
        this.description = description || '';
        this.companyData = companyData || {};
        this.createdAt = new Date().toISOString();
        this.status = 'processing';
        this.results = {};
        this.recommendations = [];
        this.score = 0;
        this.confidence = 0;
    }

    async execute() {
        this.status = 'processing';
        try {
            await this.runAnalysis();
            this.status = 'completed';
            this.generateRecommendations();
            this.calculateScore();
        } catch (error) {
            this.status = 'failed';
            this.error = error.message;
            throw error;
        }
        return this;
    }

    async runAnalysis() {
        throw new Error('La méthode runAnalysis doit être implémentée par les sous-classes');
    }

    generateRecommendations() {
        this.recommendations = this.formatRecommendations(this.results);
    }

    calculateScore() {
        // Calcul d'un score global basé sur les résultats
        this.score = this.calculateAnalysisScore(this.results);
        this.confidence = this.calculateConfidence(this.results);
    }

    formatRecommendations(results) {
        return [];
    }

    calculateAnalysisScore(results) {
        return 0;
    }

    calculateConfidence(results) {
        return 0;
    }

    toJSON() {
        return {
            type: this.type,
            name: this.name,
            description: this.description,
            companyData: this.companyData,
            createdAt: this.createdAt,
            status: this.status,
            results: this.results,
            recommendations: this.recommendations,
            score: this.score,
            confidence: this.confidence,
            error: this.error
        };
    }
}

// =============================================================================
// ANALYSE SWOT
// =============================================================================

class SWOTAnalysis extends Analysis {
    constructor(name, description, companyData) {
        super('swot', name, description, companyData);
        this.category = 'strategic';
        this.cost = { free: 30, pro: 10, enterprise: 3 };
    }

    async runAnalysis() {
        const company = this.companyData;
        
        // Générer des forces basées sur les données de l'entreprise
        const strengths = this.generateStrengths(company);
        const weaknesses = this.generateWeaknesses(company);
        const opportunities = this.generateOpportunities(company);
        const threats = this.generateThreats(company);

        // Matrice SWOT
        const swotMatrix = {
            internal: {
                positive: strengths,
                negative: weaknesses
            },
            external: {
                positive: opportunities,
                negative: threats
            }
        };

        // Analyse SO, ST, WO, WT
        const strategicInsights = this.generateStrategicInsights(
            strengths, weaknesses, opportunities, threats
        );

        this.results = {
            strengths,
            weaknesses,
            opportunities,
            threats,
            swotMatrix,
            strategicInsights,
            summary: this.generateSummary(swotMatrix, strategicInsights)
        };

        return this.results;
    }

    generateStrengths(company) {
        const strengths = [];
        
        if (!company) {
            return [
                'Forte notoriété de la marque sur le marché',
                'Équipe expérimentée et qualifiée',
                'Technologie avancée et innovante',
                'Position financière solide',
                'Réseau de distribution étendu'
            ];
        }

        // Forces basées sur les données réelles
        if (company.marketShare && company.marketShare > 0.2) {
            strengths.push(`Part de marché élevée (${(company.marketShare * 100).toFixed(1)}%)`);
        }

        if (company.revenue && company.revenue > 1000000) {
            strengths.push(`Chiffre d'affaires significatif (${this.formatCurrency(company.revenue)})`);
        }

        if (company.employees && company.employees > 50) {
            strengths.push(`Équipe importante (${company.employees} employés)`);
        }

        if (company.technology && company.technology.includes('innovant')) {
            strengths.push('Technologie innovante et compétitive');
        }

        if (company.brandRecognition && company.brandRecognition > 7) {
            strengths.push('Forte notoriété de la marque');
        }

        if (company.customerSatisfaction && company.customerSatisfaction > 8) {
            strengths.push('Taux de satisfaction client élevé');
        }

        if (company.patents && company.patents > 0) {
            strengths.push(`Portfeuille de brevets solide (${company.patents} brevets)`);
        }

        if (company.location && company.location === 'strategic') {
            strengths.push('Emplacement stratégique');
        }

        // Si aucune force spécifique n'a été trouvée
        if (strengths.length === 0) {
            return [
                'Équipe compétente et motivée',
                'Expérience significative dans le secteur',
                'Relation client solide',
                'Processus opérationnels optimisés'
            ];
        }

        return strengths;
    }

    generateWeaknesses(company) {
        const weaknesses = [];

        if (!company) {
            return [
                'Dépendance excessive à un client principal',
                'Coûts opérationnels élevés',
                'Manque de diversification géographique',
                'Technologie vieillissante',
                'Capacité de production limitée'
            ];
        }

        if (company.debtRatio && company.debtRatio > 0.6) {
            weaknesses.push(`Ratio d'endettement élevé (${(company.debtRatio * 100).toFixed(1)}%)`);
        }

        if (company.customerConcentration && company.customerConcentration > 0.3) {
            weaknesses.push(`Dépendance à un client principal (${(company.customerConcentration * 100).toFixed(1)}% du CA)`);
        }

        if (company.technology && company.technology.includes('vieillissant')) {
            weaknesses.push('Technologie vieillissante nécessitant des mises à jour');
        }

        if (company.marketShare && company.marketShare < 0.05) {
            weaknesses.push('Part de marché faible');
        }

        if (company.employeeTurnover && company.employeeTurnover > 0.15) {
            weaknesses.push(`Taux de turnover élevé (${(company.employeeTurnover * 100).toFixed(1)}%)`);
        }

        if (company.inventoryDays && company.inventoryDays > 90) {
            weaknesses.push(`Rotation des stocks lente (${company.inventoryDays} jours)`);
        }

        if (company.cashFlow && company.cashFlow < 0) {
            weaknesses.push('Flux de trésorerie négatif');
        }

        if (weaknesses.length === 0) {
            return [
                'Ressources limitées pour la R&D',
                'Dépendance à certains fournisseurs',
                'Manque de visibilité sur certains marchés',
                'Capacité marketing limitée'
            ];
        }

        return weaknesses;
    }

    generateOpportunities(company) {
        const opportunities = [];

        if (!company) {
            return [
                'Nouveaux marchés en expansion',
                'Partenariats stratégiques possibles',
                'Technologies émergentes à adopter',
                'Demande croissante pour les produits/services',
                'Concurrence peu développée sur certains segments'
            ];
        }

        if (company.market && company.market.includes('croissance')) {
            opportunities.push('Marché en croissance rapide');
        }

        if (company.innovationPotential && company.innovationPotential > 7) {
            opportunities.push('Potentiel d\'innovation important');
        }

        if (company.newMarkets) {
            opportunities.push(`Opportunités sur ${company.newMarkets.join(', ')}`);
        }

        if (company.partnershipOpportunities) {
            opportunities.push(`Possibilités de partenariats avec ${company.partnershipOpportunities.join(', ')}`);
        }

        if (company.technologyTrends) {
            opportunities.push(`Adoption possible de nouvelles technologies: ${company.technologyTrends.join(', ')}`);
        }

        if (company.regulationChanges && company.regulationChanges.includes('favorable')) {
            opportunities.push('Changements réglementaires favorables');
        }

        if (company.economicTrends && company.economicTrends === 'expansion') {
            opportunities.push('Contexte économique porteur');
        }

        if (opportunities.length === 0) {
            return [
                'Expansion géographique possible',
                'Diversification de la gamme de produits',
                'Acquisitions stratégiques envisageables',
                'Optimisation de la chaîne d\'approvisionnement'
            ];
        }

        return opportunities;
    }

    generateThreats(company) {
        const threats = [];

        if (!company) {
            return [
                'Concurrence accrue sur le marché',
                'Changements réglementaires défavorables',
                'Fluctuations économiques',
                'Nouveaux entrants sur le marché',
                'Changement des préférences des consommateurs'
            ];
        }

        if (company.competitors && company.competitors.length > 5) {
            threats.push(`Concurrence intense (${company.competitors.length} principaux concurrents)`);
        }

        if (company.competitorMarketShare && company.competitorMarketShare > 0.4) {
            threats.push(`Part de marché des concurrents élevée (${(company.competitorMarketShare * 100).toFixed(1)}%)`);
        }

        if (company.regulationChanges && company.regulationChanges.includes('défavorable')) {
            threats.push('Changements réglementaires défavorables');
        }

        if (company.economicTrends && company.economicTrends === 'récession') {
            threats.push('Risque de récession économique');
        }

        if (company.supplyChainRisks) {
            threats.push(`Risques dans la chaîne d'approvisionnement: ${company.supplyChainRisks.join(', ')}`);
        }

        if (company.technologyDisruption) {
            threats.push(`Risque de disruption technologique: ${company.technologyDisruption.join(', ')}`);
        }

        if (company.customerPreferenceChanges) {
            threats.push('Changement des préférences des consommateurs');
        }

        if (company.substitutes && company.substitutes.length > 0) {
            threats.push(`Menace des produits de substitution: ${company.substitutes.join(', ')}`);
        }

        if (threats.length === 0) {
            return [
                'Risque de nouveaux entrants sur le marché',
                'Pression sur les marges',
                'Dépendance aux conditions économiques',
                'Cybersécurité et risques de données'
            ];
        }

        return threats;
    }

    generateStrategicInsights(strengths, weaknesses, opportunities, threats) {
        const insights = {
            SO: [], // Strengths-Opportunities
            ST: [], // Strengths-Threats
            WO: [], // Weaknesses-Opportunities
            WT: []  // Weaknesses-Threats
        };

        // Stratégies SO (agressives)
        strengths.forEach(s => {
            opportunities.forEach(o => {
                insights.SO.push(this.combineInsight(s, o, 'SO'));
            });
        });

        // Stratégies ST (défensives)
        strengths.forEach(s => {
            threats.forEach(t => {
                insights.ST.push(this.combineInsight(s, t, 'ST'));
            });
        });

        // Stratégies WO (amélioration)
        weaknesses.forEach(w => {
            opportunities.forEach(o => {
                insights.WO.push(this.combineInsight(w, o, 'WO'));
            });
        });

        // Stratégies WT (survie)
        weaknesses.forEach(w => {
            threats.forEach(t => {
                insights.WT.push(this.combineInsight(w, t, 'WT'));
            });
        });

        // Sélectionner les meilleures insights (max 3 par catégorie)
        for (const key in insights) {
            insights[key] = insights[key].slice(0, 3);
        }

        return insights;
    }

    combineInsight(item1, item2, type) {
        const templates = {
            SO: `Exploiter ${item1.toLowerCase()} pour saisir l'opportunité de ${item2.toLowerCase()}`,
            ST: `Utiliser ${item1.toLowerCase()} pour contrer la menace de ${item2.toLowerCase()}`,
            WO: `Améliorer ${item1.toLowerCase()} pour profiter de ${item2.toLowerCase()}`,
            WT: `Éviter que ${item1.toLowerCase()} ne soit aggravé par ${item2.toLowerCase()}`
        };
        return templates[type] || `${item1} -> ${item2}`;
    }

    generateSummary(swotMatrix, strategicInsights) {
        const strengthsCount = swotMatrix.internal.positive.length;
        const weaknessesCount = swotMatrix.internal.negative.length;
        const opportunitiesCount = swotMatrix.external.positive.length;
        const threatsCount = swotMatrix.external.negative.length;

        let overallAssessment = '';
        
        if (strengthsCount > weaknessesCount && opportunitiesCount > threatsCount) {
            overallAssessment = 'Position stratégique forte avec de nombreuses opportunités à saisir';
        } else if (strengthsCount > weaknessesCount && opportunitiesCount <= threatsCount) {
            overallAssessment = 'Position interne solide mais environnement externe défavorable';
        } else if (strengthsCount <= weaknessesCount && opportunitiesCount > threatsCount) {
            overallAssessment = 'Faiblesses internes à corriger pour profiter des opportunités externes';
        } else {
            overallAssessment = 'Position défensive nécessaire face à un environnement difficile';
        }

        return {
            assessment: overallAssessment,
            scores: {
                strengths: strengthsCount,
                weaknesses: weaknessesCount,
                opportunities: opportunitiesCount,
                threats: threatsCount
            },
            balance: {
                internal: strengthsCount - weaknessesCount,
                external: opportunitiesCount - threatsCount
            }
        };
    }

    formatRecommendations(results) {
        const recommendations = [];
        const { strategicInsights, summary } = results;

        // Prioriser les stratégies SO
        strategicInsights.SO.forEach(insight => {
            recommendations.push({
                type: 'strategic',
                priority: 'high',
                action: insight,
                category: 'SO'
            });
        });

        // Stratégies ST
        strategicInsights.ST.forEach(insight => {
            recommendations.push({
                type: 'defensive',
                priority: 'high',
                action: insight,
                category: 'ST'
            });
        });

        // Stratégies WO
        strategicInsights.WO.forEach(insight => {
            recommendations.push({
                type: 'improvement',
                priority: 'medium',
                action: insight,
                category: 'WO'
            });
        });

        // Stratégies WT
        strategicInsights.WT.forEach(insight => {
            recommendations.push({
                type: 'survival',
                priority: 'high',
                action: insight,
                category: 'WT'
            });
        });

        // Ajouter une recommandation basée sur le résumé
        if (summary.balance.internal < 0 && summary.balance.external < 0) {
            recommendations.unshift({
                type: 'critical',
                priority: 'critical',
                action: 'Réévaluer la stratégie globale de l\'entreprise face aux faiblesses internes et menaces externes',
                category: 'emergency'
            });
        }

        return recommendations;
    }

    calculateAnalysisScore(results) {
        const { summary } = results;
        // Score basé sur l'équilibre des forces/faiblesses et opportunités/menaces
        const internalScore = Math.min(100, (summary.scores.strengths - summary.scores.weaknesses + 10) * 20);
        const externalScore = Math.min(100, (summary.scores.opportunities - summary.scores.threats + 10) * 20);
        return Math.round((internalScore * 0.6 + externalScore * 0.4));
    }

    calculateConfidence(results) {
        // Confiance basée sur le nombre d'éléments analysés
        const totalElements = Object.values(results.swotMatrix)
            .flatMap(Object.values)
            .reduce((sum, arr) => sum + arr.length, 0);
        return Math.min(100, totalElements * 5);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }
}

// =============================================================================
// ANALYSE PORTER 5 FORCES
// =============================================================================

class PorterFiveForcesAnalysis extends Analysis {
    constructor(name, description, companyData) {
        super('porter', name, description, companyData);
        this.category = 'competitive';
        this.cost = { free: 120, pro: 20, enterprise: 5 };
        this.forces = [
            'supplierPower',
            'buyerPower',
            'newEntrants',
            'substitutes',
            'rivalry'
        ];
    }

    async runAnalysis() {
        const company = this.companyData;
        
        const analysis = {
            supplierPower: this.analyzeSupplierPower(company),
            buyerPower: this.analyzeBuyerPower(company),
            newEntrants: this.analyzeNewEntrants(company),
            substitutes: this.analyzeSubstitutes(company),
            rivalry: this.analyzeRivalry(company)
        };

        const industryAttractiveness = this.calculateIndustryAttractiveness(analysis);
        const strategicImplications = this.generateStrategicImplications(analysis);

        this.results = {
            ...analysis,
            industryAttractiveness,
            strategicImplications,
            summary: this.generateSummary(analysis, industryAttractiveness)
        };

        return this.results;
    }

    analyzeSupplierPower(company) {
        const factors = {
            concentration: company?.supplierConcentration || 0,
            switchingCosts: company?.supplierSwitchingCosts || 'low',
            uniqueness: company?.supplierUniqueness || 'low',
            threatOfForwardIntegration: company?.supplierForwardIntegration || 'low',
            importanceToQuality: company?.supplierImportance || 'high'
        };

        let score = 0;
        let assessment = '';

        // Concentration des fournisseurs (moins de fournisseurs = plus de pouvoir)
        if (factors.concentration > 0.7) {
            score += 30; // Pouvoir des fournisseurs très élevé
            assessment += 'Fournisseurs très concentrés. ';
        } else if (factors.concentration > 0.4) {
            score += 20; // Pouvoir des fournisseurs élevé
            assessment += 'Fournisseurs concentrés. ';
        } else if (factors.concentration < 0.2) {
            score += 5; // Pouvoir des fournisseurs faible
        }

        // Coûts de changement
        if (factors.switchingCosts === 'high') {
            score += 25;
            assessment += 'Coûts de changement de fournisseur élevés. ';
        } else if (factors.switchingCosts === 'medium') {
            score += 15;
        } else {
            score += 5;
        }

        // Unicité des inputs
        if (factors.uniqueness === 'high') {
            score += 25;
            assessment += 'Inputs uniques et spécialisés. ';
        } else if (factors.uniqueness === 'medium') {
            score += 15;
        } else {
            score += 5;
        }

        // Menace d'intégration verticale
        if (factors.threatOfForwardIntegration === 'high') {
            score += 15;
            assessment += 'Menace élevée d\'intégration verticale. ';
        } else if (factors.threatOfForwardIntegration === 'medium') {
            score += 10;
        } else {
            score += 5;
        }

        // Importance pour la qualité
        if (factors.importanceToQuality === 'critical') {
            score += 5;
        }

        score = Math.min(100, score);

        let level = '';
        if (score >= 80) level = 'Très élevé';
        else if (score >= 60) level = 'Élevé';
        else if (score >= 40) level = 'Moyen';
        else if (score >= 20) level = 'Faible';
        else level = 'Très faible';

        return {
            score,
            level,
            assessment: assessment || 'Pouvoir des fournisseurs standard',
            factors
        };
    }

    analyzeBuyerPower(company) {
        const factors = {
            concentration: company?.buyerConcentration || 0,
            volume: company?.buyerVolume || 'low',
            switchingCosts: company?.buyerSwitchingCosts || 'low',
            informationAvailability: company?.buyerInformation || 'high',
            priceSensitivity: company?.buyerPriceSensitivity || 'high'
        };

        let score = 0;
        let assessment = '';

        // Concentration des acheteurs
        if (factors.concentration > 0.7) {
            score += 30;
            assessment += 'Acheteurs très concentrés. ';
        } else if (factors.concentration > 0.4) {
            score += 20;
            assessment += 'Acheteurs concentrés. ';
        } else if (factors.concentration < 0.2) {
            score += 5;
        }

        // Volume d'achat
        if (factors.volume === 'large') {
            score += 25;
            assessment += 'Volumes d\'achat importants. ';
        } else if (factors.volume === 'medium') {
            score += 15;
        } else {
            score += 5;
        }

        // Coûts de changement
        if (factors.switchingCosts === 'low') {
            score += 25;
            assessment += 'Coûts de changement de fournisseur faibles. ';
        } else if (factors.switchingCosts === 'medium') {
            score += 15;
        } else {
            score += 5;
        }

        // Disponibilité de l'information
        if (factors.informationAvailability === 'high') {
            score += 10;
            assessment += 'Information facilement disponible. ';
        } else {
            score += 5;
        }

        // Sensibilité au prix
        if (factors.priceSensitivity === 'high') {
            score += 5;
            assessment += 'Sensibilité au prix élevée. ';
        }

        score = Math.min(100, score);

        let level = '';
        if (score >= 80) level = 'Très élevé';
        else if (score >= 60) level = 'Élevé';
        else if (score >= 40) level = 'Moyen';
        else if (score >= 20) level = 'Faible';
        else level = 'Très faible';

        return {
            score,
            level,
            assessment: assessment || 'Pouvoir des acheteurs standard',
            factors
        };
    }

    analyzeNewEntrants(company) {
        const factors = {
            economiesOfScale: company?.economiesOfScale || 'high',
            capitalRequirements: company?.capitalRequirements || 'high',
            brandLoyalty: company?.brandLoyalty || 'medium',
            switchingCosts: company?.entrySwitchingCosts || 'medium',
            accessToDistribution: company?.accessToDistribution || 'medium',
            regulatoryBarriers: company?.regulatoryBarriers || 'medium',
            proprietaryTechnology: company?.proprietaryTechnology || 'low'
        };

        let score = 0;
        let assessment = '';

        // Économies d'échelle
        if (factors.economiesOfScale === 'high') {
            score += 20;
            assessment += 'Économies d\'échelle importantes. ';
        } else if (factors.economiesOfScale === 'medium') {
            score += 15;
        } else {
            score += 5;
        }

        // Besoins en capital
        if (factors.capitalRequirements === 'very_high') {
            score += 20;
            assessment += 'Besoins en capital très élevés. ';
        } else if (factors.capitalRequirements === 'high') {
            score += 15;
        } else {
            score += 5;
        }

        // Fidélité à la marque
        if (factors.brandLoyalty === 'very_high') {
            score += 15;
            assessment += 'Fidélité à la marque très forte. ';
        } else if (factors.brandLoyalty === 'high') {
            score += 10;
        } else if (factors.brandLoyalty === 'low') {
            score += 5;
        }

        // Coûts de changement
        if (factors.switchingCosts === 'high') {
            score += 15;
            assessment += 'Coûts de changement élevés. ';
        } else if (factors.switchingCosts === 'medium') {
            score += 10;
        } else {
            score += 5;
        }

        // Accès à la distribution
        if (factors.accessToDistribution === 'difficult') {
            score += 15;
            assessment += 'Accès à la distribution difficile. ';
        } else if (factors.accessToDistribution === 'medium') {
            score += 10;
        } else {
            score += 5;
        }

        // Barrières réglementaires
        if (factors.regulatoryBarriers === 'very_high') {
            score += 10;
            assessment += 'Barrières réglementaires très élevées. ';
        } else if (factors.regulatoryBarriers === 'high') {
            score += 5;
        }

        // Technologie propriété
        if (factors.proprietaryTechnology === 'high') {
            score += 5;
            assessment += 'Technologie propriétaire importante. ';
        }

        score = Math.min(100, score);

        // Plus le score est élevé, plus la menace est faible
        const threatLevel = 100 - score;
        let level = '';
        if (threatLevel >= 80) level = 'Très élevée';
        else if (threatLevel >= 60) level = 'Élevée';
        else if (threatLevel >= 40) level = 'Moyenne';
        else if (threatLevel >= 20) level = 'Faible';
        else level = 'Très faible';

        return {
            score: threatLevel,
            level: `Menace des nouveaux entrants: ${level}`,
            assessment: assessment || 'Menace standard des nouveaux entrants',
            factors,
            barrierScore: score
        };
    }

    analyzeSubstitutes(company) {
        const factors = {
            availability: company?.substituteAvailability || 'medium',
            pricePerformance: company?.substitutePricePerformance || 'better',
            switchingCosts: company?.substituteSwitchingCosts || 'low',
            buyerPropensity: company?.buyerPropensityToSubstitute || 'medium'
        };

        let score = 0;
        let assessment = '';

        // Disponibilité des substituts
        if (factors.availability === 'very_high') {
            score += 30;
            assessment += 'Substituts très disponibles. ';
        } else if (factors.availability === 'high') {
            score += 20;
        } else if (factors.availability === 'low') {
            score += 5;
        }

        // Rapport prix/performance
        if (factors.pricePerformance === 'much_better') {
            score += 25;
            assessment += 'Substituts avec un rapport prix/performance beaucoup meilleur. ';
        } else if (factors.pricePerformance === 'better') {
            score += 20;
        } else if (factors.pricePerformance === 'worse') {
            score += 5;
        }

        // Coûts de changement
        if (factors.switchingCosts === 'very_low') {
            score += 25;
            assessment += 'Coûts de changement vers les substituts très faibles. ';
        } else if (factors.switchingCosts === 'low') {
            score += 20;
        } else if (factors.switchingCosts === 'high') {
            score += 5;
        }

        // Propension des acheteurs
        if (factors.buyerPropensity === 'very_high') {
            score += 20;
            assessment += 'Propension des acheteurs à substituer très élevée. ';
        } else if (factors.buyerPropensity === 'high') {
            score += 15;
        } else if (factors.buyerPropensity === 'low') {
            score += 5;
        }

        score = Math.min(100, score);

        let level = '';
        if (score >= 80) level = 'Très élevée';
        else if (score >= 60) level = 'Élevée';
        else if (score >= 40) level = 'Moyenne';
        else if (score >= 20) level = 'Faible';
        else level = 'Très faible';

        return {
            score,
            level,
            assessment: assessment || 'Menace des substituts standard',
            factors
        };
    }

    analyzeRivalry(company) {
        const factors = {
            competitorCount: company?.competitorCount || 5,
            industryGrowth: company?.industryGrowth || 'medium',
            fixedCosts: company?.fixedCosts || 'high',
            storageCosts: company?.storageCosts || 'medium',
            productDifferentiation: company?.productDifferentiation || 'medium',
            exitBarriers: company?.exitBarriers || 'medium',
            strategicStakes: company?.strategicStakes || 'high'
        };

        let score = 0;
        let assessment = '';

        // Nombre de concurrents
        if (factors.competitorCount > 20) {
            score += 30;
            assessment += 'Nombre très élevé de concurrents. ';
        } else if (factors.competitorCount > 10) {
            score += 20;
            assessment += 'Nombre élevé de concurrents. ';
        } else if (factors.competitorCount < 3) {
            score += 5;
        }

        // Croissance de l'industrie
        if (factors.industryGrowth === 'slow') {
            score += 25;
            assessment += 'Croissance de l\'industrie lente. ';
        } else if (factors.industryGrowth === 'medium') {
            score += 15;
        } else if (factors.industryGrowth === 'fast') {
            score += 5;
        }

        // Coûts fixes
        if (factors.fixedCosts === 'very_high') {
            score += 20;
            assessment += 'Coûts fixes très élevés. ';
        } else if (factors.fixedCosts === 'high') {
            score += 15;
        } else {
            score += 5;
        }

        // Coûts de stockage
        if (factors.storageCosts === 'very_high') {
            score += 15;
            assessment += 'Coûts de stockage très élevés. ';
        } else if (factors.storageCosts === 'high') {
            score += 10;
        } else {
            score += 5;
        }

        // Différenciation des produits
        if (factors.productDifferentiation === 'low') {
            score += 15;
            assessment += 'Différenciation des produits faible. ';
        } else if (factors.productDifferentiation === 'medium') {
            score += 10;
        } else if (factors.productDifferentiation === 'high') {
            score += 5;
        }

        // Barrières à la sortie
        if (factors.exitBarriers === 'very_high') {
            score += 10;
            assessment += 'Barrières à la sortie très élevées. ';
        } else if (factors.exitBarriers === 'high') {
            score += 5;
        }

        // Enjeux stratégiques
        if (factors.strategicStakes === 'very_high') {
            score += 5;
            assessment += 'Enjeux stratégiques très importants. ';
        }

        score = Math.min(100, score);

        let level = '';
        if (score >= 80) level = 'Très intense';
        else if (score >= 60) level = 'Intense';
        else if (score >= 40) level = 'Modérée';
        else if (score >= 20) level = 'Faible';
        else level = 'Très faible';

        return {
            score,
            level,
            assessment: assessment || 'Intensité concurrentielle standard',
            factors
        };
    }

    calculateIndustryAttractiveness(analysis) {
        const weights = {
            supplierPower: 0.15,
            buyerPower: 0.15,
            newEntrants: 0.20,
            substitutes: 0.20,
            rivalry: 0.30
        };

        // Normaliser les scores (pour newEntrants, plus le score est bas, plus c'est bon)
        const normalizedScores = {
            supplierPower: 100 - analysis.supplierPower.score,
            buyerPower: 100 - analysis.buyerPower.score,
            newEntrants: analysis.newEntrants.barrierScore, // Déjà inversé
            substitutes: 100 - analysis.substitutes.score,
            rivalry: 100 - analysis.rivalry.score
        };

        let totalScore = 0;
        for (const force of this.forces) {
            totalScore += normalizedScores[force] * weights[force];
        }

        totalScore = Math.round(totalScore);

        let attractiveness = '';
        if (totalScore >= 80) attractiveness = 'Très attractive';
        else if (totalScore >= 65) attractiveness = 'Attractive';
        else if (totalScore >= 50) attractiveness = 'Moyennement attractive';
        else if (totalScore >= 35) attractiveness = 'Peu attractive';
        else attractiveness = 'Non attractive';

        return {
            score: totalScore,
            level: attractiveness,
            breakdown: normalizedScores
        };
    }

    generateStrategicImplications(analysis) {
        const implications = [];

        // Implication pour le pouvoir des fournisseurs
        if (analysis.supplierPower.score > 70) {
            implications.push({
                type: 'suppliers',
                action: 'Développer des relations étroites avec les fournisseurs stratégiques',
                priority: 'high'
            });
            implications.push({
                type: 'suppliers',
                action: 'Diversifier la base de fournisseurs pour réduire la dépendance',
                priority: 'high'
            });
        } else if (analysis.supplierPower.score < 30) {
            implications.push({
                type: 'suppliers',
                action: 'Profiter de la faible dépendance aux fournisseurs pour négocier de meilleurs termes',
                priority: 'medium'
            });
        }

        // Implication pour le pouvoir des acheteurs
        if (analysis.buyerPower.score > 70) {
            implications.push({
                type: 'buyers',
                action: 'Améliorer la différenciation des produits pour réduire la sensibilité au prix',
                priority: 'high'
            });
            implications.push({
                type: 'buyers',
                action: 'Développer des relations à long terme avec les clients clés',
                priority: 'high'
            });
        } else if (analysis.buyerPower.score < 30) {
            implications.push({
                type: 'buyers',
                action: 'Maintenir une bonne relation avec les clients tout en optimisant les prix',
                priority: 'medium'
            });
        }

        // Implication pour les nouveaux entrants
        if (analysis.newEntrants.score > 70) {
            implications.push({
                type: 'new_entrants',
                action: 'Renforcer les barrières à l\'entrée par l\'innovation et les économies d\'échelle',
                priority: 'high'
            });
            implications.push({
                type: 'new_entrants',
                action: 'Surveiller de près les nouveaux concurrents potentiels',
                priority: 'high'
            });
        } else if (analysis.newEntrants.score < 30) {
            implications.push({
                type: 'new_entrants',
                action: 'Profiter des barrières élevées à l\'entrée pour maintenir une position dominante',
                priority: 'medium'
            });
        }

        // Implication pour les substituts
        if (analysis.substitutes.score > 70) {
            implications.push({
                type: 'substitutes',
                action: 'Investir dans l\'innovation pour se différencier des substituts',
                priority: 'high'
            });
            implications.push({
                type: 'substitutes',
                action: 'Éduquer les clients sur les avantages uniques de vos produits',
                priority: 'high'
            });
        } else if (analysis.substitutes.score < 30) {
            implications.push({
                type: 'substitutes',
                action: 'Maintenir la surveillance des substituts potentiels',
                priority: 'low'
            });
        }

        // Implication pour la rivalité
        if (analysis.rivalry.score > 70) {
            implications.push({
                type: 'rivalry',
                action: 'Éviter les guerres de prix et se concentrer sur la différenciation',
                priority: 'critical'
            });
            implications.push({
                type: 'rivalry',
                action: 'Développer des avantages concurrentiels durables',
                priority: 'critical'
            });
        } else if (analysis.rivalry.score < 30) {
            implications.push({
                type: 'rivalry',
                action: 'Profiter de la faible rivalité pour renforcer la position sur le marché',
                priority: 'medium'
            });
        }

        return implications;
    }

    generateSummary(analysis, attractiveness) {
        const forceLevels = {};
        for (const force of this.forces) {
            forceLevels[force] = analysis[force].level;
        }

        return {
            forceLevels,
            attractiveness: attractiveness.level,
            attractivenessScore: attractiveness.score,
            recommendation: this.generateAttractivenessRecommendation(attractiveness.score)
        };
    }

    generateAttractivenessRecommendation(score) {
        if (score >= 80) {
            return 'L\'industrie est très attractive. Stratégie recommandée: Investissement agressif et expansion';
        } else if (score >= 65) {
            return 'L\'industrie est attractive. Stratégie recommandée: Développement et croissance';
        } else if (score >= 50) {
            return 'L\'industrie est moyennement attractive. Stratégie recommandée: Sélectivité et optimisation';
        } else if (score >= 35) {
            return 'L\'industrie est peu attractive. Stratégie recommandée: Approche défensive et optimisation des coûts';
        } else {
            return 'L\'industrie n\'est pas attractive. Stratégie recommandée: Réorientation ou sortie';
        }
    }

    formatRecommendations(results) {
        const recommendations = [];
        const { strategicImplications, summary } = results;

        // Ajouter les implications stratégiques
        strategicImplications.forEach(implication => {
            recommendations.push({
                type: 'strategic',
                priority: implication.priority,
                action: implication.action,
                category: implication.type,
                context: implication.type
            });
        });

        // Ajouter une recommandation basée sur l'attractivité
        recommendations.unshift({
            type: 'industry',
            priority: 'high',
            action: summary.recommendation,
            category: 'attractiveness'
        });

        return recommendations;
    }

    calculateAnalysisScore(results) {
        return Math.round(results.industryAttractiveness.score);
    }

    calculateConfidence(results) {
        // Confiance basée sur la complétude des données
        let confidence = 70; // Base
        for (const force of this.forces) {
            if (results[force].assessment && results[force].assessment.length > 50) {
                confidence += 5;
            }
        }
        return Math.min(100, confidence);
    }
}

// =============================================================================
// ANALYSE PESTEL
// =============================================================================

class PESTELAnalysis extends Analysis {
    constructor(name, description, companyData) {
        super('pestel', name, description, companyData);
        this.category = 'environmental';
        this.cost = { free: 75, pro: 15, enterprise: 4 };
        this.factors = [
            'political',
            'economic',
            'social',
            'technological',
            'environmental',
            'legal'
        ];
    }

    async runAnalysis() {
        const company = this.companyData;
        
        const analysis = {
            political: this.analyzePolitical(company),
            economic: this.analyzeEconomic(company),
            social: this.analyzeSocial(company),
            technological: this.analyzeTechnological(company),
            environmental: this.analyzeEnvironmental(company),
            legal: this.analyzeLegal(company)
        };

        const impactAssessment = this.calculateImpactAssessment(analysis);
        const trendAnalysis = this.generateTrendAnalysis(analysis);

        this.results = {
            ...analysis,
            impactAssessment,
            trendAnalysis,
            summary: this.generateSummary(analysis, impactAssessment)
        };

        return this.results;
    }

    analyzePolitical(company) {
        const factors = {
            governmentStability: company?.governmentStability || 'stable',
            taxationPolicy: company?.taxationPolicy || 'moderate',
            tradeRegulations: company?.tradeRegulations || 'favorable',
            foreignInvestmentPolicy: company?.foreignInvestmentPolicy || 'open',
            subsidies: company?.subsidies || 'none',
            politicalRisks: company?.politicalRisks || 'low'
        };

        let score = 0;
        let assessment = '';
        let impact = 'neutral';

        // Stabilité du gouvernement
        if (factors.governmentStability === 'very_stable') {
            score += 25;
            assessment += 'Gouvernement très stable. ';
        } else if (factors.governmentStability === 'stable') {
            score += 20;
            assessment += 'Gouvernement stable. ';
        } else if (factors.governmentStability === 'unstable') {
            score += 5;
            assessment += 'Gouvernement instable. ';
            impact = 'negative';
        }

        // Politique fiscale
        if (factors.taxationPolicy === 'favorable') {
            score += 20;
            assessment += 'Politique fiscale favorable. ';
        } else if (factors.taxationPolicy === 'moderate') {
            score += 15;
        } else if (factors.taxationPolicy === 'unfavorable') {
            score += 5;
            impact = 'negative';
        }

        // Réglementations commerciales
        if (factors.tradeRegulations === 'very_favorable') {
            score += 20;
            assessment += 'Réglementations commerciales très favorables. ';
        } else if (factors.tradeRegulations === 'favorable') {
            score += 15;
        } else if (factors.tradeRegulations === 'restrictive') {
            score += 5;
            impact = 'negative';
        }

        // Politique d'investissement étranger
        if (factors.foreignInvestmentPolicy === 'very_open') {
            score += 15;
            assessment += 'Politique d\'investissement étranger très ouverte. ';
        } else if (factors.foreignInvestmentPolicy === 'open') {
            score += 10;
        } else if (factors.foreignInvestmentPolicy === 'restricted') {
            score += 5;
            impact = 'negative';
        }

        // Subventions
        if (factors.subsidies === 'significant') {
            score += 10;
            assessment += 'Subventions importantes disponibles. ';
        } else if (factors.subsidies === 'some') {
            score += 5;
        }

        // Risques politiques
        if (factors.politicalRisks === 'very_high') {
            score -= 10;
            assessment += 'Risques politiques très élevés. ';
            impact = 'negative';
        } else if (factors.politicalRisks === 'high') {
            score -= 5;
            impact = 'negative';
        }

        score = Math.max(0, Math.min(100, score));

        let level = '';
        if (score >= 80) level = 'Très favorable';
        else if (score >= 60) level = 'Favorable';
        else if (score >= 40) level = 'Neutre';
        else if (score >= 20) level = 'Défavorable';
        else level = 'Très défavorable';

        return {
            score,
            level,
            impact,
            assessment: assessment || 'Environnement politique standard',
            factors
        };
    }

    analyzeEconomic(company) {
        const factors = {
            gdpGrowth: company?.gdpGrowth || 2.5,
            inflationRate: company?.inflationRate || 2.0,
            interestRates: company?.interestRates || 'moderate',
            unemploymentRate: company?.unemploymentRate || 5.0,
            exchangeRates: company?.exchangeRates || 'stable',
            disposableIncome: company?.disposableIncome || 'increasing',
            consumerSpending: company?.consumerSpending || 'growing'
        };

        let score = 0;
        let assessment = '';
        let impact = 'neutral';

        // Croissance du PIB
        if (factors.gdpGrowth > 4) {
            score += 25;
            assessment += `Croissance du PIB élevée (${factors.gdpGrowth}%). `;
        } else if (factors.gdpGrowth > 2) {
            score += 20;
            assessment += `Croissance du PIB modérée (${factors.gdpGrowth}%). `;
        } else if (factors.gdpGrowth < 0) {
            score += 5;
            assessment += `Récession économique (${factors.gdpGrowth}%). `;
            impact = 'negative';
        }

        // Taux d'inflation
        if (factors.inflationRate < 2) {
            score += 20;
            assessment += `Taux d'inflation faible (${factors.inflationRate}%). `;
        } else if (factors.inflationRate < 5) {
            score += 15;
        } else {
            score += 5;
            impact = 'negative';
        }

        // Taux d'intérêt
        if (factors.interestRates === 'low') {
            score += 15;
            assessment += 'Taux d\'intérêt bas. ';
        } else if (factors.interestRates === 'moderate') {
            score += 10;
        } else if (factors.interestRates === 'high') {
            score += 5;
            impact = 'negative';
        }

        // Taux de chômage
        if (factors.unemploymentRate < 4) {
            score += 15;
            assessment += `Taux de chômage faible (${factors.unemploymentRate}%). `;
        } else if (factors.unemploymentRate < 7) {
            score += 10;
        } else {
            score += 5;
            impact = 'negative';
        }

        // Taux de change
        if (factors.exchangeRates === 'very_stable') {
            score += 10;
            assessment += 'Taux de change très stables. ';
        } else if (factors.exchangeRates === 'stable') {
            score += 5;
        } else {
            impact = 'negative';
        }

        // Revenu disponible
        if (factors.disposableIncome === 'rapidly_increasing') {
            score += 10;
            assessment += 'Revenu disponible en forte augmentation. ';
        } else if (factors.disposableIncome === 'increasing') {
            score += 5;
        } else if (factors.disposableIncome === 'decreasing') {
            impact = 'negative';
        }

        // Dépenses des consommateurs
        if (factors.consumerSpending === 'rapidly_growing') {
            score += 10;
            assessment += 'Dépenses des consommateurs en forte croissance. ';
        } else if (factors.consumerSpending === 'growing') {
            score += 5;
        } else if (factors.consumerSpending === 'declining') {
            impact = 'negative';
        }

        score = Math.max(0, Math.min(100, score));

        let level = '';
        if (score >= 80) level = 'Très favorable';
        else if (score >= 60) level = 'Favorable';
        else if (score >= 40) level = 'Neutre';
        else if (score >= 20) level = 'Défavorable';
        else level = 'Très défavorable';

        return {
            score,
            level,
            impact,
            assessment: assessment || 'Environnement économique standard',
            factors
        };
    }

    analyzeSocial(company) {
        const factors = {
            populationGrowth: company?.populationGrowth || 'stable',
            ageDistribution: company?.ageDistribution || 'balanced',
            educationLevel: company?.educationLevel || 'high',
            culturalTrends: company?.culturalTrends || 'favorable',
            lifestyleChanges: company?.lifestyleChanges || 'moderate',
            healthAwareness: company?.healthAwareness || 'increasing',
            workLifeBalance: company?.workLifeBalance || 'improving'
        };

        let score = 0;
        let assessment = '';
        let impact = 'neutral';

        // Croissance de la population
        if (factors.populationGrowth === 'rapid') {
            score += 20;
            assessment += 'Croissance rapide de la population. ';
        } else if (factors.populationGrowth === 'moderate') {
            score += 15;
        } else if (factors.populationGrowth === 'declining') {
            score += 5;
            impact = 'negative';
        }

        // Distribution par âge
        if (factors.ageDistribution === 'young') {
            score += 15;
            assessment += 'Population jeune. ';
        } else if (factors.ageDistribution === 'balanced') {
            score += 10;
        } else if (factors.ageDistribution === 'aging') {
            score += 5;
            impact = 'negative';
        }

        // Niveau d'éducation
        if (factors.educationLevel === 'very_high') {
            score += 20;
            assessment += 'Niveau d\'éducation très élevé. ';
        } else if (factors.educationLevel === 'high') {
            score += 15;
        } else if (factors.educationLevel === 'low') {
            score += 5;
            impact = 'negative';
        }

        // Tendances culturelles
        if (factors.culturalTrends === 'very_favorable') {
            score += 15;
            assessment += 'Tendances culturelles très favorables. ';
        } else if (factors.culturalTrends === 'favorable') {
            score += 10;
        } else if (factors.culturalTrends === 'unfavorable') {
            score += 5;
            impact = 'negative';
        }

        // Changements de mode de vie
        if (factors.lifestyleChanges === 'rapid') {
            score += 10;
            assessment += 'Changements rapides du mode de vie. ';
        } else if (factors.lifestyleChanges === 'moderate') {
            score += 5;
        }

        // Sensibilisation à la santé
        if (factors.healthAwareness === 'rapidly_increasing') {
            score += 10;
            assessment += 'Sensibilisation à la santé en forte augmentation. ';
        } else if (factors.healthAwareness === 'increasing') {
            score += 5;
        }

        // Équilibre vie professionnelle/vie privée
        if (factors.workLifeBalance === 'greatly_improving') {
            score += 5;
            assessment += 'Équilibre vie professionnelle/vie privée fortement amélioré. ';
        } else if (factors.workLifeBalance === 'improving') {
            score += 5;
        }

        score = Math.max(0, Math.min(100, score));

        let level = '';
        if (score >= 80) level = 'Très favorable';
        else if (score >= 60) level = 'Favorable';
        else if (score >= 40) level = 'Neutre';
        else if (score >= 20) level = 'Défavorable';
        else level = 'Très défavorable';

        return {
            score,
            level,
            impact,
            assessment: assessment || 'Environnement social standard',
            factors
        };
    }

    analyzeTechnological(company) {
        const factors = {
            rndInvestment: company?.rndInvestment || 'high',
            technologicalAdoption: company?.technologicalAdoption || 'fast',
            digitalTransformation: company?.digitalTransformation || 'advanced',
            automation: company?.automation || 'increasing',
            aiAdoption: company?.aiAdoption || 'growing',
            technologicalDisruption: company?.technologicalDisruption || 'moderate',
            ipProtection: company?.ipProtection || 'strong'
        };

        let score = 0;
        let assessment = '';
        let impact = 'neutral';

        // Investissement en R&D
        if (factors.rndInvestment === 'very_high') {
            score += 25;
            assessment += 'Investissement en R&D très élevé. ';
        } else if (factors.rndInvestment === 'high') {
            score += 20;
            assessment += 'Investissement en R&D élevé. ';
        } else if (factors.rndInvestment === 'low') {
            score += 5;
            impact = 'negative';
        }

        // Adoption technologique
        if (factors.technologicalAdoption === 'very_fast') {
            score += 20;
            assessment += 'Adoption technologique très rapide. ';
        } else if (factors.technologicalAdoption === 'fast') {
            score += 15;
        } else if (factors.technologicalAdoption === 'slow') {
            score += 5;
            impact = 'negative';
        }

        // Transformation numérique
        if (factors.digitalTransformation === 'very_advanced') {
            score += 15;
            assessment += 'Transformation numérique très avancée. ';
        } else if (factors.digitalTransformation === 'advanced') {
            score += 10;
        } else if (factors.digitalTransformation === 'limited') {
            score += 5;
            impact = 'negative';
        }

        // Automatisation
        if (factors.automation === 'extensive') {
            score += 15;
            assessment += 'Automatisation extensive. ';
        } else if (factors.automation === 'increasing') {
            score += 10;
        } else if (factors.automation === 'limited') {
            score += 5;
            impact = 'negative';
        }

        // Adoption de l'IA
        if (factors.aiAdoption === 'widespread') {
            score += 10;
            assessment += 'Adoption de l\'IA généralisée. ';
        } else if (factors.aiAdoption === 'growing') {
            score += 5;
        }

        // Disruption technologique
        if (factors.technologicalDisruption === 'high') {
            score += 5;
            assessment += 'Risque de disruption technologique élevé. ';
            impact = 'negative';
        } else if (factors.technologicalDisruption === 'very_high') {
            score -= 5;
            impact = 'negative';
        }

        // Protection de la propriété intellectuelle
        if (factors.ipProtection === 'very_strong') {
            score += 10;
            assessment += 'Protection de la propriété intellectuelle très forte. ';
        } else if (factors.ipProtection === 'strong') {
            score += 5;
        } else if (factors.ipProtection === 'weak') {
            impact = 'negative';
        }

        score = Math.max(0, Math.min(100, score));

        let level = '';
        if (score >= 80) level = 'Très favorable';
        else if (score >= 60) level = 'Favorable';
        else if (score >= 40) level = 'Neutre';
        else if (score >= 20) level = 'Défavorable';
        else level = 'Très défavorable';

        return {
            score,
            level,
            impact,
            assessment: assessment || 'Environnement technologique standard',
            factors
        };
    }

    analyzeEnvironmental(company) {
        const factors = {
            climateChangeImpact: company?.climateChangeImpact || 'moderate',
            sustainabilityTrends: company?.sustainabilityTrends || 'growing',
            carbonFootprint: company?.carbonFootprint || 'reducing',
            greenEnergyAdoption: company?.greenEnergyAdoption || 'increasing',
            wasteManagement: company?.wasteManagement || 'improving',
            waterScarcity: company?.waterScarcity || 'concerning',
            naturalResourceAvailability: company?.naturalResourceAvailability || 'stable'
        };

        let score = 0;
        let assessment = '';
        let impact = 'neutral';

        // Impact du changement climatique
        if (factors.climateChangeImpact === 'low') {
            score += 20;
            assessment += 'Impact du changement climatique faible. ';
        } else if (factors.climateChangeImpact === 'moderate') {
            score += 15;
        } else if (factors.climateChangeImpact === 'high') {
            score += 5;
            impact = 'negative';
        }

        // Tendances de durabilité
        if (factors.sustainabilityTrends === 'rapidly_growing') {
            score += 20;
            assessment += 'Tendances de durabilité en forte croissance. ';
        } else if (factors.sustainabilityTrends === 'growing') {
            score += 15;
        } else if (factors.sustainabilityTrends === 'declining') {
            score += 5;
            impact = 'negative';
        }

        // Empreinte carbone
        if (factors.carbonFootprint === 'rapidly_reducing') {
            score += 15;
            assessment += 'Réduction rapide de l\'empreinte carbone. ';
        } else if (factors.carbonFootprint === 'reducing') {
            score += 10;
        } else if (factors.carbonFootprint === 'increasing') {
            impact = 'negative';
        }

        // Adoption de l'énergie verte
        if (factors.greenEnergyAdoption === 'widespread') {
            score += 15;
            assessment += 'Adoption généralisée de l\'énergie verte. ';
        } else if (factors.greenEnergyAdoption === 'increasing') {
            score += 10;
        } else if (factors.greenEnergyAdoption === 'limited') {
            score += 5;
        }

        // Gestion des déchets
        if (factors.wasteManagement === 'excellent') {
            score += 10;
            assessment += 'Gestion des déchets excellente. ';
        } else if (factors.wasteManagement === 'improving') {
            score += 5;
        } else if (factors.wasteManagement === 'poor') {
            impact = 'negative';
        }

        // Pénurie d'eau
        if (factors.waterScarcity === 'not_a_concern') {
            score += 5;
        } else if (factors.waterScarcity === 'concerning') {
            score += 5;
            impact = 'negative';
        } else if (factors.waterScarcity === 'critical') {
            score -= 5;
            impact = 'negative';
        }

        // Disponibilité des ressources naturelles
        if (factors.naturalResourceAvailability === 'abundant') {
            score += 10;
            assessment += 'Ressources naturelles abondantes. ';
        } else if (factors.naturalResourceAvailability === 'stable') {
            score += 5;
        } else if (factors.naturalResourceAvailability === 'declining') {
            impact = 'negative';
        }

        score = Math.max(0, Math.min(100, score));

        let level = '';
        if (score >= 80) level = 'Très favorable';
        else if (score >= 60) level = 'Favorable';
        else if (score >= 40) level = 'Neutre';
        else if (score >= 20) level = 'Défavorable';
        else level = 'Très défavorable';

        return {
            score,
            level,
            impact,
            assessment: assessment || 'Environnement écologique standard',
            factors
        };
    }

    analyzeLegal(company) {
        const factors = {
            laborLaws: company?.laborLaws || 'balanced',
            consumerProtection: company?.consumerProtection || 'strong',
            environmentalRegulations: company?.environmentalRegulations || 'strict',
            dataProtection: company?.dataProtection || 'strong',
            industryRegulations: company?.industryRegulations || 'moderate',
            intellectualProperty: company?.intellectualProperty || 'protected',
            taxCompliance: company?.taxCompliance || 'complex',
            healthAndSafety: company?.healthAndSafety || 'strict'
        };

        let score = 0;
        let assessment = '';
        let impact = 'neutral';

        // Lois du travail
        if (factors.laborLaws === 'very_flexible') {
            score += 15;
            assessment += 'Lois du travail très flexibles. ';
        } else if (factors.laborLaws === 'flexible') {
            score += 10;
        } else if (factors.laborLaws === 'very_rigid') {
            score += 5;
            impact = 'negative';
        }

        // Protection des consommateurs
        if (factors.consumerProtection === 'very_strong') {
            score += 10;
            assessment += 'Protection des consommateurs très forte. ';
        } else if (factors.consumerProtection === 'strong') {
            score += 5;
        }

        // Réglementations environnementales
        if (factors.environmentalRegulations === 'clear') {
            score += 15;
            assessment += 'Réglementations environnementales claires. ';
        } else if (factors.environmentalRegulations === 'strict') {
            score += 10;
        } else if (factors.environmentalRegulations === 'unclear') {
            score += 5;
            impact = 'negative';
        }

        // Protection des données
        if (factors.dataProtection === 'very_strong') {
            score += 15;
            assessment += 'Protection des données très forte. ';
        } else if (factors.dataProtection === 'strong') {
            score += 10;
        } else if (factors.dataProtection === 'weak') {
            score += 5;
            impact = 'negative';
        }

        // Réglementations industrielles
        if (factors.industryRegulations === 'favorable') {
            score += 15;
            assessment += 'Réglementations industrielles favorables. ';
        } else if (factors.industryRegulations === 'moderate') {
            score += 10;
        } else if (factors.industryRegulations === 'restrictive') {
            score += 5;
            impact = 'negative';
        }

        // Propriété intellectuelle
        if (factors.intellectualProperty === 'very_protected') {
            score += 10;
            assessment += 'Propriété intellectuelle très protégée. ';
        } else if (factors.intellectualProperty === 'protected') {
            score += 5;
        } else if (factors.intellectualProperty === 'poorly_protected') {
            impact = 'negative';
        }

        // Conformité fiscale
        if (factors.taxCompliance === 'simple') {
            score += 10;
            assessment += 'Conformité fiscale simple. ';
        } else if (factors.taxCompliance === 'moderate') {
            score += 5;
        } else if (factors.taxCompliance === 'very_complex') {
            impact = 'negative';
        }

        // Santé et sécurité
        if (factors.healthAndSafety === 'clear') {
            score += 10;
            assessment += 'Réglementations santé et sécurité claires. ';
        } else if (factors.healthAndSafety === 'strict') {
            score += 5;
        } else if (factors.healthAndSafety === 'unclear') {
            impact = 'negative';
        }

        score = Math.max(0, Math.min(100, score));

        let level = '';
        if (score >= 80) level = 'Très favorable';
        else if (score >= 60) level = 'Favorable';
        else if (score >= 40) level = 'Neutre';
        else if (score >= 20) level = 'Défavorable';
        else level = 'Très défavorable';

        return {
            score,
            level,
            impact,
            assessment: assessment || 'Environnement légal standard',
            factors
        };
    }

    calculateImpactAssessment(analysis) {
        const positiveFactors = [];
        const negativeFactors = [];
        const neutralFactors = [];

        for (const factor of this.factors) {
            const result = analysis[factor];
            if (result.impact === 'positive') {
                positiveFactors.push({ factor, ...result });
            } else if (result.impact === 'negative') {
                negativeFactors.push({ factor, ...result });
            } else {
                neutralFactors.push({ factor, ...result });
            }
        }

        const totalPositive = positiveFactors.reduce((sum, f) => sum + f.score, 0);
        const totalNegative = negativeFactors.reduce((sum, f) => sum + (100 - f.score), 0);
        const totalNeutral = neutralFactors.reduce((sum, f) => sum + f.score, 0);

        return {
            positiveFactors,
            negativeFactors,
            neutralFactors,
            balance: totalPositive - totalNegative,
            overallImpact: this.determineOverallImpact(totalPositive, totalNegative)
        };
    }

    determineOverallImpact(positive, negative) {
        const ratio = positive / (positive + negative + 1);
        if (ratio > 0.7) return 'Très positif';
        if (ratio > 0.5) return 'Positif';
        if (ratio > 0.3) return 'Neutre';
        if (ratio > 0.1) return 'Négatif';
        return 'Très négatif';
    }

    generateTrendAnalysis(analysis) {
        const trends = [];

        for (const factor of this.factors) {
            const result = analysis[factor];
            trends.push({
                factor,
                currentLevel: result.level,
                trend: this.determineTrend(result.factors),
                assessment: result.assessment
            });
        }

        return trends;
    }

    determineTrend(factors) {
        // Analyser les facteurs pour déterminer une tendance
        const values = Object.values(factors);
        const positive = values.filter(v => v === 'high' || v === 'very_high' || v === 'favorable' || v === 'very_favorable' || v > 0).length;
        const negative = values.filter(v => v === 'low' || v === 'very_low' || v === 'unfavorable' || v === 'very_unfavorable' || v < 0).length;

        if (positive > negative) return 'Amélioration';
        if (positive < negative) return 'Dégradation';
        return 'Stable';
    }

    generateSummary(analysis, impactAssessment) {
        const factorLevels = {};
        for (const factor of this.factors) {
            factorLevels[factor] = analysis[factor].level;
        }

        return {
            factorLevels,
            overallImpact: impactAssessment.overallImpact,
            balance: impactAssessment.balance,
            recommendation: this.generatePESTELRecommendation(impactAssessment.balance)
        };
    }

    generatePESTELRecommendation(balance) {
        if (balance > 200) {
            return 'Environnement global très favorable. Stratégie recommandée: Expansion agressive et investissement';
        } else if (balance > 100) {
            return 'Environnement global favorable. Stratégie recommandée: Croissance et développement';
        } else if (balance > -50) {
            return 'Environnement global équilibré. Stratégie recommandée: Approche prudente et optimisation';
        } else if (balance > -150) {
            return 'Environnement global défavorable. Stratégie recommandée: Approche défensive et consolidation';
        } else {
            return 'Environnement global très défavorable. Stratégie recommandée: Réorientation stratégique ou réduction des activités';
        }
    }

    formatRecommendations(results) {
        const recommendations = [];
        const { strategicImplications, summary } = results;

        // Ajouter la recommandation principale
        recommendations.push({
            type: 'environmental',
            priority: 'high',
            action: summary.recommendation,
            category: 'overall'
        });

        // Ajouter des recommandations basées sur chaque facteur
        for (const factor of this.factors) {
            const result = results[factor];
            if (result.impact === 'negative') {
                recommendations.push({
                    type: 'environmental',
                    priority: 'high',
                    action: `Atténuer les impacts négatifs de l\'environnement ${factor} (${result.level})`,
                    category: factor
                });
            } else if (result.impact === 'positive') {
                recommendations.push({
                    type: 'environmental',
                    priority: 'medium',
                    action: `Exploiter les opportunités de l\'environnement ${factor} (${result.level})`,
                    category: factor
                });
            }
        }

        return recommendations;
    }

    calculateAnalysisScore(results) {
        const { impactAssessment } = results;
        // Score basé sur l'impact global
        let score = 50; // Point de départ neutre
        score += impactAssessment.balance / 3;
        
        // Ajuster en fonction de l'impact global
        if (impactAssessment.overallImpact === 'Très positif') score += 20;
        else if (impactAssessment.overallImpact === 'Positif') score += 10;
        else if (impactAssessment.overallImpact === 'Négatif') score -= 10;
        else if (impactAssessment.overallImpact === 'Très négatif') score -= 20;

        return Math.max(0, Math.min(100, Math.round(score)));
    }

    calculateConfidence(results) {
        // Confiance basée sur le nombre de facteurs analysés en détail
        let confidence = 60;
        for (const factor of this.factors) {
            if (results[factor].assessment && results[factor].assessment.length > 50) {
                confidence += 6;
            }
        }
        return Math.min(100, confidence);
    }
}

// =============================================================================
// ANALYSE CONCURRENTIELLE
// =============================================================================

class CompetitiveAnalysis extends Analysis {
    constructor(name, description, companyData) {
        super('competitive', name, description, companyData);
        this.category = 'competitive';
        this.cost = { free: 160, pro: 20, enterprise: 6 };
    }

    async runAnalysis() {
        const company = this.companyData;
        
        const analysis = {
            marketShare: this.analyzeMarketShare(company),
            competitivePosition: this.analyzeCompetitivePosition(company),
            competitorBenchmark: this.analyzeCompetitorBenchmark(company),
            costStructure: this.analyzeCostStructure(company),
            differentiation: this.analyzeDifferentiation(company),
            strategicGroups: this.analyzeStrategicGroups(company)
        };

        const competitiveAdvantage = this.calculateCompetitiveAdvantage(analysis);
        const strategicRecommendations = this.generateStrategicRecommendations(analysis);

        this.results = {
            ...analysis,
            competitiveAdvantage,
            strategicRecommendations,
            summary: this.generateSummary(analysis, competitiveAdvantage)
        };

        return this.results;
    }

    analyzeMarketShare(company) {
        if (!company || !company.competitors) {
            return {
                companyMarketShare: 0.25,
                competitors: [],
                marketConcentration: 'moderate',
                assessment: 'Part de marché non spécifiée. Utilisation d\'une estimation par défaut.'
            };
        }

        const totalMarket = company.competitors.reduce((sum, c) => sum + (c.marketShare || 0), 0) + (company.marketShare || 0.25);
        const companyMarketShare = company.marketShare || 0.25;

        let marketConcentration = '';
        if (totalMarket > 0.9) {
            marketConcentration = 'high';
        } else if (totalMarket > 0.7) {
            marketConcentration = 'moderate';
        } else {
            marketConcentration = 'fragmented';
        }

        let assessment = '';
        if (companyMarketShare > 0.4) {
            assessment = 'Position de leader sur le marché avec une part de marché dominante.';
        } else if (companyMarketShare > 0.25) {
            assessment = 'Position forte sur le marché avec une part de marché significative.';
        } else if (companyMarketShare > 0.1) {
            assessment = 'Position compétitive avec une part de marché modérée.';
        } else {
            assessment = 'Position de challenger ou de suiveur sur le marché.';
        }

        return {
            companyMarketShare,
            competitors: company.competitors || [],
            marketConcentration,
            assessment
        };
    }

    analyzeCompetitivePosition(company) {
        if (!company) {
            return {
                strengths: [],
                weaknesses: [],
                position: 'average',
                assessment: 'Position compétitive non spécifiée.'
            };
        }

        const strengths = [];
        const weaknesses = [];

        // Comparaison avec les concurrents moyens
        if (company.quality && company.quality > 8) {
            strengths.push('Qualité supérieure à la moyenne du marché');
        } else if (company.quality && company.quality < 6) {
            weaknesses.push('Qualité inférieure à la moyenne du marché');
        }

        if (company.price && company.price < 0.95) {
            strengths.push('Prix compétitifs');
        } else if (company.price && company.price > 1.05) {
            weaknesses.push('Prix non compétitifs');
        }

        if (company.innovation && company.innovation > 7) {
            strengths.push('Innovation supérieure à la concurrence');
        } else if (company.innovation && company.innovation < 5) {
            weaknesses.push('Retard en matière d\'innovation');
        }

        if (company.customerService && company.customerService > 8) {
            strengths.push('Service client excellent');
        } else if (company.customerService && company.customerService < 6) {
            weaknesses.push('Service client à améliorer');
        }

        if (company.brandStrength && company.brandStrength > 7) {
            strengths.push('Marque forte et reconnue');
        } else if (company.brandStrength && company.brandStrength < 5) {
            weaknesses.push('Notoriété de la marque faible');
        }

        if (company.distribution && company.distribution > 7) {
            strengths.push('Réseau de distribution étendu');
        } else if (company.distribution && company.distribution < 5) {
            weaknesses.push('Réseau de distribution limité');
        }

        let position = '';
        if (strengths.length > weaknesses.length + 2) {
            position = 'leader';
        } else if (strengths.length > weaknesses.length) {
            position = 'strong';
        } else if (strengths.length === weaknesses.length) {
            position = 'average';
        } else if (weaknesses.length > strengths.length + 2) {
            position = 'weak';
        } else {
            position = 'challenger';
        }

        let assessment = '';
        if (position === 'leader') {
            assessment = 'Position de leader avec des avantages compétitifs significatifs.';
        } else if (position === 'strong') {
            assessment = 'Position compétitive forte avec plusieurs avantages.';
        } else if (position === 'average') {
            assessment = 'Position moyenne sur le marché.';
        } else if (position === 'challenger') {
            assessment = 'Position de challenger avec des faiblesses à corriger.';
        } else {
            assessment = 'Position faible nécessitant des améliorations majeures.';
        }

        return {
            strengths,
            weaknesses,
            position,
            assessment
        };
    }

    analyzeCompetitorBenchmark(company) {
        if (!company || !company.competitors) {
            return {
                priceComparison: 'average',
                qualityComparison: 'average',
                featureComparison: 'average',
                innovationComparison: 'average',
                assessment: 'Benchmark concurrentiel non disponible.'
            };
        }

        // Moyenne des concurrents
        const avgPrice = company.competitors.reduce((sum, c) => sum + (c.priceIndex || 1), 0) / company.competitors.length;
        const avgQuality = company.competitors.reduce((sum, c) => sum + (c.qualityIndex || 7), 0) / company.competitors.length;
        const avgFeatures = company.competitors.reduce((sum, c) => sum + (c.featureScore || 7), 0) / company.competitors.length;
        const avgInnovation = company.competitors.reduce((sum, c) => sum + (c.innovationScore || 5), 0) / company.competitors.length;

        const companyPrice = company.priceIndex || 1;
        const companyQuality = company.qualityIndex || 7;
        const companyFeatures = company.featureScore || 7;
        const companyInnovation = company.innovationScore || 5;

        let priceComparison = '';
        if (companyPrice < avgPrice * 0.95) priceComparison = 'below_average';
        else if (companyPrice > avgPrice * 1.05) priceComparison = 'above_average';
        else priceComparison = 'average';

        let qualityComparison = '';
        if (companyQuality > avgQuality * 1.1) qualityComparison = 'above_average';
        else if (companyQuality < avgQuality * 0.9) qualityComparison = 'below_average';
        else qualityComparison = 'average';

        let featureComparison = '';
        if (companyFeatures > avgFeatures * 1.1) featureComparison = 'above_average';
        else if (companyFeatures < avgFeatures * 0.9) featureComparison = 'below_average';
        else featureComparison = 'average';

        let innovationComparison = '';
        if (companyInnovation > avgInnovation * 1.1) innovationComparison = 'above_average';
        else if (companyInnovation < avgInnovation * 0.9) innovationComparison = 'below_average';
        else innovationComparison = 'average';

        let assessment = `Benchmark: Prix ${priceComparison}, Qualité ${qualityComparison}, `;
        assessment += `Fonctionnalités ${featureComparison}, Innovation ${innovationComparison}.`;

        return {
            priceComparison,
            qualityComparison,
            featureComparison,
            innovationComparison,
            companyVsAverage: {
                price: companyPrice,
                quality: companyQuality,
                features: companyFeatures,
                innovation: companyInnovation
            },
            industryAverage: {
                price: avgPrice,
                quality: avgQuality,
                features: avgFeatures,
                innovation: avgInnovation
            },
            assessment
        };
    }

    analyzeCostStructure(company) {
        if (!company) {
            return {
                fixedCosts: 0.5,
                variableCosts: 0.5,
                costAdvantage: 'none',
                assessment: 'Structure de coûts non spécifiée.'
            };
        }

        const fixedCosts = company.fixedCosts || 0.5;
        const variableCosts = company.variableCosts || 0.5;

        let costAdvantage = '';
        let assessment = '';

        if (fixedCosts < 0.4 && variableCosts < 0.6) {
            costAdvantage = 'significant';
            assessment = 'Structure de coûts très avantageuse avec des coûts fixes et variables bas.';
        } else if (fixedCosts < 0.5 && variableCosts < 0.7) {
            costAdvantage = 'moderate';
            assessment = 'Structure de coûts avantageuse avec des coûts compétitifs.';
        } else if (fixedCosts > 0.6 || variableCosts > 0.7) {
            costAdvantage = 'disadvantage';
            assessment = 'Structure de coûts désavantageuse nécessitant une optimisation.';
        } else {
            costAdvantage = 'none';
            assessment = 'Structure de coûts comparable à la moyenne du marché.';
        }

        return {
            fixedCosts,
            variableCosts,
            costAdvantage,
            assessment
        };
    }

    analyzeDifferentiation(company) {
        if (!company) {
            return {
                productDifferentiation: 'moderate',
                serviceDifferentiation: 'moderate',
                brandDifferentiation: 'moderate',
                assessment: 'Différenciation non spécifiée.'
            };
        }

        const productDiff = company.productDifferentiation || 'moderate';
        const serviceDiff = company.serviceDifferentiation || 'moderate';
        const brandDiff = company.brandDifferentiation || 'moderate';

        let assessment = '';
        if (productDiff === 'high' && serviceDiff === 'high' && brandDiff === 'high') {
            assessment = 'Différenciation excellente sur tous les plans.';
        } else if (productDiff === 'high' || serviceDiff === 'high' || brandDiff === 'high') {
            assessment = 'Bonne différenciation dans au moins un domaine clé.';
        } else if (productDiff === 'low' && serviceDiff === 'low' && brandDiff === 'low') {
            assessment = 'Faible différenciation nécessitant une amélioration urgente.';
        } else {
            assessment = 'Différenciation moyenne par rapport aux concurrents.';
        }

        return {
            productDifferentiation: productDiff,
            serviceDifferentiation: serviceDiff,
            brandDifferentiation: brandDiff,
            assessment
        };
    }

    analyzeStrategicGroups(company) {
        if (!company || !company.competitors) {
            return {
                groups: [],
                companyGroup: 'unknown',
                assessment: 'Groupes stratégiques non identifiés.'
            };
        }

        // Identifier les groupes stratégiques basés sur les caractéristiques
        const groups = {};
        
        // Groupe par taille
        if (company.revenue > 100000000) {
            groups.size = 'large';
        } else if (company.revenue > 10000000) {
            groups.size = 'medium';
        } else {
            groups.size = 'small';
        }

        // Groupe par porté géographique
        if (company.geographicCoverage && company.geographicCoverage === 'global') {
            groups.geography = 'global';
        } else if (company.geographicCoverage && company.geographicCoverage === 'regional') {
            groups.geography = 'regional';
        } else {
            groups.geography = 'local';
        }

        // Groupe par stratégie
        if (company.strategy && company.strategy === 'premium') {
            groups.strategy = 'premium';
        } else if (company.strategy && company.strategy === 'cost_leader') {
            groups.strategy = 'cost_leader';
        } else if (company.strategy && company.strategy === 'differentiation') {
            groups.strategy = 'differentiation';
        } else {
            groups.strategy = 'focus';
        }

        // Groupe par innovation
        if (company.innovationLevel && company.innovationLevel > 7) {
            groups.innovation = 'innovator';
        } else if (company.innovationLevel && company.innovationLevel > 4) {
            groups.innovation = 'follower';
        } else {
            groups.innovation = 'laggard';
        }

        const companyGroup = `${groups.size}_${groups.geography}_${groups.strategy}_${groups.innovation}`;

        let assessment = `L'entreprise appartient au groupe stratégique: ${companyGroup.replace(/_/g, ' ')}. `;
        assessment += 'Cela influence sa position concurrentielle et ses options stratégiques.';

        return {
            groups,
            companyGroup,
            assessment
        };
    }

    calculateCompetitiveAdvantage(analysis) {
        const { competitivePosition, competitorBenchmark, costStructure, differentiation } = analysis;

        let score = 0;
        let advantages = [];
        let disadvantages = [];

        // Position compétitive
        if (competitivePosition.position === 'leader') {
            score += 30;
            advantages.push('Position de leader sur le marché');
        } else if (competitivePosition.position === 'strong') {
            score += 20;
            advantages.push('Position compétitive forte');
        } else if (competitivePosition.position === 'average') {
            score += 10;
        } else {
            disadvantages.push(`Position compétitive ${competitivePosition.position}`);
        }

        // Benchmark
        if (competitorBenchmark.priceComparison === 'below_average') {
            score += 15;
            advantages.push('Avantage prix par rapport à la concurrence');
        } else if (competitorBenchmark.priceComparison === 'above_average') {
            disadvantages.push('Désavantage prix par rapport à la concurrence');
        }

        if (competitorBenchmark.qualityComparison === 'above_average') {
            score += 20;
            advantages.push('Avantage qualité par rapport à la concurrence');
        } else if (competitorBenchmark.qualityComparison === 'below_average') {
            disadvantages.push('Désavantage qualité par rapport à la concurrence');
        }

        if (competitorBenchmark.featureComparison === 'above_average') {
            score += 15;
            advantages.push('Avantage fonctionnalités par rapport à la concurrence');
        } else if (competitorBenchmark.featureComparison === 'below_average') {
            disadvantages.push('Désavantage fonctionnalités par rapport à la concurrence');
        }

        if (competitorBenchmark.innovationComparison === 'above_average') {
            score += 15;
            advantages.push('Avantage innovation par rapport à la concurrence');
        } else if (competitorBenchmark.innovationComparison === 'below_average') {
            disadvantages.push('Désavantage innovation par rapport à la concurrence');
        }

        // Structure de coûts
        if (costStructure.costAdvantage === 'significant') {
            score += 15;
            advantages.push('Avantage coûteux significatif');
        } else if (costStructure.costAdvantage === 'moderate') {
            score += 10;
            advantages.push('Avantage coûteux modéré');
        } else if (costStructure.costAdvantage === 'disadvantage') {
            disadvantages.push('Désavantage coûteux');
        }

        // Différenciation
        if (differentiation.productDifferentiation === 'high' && 
            differentiation.serviceDifferentiation === 'high' && 
            differentiation.brandDifferentiation === 'high') {
            score += 10;
            advantages.push('Excellente différenciation globale');
        } else if (differentiation.productDifferentiation === 'low' || 
                   differentiation.serviceDifferentiation === 'low' || 
                   differentiation.brandDifferentiation === 'low') {
            disadvantages.push('Faible différenciation dans un ou plusieurs domaines');
        }

        score = Math.min(100, score);

        let level = '';
        if (score >= 80) level = 'Très fort';
        else if (score >= 60) level = 'Fort';
        else if (score >= 40) level = 'Modéré';
        else if (score >= 20) level = 'Faible';
        else level = 'Très faible';

        return {
            score,
            level,
            advantages,
            disadvantages
        };
    }

    generateStrategicRecommendations(analysis) {
        const recommendations = [];
        const { competitivePosition, competitorBenchmark, costStructure, differentiation, strategicGroups } = analysis;

        // Recommandations basées sur la position compétitive
        if (competitivePosition.position === 'leader') {
            recommendations.push({
                type: 'positioning',
                action: 'Maintenir la position de leader en continuant à innover et à investir dans la différenciation',
                priority: 'high'
            });
            recommendations.push({
                type: 'positioning',
                action: 'Protéger la position de leader par des barrières à l\'entrée',
                priority: 'high'
            });
        } else if (competitivePosition.position === 'strong') {
            recommendations.push({
                type: 'positioning',
                action: 'Renforcer la position forte en ciblant les faiblesses des leaders',
                priority: 'high'
            });
            recommendations.push({
                type: 'positioning',
                action: 'Développer des avantages compétitifs supplémentaires',
                priority: 'medium'
            });
        } else if (competitivePosition.position === 'challenger') {
            recommendations.push({
                type: 'positioning',
                action: 'Lancer des actions agressives pour rattraper les leaders',
                priority: 'critical'
            });
            recommendations.push({
                type: 'positioning',
                action: 'Identifier et exploiter les faiblesses des leaders',
                priority: 'critical'
            });
        } else {
            recommendations.push({
                type: 'positioning',
                action: 'Améliorer les fondamentaux avant de viser des positions plus élevées',
                priority: 'critical'
            });
        }

        // Recommandations basées sur le benchmark
        if (competitorBenchmark.priceComparison === 'above_average' && 
            competitorBenchmark.qualityComparison !== 'above_average') {
            recommendations.push({
                type: 'benchmark',
                action: 'Réduire les coûts ou améliorer la qualité pour justifier les prix élevés',
                priority: 'high'
            });
        }

        if (competitorBenchmark.qualityComparison === 'below_average') {
            recommendations.push({
                type: 'benchmark',
                action: 'Investir dans l\'amélioration de la qualité pour rattraper la concurrence',
                priority: 'high'
            });
        }

        if (competitorBenchmark.innovationComparison === 'below_average') {
            recommendations.push({
                type: 'benchmark',
                action: 'Augmenter les investissements en R&D pour améliorer l\'innovation',
                priority: 'high'
            });
        }

        // Recommandations basées sur la structure de coûts
        if (costStructure.costAdvantage === 'disadvantage') {
            recommendations.push({
                type: 'cost',
                action: 'Lancer un programme d\'optimisation des coûts',
                priority: 'critical'
            });
        } else if (costStructure.costAdvantage === 'significant' || costStructure.costAdvantage === 'moderate') {
            recommendations.push({
                type: 'cost',
                action: 'Utiliser l\'avantage coût pour gagner des parts de marché',
                priority: 'medium'
            });
        }

        // Recommandations basées sur la différenciation
        if (differentiation.productDifferentiation === 'low') {
            recommendations.push({
                type: 'differentiation',
                action: 'Développer une stratégie de différenciation produit',
                priority: 'high'
            });
        }

        if (differentiation.brandDifferentiation === 'low') {
            recommendations.push({
                type: 'differentiation',
                action: 'Renforcer l\'image de marque et le positionnement',
                priority: 'high'
            });
        }

        // Recommandations basées sur les groupes stratégiques
        if (strategicGroups.companyGroup.includes('small')) {
            recommendations.push({
                type: 'strategic',
                action: 'Envisager des partenariats ou des alliances pour concurrencer les grands acteurs',
                priority: 'medium'
            });
        }

        if (strategicGroups.companyGroup.includes('laggard')) {
            recommendations.push({
                type: 'strategic',
                action: 'Investir massivement dans l\'innovation pour sortir du groupe des retardataires',
                priority: 'critical'
            });
        }

        return recommendations;
    }

    generateSummary(analysis, competitiveAdvantage) {
        const { competitivePosition, marketShare, strategicGroups } = analysis;

        return {
            marketShare: marketShare.companyMarketShare,
            competitivePosition: competitivePosition.position,
            competitiveAdvantage: competitiveAdvantage.level,
            strategicGroup: strategicGroups.companyGroup,
            recommendation: this.generateCompetitiveRecommendation(competitiveAdvantage.score, competitivePosition.position)
        };
    }

    generateCompetitiveRecommendation(score, position) {
        if (score >= 80) {
            return `Avantage compétitif très fort (${score}/100). Stratégie recommandée: Expansion agressive et diversification`;
        } else if (score >= 60) {
            return `Avantage compétitif solide (${score}/100). Stratégie recommandée: Croissance et consolidation`;
        } else if (score >= 40) {
            if (position === 'challenger' || position === 'weak') {
                return `Avantage compétitif modéré (${score}/100). Stratégie recommandée: Amélioration des positions clés et différenciation`;
            }
            return `Avantage compétitif modéré (${score}/100). Stratégie recommandée: Maintien et optimisation`;
        } else if (score >= 20) {
            return `Avantage compétitif faible (${score}/100). Stratégie recommandée: Approche défensive et restructuration`;
        } else {
            return `Avantage compétitif très faible (${score}/100). Stratégie recommandée: Réorientation stratégique ou sortie du marché`;
        }
    }

    formatRecommendations(results) {
        const recommendations = [];
        const { strategicRecommendations, summary } = results;

        // Ajouter la recommandation principale
        recommendations.push({
            type: 'competitive',
            priority: 'high',
            action: summary.recommendation,
            category: 'overall'
        });

        // Ajouter les recommandations stratégiques
        strategicRecommendations.forEach(rec => {
            recommendations.push({
                type: 'competitive',
                priority: rec.priority,
                action: rec.action,
                category: rec.type
            });
        });

        // Ajouter des recommandations basées sur les avantages/désavantages
        results.competitiveAdvantage.advantages.forEach(adv => {
            recommendations.push({
                type: 'competitive',
                priority: 'medium',
                action: `Maintenir et renforcer: ${adv}`,
                category: 'advantage'
            });
        });

        results.competitiveAdvantage.disadvantages.forEach(dis => {
            recommendations.push({
                type: 'competitive',
                priority: 'high',
                action: `Corriger: ${dis}`,
                category: 'disadvantage'
            });
        });

        return recommendations;
    }

    calculateAnalysisScore(results) {
        return Math.round(results.competitiveAdvantage.score);
    }

    calculateConfidence(results) {
        // Confiance basée sur la complétude des données
        let confidence = 70;
        if (results.marketShare.assessment && results.marketShare.assessment.length > 50) confidence += 5;
        if (results.competitivePosition.assessment && results.competitivePosition.assessment.length > 50) confidence += 5;
        if (results.competitorBenchmark.assessment && results.competitorBenchmark.assessment.length > 50) confidence += 5;
        if (results.costStructure.assessment && results.costStructure.assessment.length > 50) confidence += 5;
        if (results.differentiation.assessment && results.differentiation.assessment.length > 50) confidence += 5;
        if (results.strategicGroups.assessment && results.strategicGroups.assessment.length > 50) confidence += 5;
        return Math.min(100, confidence);
    }
}

// =============================================================================
// SYSTÈME DE GESTION DES ANALYSES
// =============================================================================

class AnalysisManager {
    static analysisTypes = {
        swot: SWOTAnalysis,
        porter: PorterFiveForcesAnalysis,
        pestel: PESTELAnalysis,
        competitive: CompetitiveAnalysis
    };

    static analysisCosts = {
        swot: { free: 5, pro: 5, enterprise: 5 },
        porter: { free: 20, pro: 20, enterprise: 20 },
        pestel: { free: 15, pro: 15, enterprise: 15 },
        competitive: { free: 20, pro: 20, enterprise: 20 }
    };

    static async runAnalysis(type, name, description, companyData, plan = 'free') {
        // Vérifier le coût
        const cost = this.analysisCosts[type]?.[plan] || this.analysisCosts[type]?.free;
        if (!cost) {
            throw new Error(`Type d'analyse inconnu: ${type}`);
        }

        // Vérifier que l'utilisateur a assez de tokens
        const availableTokens = TokenManager.availableTokens || 0;
        if (availableTokens < cost) {
            throw new Error(`Pas assez de tokens. Nécessaire: ${cost}, Disponible: ${availableTokens}`);
        }

        // Créer et exécuter l'analyse
        const AnalysisClass = this.analysisTypes[type];
        if (!AnalysisClass) {
            throw new Error(`Type d'analyse non supporté: ${type}`);
        }

        const analysis = new AnalysisClass(name, description, companyData);
        const result = await analysis.execute();

        // Sauvegarder l'analyse dans Firestore
        const user = authService.currentUser;
        if (user) {
            await db.collection('users').doc(user.uid).collection('analyses').add({
                ...result.toJSON(),
                cost: cost,
                createdAt: new Date().toISOString(),
                userId: user.uid
            });

            // Mettre à jour les tokens
            await TokenManager.useTokens(cost, type);

            // Mettre à jour les stats utilisateur
            const FieldValue = (window.firebaseDB || firebase.firestore()).FieldValue;
            await db.collection('users').doc(user.uid).update({
                'loyaltyInfo.totalAnalyses': FieldValue.increment(1),
                'loyaltyInfo.monthlyAnalyses': FieldValue.increment(1)
            });
        }

        return result;
    }

    static getCost(type, plan = 'free') {
        return this.analysisCosts[type]?.[plan] || this.analysisCosts[type]?.free || 0;
    }

    static getAnalysisTypes() {
        return Object.keys(this.analysisTypes);
    }

    static getAnalysisInfo(type) {
        const infos = {
            swot: {
                name: 'Analyse SWOT',
                description: 'Analyse des Forces, Faiblesses, Opportunités et Menaces',
                category: 'Stratégique',
                minTokens: 3,
                maxTokens: 30,
                avgTokens: 10
            },
            porter: {
                name: 'Porter 5 Forces',
                description: 'Analyse des cinq forces concurrentielles de Porter',
                category: 'Concurrence',
                minTokens: 5,
                maxTokens: 120,
                avgTokens: 20
            },
            pestel: {
                name: 'Analyse PESTEL',
                description: 'Analyse de l\'environnement Politique, Économique, Social, Technologique, Écologique et Légal',
                category: 'Environnement',
                minTokens: 4,
                maxTokens: 75,
                avgTokens: 15
            },
            competitive: {
                name: 'Analyse Concurrentielle',
                description: 'Analyse détaillée de la position concurrentielle',
                category: 'Concurrence',
                minTokens: 6,
                maxTokens: 160,
                avgTokens: 20
            }
        };
        return infos[type] || { name: type, description: '', category: 'Inconnu' };
    }

    static generateMockCompanyData() {
        return {
            name: 'Entreprise Exemple',
            industry: 'Technologie',
            revenue: 50000000,
            employees: 250,
            marketShare: 0.15,
            quality: 8,
            price: 0.95,
            innovation: 7,
            customerService: 8,
            brandStrength: 7,
            distribution: 7,
            fixedCosts: 0.45,
            variableCosts: 0.55,
            productDifferentiation: 'high',
            serviceDifferentiation: 'medium',
            brandDifferentiation: 'high',
            strategy: 'differentiation',
            geographicCoverage: 'regional',
            innovationLevel: 7,
            competitorCount: 8,
            competitors: [
                { name: 'Concurrent A', marketShare: 0.25, qualityIndex: 7, priceIndex: 1.0, featureScore: 6, innovationScore: 5 },
                { name: 'Concurrent B', marketShare: 0.20, qualityIndex: 8, priceIndex: 1.1, featureScore: 7, innovationScore: 6 },
                { name: 'Concurrent C', marketShare: 0.15, qualityIndex: 6, priceIndex: 0.9, featureScore: 5, innovationScore: 4 }
            ],
            supplierConcentration: 0.3,
            supplierSwitchingCosts: 'medium',
            supplierUniqueness: 'low',
            supplierForwardIntegration: 'low',
            buyerConcentration: 0.2,
            buyerVolume: 'large',
            buyerSwitchingCosts: 'low',
            buyerInformation: 'high',
            buyerPriceSensitivity: 'high',
            economiesOfScale: 'high',
            capitalRequirements: 'high',
            brandLoyalty: 'high',
            entrySwitchingCosts: 'medium',
            accessToDistribution: 'medium',
            regulatoryBarriers: 'medium',
            proprietaryTechnology: 'low',
            substituteAvailability: 'medium',
            substitutePricePerformance: 'better',
            substituteSwitchingCosts: 'low',
            buyerPropensityToSubstitute: 'medium',
            industryGrowth: 'medium',
            industryFixedCosts: 'high',
            industryStorageCosts: 'medium',
            productDifferentiationIndustry: 'medium',
            exitBarriers: 'medium',
            strategicStakes: 'high',
            governmentStability: 'stable',
            taxationPolicy: 'moderate',
            tradeRegulations: 'favorable',
            foreignInvestmentPolicy: 'open',
            subsidies: 'none',
            politicalRisks: 'low',
            gdpGrowth: 2.5,
            inflationRate: 2.0,
            interestRates: 'moderate',
            unemploymentRate: 5.0,
            exchangeRates: 'stable',
            disposableIncome: 'increasing',
            consumerSpending: 'growing',
            populationGrowth: 'moderate',
            ageDistribution: 'balanced',
            educationLevel: 'high',
            culturalTrends: 'favorable',
            lifestyleChanges: 'moderate',
            healthAwareness: 'increasing',
            workLifeBalance: 'improving',
            rndInvestment: 'high',
            technologicalAdoption: 'fast',
            digitalTransformation: 'advanced',
            automation: 'increasing',
            aiAdoption: 'growing',
            technologicalDisruption: 'moderate',
            ipProtection: 'strong',
            climateChangeImpact: 'moderate',
            sustainabilityTrends: 'growing',
            carbonFootprint: 'reducing',
            greenEnergyAdoption: 'increasing',
            wasteManagement: 'improving',
            waterScarcity: 'concerning',
            naturalResourceAvailability: 'stable',
            laborLaws: 'balanced',
            consumerProtection: 'strong',
            environmentalRegulations: 'strict',
            dataProtection: 'strong',
            industryRegulations: 'moderate',
            intellectualProperty: 'protected',
            taxCompliance: 'complex',
            healthAndSafety: 'strict'
        };
    }
}

// =============================================================================
// FONCTIONS GLOBALES
// =============================================================================

// Exécuter une analyse
async function executeAnalysis(type, name, description, companyData) {
    try {
        const user = authService.currentUser;
        if (!user) {
            throw new Error('Vous devez être connecté pour effectuer une analyse');
        }

        const plan = authService.userData?.plan || 'free';
        const result = await AnalysisManager.runAnalysis(type, name, description, companyData, plan);
        
        return { success: true, result };
    } catch (error) {
        console.error('Erreur lors de l\'exécution de l\'analyse:', error);
        return { success: false, error: error.message };
    }
}

// Générer des résultats mock pour la compatibilité avec l'existant
function generateMockResults(type) {
    const mockResults = {
        swot: {
            strengths: ['Forte notoriété de la marque', 'Équipe expérimentée', 'Technologie avancée', 'Position financière solide'],
            weaknesses: ['Dépendance à un client principal', 'Coûts opérationnels élevés', 'Manque de diversification'],
            opportunities: ['Nouveaux marchés en expansion', 'Partenariats stratégiques', 'Technologies émergentes'],
            threats: ['Concurrence accrue', 'Changements réglementaires', 'Fluctuations économiques'],
            strategicInsights: {
                SO: ['Exploiter la forte notoriété pour pénétrer de nouveaux marchés'],
                ST: ['Utiliser la technologie avancée pour contrer la concurrence'],
                WO: ['Réduire la dépendance client pour profiter des partenariats'],
                WT: ['Diversifier les revenus pour limiter l\'impact des fluctuations économiques']
            }
        },
        porter: {
            supplierPower: { score: 65, level: 'Élevé', assessment: 'Pouvoir des fournisseurs élevé avec concentration modérée' },
            buyerPower: { score: 70, level: 'Élevé', assessment: 'Pouvoir des acheteurs élevé avec sensibilité au prix' },
            newEntrants: { score: 45, level: 'Moyenne', assessment: 'Menace modérée des nouveaux entrants' },
            substitutes: { score: 55, level: 'Moyenne', assessment: 'Menace modérée des substituts' },
            rivalry: { score: 75, level: 'Intense', assessment: 'Rivalité concurrentielle intense' },
            industryAttractiveness: { score: 55, level: 'Moyennement attractive' }
        },
        pestel: {
            political: { score: 70, level: 'Favorable', impact: 'positive', assessment: 'Environnement politique stable' },
            economic: { score: 65, level: 'Favorable', impact: 'positive', assessment: 'Croissance économique modérée' },
            social: { score: 75, level: 'Favorable', impact: 'positive', assessment: 'Tendances sociales favorables' },
            technological: { score: 80, level: 'Très favorable', impact: 'positive', assessment: 'Environnement technologique très favorable' },
            environmental: { score: 60, level: 'Neutre', impact: 'neutral', assessment: 'Pression environnementale modérée' },
            legal: { score: 55, level: 'Neutre', impact: 'neutral', assessment: 'Cadre légal standard' }
        },
        competitive: {
            marketShare: { companyMarketShare: 0.15, assessment: 'Part de marché de 15%' },
            competitivePosition: { position: 'strong', assessment: 'Position compétitive forte' },
            competitorBenchmark: {
                priceComparison: 'average',
                qualityComparison: 'above_average',
                featureComparison: 'average',
                assessment: 'Qualité supérieure à la moyenne'
            },
            competitiveAdvantage: { score: 70, level: 'Fort' }
        }
    };

    return mockResults[type] || {};
}

// Rendre les fonctions disponibles globalement
window.AnalysisManager = AnalysisManager;
window.executeAnalysis = executeAnalysis;
window.generateMockResults = generateMockResults;