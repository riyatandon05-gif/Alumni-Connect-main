const db = require('../config/database');

module.exports = {
  listByInstitute(instituteId) { return db.prepare(`SELECT b.*, (SELECT COUNT(*) FROM batch_students s WHERE s.batch_id=b.id) AS student_count FROM batches b WHERE b.institute_id=? ORDER BY b.created_at DESC`).all(instituteId); },
  create(instituteId, name) { const result = db.prepare('INSERT INTO batches (institute_id,name) VALUES (?,?)').run(instituteId, name); return db.prepare('SELECT * FROM batches WHERE id=?').get(result.lastInsertRowid); },
  findOwned(id, instituteId) { return db.prepare('SELECT * FROM batches WHERE id=? AND institute_id=?').get(id, instituteId); },
  remove(id, instituteId) { return db.prepare('DELETE FROM batches WHERE id=? AND institute_id=?').run(id, instituteId); },
  importStudents(batchId, rows) {
    const insert = db.prepare('INSERT INTO batch_students (batch_id,name,email,phone,graduation_year,raw_row) VALUES (?,?,?,?,?,?)');
    const transaction = db.transaction(items => items.forEach(row => {
      const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value]));
      insert.run(batchId, normalized.name || normalized.fullname || null, normalized.email || null, normalized.phone || normalized.mobile || null, normalized.graduation_year || normalized.year || null, JSON.stringify(row));
    }));
    transaction(rows); return rows.length;
  },
  listStudents(batchId) { return db.prepare('SELECT * FROM batch_students WHERE batch_id=? ORDER BY id').all(batchId); }
};
