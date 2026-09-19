// =============================================================================
// REGISTER.JS - Gestion de l'inscription
// =============================================================================

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    initRegisterForm();
});

// Initialiser le formulaire d'inscription
function initRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    const registerName = document.getElementById('registerName');
    const registerEmail = document.getElementById('registerEmail');
    const registerPassword = document.getElementById('registerPassword');
    const registerConfirmPassword = document.getElementById('registerConfirmPassword');
    const registerBtn = document.getElementById('registerBtnForm');
    const registerError = document.getElementById('registerError');
    const registerErrorTitle = document.getElementById('registerErrorTitle');
    const registerErrorMessage = document.getElementById('registerErrorMessage');
    const registerErrorClose = document.getElementById('registerErrorClose');
    const registerSuccess = document.getElementById('registerSuccess');
    const googleRegisterBtn = document.getElementById('googleRegisterBtn');
    const termsAgreement = document.getElementById('termsAgreement');
    
    // Gérer la soumission du formulaire
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Cacher les alertes
            hideAllAlerts([registerError, registerSuccess]);
            
            // Désactiver le bouton
            if (registerBtn) {
                registerBtn.disabled = true;
                registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création...';
            }
            
            // Récupérer les valeurs
            const name = registerName.value.trim();
            const email = registerEmail.value.trim();
            const password = registerPassword.value;
            const confirmPassword = registerConfirmPassword.value;
            const referralCode = document.getElementById('referralCode').value.trim();
            const companyName = document.getElementById('companyName').value.trim();
            
            // Validation
            if (name.length < 2) {
                showError(registerError, registerErrorTitle, registerErrorMessage, 'Le nom doit contenir au moins 2 caractères');
                if (registerBtn) {
                    registerBtn.disabled = false;
                    registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Créer mon compte';
                }
                return;
            }
            
            if (!validateEmail(email)) {
                showError(registerError, registerErrorTitle, registerErrorMessage, 'Adresse email invalide');
                if (registerBtn) {
                    registerBtn.disabled = false;
                    registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Créer mon compte';
                }
                return;
            }
            
            if (password.length < 6) {
                showError(registerError, registerErrorTitle, registerErrorMessage, 'Le mot de passe doit contenir au moins 6 caractères');
                if (registerBtn) {
                    registerBtn.disabled = false;
                    registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Créer mon compte';
                }
                return;
            }
            
            if (password !== confirmPassword) {
                showError(registerError, registerErrorTitle, registerErrorMessage, 'Les mots de passe ne correspondent pas');
                if (registerBtn) {
                    registerBtn.disabled = false;
                    registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Créer mon compte';
                }
                return;
            }
            
            if (!termsAgreement || !termsAgreement.checked) {
                showError(registerError, registerErrorTitle, registerErrorMessage, 'Vous devez accepter les conditions générales');
                if (registerBtn) {
                    registerBtn.disabled = false;
                    registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Créer mon compte';
                }
                return;
            }
            
            // Inscription Firebase
            authService.signUp(email, password, name, referralCode).then(result => {
                if (result.success) {
                    // Afficher le succès
                    if (registerSuccess) registerSuccess.style.display = 'flex';
                    
                    // Mettre à jour le nom de l'entreprise si fourni
                    if (companyName && result.user) {
                        authService.updateProfile(name, companyName);
                    }
                    
                    // Rediriger après 3 secondes
                    setTimeout(() => {
                        window.location.href = './dashboard.html';
                    }, 3000);
                } else {
                    showError(registerError, registerErrorTitle, registerErrorMessage, result.error || 'Erreur d\'inscription');
                    if (registerBtn) {
                        registerBtn.disabled = false;
                        registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Créer mon compte';
                    }
                }
            }).catch(error => {
                showError(registerError, registerErrorTitle, registerErrorMessage, error.message || 'Erreur d\'inscription');
                if (registerBtn) {
                    registerBtn.disabled = false;
                    registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Créer mon compte';
                }
            });
        });
    }
    
    // Fermer l'alerte d'erreur
    if (registerErrorClose) {
        registerErrorClose.onclick = function() {
            if (registerError) registerError.style.display = 'none';
        };
    }
    
    // Inscription avec Google
    if (googleRegisterBtn) {
        googleRegisterBtn.onclick = function() {
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
                    showError(registerError, registerErrorTitle, registerErrorMessage, error.message || 'Erreur de connexion Google');
                    this.disabled = false;
                    this.innerHTML = '<i class="fab fa-google"></i> S\'inscrire avec Google';
                });
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
