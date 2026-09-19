// =============================================================================
// AUTH.JS - Gestion de l'authentification Firebase
// =============================================================================

class AuthService {
  constructor() {
    // Utiliser les instances exposées par firebase-config.js
    this.auth = window.firebaseAuth || firebase.auth();
    this.db = window.firebaseDB || firebase.firestore();
    this.currentUser = null;
    this.authStateListener = null;
    this.functions = window.firebaseFunctions || (firebase.functions ? firebase.functions() : null);
  }

  // Initialisation
  init() {
    
    this.authStateListener = this.auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.currentUser = user;
        await this.loadUserData(user.uid);
        localStorage.setItem('dpai_user_uid', user.uid);
      } else {
        this.currentUser = null;
        this.userData = null;
        localStorage.removeItem('dpai_user_uid');
      }
      this.updateUI();
    });
  }

  // Charger les données utilisateur depuis Firestore
  async loadUserData(uid) {
    try {
      const userDoc = await this.db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        this.userData = { id: uid, ...userDoc.data() };
        TokenManager.init(this.userData);
      } else {
        // Nouveau utilisateur, créer un profil par défaut
        const newUser = this.createDefaultUser(uid);
        await this.db.collection('users').doc(uid).set(newUser);
        this.userData = newUser;
        TokenManager.init(this.userData);
      }
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
    }
  }

  // Créer un utilisateur par défaut
  createDefaultUser(uid) {
    const email = this.auth.currentUser.email || '';
    const displayName = this.auth.currentUser.displayName || email.split('@')[0] || 'Utilisateur';
    
    return {
      id: uid,
      name: displayName,
      email: email,
      plan: 'free',
      subscriptionStartDate: new Date().toISOString(),
      subscriptionEndDate: null,
      tokenState: TokenManager.createTokenState(uid, 'free'),
      loyaltyInfo: LoyaltySystem.create(uid),
      referralCode: null,
      referralInfo: null,
      companyName: null,
      companyDomain: null,
      hasCompanyDiscount: false,
      hasAccessToPremiumSuggestions: false,
      hasAccessToAdvancedAnalytics: false,
      hasAccessToAPI: false,
      isEmailVerified: this.auth.currentUser.emailVerified || false,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
  }

  // Inscription avec email/mot de passe
  async signUp(email, password, name, referralCode = null) {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Mettre à jour le profil
      await user.updateProfile({ displayName: name });
      
      // Envoyer email de vérification
      await user.sendEmailVerification();
      
      // Créer l'utilisateur dans Firestore
      const newUser = {
        id: user.uid,
        name: name,
        email: email,
        plan: 'free',
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: null,
        tokenState: TokenManager.createTokenState(user.uid, 'free'),
        loyaltyInfo: LoyaltySystem.create(user.uid),
        referralCode: null,
        referralInfo: referralCode ? {
          referralCode: referralCode,
          sponsorId: null,
          sponsorName: null,
          sponsorEmail: null,
          status: 'pending',
          createdAt: new Date().toISOString()
        } : null,
        companyName: null,
        companyDomain: TokenUtils.extractDomain(email),
        hasCompanyDiscount: false,
        hasAccessToPremiumSuggestions: false,
        hasAccessToAdvancedAnalytics: false,
        hasAccessToAPI: false,
        isEmailVerified: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      
      await this.db.collection('users').doc(user.uid).set(newUser);
      
      // Si code de parrainage, trouver le sponsor
      if (referralCode) {
        await this.processReferral(user.uid, referralCode);
      }
      
      this.userData = newUser;
      TokenManager.init(this.userData);
      
      return { success: true, user: user };
    } catch (error) {
      console.error('Erreur inscription:', error);
      return { success: false, error: error.message };
    }
  }

  // Connexion avec email/mot de passe
  async signIn(email, password) {
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Mettre à jour la date de dernière connexion
      await this.db.collection('users').doc(user.uid).update({
        lastLoginAt: new Date().toISOString()
      });
      
      return { success: true, user: user };
    } catch (error) {
      console.error('Erreur connexion:', error);
      return { success: false, error: error.message };
    }
  }

  // Déconnexion
  async signOut() {
    try {
      await this.auth.signOut();
      this.currentUser = null;
      this.userData = null;
      TokenManager.clear();
      return { success: true };
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      return { success: false, error: error.message };
    }
  }

  // Réinitialisation du mot de passe
  async resetPassword(email) {
    try {
      await this.auth.sendPasswordResetEmail(email);
      return { success: true };
    } catch (error) {
      console.error('Erreur réinitialisation:', error);
      return { success: false, error: error.message };
    }
  }

  // Vérification email
  async verifyEmail() {
    try {
      const user = this.auth.currentUser;
      if (user) {
        await user.sendEmailVerification();
        return { success: true };
      }
      return { success: false, error: 'Aucun utilisateur connecté' };
    } catch (error) {
      console.error('Erreur vérification email:', error);
      return { success: false, error: error.message };
    }
  }

  // Traitement du parrainage
  async processReferral(userId, referralCode) {
    try {
      // Trouver le sponsor
      const referralQuery = await this.db.collection('users')
        .where('referralCode', '==', referralCode)
        .limit(1)
        .get();
      
      if (!referralQuery.empty) {
        const sponsor = referralQuery.docs[0];
        
        // Mettre à jour l'info de parrainage
        await this.db.collection('users').doc(userId).update({
          referralInfo: {
            referralCode: referralCode,
            sponsorId: sponsor.id,
            sponsorName: sponsor.data().name,
            sponsorEmail: sponsor.data().email,
            status: 'pending',
            createdAt: new Date().toISOString()
          }
        });
        
        // Notifier le sponsor (optionnel)
        console.log(`Nouveau filleul pour ${sponsor.data().name}`);
      }
    } catch (error) {
      console.error('Erreur parrainage:', error);
    }
  }

  // Mettre à jour le profil
  async updateProfile(name, companyName = null) {
    try {
      const user = this.auth.currentUser;
      if (!user) return { success: false, error: 'Aucun utilisateur connecté' };
      
      await user.updateProfile({ displayName: name });
      
      const updateData = { name: name };
      if (companyName) updateData.companyName = companyName;
      
      await this.db.collection('users').doc(user.uid).update(updateData);
      
      this.userData.name = name;
      if (companyName) this.userData.companyName = companyName;
      
      return { success: true };
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      return { success: false, error: error.message };
    }
  }

  // Mettre à jour l'UI
  updateUI() {
    const event = new CustomEvent('authStateChanged', {
      detail: { user: this.currentUser, userData: this.userData }
    });
    window.dispatchEvent(event);
  }

  // Nettoyage
  destroy() {
    if (this.authStateListener) {
      this.authStateListener();
    }
  }
}

// Instance singleton
const authService = new AuthService();

// Exposer globalement pour les autres modules
window.authService = authService;
