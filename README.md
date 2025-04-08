# GhostFiles.rip

**GhostFiles** is a privacy-first file hosting service with **client-side end-to-end encryption**.  
No logins. No cookies. No tracking.

---

## 🔐 Features

- ✅ End-to-end encryption (AES-GCM) in the browser  
- 🢨 Files are auto deleted after 7 days  
- 🔎 Zero-knowledge architecture the server never sees your data

---

## 🚀 Demo

Try it live: [https://ghostfiles.rip](https://ghostfiles.rip)

---

## 🧠 How It Works

1. Select a file in your browser  
2. Enter a password  
3. The file is **encrypted client-side**  
4. You receive a unique download link with an ID  
5. When opened, the file is **decrypted client-side**

---

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, Vanilla JavaScript  
- **Backend:** Node.js + Express  
- **Encryption:** WebCrypto API (AES-GCM)  
- **Metadata Storage:** SQLite (`meta.db`)

---

## ⚙️ Installation

### 🔧 Manual Installation

```bash
# Clone the repository
git clone https://github.com/xByMilow/ghostfiles.git

# Navigate into the project directory
cd ghostfiles

# Install dependencies
npm install

# Start the server
npm start
```

---

### ⚡ Auto Installation (Recommended)

You can automatically install and start GhostFiles using the provided installation script:

```bash
bash <(curl -s https://raw.githubusercontent.com/xByMilow/ghostfiles/refs/heads/main/autoinstall.sh)
```

The script will:

- Install `screen` (if not already installed)  
- Clone the repository into `/home/ghostfiles`  
- Install all dependencies  
- Start the app in a `screen` session named `ghostfiles`  
- Automatically run `/home/ghostfiles/start.sh`

---