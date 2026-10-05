# Connect Pro — Bureau & Assistance à Distance Sécurisée

Application personnelle et sécurisée de contrôle d'ordinateur à distance par code à 6 chiffres, flux WebRTC chiffré de bout en bout, transmission souris/clavier, chat intégré et transfert de fichiers bidirectionnel.

---

## 🚀 Démarrage Ultra-Rapide sur Windows (2 Ordinateurs)

### 1. Sur le PC A (Hôte / Machine à contrôler)
* Double-cliquez sur `demarrer-windows.bat` (ou tapez `npm install && npm run dev` dans un terminal).
* L'application s'ouvre sur `http://localhost:3000`.
* Notez votre **code de connexion à 6 chiffres** (ex: `724 918`).

### 2. Sur le PC B (Client / Machine de contrôle)
* Ouvrez votre navigateur et entrez l'adresse IP locale du PC A : `http://[IP_DU_PC_A]:3000` (ex: `http://192.168.1.45:3000`).
* Entrez le code à 6 chiffres du PC A et cliquez sur **Se connecter**.
* Une alerte de sécurité apparaît sur le PC A pour accepter le contrôle.
* Dès l'acceptation, l'écran apparaît en plein écran avec contrôle en temps réel.

---

## 🌐 Déploiement en Ligne (Render.com / Railway / Docker)

### Déploiement sur Render.com (100% Gratuit)
1. Créez un compte gratuit sur [Render.com](https://render.com).
2. Cliquez sur **New +** > **Web Service**.
3. Liez ce dépôt GitHub.
4. Remplissez les champs suivants :
   * **Language :** `Node`
   * **Build Command :** `npm install && npm run build`
   * **Start Command :** `npm start`
   * **Environment Variables :** `NODE_VERSION` = `22`
5. Cliquez sur **Create Web Service**.

### Déploiement avec Docker
```bash
docker build -t connect-pro .
docker run -p 3000:3000 connect-pro
```

---

## 🛡️ Sécurité & Confidentialité
* Aucun mot de passe permanent par défaut : code PIN temporaire renouvelable en 1 clic.
* Validation explicite obligatoire par popup de confirmation avant tout accès.
* Révocation instantanée en cliquant sur le bouton d'urgence « Déconnecter ».
* Flux vidéo et données transmis en Peer-to-Peer direct (WebRTC DTLS/SRTP).
