// =============================================================================
// create-test-payment-links.js - Crée TOUT automatiquement dans Stripe TEST
// Crée les Produits, Prix, et Payment Links si ils n'existent pas
// =============================================================================

const stripe = require('stripe');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURATION DES PRODUITS ET PRIX (en euros)
// =============================================================================

const PRODUCTS = [
  // ========== PACKS DE TOKENS (paiement unique) ==========
  {
    id: 'discovery',
    name: 'Pack Découverte - 100 tokens',
    description: '100 tokens pour tester la plateforme DPAI',
    type: 'token_pack',
    tokenAmount: 100,
    priceEuros: 10.00,
    isRecurring: false
  },
  {
    id: 'boost',
    name: 'Pack Boost - 300 tokens',
    description: '300 tokens pour une utilisation régulière',
    type: 'token_pack',
    tokenAmount: 300,
    priceEuros: 25.00,
    isRecurring: false
  },
  {
    id: 'expert',
    name: 'Pack Expert - 600 tokens',
    description: '600 tokens pour les utilisateurs intensifs',
    type: 'token_pack',
    tokenAmount: 600,
    priceEuros: 45.00,
    isRecurring: false
  },
  {
    id: 'unique_report',
    name: 'Rapport unique - 250 tokens',
    description: '250 tokens pour un rapport unique',
    type: 'token_pack',
    tokenAmount: 250,
    priceEuros: 20.00,
    isRecurring: false
  },
  // ========== ABONNEMENTS ==========
  {
    id: 'pro_monthly',
    name: 'Abonnement Pro - Mensuel',
    description: 'Abonnement mensuel Pro avec 500 tokens/mois',
    type: 'subscription',
    planId: 'pro',
    isAnnual: false,
    priceEuros: 50.00,
    isRecurring: true,
    interval: 'month'
  },
  {
    id: 'pro_annual',
    name: 'Abonnement Pro - Annuel',
    description: 'Abonnement annuel Pro avec 500 tokens/mois + 2 mois offerts',
    type: 'subscription',
    planId: 'pro',
    isAnnual: true,
    priceEuros: 500.00,
    isRecurring: true,
    interval: 'year'
  },
  {
    id: 'enterprise_monthly',
    name: 'Abonnement Enterprise - Mensuel',
    description: 'Abonnement mensuel Enterprise avec 5000 tokens/mois',
    type: 'subscription',
    planId: 'enterprise',
    isAnnual: false,
    priceEuros: 300.00,
    isRecurring: true,
    interval: 'month'
  },
  {
    id: 'enterprise_annual',
    name: 'Abonnement Enterprise - Annuel',
    description: 'Abonnement annuel Enterprise avec 5000 tokens/mois + 2 mois offerts',
    type: 'subscription',
    planId: 'enterprise',
    isAnnual: true,
    priceEuros: 3000.00,
    isRecurring: true,
    interval: 'year'
  }
];

// =============================================================================
// SCRIPT PRINCIPAL
// =============================================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║  DPAI - Création COMPLÈTE (Produits, Prix, Payment Links) en MODE TEST ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

