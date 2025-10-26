const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'queenofpeace_secret_key',
  resave: false,
  saveUninitialized: true
}));

// First admin
const ADMIN_USER = 'fbffc64';
const ADMIN_PASS = 'fbffc64';

// Ensure data folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const volunteersFile = path.join(dataDir, 'volunteers.json');
const eventsFile = path.join(dataDir, 'events.json');

// Ensure JSON files exist
function ensureFile(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]');
    console.log(`Created ${path.basename(filePath)}`);
  }
}
ensureFile(volunteersFile);
ensureFile(eventsFile);

// Routes
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.user = username;
    res.json({ success: true, redirect: '/admin.html' });
  } else {
    res.json({ success: false, message: 'Invalid credentials' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.post('/add-volunteers', (req, res) => {
  if (!req.session.user) return res.status(403).json({ error: 'Unauthorized' });
  let volunteers = JSON.parse(fs.readFileSync(volunteersFile));
  const { name, email } = req.body;
  volunteers.push({ name, email });
  fs.writeFileSync(volunteersFile, JSON.stringify(volunteers, null, 2));
  res.json({ success: true });
});

app.post('/add-event', (req, res) => {
  if (!req.session.user) return res.status(403).json({ error: 'Unauthorized' });
  let events = JSON.parse(fs.readFileSync(eventsFile));
  const { title, date } = req.body;
  events.push({ title, date });
  fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2));
  res.json({ success: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => console.log(`Queen of Peace app listening on port ${PORT}`));
