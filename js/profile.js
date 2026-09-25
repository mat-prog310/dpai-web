// =============================================================================
// PROFILE.JS - Gestion du profil utilisateur
// =============================================================================

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    initProfilePage();
});

// Initialiser la page de profil
function initProfilePage() {
    // Initialiser les tabs
    initProfileTabs();
    
    // Initialiser les formulaires
    initProfileForms();
    
    // Initialiser les modaux
    initProfileModals();
    
    // Écouter les changements d'authentification
    window.addEventListener('authStateChanged', function(event) {
        const { user, userData } = event.detail;
        checkProfileAuthStatus(user, userData);
    });
    
    // Vérifier l'état d'authentification
    checkProfileAuthStatus();
    
    // Vérifier périodiquement au cas où authService n'est pas encore prêt
    const checkAuthInterval = setInterval(function() {
        // Si authService existe, vérifier une dernière fois et arrêter l'intervalle
        if (typeof authService !== 'undefined' && authService !== null) {
            checkProfileAuthStatus();
            clearInterval(checkAuthInterval);
        }
    }, 500);
    
    // Arrêter l'intervalle après 10 secondes maximum
    setTimeout(function() {
        clearInterval(checkAuthInterval);
    }, 10000);
}

// Vérifier l'état d'authentification
function checkProfileAuthStatus(user, userData) {
    // Vérifier si authService existe
    const authServiceExists = typeof authService !== 'undefined' && authService !== null;
    
    const userFinal = user || (authServiceExists ? authService.currentUser : null);
    const userDataFinal = userData || (authServiceExists ? authService.userData : null);
    
    const unauthenticatedView = document.getElementById('unauthenticatedProfileView');
    const profileContent = document.getElementById('profileContent');
    const loadingView = document.getElementById('loadingView');
    
    // Cacher toutes les vues d'abord
    if (unauthenticatedView) unauthenticatedView.style.display = 'none';
    if (profileContent) profileContent.style.display = 'none';
    if (loadingView) loadingView.style.display = 'none';
    
    // Si authService n'existe pas encore, afficher le loading
    if (!authServiceExists) {
        if (loadingView) loadingView.style.display = 'block';
        return;
    }
    
    // Si authService existe mais user est null, on est peut-être en train de charger
    // Afficher le loading si on est en attente de vérification
    if (!userFinal && authServiceExists) {
        // Vérifier si on est dans un état de chargement
        // Si authService existe mais currentUser est null, Firebase est peut-être en train de vérifier
        if (loadingView) loadingView.style.display = 'block';
        else if (unauthenticatedView) unauthenticatedView.style.display = 'block';
        return;
    }
    
    // Si l'utilisateur est connecté, afficher le contenu
    if (userFinal) {
        // Utilisateur connecté
        if (profileContent) profileContent.style.display = 'block';
        
        // Si on a userData, charger les données
        if (userDataFinal) {
            // Charger les données du profil
            loadProfileData(userFinal, userDataFinal);
            
            // Initialiser TokenManager
            TokenManager.init(userDataFinal);
        }
        
    } else {
        // Utilisateur non connecté
        if (unauthenticatedView) unauthenticatedView.style.display = 'block';
    }
}

// Charger les données du profil
function loadProfileData(user, userData) {
    // Mettre à jour les informations de base
    updateProfileHeader(user, userData);
    updateAccountInfo(user, userData);
    updateLoyaltyInfo(userData);
    updateReferralInfo(userData);
    
    // Charger les préférences
    loadPreferences(userData);
    
    // Mettre à jour l'UI du plan
    updatePlanUI(userData);
}

