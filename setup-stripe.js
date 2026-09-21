// =============================================================================
// setup-stripe.js - Script pour créer Produits, Prix et Abonnements dans Stripe
// À exécuter UNE SEULE FOIS depuis le dossier dpai_web
// Gère à la fois les packs de tokens (one-time) et les abonnements (recurring)
// =============================================================================

const stripe = require('stripe');
const readline = require('readline');

// =============================================================================
// CONFIGURATION DE TES PACKS DE TOKENS (paiement unique)
// =============================================================================

const TOKEN_PACKS = [
  {
    productId: 'prod_discovery_100',
    name: 'Pack Découverte',
    description: '100 tokens pour DPAI - Parfait pour commencer',
    priceEuros: 12.00,
    tokenAmount: 100
  },
  {
    productId: 'prod_boost_300',
    name: 'Pack Boost',
    description: '300 tokens pour DPAI - Idéal pour les analyses avancées',
    priceEuros: 30.00,
    tokenAmount: 300
  },
  {
    productId: 'prod_expert_600',
    name: 'Pack Expert',
    description: '600 tokens pour DPAI - Alternative sans engagement',
    priceEuros: 55.00,
    tokenAmount: 600
  },
  {
    productId: 'prod_report_250',
    name: 'Rapport unique',
    description: '250 tokens pour DPAI - Pour débloquer un rapport détaillé',
    priceEuros: 25.00,
    tokenAmount: 250
  }
];

// =============================================================================
// CONFIGURATION DE TES ABONNEMENTS (recurring)
// =============================================================================

const SUBSCRIPTION_PLANS = [
  {
    id: 'pro',
    productId: 'prod_pro',
    name: 'Pro',
    description: 'Abonnement Pro - 500 tokens/mois, analyses illimitées, support prioritaire',
    monthlyPrice: 50.00,
    annualPrice: 500.00
  },
  {
    id: 'enterprise',
    productId: 'prod_enterprise',
    name: 'Enterprise',
    description: 'Abonnement Enterprise - 5000 tokens/mois, support 24/7, accès API',
    monthlyPrice: 300.00,
    annualPrice: 3000.00
  }
];

// =============================================================================
// FONCTION PRINCIPALE
// =============================================================================

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  DPAI - Création Produits, Prix et Abonnements Stripe             ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

