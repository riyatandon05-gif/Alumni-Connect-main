const db = require('../config/database');

module.exports = {
  create(data) {
    const result = db.prepare(`INSERT INTO users (name,email,password_hash,role,graduation_year,institute,company_name) VALUES (?,?,?,?,?,?,?)`).run(data.name, data.email, data.password_hash, data.role, data.graduation_year || null, data.institute || null, data.company_name || null);
    return this.findById(result.lastInsertRowid);
  },
  findByEmailAndRole(email, role) { return db.prepare('SELECT * FROM users WHERE email=? AND role=?').get(email, role); },
  findById(id) { return db.prepare('SELECT * FROM users WHERE id=?').get(id); },
  updateProfile(id, fields, values) { db.prepare(`UPDATE users SET ${fields.map(field => `${field}=?`).join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(...values, id); return this.findById(id); }
};