// Mettre à jour l'en-tête du profil
function updateProfileHeader(user, userData) {
    const userNameEl = document.getElementById('profileUserName');
    const userEmailEl = document.getElementById('profileUserEmail');
    const totalAnalysesEl = document.getElementById('profileTotalAnalyses');
    const totalTokensEl = document.getElementById('profileTotalTokens');
    const memberSinceEl = document.getElementById('profileMemberSince');
    
    if (userNameEl) {
        userNameEl.textContent = user.displayName || userData.name || user.email || 'Utilisateur';
    }
    
    if (userEmailEl) {
        userEmailEl.textContent = user.email || userData.email || 'email@example.com';
    }
    
    if (totalAnalysesEl) {
        const total = userData.totalAnalyses || userData.loyaltyInfo?.totalAnalyses || 0;
        totalAnalysesEl.textContent = TokenUtils.formatTokens(total);
    }
    
    if (totalTokensEl) {
        const used = userData.tokensUsed || userData.tokenState?.usedTokens || 0;
        totalTokensEl.textContent = TokenUtils.formatTokens(used);
    }
    
    if (memberSinceEl) {
        const date = userData.createdAt || user.metadata?.creationTime;
        if (date) {
            memberSinceEl.textContent = formatDate(date);
        }
    }
    
    // Mettre à jour le nom dans la navbar
    const navUserName = document.getElementById('userName');
    if (navUserName) {
        navUserName.textContent = user.displayName || userData.name || user.email || 'Compte';
    }
}

// Mettre à jour les informations de compte
function updateAccountInfo(user, userData) {
    const emailEl = document.getElementById('accountEmail');
    const planEl = document.getElementById('accountPlan');
    const joinDateEl = document.getElementById('accountJoinDate');
    const lastLoginEl = document.getElementById('accountLastLogin');
    const statusEl = document.getElementById('accountStatus');
    
    if (emailEl) {
        emailEl.textContent = user.email || userData.email || '-';
    }
    
    if (planEl) {
        const planNames = {
            free: 'Gratuit',
            pro: 'Pro',
            enterprise: 'Entreprise'
        };
        planEl.textContent = planNames[userData.plan] || userData.plan || 'Gratuit';
    }
    
    if (joinDateEl) {
        const date = userData.createdAt || user.metadata?.creationTime;
        if (date) {
            joinDateEl.textContent = formatDate(date);
        }
    }
    
    if (lastLoginEl) {
        const date = userData.lastLoginAt || user.metadata?.lastSignInTime;
        if (date) {
            lastLoginEl.textContent = formatDate(date);
        }
    }
    
    if (statusEl) {
        statusEl.textContent = userData.isActive ? 'Actif' : 'Inactif';
    }
}

// Mettre à jour les informations de fidélité
function updateLoyaltyInfo(userData) {
    const tokensEl = document.getElementById('loyaltyTokensDisplay');
    const totalAnalysesEl = document.getElementById('loyaltyTotalAnalysesDisplay');
    const monthlyAnalysesEl = document.getElementById('loyaltyMonthlyAnalysesDisplay');
    
    if (userData.loyaltyInfo) {
        if (tokensEl) {
            tokensEl.textContent = TokenUtils.formatTokens(userData.loyaltyInfo.monthlyLoyaltyTokens || 0);
        }
        if (totalAnalysesEl) {
            totalAnalysesEl.textContent = TokenUtils.formatTokens(userData.loyaltyInfo.totalAnalyses || 0);
        }
        if (monthlyAnalysesEl) {
            monthlyAnalysesEl.textContent = TokenUtils.formatTokens(userData.loyaltyInfo.monthlyAnalyses || 0);
        }
    }
}

// Mettre à jour les informations de parrainage
function updateReferralInfo(userData) {
    const codeEl = document.getElementById('referralCodeDisplay');
    const countEl = document.getElementById('referralCount');
    const tokensEl = document.getElementById('referralTokensEarned');
    
    if (userData.referralCode) {
        if (codeEl) {
            codeEl.textContent = userData.referralCode;
        }
    }
    
    if (userData.referralInfo) {
        if (countEl) {
            countEl.textContent = userData.referralInfo.referralCount || 0;
        }
        if (tokensEl) {
            tokensEl.textContent = TokenUtils.formatTokens(userData.referralInfo.tokensEarned || 0);
        }
    }
}