rl.question('🔑 Entrez votre clé secrète Stripe (sk_test_... ou sk_live_...) : ', async (secretKey) => {
  rl.close();

  if (!secretKey || !secretKey.startsWith('sk_')) {
    console.error('❌ Clé Stripe invalide. Elle doit commencer par "sk_test_" ou "sk_live_"');
    process.exit(1);
  }

  try {
    const stripeClient = stripe(secretKey);
    
    console.log('\n🔧 Début de la création dans Stripe...\n');
    
    // ===========================================================================
    // 1. CRÉATION DES PACKS DE TOKENS (one-time payment)
    // ===========================================================================
    console.log('📦 CRÉATION DES PACKS DE TOKENS (paiement unique)');
    console.log('─'.repeat(70));

    const tokenResults = [];
    let tokenSuccessCount = 0;
    let tokenAlreadyExistsCount = 0;

    for (const pack of TOKEN_PACKS) {
      try {
        // Créer ou récupérer le produit
        let product;
        try {
          product = await stripeClient.products.retrieve(pack.productId);
          console.log(`ℹ️  Produit "${pack.name}" existe déjà: ${product.id}`);
          tokenAlreadyExistsCount++;
        } catch (error) {
          product = await stripeClient.products.create({
            id: pack.productId,
            name: pack.name,
            description: pack.description,
            metadata: {
              tokenAmount: pack.tokenAmount.toString(),
              type: 'token_pack'
            }
          });
          console.log(`✅ Produit créé: ${product.id} (${pack.name})`);
          tokenSuccessCount++;
        }

        // Créer ou récupérer le prix (one-time)
        let price;
        try {
          const prices = await stripeClient.prices.list({
            product: product.id,
            limit: 1
          });
          
          if (prices.data.length > 0) {
            price = prices.data[0];
            console.log(`ℹ️  Prix existe déjà: ${price.id} (${price.unit_amount / 100}€)`);
            tokenAlreadyExistsCount++;
          } else {
            throw new Error('No price found');
          }
        } catch (error) {
          price = await stripeClient.prices.create({
            product: product.id,
            unit_amount: Math.round(pack.priceEuros * 100),
            currency: 'eur',
            metadata: {
              tokenAmount: pack.tokenAmount.toString()
            }
          });
          console.log(`✅ Prix créé: ${price.id} (${pack.priceEuros}€ pour ${pack.tokenAmount} tokens)`);
          tokenSuccessCount++;
        }

        tokenResults.push({
          type: 'token_pack',
          packId: pack.productId.replace('prod_', ''),
          productId: product.id,
          priceId: price.id,
          priceEuros: pack.priceEuros,
          tokenAmount: pack.tokenAmount
        });

        console.log('─'.repeat(70));

      } catch (error) {
        console.error(`❌ Erreur avec ${pack.productId}:`, error.message);
      }
    }

    // ===========================================================================
    // 2. CRÉATION DES ABONNEMENTS (recurring)
    // ===========================================================================
    console.log('\n📋 CRÉATION DES ABONNEMENTS (recurring)');
    console.log('─'.repeat(70));

    const subscriptionResults = [];
    let subSuccessCount = 0;
    let subAlreadyExistsCount = 0;

    for (const plan of SUBSCRIPTION_PLANS) {
      try {
        // Créer ou récupérer le produit pour l'abonnement
        let product;
        try {
          product = await stripeClient.products.retrieve(plan.productId);
          console.log(`ℹ️  Produit "${plan.name}" existe déjà: ${product.id}`);
          subAlreadyExistsCount++;
        } catch (error) {
          product = await stripeClient.products.create({
            id: plan.productId,
            name: plan.name,
            description: plan.description,
            metadata: {
              type: 'subscription'
            }
          });
          console.log(`✅ Produit créé: ${product.id} (${plan.name})`);
          subSuccessCount++;
        }

        // Créer le prix mensuel (recurring)
        let monthlyPrice;
        try {
          const prices = await stripeClient.prices.list({
            product: product.id,
            limit: 5
          });
          
          const existingMonthly = prices.data.find(p => 
            p.recurring && p.recurring.interval === 'month'
          );
          
          if (existingMonthly) {
            monthlyPrice = existingMonthly;
            console.log(`ℹ️  Prix mensuel existe: ${monthlyPrice.id} (${monthlyPrice.unit_amount / 100}€/mois)`);
            subAlreadyExistsCount++;
          } else {
            throw new Error('No monthly price found');
          }
        } catch (error) {
          monthlyPrice = await stripeClient.prices.create({
            product: product.id,
            unit_amount: Math.round(plan.monthlyPrice * 100),
            currency: 'eur',
            recurring: {
              interval: 'month'
            },
            metadata: {
              type: 'subscription_monthly'
            }
          });
          console.log(`✅ Prix mensuel créé: ${monthlyPrice.id} (${plan.monthlyPrice}€/mois)`);
          subSuccessCount++;
        }

        // Créer le prix annuel (recurring)
        let annualPrice;
        try {
          const prices = await stripeClient.prices.list({
            product: product.id,
            limit: 5
          });
          
          const existingAnnual = prices.data.find(p => 
            p.recurring && p.recurring.interval === 'year'
          );
          
          if (existingAnnual) {
            annualPrice = existingAnnual;
            console.log(`ℹ️  Prix annuel existe: ${annualPrice.id} (${annualPrice.unit_amount / 100}€/an)`);
            subAlreadyExistsCount++;
          } else {
            throw new Error('No annual price found');
          }
        } catch (error) {
          annualPrice = await stripeClient.prices.create({
            product: product.id,
            unit_amount: Math.round(plan.annualPrice * 100),
            currency: 'eur',
            recurring: {
              interval: 'year'
            },
            metadata: {
              type: 'subscription_annual'
            }
          });
          console.log(`✅ Prix annuel créé: ${annualPrice.id} (${plan.annualPrice}€/an)`);
          subSuccessCount++;
        }

        subscriptionResults.push({
          type: 'subscription',
          planId: plan.id,
          productId: product.id,
          monthlyPriceId: monthlyPrice.id,
          annualPriceId: annualPrice.id,
          monthlyPrice: plan.monthlyPrice,
          annualPrice: plan.annualPrice
        });

        console.log('─'.repeat(70));

      } catch (error) {
        console.error(`❌ Erreur avec ${plan.productId}:`, error.message);
      }
    }

    // ===========================================================================
    // AFFICHAGE DES RÉSULTATS
    // ===========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log('✅ TOUTES LES OPÉRATIONS TERMINÉES');
    console.log('═'.repeat(70));
    
    console.log(`\n📊 Statistiques:`);
    console.log(`   Packs de tokens: ${tokenSuccessCount} créés, ${tokenAlreadyExistsCount} existants`);
    console.log(`   Abonnements: ${subSuccessCount} créés, ${subAlreadyExistsCount} existants`);
    
    // Afficher les résultats pour les packs de tokens
    console.log('\n📦 Price IDs pour les PACKS DE TOKENS (TokenPacks):');
    console.log('─'.repeat(70));
    tokenResults.forEach(result => {
      const padding = ' '.repeat(35 - result.priceId.length);
      console.log(`   ${result.priceId}${padding}// ${result.tokenAmount} tokens - ${result.priceEuros}€`);
    });

    // Afficher les résultats pour les abonnements
    console.log('\n📋 Price IDs pour les ABONNEMENTS (SubscriptionPlans):');
    console.log('─'.repeat(70));
    subscriptionResults.forEach(result => {
      console.log(`   ${result.planId.toUpperCase()}:`);
      console.log(`      stripePriceId: '${result.monthlyPriceId}'  // ${result.monthlyPrice}€/mois`);
      console.log(`      stripeAnnualPriceId: '${result.annualPriceId}'  // ${result.annualPrice}€/an`);
      console.log('');
    });

    // Instructions de mise à jour
    console.log('═'.repeat(70));
    console.log('📝 MISE À JOUR NÉCESSAIRE DANS tokens.js:');
    console.log('─'.repeat(70));
    console.log('1. Dans TokenPacks:');
    console.log('   Remplace les stripePriceId par les Price IDs ci-dessus.');
    
    console.log('\n2. Dans SubscriptionPlans:');
    console.log('   Remplace stripePriceId et stripeAnnualPriceId.');
    if (subscriptionResults.length > 0) {
      console.log('\n   Exemple pour Pro:');
      const proPlan = subscriptionResults.find(r => r.planId === 'pro');
      if (proPlan) {
        console.log(`      stripePriceId: '${proPlan.monthlyPriceId}',`);
        console.log(`      stripeAnnualPriceId: '${proPlan.annualPriceId}',`);
      }
    }

    console.log('\n✨ Tout est prêt dans Stripe !');
    console.log('\n💡 Prochaines étapes:');
    console.log('   1. Mets à jour tokens.js avec les nouveaux Price IDs');
    console.log('   2. Vérifie dans ton Dashboard: https://dashboard.stripe.com/test/products');
    console.log('   3. Teste un achat et un abonnement');

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error.message);
    console.error('Vérifie que ta clé secrète Stripe est valide.');
    process.exit(1);
  }
});
