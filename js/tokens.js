// =============================================================================
// TOKENS.JS - Système de gestion des tokens
// =============================================================================

// Configuration des plans (reprenant les données de l'appli Flutter)
const TokenConfig = {
  baseTokenLimits: {
    free: 50,
    pro: 500,
    enterprise: 5000
  },
  
  tokenBonuses: {
    free: 0.0,
    pro: 0.20,
    enterprise: 0.30
  },
  
  planPrices: {
    free: 0.0,
    pro: 50.0,
    enterprise: 300.0
  },
  
  welcomeBonus: 10,
  firstAnalysisBonus: 5,
  
  referralBonusSponsor: 20,
  referralBonusReferral: 10,
  
  loyaltyBonusPerAnalysis: 1,
  maxMonthlyLoyaltyBonus: {
    free: 10,
    pro: 50,
    enterprise: 100
  },
  
  companyDiscountRate: 0.20,
  lowTokenThreshold: 0.20,
  tokenResetDays: 30
};

// Coûts des analyses par type et par plan (même structure que AnalysisManager.analysisCosts)
const AnalysisCosts = {
  swot: { free: 5, pro: 5, enterprise: 5 },
  porter: { free: 20, pro: 20, enterprise: 20 },
  pestel: { free: 15, pro: 15, enterprise: 15 },
  competitive: { free: 20, pro: 20, enterprise: 20 },
  basic: { free: 5, pro: 2, enterprise: 1 },
  advanced: { free: 10, pro: 4, enterprise: 1 },
  detailed_report: { free: 10, pro: 5, enterprise: 2 },
  synergy: { free: 20, pro: 10, enterprise: 5 },
  modeling: { free: 20, pro: 10, enterprise: 5 },
  benchmark: { free: 20, pro: 10, enterprise: 5 }
};

// Packs de tokens disponibles
const TokenPacks = [
  {
    id: 'discovery',
    name: 'Découverte',
    tokenAmount: 100,
    priceEuros: 12.00,
    pricePerToken: 0.12,
    targetAudience: 'Utilisateur gratuit qui a épuisé son quota mensuel',
    description: 'Parfait pour commencer avec des analyses supplémentaires',
    stripePriceId: 'price_discovery_100',
    isBestValue: false
  },
  {
    id: 'boost',
    name: 'Boost',
    tokenAmount: 300,
    priceEuros: 30.00,
    pricePerToken: 0.10,
    targetAudience: 'Utilisateur Pro qui veut faire une analyse lourde (Porter, Concurrentiel)',
    description: 'Idéal pour les analyses avancées comme Porter 5 Forces',
    stripePriceId: 'price_boost_300',
    isBestValue: false
  },
  {
    id: 'expert',
    name: 'Expert',
    tokenAmount: 600,
    priceEuros: 55.00,
    pricePerToken: 0.092,
    targetAudience: 'Utilisateur Pro qui hésite à s\'abonner',
    description: 'Alternative sans engagement pour les utilisateurs Pro',
    stripePriceId: 'price_expert_600',
    isBestValue: true
  },
  {
    id: 'unique_report',
    name: 'Rapport unique',
    tokenAmount: 250,
    priceEuros: 25.00,
    pricePerToken: 0.10,
    targetAudience: 'Utilisateur Pro qui veut débloquer le Rapport détaillé',
    description: 'Pour débloquer un rapport détaillé avec recommandations',
    stripePriceId: 'price_report_250',
    isBestValue: false
  }
];

// Système de fidélité
class LoyaltySystem {
  static create(userId) {
    return {
      userId: userId,
      totalAnalyses: 0,
      monthlyAnalyses: 0,
      monthlyLoyaltyTokens: 0,
      lastAnalysisDate: null,
      lastMonthlyReset: new Date().toISOString()
    };
  }

  static addAnalysis(loyaltyInfo) {
    const newInfo = { ...loyaltyInfo };
    newInfo.totalAnalyses++;
    newInfo.monthlyAnalyses++;
    
    // Ajouter bonus de fidélité
    const bonus = TokenConfig.loyaltyBonusPerAnalysis;
    newInfo.monthlyLoyaltyTokens = Math.min(
      newInfo.monthlyLoyaltyTokens + bonus,
      TokenConfig.maxMonthlyLoyaltyBonus[loyaltyInfo.plan || 'free']
    );
    
    newInfo.lastAnalysisDate = new Date().toISOString();
    return newInfo;
  }

  static resetMonthly(loyaltyInfo) {
    return {
      ...loyaltyInfo,
      monthlyAnalyses: 0,
      monthlyLoyaltyTokens: 0,
      lastMonthlyReset: new Date().toISOString()
    };
  }
}

// Système de parrainage
class ReferralSystem {
  static createReferralInfo(referralCode, sponsorId, sponsorName, sponsorEmail) {
    return {
      referralCode: referralCode,
      sponsorId: sponsorId,
      sponsorName: sponsorName,
      sponsorEmail: sponsorEmail,
      status: 'pending',
      createdAt: new Date().toISOString(),
      validatedAt: null,
      rewardedAt: null
    };
  }

