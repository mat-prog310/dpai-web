// =============================================================================
// create-payment-links.js - Génère des Payment Links Stripe automatiquement
// Solution ULTRA-SIMPLE : pas besoin de Firebase Functions, pas de client-only
// =============================================================================

const stripe = require('stripe');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// =============================================================================
// TES PRODUITS AVEC LES PRICE IDs EXISTANTS
// =============================================================================

const ITEMS = [
  // ========== PACKS DE TOKENS ==========
  {
    id: 'discovery',
    name: 'Pack Découverte - 100 tokens',
    priceId: 'price_1UHRYnKEd7fefQpswxf0RVbw',
    type: 'token_pack',
    tokenAmount: 100
  },
  {
    id: 'boost',
    name: 'Pack Boost - 300 tokens',
    priceId: 'price_1UHRYoKEd7fefQpsCObyL9QI',
    type: 'token_pack',
    tokenAmount: 300
  },
  {
    id: 'expert',
    name: 'Pack Expert - 600 tokens',
    priceId: 'price_1UHRYoKEd7fefQpsfBGpZwj9',
    type: 'token_pack',
    tokenAmount: 600
  },
  {
    id: 'unique_report',
    name: 'Rapport unique - 250 tokens',
    priceId: 'price_1UHRYpKEd7fefQpsK7QypRsm',
    type: 'token_pack',
    tokenAmount: 250
  },
  
  // ========== ABONNEMENTS ==========
  {
    id: 'pro_monthly',
    name: 'Abonnement Pro - Mensuel',
    priceId: 'price_1UHRbdKEd7fefQpsBl8qSJgF',
    type: 'subscription',
    planId: 'pro',
    isAnnual: false
  },
  {
    id: 'pro_annual',
    name: 'Abonnement Pro - Annuel',
    priceId: 'price_1UHRbeKEd7fefQpsDwenwZFc',
    type: 'subscription',
    planId: 'pro',
    isAnnual: true
  },
  {
    id: 'enterprise_monthly',
    name: 'Abonnement Enterprise - Mensuel',
    priceId: 'price_1UHRbfKEd7fefQpsTIdk1WEV',
    type: 'subscription',
    planId: 'enterprise',
    isAnnual: false
  },
  {
    id: 'enterprise_annual',
    name: 'Abonnement Enterprise - Annuel',
    priceId: 'price_1UHRbfKEd7fefQpsGOWXqN6F',
    type: 'subscription',
    planId: 'enterprise',
    isAnnual: true
  }
];

// =============================================================================
// SCRIPT PRINCIPAL
// =============================================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║     DPAI - Générateur de Payment Links Stripe                       ║');
console.log('║     Solution ULTRA-SIMPLE (contourne client-only)                 ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

rl.question('🔑 Entrez votre clé secrète Stripe (sk_test_... ou sk_live_...) : ', async (secretKey) => {
  rl.close();

  if (!secretKey || !secretKey.startsWith('sk_')) {
    console.error('❌ Clé invalide. Doit commencer par "sk_test_" ou "sk_live_"');
    process.exit(1);
  }

  try {
    const stripeClient = stripe(secretKey);
    
    console.log('\n🔧 Création des Payment Links...\n');
    console.log('─'.repeat(70));

    const results = [];

    for (const item of ITEMS) {
      try {
        // Vérifier si le Payment Link existe déjà pour ce Price ID
        const existingLinks = await stripeClient.paymentLinks.list({ limit: 100 });
        const existing = existingLinks.data.find(link =>
          link.line_items?.data?.[0]?.price?.id === item.priceId
        );
        
        const paymentLink = existing || await stripeClient.paymentLinks.create({
          line_items: [{ price: item.priceId, quantity: 1 }],
          payment_method_types: ['card'],
          metadata: {
            itemId: item.id,
            type: item.type,
            planId: item.planId,
            isAnnual: String(item.isAnnual || false),
            tokenAmount: String(item.tokenAmount || 0)
          }
        });

        results.push({
          id: item.id,
          type: item.type,
          planId: item.planId,
          isAnnual: item.isAnnual,
          url: paymentLink.url,
          priceId: item.priceId
        });

        console.log(`✅ ${item.name}`);
        console.log(`   🔗 ${paymentLink.url}`);
        console.log('─'.repeat(70));

      } catch (error) {
        console.error(`❌ ${item.name}:`, error.message);
      }
    }

    // =======================================================================
    // GÉNÉRER LE FICHIER DE CONFIGURATION
    // =======================================================================
    
    console.log('\n' + '═'.repeat(70));
    console.log('✅ PAYMENT LINKS GÉNÉRÉS');
    console.log('═'.repeat(70));
    
    // Créer la configuration pour stripe-service.js
    const paymentLinksConfig = {};
    results.forEach(r => {
      if (r.type === 'token_pack') {
        paymentLinksConfig[`${r.id}_link`] = r.url;
      } else {
        paymentLinksConfig[`${r.planId}_${r.isAnnual ? 'annual' : 'monthly'}_link`] = r.url;
      }
    });
    
    const configCode = `
// =============================================================================
// payment-links-config.js - À inclure dans ton HTML AVANT stripe-service.js
// =============================================================================

const PAYMENT_LINKS = ${JSON.stringify(paymentLinksConfig, null, 2)};

// Rendre disponible globalement
window.PAYMENT_LINKS = PAYMENT_LINKS;
`;
    
    // Sauvegarder le fichier
    const configPath = path.join(__dirname, 'payment-links-config.js');
    fs.writeFileSync(configPath, configCode);
    
    // Afficher les résultats
    console.log('\n📄 Fichier généré: payment-links-config.js');
    console.log('   → À inclure dans ton HTML avec: <script src="payment-links-config.js"></script>');
    
    console.log('\n📋 TOUTES LES URLs:');
    console.log('─'.repeat(70));
    
    const tokenPacks = results.filter(r => r.type === 'token_pack');
    const subscriptions = results.filter(r => r.type === 'subscription');
    
    console.log('\n📦 PACKS DE TOKENS:');
    tokenPacks.forEach(r => {
      console.log(`   ${r.id.toUpperCase()}: ${r.url}`);
    });
    
    console.log('\n📋 ABONNEMENTS:');
    subscriptions.forEach(r => {
      const type = r.isAnnual ? 'Annuel' : 'Mensuel';
      console.log(`   ${r.planId.toUpperCase()} ${type}: ${r.url}`);
    });

    console.log('\n✨ Fini ! Tes Payment Links sont prêts à être utilisés.');
    console.log('\n💡 Prochaine étape:');
    console.log('   1. Ajoute <script src="payment-links-config.js"></script> dans ton HTML');
    console.log('   2. Modifie stripe-service.js (voir instructions ci-dessous)');

  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  }
});
