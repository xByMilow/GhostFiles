// Secure File Server with Upload Limit, Clear & Reload CLI
const express = require("express");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const fse = require("fs-extra");
const readline = require("readline");
const checkDiskSpace = require("check-disk-space").default;

const app = express();
const PORT = 2397;
const dataPath = path.join(__dirname, "data.json");
const CLEAR_INTERVAL_HOURS = 168;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const upload = multer({
  dest: "temp/",
  limits: { fileSize: MAX_FILE_SIZE },
});

const db = new sqlite3.Database("meta.db");
db.run(`CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  filename TEXT,
  ext TEXT,
  passwordhash TEXT,
  encrypted INTEGER
)`);

// Middleware
app.use(helmet());
app.use(express.static("public"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.set("trust proxy", 1);

const limiter = rateLimit({ windowMs: 1 * 60 * 1000, max: 30 });
app.use(limiter);

app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large" });
  }
  next(err);
});

function generateId(length) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function moveFile(oldPath, newPath) {
  return new Promise((resolve, reject) => {
    fs.rename(oldPath, newPath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const encrypted = req.body.encrypted === "true";
    const ext = path.extname(req.file.originalname).slice(0, 10);

    if (encrypted) {
      const passwordHash = req.body.passwordhash;
      if (!passwordHash || passwordHash.length !== 88) {
        fse.removeSync(req.file.path);
        return res.status(400).json({ error: "Invalid password hash" });
      }

      const id = crypto.randomBytes(16).toString("hex");
      const newPath = path.join("files", `${id}.aes`);
      await moveFile(req.file.path, newPath);

      db.run(
        `INSERT INTO files (id, filename, ext, passwordhash, encrypted) VALUES (?, ?, ?, ?, 1)`,
        [id, req.file.originalname, ext, passwordHash],
        () => res.json({ link: `/upload/${id}` })
      );
    } else {
      const id = generateId(8);
      const newPath = path.join("files", `${id}${ext}`);
      await moveFile(req.file.path, newPath);

      db.run(
        `INSERT INTO files (id, filename, ext, passwordhash, encrypted) VALUES (?, ?, ?, '', 0)`,
        [id, req.file.originalname, ext],
        () => res.json({ link: `/upload/${id}` })
      );
    }
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/upload/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "download.html"));
});

app.get("/api/file/:id", (req, res) => {
  const id = req.params.id.replace(/[^a-z0-9]/gi, "");
  if (id.length < 8 || id.length > 64) return res.status(400).send("Invalid ID");

  db.get(`SELECT * FROM files WHERE id = ?`, [id], (err, row) => {
    if (!row) return res.status(404).send("Not found");

    const filePath = row.encrypted
      ? path.join("files", `${id}.aes`)
      : path.join("files", `${id}${row.ext}`);

    if (!fs.existsSync(filePath)) return res.status(404).send("Missing file");

    res.setHeader("X-Filename", encodeURIComponent(row.filename));
    res.download(filePath, row.filename);
  });
});

app.get("/api/meta/:id", (req, res) => {
  const id = req.params.id.replace(/[^a-z0-9]/gi, "");
  if (id.length < 8 || id.length > 64) return res.status(400).send("Invalid ID");

  db.get(`SELECT filename FROM files WHERE id = ?`, [id], (err, row) => {
    if (!row) return res.status(404).send("Not found");
    res.json({ filename: row.filename });
  });
});

function getFolderSize(folderPath) {
  let totalSize = 0;
  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const stats = fs.statSync(path.join(folderPath, file));
    if (stats.isFile()) totalSize += stats.size;
  }
  return totalSize / (1024 * 1024);
}

async function getDiskUsage() {
  try {
    const diskSpace = await checkDiskSpace("/");
    const total = diskSpace.size / 1024 / 1024 / 1024;
    const used = (diskSpace.size - diskSpace.free) / 1024 / 1024 / 1024;
    return {
      total: isNaN(total) ? 0 : total,
      used: isNaN(used) ? 0 : used,
    };
  } catch (e) {
    return { total: 0, used: 0 };
  }
}

function getClearAtTimestamp() {
  try {
    if (fs.existsSync(dataPath)) {
      const json = JSON.parse(fs.readFileSync(dataPath));
      if (json.clearAt) return json.clearAt;
    }
  } catch {}
  return Date.now() + CLEAR_INTERVAL_HOURS * 60 * 60 * 1000;
}

app.get("/api/stats", async (req, res) => {
  try {
    const filesEnc = fs.readdirSync("files");
    const filesEncCount = filesEnc.length;
    const filesEncSize = getFolderSize("files");
    const nodeRam = process.memoryUsage().rss / (1024 * 1024);
    const clearAt = getClearAtTimestamp();

    res.json({
      files: filesEncCount,
      storageUsed: filesEncSize.toFixed(2),
      nodeRam: nodeRam.toFixed(2),
      clearAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get stats" });
  }
});

function initClearTimer() {
  let data = { clearAt: null };
  if (fs.existsSync(dataPath)) {
    data = JSON.parse(fs.readFileSync(dataPath));
  }
  if (!data.clearAt) {
    const clearAt = Date.now() + CLEAR_INTERVAL_HOURS * 60 * 60 * 1000;
    data.clearAt = clearAt;
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  }
}

function getTimeUntilClear() {
  const data = JSON.parse(fs.readFileSync(dataPath));
  const now = Date.now();
  const remaining = Math.max(0, data.clearAt - now);
  const minutes = Math.floor(remaining / (1000 * 60)) % 60;
  const hours = Math.floor(remaining / (1000 * 60 * 60)) % 24;
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  return { days, hours, minutes };
}

setInterval(() => {
  const { days, hours, minutes } = getTimeUntilClear();
  console.log(`⏳ Time until clear: ${days}d ${hours}h ${minutes}min`);
}, 1000);

function clearAllData() {
  fse.emptyDirSync(path.join(__dirname, "files"));
  db.run("DELETE FROM files");
  const newClearAt = Date.now() + CLEAR_INTERVAL_HOURS * 60 * 60 * 1000;
  fs.writeFileSync(dataPath, JSON.stringify({ clearAt: newClearAt }, null, 2));
  console.log("🧹 Manual clear executed. Next reset at:", new Date(newClearAt).toLocaleString());
}

function reloadServer() {
  console.log("🔁 Reloading server state and static content...");
  initClearTimer();
  console.log("✅ Reload complete.");
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "> " });
rl.prompt();
rl.on("line", (line) => {
  const input = line.trim().toLowerCase();
  if (input === "clear") {
    console.log("⚠️  Clear command received...");
    clearAllData();
  } else if (input === "reload") {
    console.log("🔁 Reload command received...");
    reloadServer();
  } else {
    console.log(`❓ Unknown command: ${input}`);
  }
  rl.prompt();
});

initClearTimer();
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
