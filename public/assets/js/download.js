const id = window.location.pathname.split("/").pop();
const statusEl = document.getElementById("status");
const progressBar = document.getElementById("progressBar");

async function startDownload() {
  const password = document.getElementById("password").value;
  if (!password) return alert("Passwort eingeben");

  statusEl.textContent = "Lade Datei-Metadaten...";
  progressBar.style.width = "10%";

  // Dateiname über Meta-API holen
  const metaRes = await fetch(`/api/meta/${id}`);
  if (!metaRes.ok) {
    statusEl.textContent = "Fehler beim Laden der Metadaten.";
    return;
  }
  const meta = await metaRes.json();
  const filename = meta.filename || "file.bin";

  statusEl.textContent = "Lade verschlüsselte Datei...";
  progressBar.style.width = "30%";

  const response = await fetch(`/api/file/${id}`);
  const encryptedData = await response.arrayBuffer();

  progressBar.style.width = "50%";
  statusEl.textContent = "Berechne Hash & entschlüssle...";

  const enc = new TextEncoder();
  const pwHash = await crypto.subtle.digest("SHA-512", enc.encode(password));
  const keyBytes = new Uint8Array(pwHash).slice(0, 32);
  const keyMaterial = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);

  const iv = new Uint8Array(encryptedData.slice(0, 12));
  const data = encryptedData.slice(12);

  try {
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, keyMaterial, data);
    progressBar.style.width = "100%";
    statusEl.textContent = "Download wird vorbereitet...";

    const blob = new Blob([decrypted]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    statusEl.textContent = "✅ Download abgeschlossen.";
  } catch (err) {
    console.error("Entschlüsselungsfehler:", err);
    progressBar.style.width = "0%";
    statusEl.textContent = "❌ Entschlüsselung fehlgeschlagen.";
  }
}

document.getElementById('downloadButton').addEventListener('click', startDownload);