// Charger les préférences
function loadPreferences(userData) {
    // Charger les préférences de l'utilisateur
    if (userData.preferences) {
        // Langue
        const languageRadios = document.querySelectorAll('input[name="language"]');
        if (userData.preferences.language) {
            languageRadios.forEach(radio => {
                if (radio.value === userData.preferences.language) {
                    radio.checked = true;
                }
            });
        }
        
        // Thème
        const themeRadios = document.querySelectorAll('input[name="theme"]');
        if (userData.preferences.theme) {
            themeRadios.forEach(radio => {
                if (radio.value === userData.preferences.theme) {
                    radio.checked = true;
                }
            });
        }
        
        // Notifications
        const notificationChecks = document.querySelectorAll('input[name^="notification"]');
        if (userData.preferences.notifications) {
            notificationChecks.forEach(check => {
                const name = check.getAttribute('name');
                if (userData.preferences.notifications[name]) {
                    check.checked = true;
                }
            });
        }
        
        // Type d'analyse par défaut
        const analysisTypeSelect = document.getElementById('defaultAnalysisType');
        if (analysisTypeSelect && userData.preferences.defaultAnalysisType) {
            analysisTypeSelect.value = userData.preferences.defaultAnalysisType;
        }
        
        // Niveau de détail par défaut
        const detailRadios = document.querySelectorAll('input[name="defaultDetailLevel"]');
        if (userData.preferences.defaultDetailLevel) {
            detailRadios.forEach(radio => {
                if (radio.value === userData.preferences.defaultDetailLevel) {
                    radio.checked = true;
                }
            });
        }
    }
}

// Initialiser les tabs
function initProfileTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Retirer la classe active de tous les tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            
            // Ajouter la classe active au tab cliqué
            this.classList.add('active');
            
            // Afficher/masquer les contenus
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => {
                content.style.display = 'none';
            });
            
            const targetTab = document.getElementById(`${tabId}-tab`);
            if (targetTab) {
                targetTab.style.display = 'block';
            }
        });
    });
}

// Initialiser les formulaires
function initProfileForms() {
    // Formulaire de profil
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveProfile();
        });
    }
    
    // Formulaire de mot de passe
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            changePassword();
        });
    }
    
    // Formulaire de préférences
    const preferencesForm = document.getElementById('preferencesForm');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', function(e) {
            e.preventDefault();
            savePreferences();
        });
    }
    
    // Formulaire de préférences d'analyse
    const analysisPreferencesForm = document.getElementById('analysisPreferencesForm');
    if (analysisPreferencesForm) {
        analysisPreferencesForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveAnalysisPreferences();
        });
    }
    
    // Formulaire de changement d'email
    const emailChangeForm = document.getElementById('emailChangeForm');
    if (emailChangeForm) {
        emailChangeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            confirmEmailChange();
        });
    }
    
    // Initialiser la force du mot de passe
    initPasswordStrength();
    
    // Initialiser la correspondance des mots de passe
    initPasswordMatch();
}

// Initialiser les modaux
function initProfileModals() {
    // Modal de changement d'email
    const emailChangeModal = document.getElementById('emailChangeModal');
    if (emailChangeModal) {
        const closeBtn = document.getElementById('emailChangeModalClose');
        const cancelBtn = document.getElementById('emailChangeCancel');
        const confirmBtn = document.getElementById('emailChangeConfirm');
        
        if (closeBtn) closeBtn.onclick = function() { emailChangeModal.classList.remove('visible'); };
        if (cancelBtn) cancelBtn.onclick = function() { emailChangeModal.classList.remove('visible'); };
        if (confirmBtn) confirmBtn.onclick = confirmEmailChange;
    }
    
    // Modal de suppression de compte
    const accountDeleteModal = document.getElementById('accountDeleteModal');
    if (accountDeleteModal) {
        const closeBtn = document.getElementById('accountDeleteModalClose');
        const cancelBtn = document.getElementById('accountDeleteCancel');
        const confirmBtn = document.getElementById('accountDeleteConfirm');
        
        if (closeBtn) closeBtn.onclick = function() { accountDeleteModal.classList.remove('visible'); };
        if (cancelBtn) cancelBtn.onclick = function() { accountDeleteModal.classList.remove('visible'); };
        if (confirmBtn) confirmBtn.onclick = confirmAccountDeletion;
    }
    
    // Modal de rétrogradation
    const downgradeModal = document.getElementById('downgradeModal');
    if (downgradeModal) {
        const closeBtn = document.getElementById('downgradeModalClose');
        const cancelBtn = document.getElementById('downgradeCancel');
        const confirmBtn = document.getElementById('downgradeConfirm');
        
        if (closeBtn) closeBtn.onclick = hideDowngradeModal;
        if (cancelBtn) cancelBtn.onclick = hideDowngradeModal;
        if (confirmBtn) confirmBtn.onclick = downgradePlan;
    }
}