rl.question('🔑 Entrez votre clé secrète Stripe TEST (sk_test_...) : ', async (secretKey) => {
  rl.close();

  if (!secretKey || !secretKey.startsWith('sk_test_')) {
    console.error('❌ Clé invalide. Elle DOIT commencer par "sk_test_" pour le mode TEST.');
    console.error('   Obtenez une clé TEST sur: https://dashboard.stripe.com/test/apikeys');
    process.exit(1);
  }

  try {
    const stripeClient = stripe(secretKey);
    
    console.log('\n🔧 Début de la création dans Stripe TEST...\n');
    console.log('─'.repeat(75));

    const results = [];
    const createdItems = [];

    // =========================================================================
    // CRÉER LES PRODUITS ET PRIX
    // =========================================================================
    for (const productConfig of PRODUCTS) {
      try {
        console.log(`\n📦 Traitement: ${productConfig.name}`);

        // Vérifier si le produit existe déjà
        let product;
        const existingProducts = await stripeClient.products.list({ limit: 100 });
        const existingProduct = existingProducts.data.find(p => 
          p.name === productConfig.name || p.metadata?.itemId === productConfig.id
        );

        if (existingProduct) {
          product = existingProduct;
          console.log(`   ✅ Produit existant trouvé: ${product.id}`);
        } else {
          // Créer le produit
          product = await stripeClient.products.create({
            name: productConfig.name,
            description: productConfig.description,
            metadata: {
              itemId: productConfig.id,
              type: productConfig.type,
              planId: productConfig.planId,
              tokenAmount: String(productConfig.tokenAmount || 0),
              isAnnual: String(productConfig.isAnnual || false)
            }
          });
          console.log(`   🆕 Produit créé: ${product.id}`);
        }

        // Vérifier si le prix existe déjà
        let price;
        const existingPrices = await stripeClient.prices.list({
          product: product.id,
          limit: 100
        });

        const priceAmount = Math.round(productConfig.priceEuros * 100); // Convertir en centimes

        const existingPrice = existingPrices.data.find(p => 
          p.unit_amount === priceAmount && 
          p.currency === 'eur' &&
          (!productConfig.isRecurring || p.recurring?.interval === productConfig.interval)
        );

        if (existingPrice) {
          price = existingPrice;
          console.log(`   ✅ Prix existant trouvé: ${price.id} (${priceAmount}€)`);
        } else {
          // Créer le prix
          const priceData = {
            product: product.id,
            unit_amount: priceAmount,
            currency: 'eur',
            metadata: {
              itemId: productConfig.id,
              type: productConfig.type,
              planId: productConfig.planId
            }
          };

          if (productConfig.isRecurring) {
            priceData.recurring = {
              interval: productConfig.interval
            };
          }

          price = await stripeClient.prices.create(priceData);
          console.log(`   🆕 Prix créé: ${price.id} (${priceAmount}€)`);
        }

        // Stocker pour créer le Payment Link
        createdItems.push({
          id: productConfig.id,
          name: productConfig.name,
          type: productConfig.type,
          planId: productConfig.planId,
          isAnnual: productConfig.isAnnual || false,
          tokenAmount: productConfig.tokenAmount || 0,
          priceId: price.id,
          productId: product.id
        });

      } catch (error) {
        console.error(`   ❌ Erreur: ${error.message}`);
      }
    }

    // =========================================================================
    // CRÉER LES PAYMENT LINKS
    // =========================================================================
    console.log('\n' + '═'.repeat(75));
    console.log('🔗 CRÉATION DES PAYMENT LINKS');
    console.log('═'.repeat(75));

    for (const item of createdItems) {
      try {
        console.log(`\n📎 Création Payment Link pour: ${item.name}`);

        // Vérifier si un Payment Link existe déjà pour ce prix
        const existingLinks = await stripeClient.paymentLinks.list({ limit: 100 });
        const existing = existingLinks.data.find(link =>
          link.line_items?.data?.[0]?.price?.id === item.priceId
        );

        let paymentLink;
        if (existing) {
          paymentLink = existing;
          console.log(`   ✅ Payment Link existant: ${paymentLink.url}`);
        } else {
          // Créer le Payment Link
          paymentLink = await stripeClient.paymentLinks.create({
            line_items: [{
              price: item.priceId,
              quantity: 1
            }],
            payment_method_types: ['card'],
            metadata: {
              itemId: item.id,
              type: item.type,
              planId: item.planId,
              isAnnual: String(item.isAnnual),
              tokenAmount: String(item.tokenAmount)
            }
          });
          console.log(`   🆕 Payment Link créé: ${paymentLink.url}`);
        }

        results.push({
          id: item.id,
          type: item.type,
          planId: item.planId,
          isAnnual: item.isAnnual,
          url: paymentLink.url,
          priceId: item.priceId,
          productId: item.productId
        });

      } catch (error) {
        console.error(`   ❌ Erreur: ${error.message}`);
      }
    }

    // =========================================================================
    // GÉNÉRER LE FICHIER DE CONFIGURATION
    // =========================================================================
    console.log('\n' + '═'.repeat(75));
    console.log('✅ TOUS LES ÉLÉMENTS CRÉÉS DANS STRIPE TEST');
    console.log('═'.repeat(75));

    const paymentLinksConfig = {};
    results.forEach(r => {
      if (r.type === 'token_pack') {
        paymentLinksConfig[`${r.id}_link`] = r.url;
      } else {
        paymentLinksConfig[`${r.planId}_${r.isAnnual ? 'annual' : 'monthly'}_link`] = r.url;
      }
    });

    const configCode = `// =============================================================================
// payment-links-config.js - Configuration TEST Stripe
// Généré automatiquement par create-test-payment-links.js
// =============================================================================

const PAYMENT_LINKS = ${JSON.stringify(paymentLinksConfig, null, 2)};

// Rendre disponible globalement
window.PAYMENT_LINKS = PAYMENT_LINKS;
`;

    const configPath = path.join(__dirname, 'js', 'payment-links-config.js');
    fs.writeFileSync(configPath, configCode);

    console.log(`\n📄 Fichier généré: js/payment-links-config.js`);
    console.log('   → Ce fichier contient toutes les URLs des Payment Links TEST\n');

    // =========================================================================
    // AFFICHER LES RÉSULTATS
    // =========================================================================
    console.log('📋 RÉCAPITULATIF:');
    console.log('─'.repeat(75));

    const tokenPacks = results.filter(r => r.type === 'token_pack');
    const subscriptions = results.filter(r => r.type === 'subscription');

    if (tokenPacks.length > 0) {
      console.log('\n📦 PACKS DE TOKENS:');
      tokenPacks.forEach(r => {
        console.log(`   ${r.id.toUpperCase()}: ${r.url}`);
      });
    }

    if (subscriptions.length > 0) {
      console.log('\n📋 ABONNEMENTS:');
      subscriptions.forEach(r => {
        const type = r.isAnnual ? 'Annuel' : 'Mensuel';
        console.log(`   ${r.planId.toUpperCase()} ${type}: ${r.url}`);
      });
    }

    // =========================================================================
    // INSTRUCTIONS POUR L'UTILISATEUR
    // =========================================================================
    console.log('\n' + '═'.repeat(75));
    console.log('📝 PROCHAINES ÉTAPES:');
    console.log('═'.repeat(75));
    console.log('\n1️⃣  Dans stripe-service.js, REMPLACE le contenu de PAYMENT_LINKS par:');
    console.log('   ' + '-'.repeat(71));
    console.log(`   const PAYMENT_LINKS = ${JSON.stringify(paymentLinksConfig, null, 2).split('\n').join('\n   ')};`);
    console.log('   ' + '-'.repeat(71));

    console.log('\n2️⃣  OU, ajoute cette ligne dans le <head> de tes HTML:');
    console.log('   <script src="js/payment-links-config.js"></script>');

    console.log('\n3️⃣  Teste avec une carte de test:');
    console.log('   Numéro: 4242 4242 4242 4242');
    console.log('   Date: 12/30');
    console.log('   CVC: 123');

    console.log('\n4️⃣  Vérifie dans ton Dashboard Stripe TEST:');
    console.log('   https://dashboard.stripe.com/test/products');
    console.log('   https://dashboard.stripe.com/test/payment-links');

    console.log('\n✨ Tout est prêt ! Tes Payment Links TEST sont fonctionnels.\n');

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error.message);
    console.error('\nVérifie que:');
    console.error('  1. Ta clé secrète commence bien par "sk_test_"');
    console.error('  2. Tu as une connexion internet');
    console.error('  3. Ton compte Stripe n\'est pas bloqué');
    process.exit(1);
  }
});
