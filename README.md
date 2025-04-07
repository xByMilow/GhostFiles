# 🧊 GhostFiles.rip

**GhostFiles** is a privacy-focused file hosting service with client-side end-to-end encryption.  
⚔️ No logins. No cookies. No tracking. Just you and your file.

---

## 🔐 Features

- ✅ End-to-end encryption (AES-256) directly in the browser
- 🌍 Decentralized storage via dynamic nodes
- 🧨 Files are securely overwritten and auto-deleted after 7 days
- 📉 Rate limiting and abuse protection built-in
- 🔎 Zero-knowledge architecture – the server never sees your data

---

## 🚀 Demo

Try it live: [ghostfiles.rip](https://ghostfiles.rip)

---

## 🧠 How it works

1. Select a file in your browser
2. Enter a password
3. The file is **encrypted client-side**
4. You get a unique download link with an ID
5. When opened, the file is **decrypted client-side** and reconstructed

---

## 🛠️ Tech Stack

- Frontend: HTML, CSS, JavaScript (Vanilla)
- Backend: Node.js + Express
- Encryption: WebCrypto API (AES-GCM)
- Storage: Randomized file nodes
- Meta data: SQLite (`meta.db`)

---

## 📂 Folder Structure

/public ├── index.html ├── decrypt.html ├── style.css └── script.js

/server ├── server.js └── meta.db

/files-enc └── [encrypted files]

yaml
Kopieren
Bearbeiten

---

## ⚙️ Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/ghostfiles.git

# Go into the project directory
cd ghostfiles

# Install server dependencies
npm install

# Start the server
npm start