// Sauvegarder le profil
async function saveProfile() {
    const user = authService.currentUser;
    if (!user) {
        showAlert('error', 'Erreur', 'Vous devez être connecté.');
        return;
    }
    
    const name = document.getElementById('profileName').value;
    const company = document.getElementById('profileCompany').value;
    const phone = document.getElementById('profilePhone').value;
    const jobTitle = document.getElementById('profileJobTitle').value;
    const bio = document.getElementById('profileBio').value;
    
    try {
        const result = await authService.updateProfile(name, company);
        
        if (result.success) {
            // Sauvegarder les informations supplémentaires dans Firestore
            await db.collection('users').doc(user.uid).update({
                name: name,
                companyName: company || null,
                phone: phone || null,
                jobTitle: jobTitle || null,
                bio: bio || null
            });
            
            showAlert('success', 'Succès', 'Votre profil a été mis à jour avec succès !');
            
            // Recharger la page
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            showAlert('error', 'Erreur', result.error || 'Une erreur est survenue.');
        }
    } catch (error) {
        showAlert('error', 'Erreur', error.message || 'Une erreur est survenue.');
    }
}

// Changer le mot de passe
async function changePassword() {
    const user = authService.currentUser;
    if (!user) {
        showAlert('error', 'Erreur', 'Vous devez être connecté.');
        return;
    }
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        showAlert('error', 'Erreur', 'Veuillez remplir tous les champs.');
        return;
    }
    
    if (newPassword !== confirmNewPassword) {
        showAlert('error', 'Erreur', 'Les mots de passe ne correspondent pas.');
        return;
    }
    
    if (newPassword.length < 6) {
        showAlert('error', 'Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
        return;
    }
    
    try {
        // Reauthentifier l'utilisateur
        const auth = window.firebaseAuth || firebase.auth();
        const credential = auth.EmailAuthProvider.credential(
            user.email,
            currentPassword
        );
        
        await user.reauthenticateWithCredential(credential);
        
        // Changer le mot de passe
        await user.updatePassword(newPassword);
        
        showAlert('success', 'Succès', 'Votre mot de passe a été changé avec succès !');
        
        // Réinitialiser les champs
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
        
        // Fermer l'onglet sécurité
        document.querySelector('.tab-btn.active')?.classList.remove('active');
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        document.querySelector('.tab-btn[data-tab="profile"]')?.classList.add('active');
        document.getElementById('profile-tab').style.display = 'block';
        
    } catch (error) {
        showAlert('error', 'Erreur', 'Mot de passe actuel incorrect ou une erreur est survenue.');
    }
}

// Sauvegarder les préférences
async function savePreferences() {
    const user = authService.currentUser;
    if (!user) {
        showAlert('error', 'Erreur', 'Vous devez être connecté.');
        return;
    }
    
    const preferences = {
        language: document.querySelector('input[name="language"]:checked')?.value || 'fr',
        theme: document.querySelector('input[name="theme"]:checked')?.value || 'light',
        notifications: {
            emailNotifications: document.querySelector('input[name="emailNotifications"]')?.checked || false,
            pushNotifications: document.querySelector('input[name="pushNotifications"]')?.checked || false,
            analysisCompleteNotification: document.querySelector('input[name="analysisCompleteNotification"]')?.checked || false,
            promotionalEmails: document.querySelector('input[name="promotionalEmails"]')?.checked || false
        }
    };
    
    try {
        await db.collection('users').doc(user.uid).update({
            preferences: preferences
        });
        
        showAlert('success', 'Succès', 'Vos préférences ont été sauvegardées avec succès !');
        
        // Appliquer le thème
        applyTheme(preferences.theme);
        
    } catch (error) {
        showAlert('error', 'Erreur', error.message || 'Une erreur est survenue.');
    }
}

