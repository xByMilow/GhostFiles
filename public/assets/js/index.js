document.addEventListener("DOMContentLoaded", () => {
  const elements = {
    generateBtn: document.getElementById("generateBtn"),
    uploadBtn: document.getElementById("uploadBtn"),
    fileInput: document.getElementById("file"),
    passwordInput: document.getElementById("password"),
    progressBar: document.getElementById("progressBar"),
    status: document.getElementById("status"),
    toggleBtn: document.getElementById("togglePassword"),
    copyBtn: document.getElementById("copyPassword"),
    fileCount: document.getElementById("fileCount"),
    storageUsed: document.getElementById("storageUsed"),
    nodeRamUsage: document.getElementById("nodeRamUsage"),
    clearTimer: document.getElementById("clearTimer"),
    strength: document.getElementById("strength"),
    resultBox: document.getElementById("resultBox"),
    copyLinkBtn: document.getElementById("copyLinkBtn"),
    reloadBtn: document.getElementById("reloadBtn"),
  };

  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}|;:',.<>/?`~";

  elements.generateBtn.addEventListener("click", () => {
    const length = parseInt(elements.strength.value);
    elements.passwordInput.value = Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
  });

  elements.toggleBtn.addEventListener("click", () => {
    const isHidden = elements.passwordInput.type === "password";
    elements.passwordInput.type = isHidden ? "text" : "password";
    elements.toggleBtn.querySelector("img").src = "/assets/icons/eye.png";
  });

  elements.copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(elements.passwordInput.value);
      const img = elements.copyBtn.querySelector("img");
      img.src = "/assets/icons/success.png";
      setTimeout(() => img.src = "/assets/icons/copy.png", 1500);
    } catch {
      elements.copyBtn.querySelector("img").src = "/assets/icons/error.png";
    }
  });

  elements.copyLinkBtn?.addEventListener("click", async () => {
    const linkText = document.getElementById("resultLink")?.value;
    if (!linkText) return;
    try {
      await navigator.clipboard.writeText(linkText);
      elements.copyLinkBtn.querySelector("img").src = "/assets/icons/success.png";
      setTimeout(() => elements.copyLinkBtn.querySelector("img").src = "/assets/icons/copy.png", 1500);
    } catch {
      elements.copyLinkBtn.querySelector("img").src = "/assets/icons/error.png";
    }
  });

  elements.reloadBtn?.addEventListener("click", () => {
    window.location.reload();
  });

  async function upload() {
    const { files } = elements.fileInput;
    const password = elements.passwordInput.value;

    elements.resultBox.innerHTML = "";
    if (!files.length) return alert("Please select a file.");
    if (!password) return alert("Please enter or generate a password.");

    const file = files[0];

    if (file.size > 100 * 1024 * 1024) {
      updateProgress(0, "❌ File too large (max. 100MB).");
      return;
    }

    updateProgress(5, "🔐 Encrypting file...");

    try {
      const pwBuffer = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest("SHA-512", pwBuffer);
      const pwHash = arrayBufferToBase64(hashBuffer);

      const key = await crypto.subtle.importKey("raw", hashBuffer.slice(0, 32), { name: "AES-GCM" }, false, ["encrypt"]);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const fileBuffer = await file.arrayBuffer();

      const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, fileBuffer);
      const encryptedBlob = new Blob([iv, new Uint8Array(encrypted)]);

      const formData = new FormData();
      formData.append("file", encryptedBlob, file.name);
      formData.append("passwordhash", pwHash);
      formData.append("encrypted", "true");

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/upload", true);

      const startTime = Date.now();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          const speed = (e.loaded / (1024 * 1024)) / elapsedSeconds; // MB/s
          updateProgress(percent, `⬆️ Uploading... ${percent}% (${speed.toFixed(2)} MB/s)`);
        }
      });

      xhr.onload = () => {
        if (xhr.status === 200) {
          const { link } = JSON.parse(xhr.responseText);
          showResult(link);
          updateProgress(100, "✅ Upload successful.");
        } else {
          const { error } = JSON.parse(xhr.responseText);
          updateProgress(0, `❌ ${error || "Upload failed."}`);
        }
      };

      xhr.onerror = () => {
        updateProgress(0, "❌ Upload failed (network error).");
      };

      xhr.send(formData);
    } catch (err) {
      console.error("Upload error:", err);
      updateProgress(0, `❌ ${err.message || "Upload failed."}`);
    }
  }

  function showResult(link) {
    const resultHTML = `
      <div class="result-wrapper">
        <input type="text" id="resultLink" value="${location.origin}${link}" readonly>
        <button id="copyLinkBtn" title="Copy link"><img src="/assets/icons/copy.png" alt="Copy"></button>
        <button id="reloadBtn" title="Reload"><img src="/assets/icons/reload.png" alt="Reload"></button>
      </div>
    `;
    elements.resultBox.innerHTML = resultHTML;

    // Rebind copy and reload
    elements.copyLinkBtn = document.getElementById("copyLinkBtn");
    elements.resultLink = document.getElementById("resultLink");
    elements.reloadBtn = document.getElementById("reloadBtn");

    elements.copyLinkBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(elements.resultLink.value);
        elements.copyLinkBtn.querySelector("img").src = "/assets/icons/success.png";
        setTimeout(() => elements.copyLinkBtn.querySelector("img").src = "/assets/icons/copy.png", 1500);
      } catch {
        elements.copyLinkBtn.querySelector("img").src = "/assets/icons/error.png";
      }
    });

    elements.reloadBtn.addEventListener("click", () => {
      window.location.reload();
    });
  }

  function updateProgress(percent, message) {
    elements.progressBar.style.width = `${percent}%`;
    elements.status.innerHTML = message;
  }

  function arrayBufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  async function fetchStats() {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();

      elements.fileCount.textContent = data.files;
      elements.storageUsed.textContent = `${(+data.storageUsed).toFixed(2)} MB`;
      elements.nodeRamUsage.textContent = `${(+data.nodeRam).toFixed(2)} MB`;

      updateClearTimer(data.clearAt);
    } catch (err) {
      console.error("Failed to fetch server stats:", err);
    }
  }

  function updateClearTimer(clearAt) {
    const diff = Math.max(0, clearAt - Date.now());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
    const minutes = Math.floor(diff / (1000 * 60)) % 60;
    elements.clearTimer.textContent = `${days}d ${hours}h ${minutes}m`;
  }

  elements.uploadBtn.addEventListener("click", upload);
  fetchStats();
  setInterval(fetchStats, 5000);
});
