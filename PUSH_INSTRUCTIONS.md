# Instructions pour pusher dpai_web vers un nouveau dépôt

## Option 1: GitHub (recommandé)

### 1. Créer un nouveau dépôt sur GitHub
- Allez sur https://github.com/new
- Nom du dépôt: `dpai_web`
- Description: "DPAI Web Application - Analyse stratégique"
- Public ou Private: selon votre préférence
- **Ne pas** initializer avec README, .gitignore ou license

### 2. Ajouter le remote et pusher

Ouvrez un terminal dans `/c/dev/dpai_clean/dpai_web` et exécutez:

```bash
# Vous êtes déjà dans dpai_web qui a un dépôt git initialisé
git remote add origin https://github.com/VOTRE_NOM_UTILISATEUR/dpai_web.git
git branch -M main
git push -u origin main
```

Si vous avez une authentification 2FA, vous devrez peut-être utiliser un token personnel.

---

## Option 2: GitLab

### 1. Créer un nouveau dépôt sur GitLab
- Allez sur https://gitlab.com/projects/new
- Nom du dépôt: `dpai_web`
- **Ne pas** initializer avec README

### 2. Ajouter le remote et pusher

```bash
cd /c/dev/dpai_clean/dpai_web
git remote add origin git@gitlab.com:VOTRE_NOM_UTILISATEUR/dpai_web.git
git branch -M main
git push -u origin main
```

---

## Option 3: Railway (pour déploiement direct)

Si vous voulez déployer directement sur Railway:

### 1. Installer Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Créer un nouveau projet
```bash
cd /c/dev/dpai_clean/dpai_web
railway new
# Suivre les instructions
```

### 3. Déployer
```bash
railway up
```

---

## Vérification

Après le push, vérifiez que tout est là:
```bash
git log --oneline
git status
```

---

## Notes importantes

- Le dépôt est déjà initialisé avec un commit "Initial commit - DPAI Web Application"
- Tous les fichiers de dpai_web sont prêts à être poussés
- Les fichiers de test (test-results.html, test_analysis.html) sont inclus mais peuvent être supprimés si vous voulez

---

## Si vous avez des problèmes

### Problème: Remote existe déjà
Si vous voyez "remote origin already exists", exécutez d'abord:
```bash
git remote remove origin
```

### Problème: Authentication failed
Si l'authentification échoue, utilisez un Personal Access Token:
1. Générez un token sur GitHub/GitLab
2. Utilisez: `git push https://VOTRE_NOM:TOKEN@github.com/VOTRE_NOM/dpai_web.git`

### Problème: Refusing to overwrite
Si GitHub refuse à cause d'une divergence:
```bash
git push -u origin main --force
# OU (plus sûr)
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## Structure du projet

Le dépôt contient:
- `/` - Fichiers HTML principaux
- `/css/` - Styles CSS
- `/js/` - JavaScript (dashboard, analyses, Stripe, etc.)
- `/assets/` - Images et ressources
- `analysis-results.html` - Nouvelle page pour les résultats d'analyse

---

## Après le push

Une fois poussé, vous pouvez:
1. Partager le lien du dépôt
2. Configurer GitHub Pages pour le déploiement web
3. Connecter à Railway/Netlify/Vercel pour le déploiement automatique

---

## Configuration Stripe

N'oubliez pas de configurer:
1. Votre clé publique Stripe dans `js/firebase-config.js`
2. Vos Price IDs dans `js/stripe-service.js`
3. Un backend (Firebase Functions ou Railway) pour valider les paiements

Voir le fichier `STRIPE_SETUP.md` (à créer) pour plus de détails.