  static generateReferralCode(name) {
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${cleanName}-${randomSuffix}`;
  }
}

// Gestionnaire principal des tokens
class TokenManager {
  static init(userData) {
    this.userData = userData;
    this.tokenState = userData.tokenState || this.createTokenState(userData.id, userData.plan);
    this.loyaltyInfo = userData.loyaltyInfo || LoyaltySystem.create(userData.id);
    this.referralInfo = userData.referralInfo;
    this.hasCompanyDiscount = userData.hasCompanyDiscount || false;
  }

  static createTokenState(userId, plan) {
    const baseTokens = TokenConfig.baseTokenLimits[plan] || TokenConfig.baseTokenLimits.free;
    const bonusTokens = Math.floor(baseTokens * (TokenConfig.tokenBonuses[plan] || 0));
    
    return {
      userId: userId,
      plan: plan,
      baseTokens: baseTokens,
      bonusTokens: bonusTokens,
      totalTokens: baseTokens + bonusTokens + TokenConfig.welcomeBonus,
      usedTokens: 0,
      availableTokens: baseTokens + bonusTokens + TokenConfig.welcomeBonus,
      lastTokenUpdate: new Date().toISOString(),
      firstAnalysisDone: false,
      monthlyTokensUsed: 0,
      lastMonthlyReset: new Date().toISOString()
    };
  }

  static get availableTokens() {
    return this.tokenState ? this.tokenState.availableTokens : 0;
  }

  static get tokenLimit() {
    return this.tokenState ? this.tokenState.baseTokens : 0;
  }

  static get tokenUsagePercentage() {
    if (!this.tokenState) return 0;
    return (this.tokenState.usedTokens / this.tokenState.totalTokens) * 100;
  }

  static async useTokens(amount, analysisType = 'basic') {
    if (this.availableTokens < amount) {
      throw new Error('Pas assez de tokens');
    }

    const newState = { ...this.tokenState };
    newState.usedTokens += amount;
    newState.availableTokens -= amount;
    newState.monthlyTokensUsed += amount;
    
    // Si c'est la première analyse, ajouter le bonus
    if (!newState.firstAnalysisDone) {
      newState.firstAnalysisDone = true;
      newState.availableTokens += TokenConfig.firstAnalysisBonus;
      newState.totalTokens += TokenConfig.firstAnalysisBonus;
    }

    // Mettre à jour la fidélité
    this.loyaltyInfo = LoyaltySystem.addAnalysis(this.loyaltyInfo);
    
    // Sauvegarder dans Firestore
    await db.collection('users').doc(this.userData.id).update({
      tokenState: newState,
      loyaltyInfo: this.loyaltyInfo
    });

    this.tokenState = newState;
    return true;
  }

  static async addTokens(amount, reason = 'achat') {
    const newState = { ...this.tokenState };
    newState.availableTokens += amount;
    newState.totalTokens += amount;
    
    // Sauvegarder dans Firestore
    await db.collection('users').doc(this.userData.id).update({
      tokenState: newState
    });

    this.tokenState = newState;
    return true;
  }

  static async resetMonthlyTokens() {
    const plan = this.userData.plan || 'free';
    const baseTokens = TokenConfig.baseTokenLimits[plan];
    const bonusTokens = Math.floor(baseTokens * (TokenConfig.tokenBonuses[plan] || 0));
    
    const newState = {
      ...this.tokenState,
      availableTokens: baseTokens + bonusTokens + (this.userData.isPremium ? TokenConfig.welcomeBonus : 0),
      usedTokens: 0,
      monthlyTokensUsed: 0,
      lastMonthlyReset: new Date().toISOString(),
      firstAnalysisDone: false
    };
    
    // Réinitialiser la fidélité mensuelle
    this.loyaltyInfo = LoyaltySystem.resetMonthly(this.loyaltyInfo);
    
    await db.collection('users').doc(this.userData.id).update({
      tokenState: newState,
      loyaltyInfo: this.loyaltyInfo
    });

    this.tokenState = newState;
  }

  static async changePlan(newPlan) {
    const newState = this.createTokenState(this.userData.id, newPlan);
    
    // Transférer les tokens non utilisés (optionnel)
    const unusedTokens = this.tokenState.totalTokens - this.tokenState.usedTokens;
    newState.availableTokens += Math.min(unusedTokens, newState.baseTokens);
    
    await db.collection('users').doc(this.userData.id).update({
      tokenState: newState,
      plan: newPlan
    });

    this.tokenState = newState;
  }

  static async applyReferralSponsorBonus() {
    if (!this.referralInfo || this.referralInfo.status !== 'validated') {
      return false;
    }

    const newState = { ...this.tokenState };
    newState.availableTokens += TokenConfig.referralBonusSponsor;
    newState.totalTokens += TokenConfig.referralBonusSponsor;
    
    await db.collection('users').doc(this.userData.id).update({
      tokenState: newState,
      'referralInfo.status': 'rewarded',
      'referralInfo.rewardedAt': new Date().toISOString()
    });

    this.tokenState = newState;
    this.referralInfo.status = 'rewarded';
    this.referralInfo.rewardedAt = new Date().toISOString();
    
    return true;
  }

  static getCost(analysisType, plan) {
    return AnalysisCosts[analysisType]?.[plan || 'free'] || AnalysisCosts.basic?.free || 0;
  }

  static canPerformAnalysis(analysisType, plan) {
    const cost = this.getCost(analysisType, plan);
    return this.availableTokens >= cost;
  }

  static clear() {
    this.userData = null;
    this.tokenState = null;
    this.loyaltyInfo = null;
    this.referralInfo = null;
  }
}

// Utilitaires
class TokenUtils {
  static extractDomain(email) {
    if (!email) return null;
    const parts = email.split('@');
    return parts.length > 1 ? parts[1] : null;
  }

  static isPremiumPlan(plan) {
    return ['pro', 'enterprise'].includes(plan);
  }

  static formatTokens(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount);
  }

  static formatPrice(price) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  }
}

// Charger les données utilisateur
async function loadUserTokenData(userId) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = { id: userId, ...userDoc.data() };
      TokenManager.init(userData);
      return userData;
    }
  } catch (error) {
    console.error('Erreur chargement données tokens:', error);
  }
  return null;
}

// Exposer les objets globalement
window.TokenConfig = TokenConfig;
window.TokenManager = TokenManager;
window.TokenUtils = TokenUtils;
