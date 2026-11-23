require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-change-this-secret';

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const publicDir = path.resolve(__dirname, '..');
app.use(express.static(publicDir));

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    req.auth = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function allowRoles(...roles) {
  return (req, res, next) => roles.includes(req.auth.role)
    ? next()
    : res.status(403).json({ error: 'Insufficient permissions' });
}

function publicUser(row) {
  if (!row) return null;
  const { password_hash, ...user } = row;
  return user;
}

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/signup', (req, res) => {
  const { name, email, password, role, graduation_year, institute, company_name } = req.body;
  const allowedRoles = ['Recruiter', 'Alumni', 'Student', 'Institute'];
  if (!name || !email || !password || !allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Name, email, password and a valid role are required' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  try {
    const result = db.prepare(`INSERT INTO users
      (name, email, password_hash, role, graduation_year, institute, company_name)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      name.trim(), normalizedEmail, bcrypt.hashSync(password, 12), role,
      graduation_year || null, institute || null, company_name || null
    );
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    if (String(error).includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered' });
    console.error(error);
    res.status(500).json({ error: 'Could not create account' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password and role are required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND role = ?')
    .get(String(email).trim().toLowerCase(), role);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials or role' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

app.patch('/api/profile', authenticate, (req, res) => {
  const allowed = ['name', 'graduation_year', 'institute', 'company_name'];
  const fields = allowed.filter(key => req.body[key] !== undefined);
  if (!fields.length) return res.status(400).json({ error: 'No profile fields supplied' });
  const setClause = fields.map(field => `${field} = ?`).join(', ');
  const values = fields.map(field => req.body[field]);
  db.prepare(`UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(...values, req.auth.sub);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth.sub);
  res.json({ user: publicUser(user) });
});

app.get('/api/batches', authenticate, allowRoles('Institute'), (req, res) => {
  const batches = db.prepare(`
    SELECT b.*, (SELECT COUNT(*) FROM batch_students s WHERE s.batch_id = b.id) AS student_count
    FROM batches b WHERE b.institute_id = ? ORDER BY b.created_at DESC
  `).all(req.auth.sub);
  res.json({ batches });
});

app.post('/api/batches', authenticate, allowRoles('Institute'), (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Batch name is required' });
  try {
    const result = db.prepare('INSERT INTO batches (institute_id, name) VALUES (?, ?)')
      .run(req.auth.sub, name);
    res.status(201).json({ batch: db.prepare('SELECT * FROM batches WHERE id = ?').get(result.lastInsertRowid) });
  } catch (error) {
    if (String(error).includes('UNIQUE')) return res.status(409).json({ error: 'Batch already exists' });
    throw error;
  }
});

app.delete('/api/batches/:id', authenticate, allowRoles('Institute'), (req, res) => {
  const result = db.prepare('DELETE FROM batches WHERE id = ? AND institute_id = ?')
    .run(req.params.id, req.auth.sub);
  if (!result.changes) return res.status(404).json({ error: 'Batch not found' });
  res.status(204).end();
});

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.originalname.toLowerCase().endsWith('.csv'))
});

app.post('/api/batches/:id/students', authenticate, allowRoles('Institute'), csvUpload.single('file'), (req, res) => {
  const batch = db.prepare('SELECT * FROM batches WHERE id = ? AND institute_id = ?')
    .get(req.params.id, req.auth.sub);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  if (!req.file) return res.status(400).json({ error: 'CSV file is required' });
  try {
    const rows = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
    const insert = db.prepare(`INSERT INTO batch_students
      (batch_id, name, email, phone, graduation_year, raw_row) VALUES (?, ?, ?, ?, ?, ?)`);
    const insertMany = db.transaction(items => {
      items.forEach(row => {
        const normalized = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v]));
        insert.run(batch.id,
          normalized.name || normalized.fullname || null,
          normalized.email || null,
          normalized.phone || normalized.mobile || null,
          normalized.graduation_year || normalized.year || null,
          JSON.stringify(row)
        );
      });
    });
    insertMany(rows);
    res.status(201).json({ imported: rows.length });
  } catch (error) {
    res.status(400).json({ error: 'Invalid CSV file', details: error.message });
  }
});

app.get('/api/batches/:id/students', authenticate, allowRoles('Institute'), (req, res) => {
  const batch = db.prepare('SELECT * FROM batches WHERE id = ? AND institute_id = ?')
    .get(req.params.id, req.auth.sub);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  const students = db.prepare('SELECT * FROM batch_students WHERE batch_id = ? ORDER BY id').all(batch.id);
  res.json({ students });
});

app.get('/api/jobs', authenticate, (req, res) => {
  const jobs = db.prepare(`SELECT j.*, u.name AS recruiter_name, u.company_name
    FROM jobs j JOIN users u ON u.id = j.recruiter_id
    WHERE j.status = 'open' ORDER BY j.created_at DESC`).all();
  res.json({ jobs });
});

app.post('/api/jobs', authenticate, allowRoles('Recruiter'), (req, res) => {
  const { title, description, location, job_type } = req.body;
  if (!title) return res.status(400).json({ error: 'Job title is required' });
  const result = db.prepare(`INSERT INTO jobs
    (recruiter_id, title, description, location, job_type) VALUES (?, ?, ?, ?, ?)`) 
    .run(req.auth.sub, title, description || null, location || null, job_type || null);
  res.status(201).json({ job: db.prepare('SELECT * FROM jobs WHERE id = ?').get(result.lastInsertRowid) });
});

app.get('/api/mentorship', authenticate, (req, res) => {
  let requests;
  if (req.auth.role === 'Alumni') {
    requests = db.prepare(`SELECT m.*, u.name AS student_name
      FROM mentorship_requests m JOIN users u ON u.id = m.student_id
      WHERE m.alumni_id = ? OR m.alumni_id IS NULL ORDER BY m.created_at DESC`).all(req.auth.sub);
  } else if (req.auth.role === 'Student') {
    requests = db.prepare(`SELECT m.*, u.name AS alumni_name
      FROM mentorship_requests m LEFT JOIN users u ON u.id = m.alumni_id
      WHERE m.student_id = ? ORDER BY m.created_at DESC`).all(req.auth.sub);
  } else {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  res.json({ requests });
});

app.post('/api/mentorship', authenticate, allowRoles('Student'), (req, res) => {
  const { topic, message, alumni_id } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic is required' });
  const result = db.prepare(`INSERT INTO mentorship_requests
    (student_id, alumni_id, topic, message) VALUES (?, ?, ?, ?)`) 
    .run(req.auth.sub, alumni_id || null, topic, message || null);
  res.status(201).json({ request: db.prepare('SELECT * FROM mentorship_requests WHERE id = ?').get(result.lastInsertRowid) });
});

app.patch('/api/mentorship/:id/accept', authenticate, allowRoles('Alumni'), (req, res) => {
  const request = db.prepare('SELECT * FROM mentorship_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.alumni_id && request.alumni_id !== req.auth.sub) {
    return res.status(403).json({ error: 'Request belongs to another mentor' });
  }
  db.prepare(`UPDATE mentorship_requests SET alumni_id = ?, status = 'accepted' WHERE id = ?`)
    .run(req.auth.sub, req.params.id);
  res.json({ request: db.prepare('SELECT * FROM mentorship_requests WHERE id = ?').get(req.params.id) });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));

app.listen(PORT, () => {
  console.log(`Alumni Connect backend running at http://localhost:${PORT}`);
});