// Sauvegarder les préférences d'analyse
async function saveAnalysisPreferences() {
    const user = authService.currentUser;
    if (!user) {
        showAlert('error', 'Erreur', 'Vous devez être connecté.');
        return;
    }
    
    const defaultAnalysisType = document.getElementById('defaultAnalysisType').value;
    const defaultDetailLevel = document.querySelector('input[name="defaultDetailLevel"]:checked')?.value || 'standard';
    
    try {
        await db.collection('users').doc(user.uid).update({
            'preferences.defaultAnalysisType': defaultAnalysisType || null,
            'preferences.defaultDetailLevel': defaultDetailLevel
        });
        
        showAlert('success', 'Succès', 'Vos préférences d\'analyse ont été sauvegardées avec succès !');
        
    } catch (error) {
        showAlert('error', 'Erreur', error.message || 'Une erreur est survenue.');
    }
}

// Appliquer le thème
function applyTheme(theme) {
    const html = document.documentElement;
    
    // Retirer les thèmes existants
    html.classList.remove('theme-dark', 'theme-light');
    
    // Appliquer le nouveau thème
    if (theme === 'dark') {
        html.classList.add('theme-dark');
        localStorage.setItem('dpai_theme', 'dark');
    } else if (theme === 'light') {
        html.classList.add('theme-light');
        localStorage.setItem('dpai_theme', 'light');
    } else {
        // Thème système
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (systemTheme === 'dark') {
            html.classList.add('theme-dark');
        } else {
            html.classList.add('theme-light');
        }
        localStorage.removeItem('dpai_theme');
    }
}

// Changer l'email
function changeEmail() {
    const modal = document.getElementById('emailChangeModal');
    if (modal) {
        modal.classList.add('visible');
    }
}

// Confirmer le changement d'email
async function confirmEmailChange() {
    const user = authService.currentUser;
    if (!user) {
        showAlert('error', 'Erreur', 'Vous devez être connecté.');
        return;
    }
    
    const newEmail = document.getElementById('newEmail').value;
    const password = document.getElementById('emailPassword').value;
    
    if (!newEmail || !password) {
        showAlert('error', 'Erreur', 'Veuillez remplir tous les champs.');
        return;
    }
    
    if (!isValidEmail(newEmail)) {
        showAlert('error', 'Erreur', 'Veuillez entrer une adresse email valide.');
        return;
    }
    
    try {
        // Reauthentifier l'utilisateur
        const auth = window.firebaseAuth || firebase.auth();
        const credential = auth.EmailAuthProvider.credential(
            user.email,
            password
        );
        
        await user.reauthenticateWithCredential(credential);
        
        // Changer l'email
        await user.updateEmail(newEmail);
        
        // Mettre à jour dans Firestore
        await db.collection('users').doc(user.uid).update({
            email: newEmail
        });
        
        showAlert('success', 'Succès', 'Votre adresse email a été changée avec succès !');
        
        // Fermer le modal
        const modal = document.getElementById('emailChangeModal');
        if (modal) modal.classList.remove('visible');
        
        // Recharger la page
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        showAlert('error', 'Erreur', 'Mot de passe incorrect ou une erreur est survenue.');
    }
}

// Supprimer le compte
function deleteAccount() {
    const modal = document.getElementById('accountDeleteModal');
    if (modal) {
        modal.classList.add('visible');
    }
}

// Confirmer la suppression du compte
async function confirmAccountDeletion() {
    const user = authService.currentUser;
    if (!user) {
        showAlert('error', 'Erreur', 'Vous devez être connecté.');
        return;
    }
    
    const password = document.getElementById('deletePassword').value;
    
    if (!password) {
        showAlert('error', 'Erreur', 'Veuillez entrer votre mot de passe.');
        return;
    }
    
    try {
        // Reauthentifier l'utilisateur
        const auth = window.firebaseAuth || firebase.auth();
        const credential = auth.EmailAuthProvider.credential(
            user.email,
            password
        );
        
        await user.reauthenticateWithCredential(credential);
        
        // Supprimer l'utilisateur de Firestore
        await db.collection('users').doc(user.uid).delete();
        
        // Supprimer l'utilisateur de Firebase Auth
        await user.delete();
        
        showAlert('success', 'Succès', 'Votre compte a été supprimé avec succès.');
        
        // Fermer le modal
        const modal = document.getElementById('accountDeleteModal');
        if (modal) modal.classList.remove('visible');
        
        // Rediriger vers la page d'accueil
        setTimeout(() => {
            window.location.href = '/';
        }, 1500);
        
    } catch (error) {
        showAlert('error', 'Erreur', 'Mot de passe incorrect ou une erreur est survenue.');
    }
}

