// =============================================================================
// payment-links-config.js - Configuration LIVE Stripe (PRODUCTION)
// https://dashboard.stripe.com/payment-links
// =============================================================================

const PAYMENT_LINKS = {
  "discovery_link": "https://buy.stripe.com/cNi00k2zia4H8cD0FncV200",
  "boost_link": "https://buy.stripe.com/9B63cw5Lua4HdwX2NvcV201",
  "expert_link": "https://buy.stripe.com/eVq4gA4Hq1yb78zafXcV202",
  "unique_report_link": "https://buy.stripe.com/3cIaEYgq86Sv8cD9bTcV203",
  "pro_monthly_link": "https://buy.stripe.com/dRm14o2zidgT0Kb1JrcV204",
  "pro_annual_link": "https://buy.stripe.com/28EdRa0ra3Gj64v5ZHcV205",
  "enterprise_monthly_link": "https://buy.stripe.com/00wcN67TC0u778z5ZHcV206",
  "enterprise_annual_link": "https://buy.stripe.com/dRm00k8XG0u7csTbk1cV207"
};

// Rendre disponible globalement
window.PAYMENT_LINKS = PAYMENT_LINKS;
