const express = require('express');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'queen-of-peace-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

const DATA_DIR = path.join(__dirname, 'data');
const VOL_FILE = path.join(DATA_DIR, 'volunteers.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const HOURS_FILE = path.join(DATA_DIR, 'hours.json');

function readJSON(file, defaultValue){
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return defaultValue;
  }
}
function writeJSON(file, data){
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Ensure files exist
if (!fs.existsSync(VOL_FILE)) writeJSON(VOL_FILE, []);
if (!fs.existsSync(EVENTS_FILE)) writeJSON(EVENTS_FILE, []);
if (!fs.existsSync(HOURS_FILE)) writeJSON(HOURS_FILE, []);

// Simple admin credentials (for demo purposes)
const ADMIN_USER = { username: 'bryandaw', password: 'bryandaw' };

// Serve static frontend
app.use('/', express.static(path.join(__dirname, 'public')));

// Auth endpoints
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
    req.session.isAdmin = true;
    return res.json({ ok: true, message: 'Logged in as admin' });
  }
  return res.status(401).json({ ok: false, message: 'Invalid credentials' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

function requireAdmin(req, res, next){
  if (req.session && req.session.isAdmin) return next();
  return res.status(403).json({ ok: false, message: 'Admin required' });
}

// Volunteers endpoints
app.get('/api/volunteers', requireAdmin, (req, res) => {
  const vols = readJSON(VOL_FILE, []);
  res.json(vols);
});

app.post('/api/volunteers', requireAdmin, (req, res) => {
  const vols = readJSON(VOL_FILE, []);
  const { firstName, lastName, email } = req.body;
  if (!email) return res.status(400).json({ ok: false, message: 'Email required' });
  const id = Date.now().toString();
  const v = { id, firstName: firstName||'', lastName: lastName||'', email };
  vols.push(v);
  writeJSON(VOL_FILE, vols);
  res.json({ ok: true, volunteer: v });
});

// Bulk CSV upload: expects CSV in body field 'file' (multipart)
app.post('/api/volunteers/bulk', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, message: 'No file uploaded' });
  const text = req.file.buffer.toString('utf8');
  // very simple CSV parse: lines, comma separated: firstName,lastName,email
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length>0);
  const vols = readJSON(VOL_FILE, []);
  const added = [];
  for (const line of lines) {
    const parts = line.split(',');
    if (parts.length < 3) continue;
    const [firstName, lastName, email] = parts.map(s => s.trim());
    if (!email) continue;
    const id = Date.now().toString() + Math.random().toString(36).slice(2,8);
    const v = { id, firstName, lastName, email };
    vols.push(v);
    added.push(v);
  }
  writeJSON(VOL_FILE, vols);
  res.json({ ok: true, added });
});

// Events
app.get('/api/events', (req, res) => {
  const events = readJSON(EVENTS_FILE, []);
  res.json(events);
});

app.post('/api/events', requireAdmin, (req, res) => {
  const events = readJSON(EVENTS_FILE, []);
  const { title, date, location, capacity } = req.body;
  if (!title) return res.status(400).json({ ok: false, message: 'Title required' });
  const id = Date.now().toString();
  const e = { id, title, date: date||'', location: location||'', capacity: Number(capacity)||0, attendees: [] };
  events.push(e);
  writeJSON(EVENTS_FILE, events);
  res.json({ ok: true, event: e });
});

// Register volunteer for event
app.post('/api/events/:id/register', (req, res) => {
  const events = readJSON(EVENTS_FILE, []);
  const vols = readJSON(VOL_FILE, []);
  const event = events.find(ev => ev.id === req.params.id);
  if (!event) return res.status(404).json({ ok: false, message: 'Event not found' });
  const { volunteerEmail } = req.body;
  if (!volunteerEmail) return res.status(400).json({ ok: false, message: 'volunteerEmail required' });
  const volunteer = vols.find(v => v.email === volunteerEmail);
  if (!volunteer) return res.status(404).json({ ok: false, message: 'Volunteer not found' });
  if (event.attendees.find(a => a === volunteer.id)) return res.status(400).json({ ok: false, message: 'Already registered' });
  if (event.capacity && event.attendees.length >= event.capacity) return res.status(400).json({ ok: false, message: 'Event full' });
  event.attendees.push(volunteer.id);
  writeJSON(EVENTS_FILE, events);
  res.json({ ok: true, event });
});

// Hours
app.post('/api/hours', (req, res) => {
  // volunteer logs hours for an event
  const { volunteerEmail, eventId, hours, notes } = req.body;
  if (!volunteerEmail || !hours) return res.status(400).json({ ok: false, message: 'volunteerEmail and hours required' });
  const vols = readJSON(VOL_FILE, []);
  const volunteer = vols.find(v => v.email === volunteerEmail);
  if (!volunteer) return res.status(404).json({ ok: false, message: 'Volunteer not found' });
  const events = readJSON(EVENTS_FILE, []);
  const ev = events.find(e => e.id === eventId) || null;
  const hrs = readJSON(HOURS_FILE, []);
  const entry = { id: Date.now().toString() + Math.random().toString(36).slice(2,6), volunteerId: volunteer.id, volunteerEmail, eventId: eventId||null, eventTitle: ev?ev.title:null, hours: Number(hours), notes: notes||'', date: new Date().toISOString() };
  hrs.push(entry);
  writeJSON(HOURS_FILE, hrs);
  res.json({ ok: true, entry });
});

app.get('/api/hours', requireAdmin, (req, res) => {
  const hrs = readJSON(HOURS_FILE, []);
  res.json(hrs);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Queen of Peace app listening on http://localhost:${PORT}`);
});