// Copier le code de parrainage
function copyReferralCode() {
    const codeEl = document.getElementById('referralCodeDisplay');
    const code = codeEl?.textContent || '';
    
    if (code && code !== '-') {
        navigator.clipboard.writeText(code).then(() => {
            showAlert('success', 'Succès', 'Code de parrainage copié dans le presse-papiers !');
        }).catch(() => {
            showAlert('error', 'Erreur', 'Impossible de copier le code.');
        });
    }
}

// Activer l'authentification à deux facteurs
function enableTwoFactor() {
    showAlert('info', 'Information', 'La fonctionnalité 2FA sera disponible prochainement.');
}

// Télécharger un avatar
function uploadAvatar() {
    showAlert('info', 'Information', 'La fonctionnalité de téléchargement d\'avatar sera disponible prochainement.');
}

// Initialiser la force du mot de passe
function initPasswordStrength() {
    const passwordInput = document.getElementById('newPassword');
    const passwordStrength = document.getElementById('passwordStrength');
    const passwordStrengthText = document.getElementById('passwordStrengthText');
    
    if (passwordInput && passwordStrength) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            
            if (passwordStrength) {
                passwordStrength.style.width = `${strength.percent}%`;
                passwordStrength.style.backgroundColor = strength.color;
            }
            
            if (passwordStrengthText) {
                passwordStrengthText.textContent = strength.label;
                passwordStrengthText.style.color = strength.color;
            }
        });
    }
}

// Initialiser la correspondance des mots de passe
function initPasswordMatch() {
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmNewPassword');
    const errorEl = document.getElementById('passwordMatchError');
    
    if (newPasswordInput && confirmPasswordInput && errorEl) {
        confirmPasswordInput.addEventListener('input', function() {
            if (this.value !== newPasswordInput.value) {
                errorEl.style.display = 'flex';
                this.classList.add('error');
            } else {
                errorEl.style.display = 'none';
                this.classList.remove('error');
            }
        });
    }
}

// Formater une date
function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Moins d'une heure
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `Il y a ${minutes} min`;
    }
    
    // Moins d'un jour
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `Il y a ${hours}h`;
    }
    
    // Moins d'une semaine
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `Il y a ${days} jours`;
    }
    
    // Format date complète
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// Valider une adresse email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Calculer la force du mot de passe (copié de main.js)
function calculatePasswordStrength(password) {
    let score = 0;
    
    // Longueur
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 10;
    
    // Majuscules
    if (/[A-Z]/.test(password)) score += 15;
    
    // Minuscules
    if (/[a-z]/.test(password)) score += 15;
    
    // Chiffres
    if (/[0-9]/.test(password)) score += 15;
    
    // Caractères spéciaux
    if (/[^A-Za-z0-9]/.test(password)) score += 20;
    
    // Limiter à 100
    score = Math.min(score, 100);
    
    let color, label;
    
    if (score < 30) {
        color = '#ef4444';
        label = 'Faible';
    } else if (score < 60) {
        color = '#f59e0b';
        label = 'Moyen';
    } else if (score < 80) {
        color = '#10b981';
        label = 'Bon';
    } else {
        color = '#10b981';
        label = 'Excellente';
    }
    
    return {
        score: score,
        percent: score,
        color: color,
        label: label
    };
}

// Afficher une alerte
function showAlert(type, title, message) {
    if (typeof window.showAlert === 'function') {
        window.showAlert(type, title, message);
    } else {
        alert(`${title}: ${message}`);
    }
}

