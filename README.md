# Système de Gestion de Mémorisation du Coran

Un système simple et intuitif pour gérer les étudiants, l'assiduité et les progrès de mémorisation, avec un support complet pour la langue arabe et un portail dédié pour les parents.

## 🚀 Comment démarrer l'application (Guide Débutant)

### 1. Configurer la base de données (Firebase)
L'application doit être connectée à votre propre projet Firebase pour fonctionner. Suivez ces étapes :

1. Allez sur la [Console Firebase](https://console.firebase.google.com/) et créez un nouveau projet.
2. **Activer Firestore :** Dans le menu latéral (Build), choisissez **Firestore Database** et cliquez sur **Create Database**. Choisissez "Start in test mode".
3. **Activer l'Authentification :** Dans le menu latéral, choisissez **Authentication** puis activez l'option **Email/Password**.
4. **Obtenir la Configuration :**
   - Cliquez sur l'icône de l'engrenage (Project Settings).
   - Dans la section "Your apps", ajoutez une nouvelle application Web (`</>`).
   - Copiez l'objet `firebaseConfig`.

### 2. Connecter le code aux données
- Ouvrez le fichier `src/firebase.js` dans votre code.
- Remplacez les valeurs existantes par celles que vous avez copiées depuis la console Firebase.

### 3. Créer le compte Administrateur (Admin)
Pour accéder au panneau d'administration :
1. Créez un utilisateur dans Firebase Authentication (Email/Mot de passe).
2. Copiez son **UID**.
3. Dans Firestore, créez une collection nommée `teachers`.
4. Ajoutez un document avec l'**UID** comme nom de document, et ajoutez à l'intérieur un champ `role: "admin"`.

### 4. Lancer l'application localement
Dans le dossier du projet, exécutez les commandes suivantes :
```bash
npm install
npm run dev
```
Ouvrez votre navigateur à l'adresse `http://localhost:5173`.

---
Développé par Antigravity (Google Deepmind)
