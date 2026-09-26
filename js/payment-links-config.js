// =============================================================================
// payment-links-config.js - Configuration Stripe (TEST ou PRODUCTION)
// https://dashboard.stripe.com/payment-links (pour PRODUCTION)
// https://dashboard.stripe.com/test/payment-links (pour TEST)
// =============================================================================

(function() {
  'use strict';

  // Configuration PRODUCTION (live)
  const PAYMENT_LINKS_PROD = {
    // Packs de tokens
    "discovery_link":     "https://buy.stripe.com/cNi00k2zia4H8cD0FncV200",
    "boost_link":         "https://buy.stripe.com/9B63cw5Lua4HdwX2NvcV201",
    "expert_link":        "https://buy.stripe.com/eVq4gA4Hq1yb78zafXcV202",
    "unique_report_link": "https://buy.stripe.com/3cIaEYgq86Sv8cD9bTcV203",

    // Abonnements
    "pro_monthly_link":        "https://buy.stripe.com/dRm14o2zidgT0Kb1JrcV204",
    "pro_annual_link":         "https://buy.stripe.com/28EdRa0ra3Gj64v5ZHcV205",
    "enterprise_monthly_link": "https://buy.stripe.com/00wcN67TC0u778z5ZHcV206",
    "enterprise_annual_link":  "https://buy.stripe.com/dRm00k8XG0u7csTbk1cV207"
  };

  // Configuration TEST - Remplacez ces liens par ceux créés dans votre dashboard Stripe TEST
  // https://dashboard.stripe.com/test/payment-links
  // ⚠️ IMPORTANT: Vous devez créer ces Payment Links dans le mode TEST de Stripe
  // Utilisez des cartes de test comme: 4242 4242 4242 4242
  const PAYMENT_LINKS_TEST = {
    // Packs de tokens - EXEMPLES, à remplacer par vos vrais liens TEST
    "discovery_link":     "https://buy.stripe.com/test_8x2bIU9EQfLg4g13tg0gw01",
    "boost_link":         "https://buy.stripe.com/test_9B68wIg3edD89Ald3Q0gw03",
    "expert_link":        "https://buy.stripe.com/test_4gM7sE5oAbv0cMxe7U0gw00",
    "unique_report_link": "https://buy.stripe.com/test_5kQ00ceZa42ydQBd3Q0gw02",

    // Abonnements - EXEMPLES, à remplacer par vos vrais liens TEST
    "pro_monthly_link":        "https://buy.stripe.com/test_3cI14g3gs56C7sdgg20gw06",
    "pro_annual_link":         "https://buy.stripe.com/test_6oU14g4kw6aG6o98NA0gw04",
    "enterprise_monthly_link": "https://buy.stripe.com/test_4gM5kw4kw0Qm13PfbY0gw07",
    "enterprise_annual_link":  "https://buy.stripe.com/test_aFacMYcR22Yu8wh4xk0gw05"
  };

  // Détection automatique du mode en fonction de la clé publique Stripe
  const publishableKey = window.stripePublishableKey || '';
  const isTestMode = publishableKey.startsWith('pk_test_');

  // Sélection de la configuration
  const PAYMENT_LINKS = isTestMode ? PAYMENT_LINKS_TEST : PAYMENT_LINKS_PROD;

  // Exposition globale (protégée contre écrasement)
  window.PAYMENT_LINKS = window.PAYMENT_LINKS || PAYMENT_LINKS;

  // Alias pour compatibilité avec le reste du code (sans _link)
  // Permet à stripe-service.js d'utiliser PAYMENT_LINKS[packId] OU PAYMENT_LINKS[packId + '_link']
  window.PAYMENT_LINKS.discovery     = window.PAYMENT_LINKS.discovery_link;
  window.PAYMENT_LINKS.boost         = window.PAYMENT_LINKS.boost_link;
  window.PAYMENT_LINKS.expert        = window.PAYMENT_LINKS.expert_link;
  window.PAYMENT_LINKS.unique_report = window.PAYMENT_LINKS.unique_report_link;
  window.PAYMENT_LINKS.pro_monthly        = window.PAYMENT_LINKS.pro_monthly_link;
  window.PAYMENT_LINKS.pro_annual         = window.PAYMENT_LINKS.pro_annual_link;
  window.PAYMENT_LINKS.enterprise_monthly = window.PAYMENT_LINKS.enterprise_monthly_link;
  window.PAYMENT_LINKS.enterprise_annual  = window.PAYMENT_LINKS.enterprise_annual_link;

  console.log('%c💳 [payment-links-config.js] PAYMENT_LINKS chargé - Mode: ' + (isTestMode ? 'TEST 🧪' : 'PRODUCTION ✅'), 'color: ' + (isTestMode ? '#28a745' : '#dc3545') + '; font-weight: bold;', {
    mode: isTestMode ? 'TEST' : 'PRODUCTION',
    packs: ['discovery', 'boost', 'expert', 'unique_report'],
    abonnements: ['pro_monthly', 'pro_annual', 'enterprise_monthly', 'enterprise_annual']
  });
})();