// Rétrogradation de plan
function showDowngradeModal() {
    const modal = document.getElementById('downgradeModal');
    if (modal) {
        modal.classList.add('visible');
        
        // Mettre à jour la liste des pertes selon le plan actuel
        updateDowngradeLosesList();
    }
}

function hideDowngradeModal() {
    const modal = document.getElementById('downgradeModal');
    if (modal) {
        modal.classList.remove('visible');
        document.getElementById('downgradePassword').value = '';
    }
}

function updateDowngradeLosesList() {
    const userPlan = authService?.userData?.plan;
    const losesList = document.getElementById('downgradeLosesList');
    
    if (!losesList) return;
    
    const planFeatures = {
        pro: [
            'Accès aux analyses avancées',
            '500 tokens/mois supplémentaires',
            'Support prioritaire',
            'Projets illimités'
        ],
        enterprise: [
            'Accès à TOUTES les analyses',
            '5000 tokens/mois supplémentaires',
            'Support dédié 24/7',
            'Accès API',
            'Formation incluse',
            'Rapports personnalisés',
            'Services de stratégie de croissance externe'
        ]
    };
    
    const features = planFeatures[userPlan] || [];
    losesList.innerHTML = features.map(feature => 
        `<li><i class="fas fa-times-circle"></i> ${feature}</li>`
    ).join('');
}

function downgradePlan() {
    const password = document.getElementById('downgradePassword')?.value;
    
    if (!password) {
        showAlert('error', 'Erreur', 'Veuillez entrer votre mot de passe');
        return;
    }
    
    const currentUser = authService?.currentUser;
    const currentUserData = authService?.userData;
    
    if (!currentUser || !currentUserData) {
        showAlert('error', 'Erreur', 'Impossible de rétrograder. Veuillez réessayer.');
        return;
    }
    
    // Vérifier que l'utilisateur n'est pas déjà en plan gratuit
    if (currentUserData.plan === 'free') {
        showAlert('error', 'Erreur', 'Vous êtes déjà sur le plan Gratuit.');
        hideDowngradeModal();
        return;
    }
    
    // Re-authentifier l'utilisateur
    const credential = firebase.auth.EmailAuthProvider.credential(
        currentUser.email,
        password
    );
    
    // Afficher un état de chargement sur le bouton
    const confirmBtn = document.getElementById('downgradeConfirm');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rétrogradation en cours...';
    }
    
    currentUser.reauthenticateWithCredential(credential)
        .then(async () => {
            try {
                // Mettre à jour le plan en base de données
                const userRef = authService.db.collection('users').doc(currentUser.uid);
                
                // Créer un nouvel état de tokens pour le plan gratuit
                const newTokenState = TokenManager.createTokenState(currentUser.uid, 'free');
                
                await userRef.update({
                    plan: 'free',
                    subscriptionStartDate: new Date().toISOString(),
                    subscriptionEndDate: null,
                    tokenState: newTokenState,
                    hasAccessToPremiumSuggestions: false,
                    hasAccessToAdvancedAnalytics: false,
                    hasAccessToAPI: false,
                    hasCompanyDiscount: false
                });
                
                // Recharger les données utilisateur
                await authService.loadUserData(currentUser.uid);
                
                // Restaurer le bouton
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<i class="fas fa-arrow-down"></i> Confirmer la rétrogradation';
                }
                
                hideDowngradeModal();
                
                showAlert('success', 'Succès', 'Votre plan a été rétrogradé avec succès. Vous avez maintenant le plan Gratuit.');
                
                // Déclencher un événement pour mettre à jour l'UI
                window.dispatchEvent(new CustomEvent('authStateChanged', {
                    detail: {
                        user: currentUser,
                        userData: authService.userData
                    }
                }));
                
                // Recharger la page pour appliquer les changements
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
                
            } catch (error) {
                // Restaurer le bouton
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<i class="fas fa-arrow-down"></i> Confirmer la rétrogradation';
                }
                
                console.error('Erreur lors de la rétrogradation:', error);
                showAlert('error', 'Erreur', 'Une erreur est survenue lors de la rétrogradation. Veuillez réessayer.');
            }
        })
        .catch(error => {
            // Restaurer le bouton
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fas fa-arrow-down"></i> Confirmer la rétrogradation';
            }
            
            console.error('Erreur d\'authentification:', error);
            showAlert('error', 'Erreur', 'Mot de passe incorrect. Veuillez réessayer.');
        });
}

