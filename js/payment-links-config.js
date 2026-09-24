// =============================================================================
// payment-links-config.js - Configuration LIVE Stripe (PRODUCTION)
// https://dashboard.stripe.com/payment-links
// =============================================================================

(function() {
  'use strict';

  const PAYMENT_LINKS = {
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

  console.log('%c💳 [payment-links-config.js] PAYMENT_LINKS chargé', 'color: #6772e5; font-weight: bold;', {
    packs: ['discovery', 'boost', 'expert', 'unique_report'],
    abonnements: ['pro_monthly', 'pro_annual', 'enterprise_monthly', 'enterprise_annual']
  });
})();
