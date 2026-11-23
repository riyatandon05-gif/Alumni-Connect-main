const db = require('../config/database');

module.exports = {
  jobs: {
    list() { return db.prepare(`SELECT j.*,u.name AS recruiter_name,u.company_name FROM jobs j JOIN users u ON u.id=j.recruiter_id WHERE j.status='open' ORDER BY j.created_at DESC`).all(); },
    create(recruiterId, data) { const result = db.prepare('INSERT INTO jobs (recruiter_id,title,description,location,job_type) VALUES (?,?,?,?,?)').run(recruiterId, data.title, data.description || null, data.location || null, data.job_type || null); return db.prepare('SELECT * FROM jobs WHERE id=?').get(result.lastInsertRowid); }
  },
  mentorship: {
    listForAlumni(alumniId) { return db.prepare(`SELECT m.*,u.name AS student_name FROM mentorship_requests m JOIN users u ON u.id=m.student_id WHERE m.alumni_id=? OR m.alumni_id IS NULL ORDER BY m.created_at DESC`).all(alumniId); },
    listForStudent(studentId) { return db.prepare(`SELECT m.*,u.name AS alumni_name FROM mentorship_requests m LEFT JOIN users u ON u.id=m.alumni_id WHERE m.student_id=? ORDER BY m.created_at DESC`).all(studentId); },
    create(studentId, data) { const result = db.prepare('INSERT INTO mentorship_requests (student_id,alumni_id,topic,message) VALUES (?,?,?,?)').run(studentId, data.alumni_id || null, data.topic, data.message || null); return db.prepare('SELECT * FROM mentorship_requests WHERE id=?').get(result.lastInsertRowid); },
    findById(id) { return db.prepare('SELECT * FROM mentorship_requests WHERE id=?').get(id); },
    accept(id, alumniId) { db.prepare("UPDATE mentorship_requests SET alumni_id=?,status='accepted' WHERE id=?").run(alumniId, id); return this.findById(id); }
  }
};