// Mettre à jour l'UI selon le plan
function updatePlanUI(userData) {
    const plan = userData?.plan || 'free';
    const isFree = plan === 'free';
    
    // Boutons de rétrogradation
    const downgradeBtn = document.getElementById('downgradeBtn');
    const dangerDowngradeBtn = document.getElementById('dangerDowngradeBtn');
    
    if (downgradeBtn) {
        downgradeBtn.style.display = isFree ? 'none' : 'inline-flex';
    }
    
    if (dangerDowngradeBtn) {
        dangerDowngradeBtn.style.display = isFree ? 'none' : 'inline-flex';
    }
    
    // Avertissement de rétrogradation
    const downgradeWarning = document.getElementById('downgradeWarning');
    if (downgradeWarning) {
        downgradeWarning.style.display = isFree ? 'none' : 'flex';
    }
    
    // Mettre à jour le badge de plan dans le header
    const planBadge = document.getElementById('profilePlanBadge');
    const accountPlanEl = document.getElementById('accountPlan');
    
    const planNames = {
        free: 'Gratuit',
        pro: 'Pro',
        enterprise: 'Entreprise'
    };
    
    const planName = planNames[plan] || plan;
    
    if (planBadge) {
        planBadge.innerHTML = `<i class="fas fa-crown"></i> <span>${planName}</span>`;
    }
    
    if (accountPlanEl) {
        accountPlanEl.textContent = planName;
    }
    
    // Mettre à jour le nom du plan actuel
    const currentPlanName = document.getElementById('currentPlanName');
    if (currentPlanName) {
        currentPlanName.textContent = planName;
    }
    
    // Mettre à jour la description du plan
    const currentPlanDescription = document.getElementById('currentPlanDescription');
    const planDescriptions = {
        free: 'Accès aux fonctionnalités de base avec 50 tokens gratuits.',
        pro: 'Accès à toutes les analyses avec 500 tokens/mois + 1/jour.',
        enterprise: 'Accès complet à toutes les fonctionnalités avec 5000 tokens/mois + 1/jour, support dédié et formation incluse.'
    };
    if (currentPlanDescription) {
        currentPlanDescription.textContent = planDescriptions[plan] || '';
    }
    
    // Mettre à jour les fonctionnalités affichées
    const currentPlanFeatures = document.getElementById('currentPlanFeatures');
    const planFeaturesMap = {
        free: [
            'Analyses de base',
            '50 tokens gratuits',
            'Accès limité',
            '3 projets maximum'
        ],
        pro: [
            'Toutes les analyses',
            '500 tokens/mois + 1/jour',
            'Rapports détaillés',
            'Projets illimités',
            'Support prioritaire'
        ],
        enterprise: [
            'Toutes les analyses premium',
            '5000 tokens/mois + 1/jour',
            'Support dédié 24/7',
            'Accès API',
            'Formation incluse',
            'Stratégie de croissance externe',
            'Rapports personnalisés'
        ]
    };
    
    if (currentPlanFeatures) {
        const features = planFeaturesMap[plan] || [];
        currentPlanFeatures.innerHTML = features.map(feature => 
            `<li><i class="fas fa-check"></i> ${feature}</li>`
        ).join('');
    }
}

// Toggle password visibility
function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    if (input) {
        if (input.type === 'password') {
            input.type = 'text';
            button.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            input.type = 'password';
            button.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }
}

// Rendre les fonctions disponibles globalement
window.changeEmail = changeEmail;
window.copyReferralCode = copyReferralCode;
window.enableTwoFactor = enableTwoFactor;
window.uploadAvatar = uploadAvatar;
window.deleteAccount = deleteAccount;
window.showDowngradeModal = showDowngradeModal;
window.hideDowngradeModal = hideDowngradeModal;
window.downgradePlan = downgradePlan;
window.togglePasswordVisibility = togglePasswordVisibility;
