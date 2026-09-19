// =============================================================================
// LOGIN.JS - Gestion de la connexion
// =============================================================================

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    initLoginForm();
    initForgotPasswordModal();
});

// Initialiser le formulaire de connexion
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const loginBtn = document.getElementById('loginBtnForm');
    const loginError = document.getElementById('loginError');
    const loginErrorTitle = document.getElementById('loginErrorTitle');
    const loginErrorMessage = document.getElementById('loginErrorMessage');
    const loginErrorClose = document.getElementById('loginErrorClose');
    const loginSuccess = document.getElementById('loginSuccess');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    
    // Gérer la soumission du formulaire
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Cacher les alertes
            hideAllAlerts([loginError, loginSuccess]);
            
            // Désactiver le bouton
            if (loginBtn) loginBtn.disabled = true;
            if (loginBtn) loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
            
            // Récupérer les valeurs
            const email = loginEmail.value.trim();
            const password = loginPassword.value;
            
            // Validation
            if (!validateEmail(email)) {
                showError(loginError, loginErrorTitle, loginErrorMessage, 'Adresse email invalide');
                if (loginBtn) loginBtn.disabled = false;
                if (loginBtn) loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
                return;
            }
            
            if (password.length < 6) {
                showError(loginError, loginErrorTitle, loginErrorMessage, 'Le mot de passe doit contenir au moins 6 caractères');
                if (loginBtn) loginBtn.disabled = false;
                if (loginBtn) loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
                return;
            }
            
            // Connexion Firebase
            authService.signIn(email, password).then(result => {
                if (result.success) {
                    // Afficher le succès
                    if (loginSuccess) loginSuccess.style.display = 'flex';
                    
                    // Rediriger après 2 secondes
                    setTimeout(() => {
                        // Vérifier si l'utilisateur a vérifié son email
                        const user = authService.currentUser;
                        if (user && !user.emailVerified) {
                            window.location.href = './dashboard.html';
                        } else {
                            window.location.href = './dashboard.html';
                        }
                    }, 2000);
                } else {
                    showError(loginError, loginErrorTitle, loginErrorMessage, result.error || 'Erreur de connexion');
                    if (loginBtn) loginBtn.disabled = false;
                    if (loginBtn) loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
                }
            }).catch(error => {
                showError(loginError, loginErrorTitle, loginErrorMessage, error.message || 'Erreur de connexion');
                if (loginBtn) loginBtn.disabled = false;
                if (loginBtn) loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
            });
        });
    }
    
    // Fermer l'alerte d'erreur
    if (loginErrorClose) {
        loginErrorClose.onclick = function() {
            if (loginError) loginError.style.display = 'none';
        };
    }
    
    // Connexion avec Google
    if (googleLoginBtn) {
        googleLoginBtn.onclick = function() {
            // Désactiver le bouton
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
            
            // Utiliser Firebase Google Auth via authService
            const provider = new (window.firebaseAuth || firebase.auth).GoogleAuthProvider();
            
            authService.auth.signInWithPopup(provider)
                .then(result => {
                    // Nouveau utilisateur
                    if (result.additionalUserInfo.isNewUser) {
                        return createNewUserFromGoogle(result.user);
                    }
                    return Promise.resolve();
                })
                .then(() => {
                    // Rediriger
                    window.location.href = './dashboard.html';
                })
                .catch(error => {
                    showError(loginError, loginErrorTitle, loginErrorMessage, error.message || 'Erreur de connexion Google');
                    this.disabled = false;
                    this.innerHTML = '<i class="fab fa-google"></i> Continuer avec Google';
                });
        };
    }
    
    // Mot de passe oublié
    if (forgotPasswordBtn) {
        forgotPasswordBtn.onclick = function(e) {
            e.preventDefault();
            const forgotPasswordModal = document.getElementById('forgotPasswordModal');
            if (forgotPasswordModal) {
                forgotPasswordModal.classList.add('visible');
            }
        };
    }
}

// Créer un nouvel utilisateur à partir de Google
async function createNewUserFromGoogle(user) {
    const userData = {
        id: user.uid,
        name: user.displayName || user.email || 'Utilisateur',
        email: user.email,
        plan: 'free',
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: null,
        tokenState: TokenManager.createTokenState(user.uid, 'free'),
        loyaltyInfo: LoyaltySystem.create(user.uid),
        referralCode: null,
        referralInfo: null,
        companyName: null,
        companyDomain: TokenUtils.extractDomain(user.email),
        hasCompanyDiscount: false,
        hasAccessToPremiumSuggestions: false,
        hasAccessToAdvancedAnalytics: false,
        hasAccessToAPI: false,
        isEmailVerified: user.emailVerified || false,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        provider: 'google',
        photoURL: user.photoURL
    };
    
    try {
        await db.collection('users').doc(user.uid).set(userData);
        TokenManager.init(userData);
    } catch (error) {
        console.error('Erreur création utilisateur Google:', error);
    }
}

// Initialiser le modal de mot de passe oublié
function initForgotPasswordModal() {
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const resetEmail = document.getElementById('resetEmail');
    const forgotPasswordModalClose = document.getElementById('forgotPasswordModalClose');
    const resetPasswordSuccess = document.getElementById('resetPasswordSuccess');
    const resetPasswordError = document.getElementById('resetPasswordError');
    const resetPasswordErrorMessage = document.getElementById('resetPasswordErrorMessage');
    
    // Fermer le modal
    if (forgotPasswordModalClose) {
        forgotPasswordModalClose.onclick = function() {
            if (forgotPasswordModal) forgotPasswordModal.classList.remove('visible');
            hideAllAlerts([resetPasswordSuccess, resetPasswordError]);
        };
    }
    
    // Soumission du formulaire
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            hideAllAlerts([resetPasswordSuccess, resetPasswordError]);
            
            const email = resetEmail.value.trim();
            
            if (!validateEmail(email)) {
                if (resetPasswordError) resetPasswordError.style.display = 'flex';
                if (resetPasswordErrorMessage) resetPasswordErrorMessage.textContent = 'Adresse email invalide';
                return;
            }
            
            // Envoyer l'email de réinitialisation
            authService.resetPassword(email).then(result => {
                if (result.success) {
                    if (resetPasswordSuccess) resetPasswordSuccess.style.display = 'flex';
                    if (resetPasswordError) resetPasswordError.style.display = 'none';
                    
                    // Réinitialiser le formulaire
                    if (forgotPasswordForm) forgotPasswordForm.reset();
                } else {
                    if (resetPasswordError) resetPasswordError.style.display = 'flex';
                    if (resetPasswordErrorMessage) resetPasswordErrorMessage.textContent = result.error || 'Erreur lors de l\'envoi de l\'email';
                }
            }).catch(error => {
                if (resetPasswordError) resetPasswordError.style.display = 'flex';
                if (resetPasswordErrorMessage) resetPasswordErrorMessage.textContent = error.message || 'Erreur lors de l\'envoi de l\'email';
            });
        });
    }
}

// Cacher toutes les alertes
function hideAllAlerts(alerts) {
    alerts.forEach(alert => {
        if (alert) alert.style.display = 'none';
    });
}

// Afficher une erreur
function showError(errorEl, titleEl, messageEl, message) {
    if (errorEl) errorEl.style.display = 'flex';
    if (titleEl) titleEl.textContent = 'Erreur';
    if (messageEl) messageEl.textContent = message;
}

// Valider un email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}
