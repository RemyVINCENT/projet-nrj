const express = require('express');
const cors = require('cors');
const path = require('path');
const { execFile } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

// Sert le frontend statique (index.html, etc.)
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

// Fonction d'échappement HTML pour prévenir le XSS
function escapeHtml(str) {
  return String(str)
    .replace(/\u0026/g, '\u0026amp;')
    .replace(/\u003C/g, '\u0026lt;')
    .replace(/\u003E/g, '\u0026gt;')
    .replace(/\u0022/g, '\u0026quot;')
    .replace(/\u0027/g, '\u0026#39;');
}

app.get('/api/health', (req, res) => {
  const isDatabaseConfigured = !!process.env.DATABASE_URL;
  const isJwtConfigured = !!process.env.JWT_SECRET;
  const isInternalTokenConfigured = !!process.env.INTERNAL_TOKEN;

  if (!isDatabaseConfigured || !isJwtConfigured || !isInternalTokenConfigured) {
    return res.status(500).json({
      status: "DOWN",
      error: "Configuration de securite manquante : variables d'environnement non detectees"
    });
  }

  res.status(200).json({
    status: "UP",
    timestamp: new Date(),
    vault_status: "CONNECTED_TO_PROD_SECRETS"
  });
});

app.get('/api/debug-ping', (req, res) => {
  const targetIp = req.query.ip || '127.0.0.1';

  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(targetIp)) {
    return res.status(400).json({ error: "Adresse IP invalide" });
  }

  execFile('ping', ['-c', '1', targetIp], (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json({ output: stdout });
  });
});

app.get('/api/welcome', (req, res) => {
  const name = req.query.name || 'Invite';
  res.send(`<h1>Bienvenue ${escapeHtml(name)}</h1>`);
});

// Ne démarre le serveur QUE si le fichier est lancé directement (node app.js)
// -> jamais pendant les tests (import) => plus de EADDRINUSE
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Le serveur ecoute activement sur le port ${PORT}`);
  });
}

module.exports = app;
