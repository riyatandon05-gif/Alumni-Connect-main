const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function publicUser(row) { if (!row) return null; const { password_hash, ...user } = row; return user; }
function signToken(user) { return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET || 'development-only-change-this-secret', { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }); }

exports.signup = (req, res) => {
  const { name, email, password, role, graduation_year, institute, company_name } = req.body;
  const allowedRoles = ['Recruiter', 'Alumni', 'Student', 'Institute'];
  if (!name || !email || !password || !allowedRoles.includes(role)) return res.status(400).json({ error: 'Name, email, password and a valid role are required' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const user = User.create({ name: name.trim(), email: String(email).trim().toLowerCase(), password_hash: bcrypt.hashSync(password, 12), role, graduation_year, institute, company_name });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (error) {
    if (String(error).includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Could not create account' });
  }
};

exports.login = (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) return res.status(400).json({ error: 'Email, password and role are required' });
  const user = User.findByEmailAndRole(String(email).trim().toLowerCase(), role);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials or role' });
  res.json({ token: signToken(user), user: publicUser(user) });
};

exports.me = (req, res) => {
  const user = User.findById(req.auth.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
};

exports.updateProfile = (req, res) => {
  const allowed = ['name', 'graduation_year', 'institute', 'company_name'];
  const fields = allowed.filter(field => req.body[field] !== undefined);
  if (!fields.length) return res.status(400).json({ error: 'No profile fields supplied' });
  const user = User.updateProfile(req.auth.sub, fields, fields.map(field => req.body[field]));
  res.json({ user: publicUser(user) });
};
