const dbStore = require('../config/database');

function read() { return dbStore.read(); }
function save(data) { dbStore.save(data); }
function nextId(rows) { return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1; }

module.exports = {
  read,
  save,
  listEvents() { return read().events || []; },
  createEvent(data) {
    const db = read(); db.events ||= [];
    const event = { id: nextId(db.events), title: data.title, description: data.description || '', date: data.date || '', location: data.location || '', image: data.image || '', created_at: new Date().toISOString() };
    db.events.push(event); save(db); return event;
  },
  listDirectory(role) {
    const db = read();
    return db.users.filter(user => !role || user.role === role).map(({ password_hash, ...user }) => user);
  },
  listMessages() { const db = read(); return (db.chat_messages || []).slice(-100); },
  createMessage(senderId, message) {
    const db = read(); db.chat_messages ||= [];
    const sender = db.users.find(user => Number(user.id) === Number(senderId));
    const row = { id: nextId(db.chat_messages), sender_id: senderId, sender_name: sender?.name || 'Member', sender_role: sender?.role || '', avatar: sender?.avatar || '', message: String(message).trim(), created_at: new Date().toISOString() };
    if (!row.message) return null;
    db.chat_messages.push(row); save(db); return row;
  },
  listApplications(studentId) { const db = read(); return (db.applications || []).filter(item => Number(item.student_id) === Number(studentId)); },
  applyToJob(studentId, jobId) {
    const db = read(); db.applications ||= [];
    if (db.applications.some(item => Number(item.student_id) === Number(studentId) && Number(item.job_id) === Number(jobId))) return { duplicate: true };
    const application = { id: nextId(db.applications), student_id: studentId, job_id: jobId, status: 'Applied', created_at: new Date().toISOString() };
    db.applications.push(application); save(db); return application;
  },
  listSavedJobs(studentId) { const db = read(); return (db.saved_jobs || []).filter(item => Number(item.student_id) === Number(studentId)); },
  toggleSavedJob(studentId, jobId) {
    const db = read(); db.saved_jobs ||= [];
    const index = db.saved_jobs.findIndex(item => Number(item.student_id) === Number(studentId) && Number(item.job_id) === Number(jobId));
    if (index >= 0) { db.saved_jobs.splice(index, 1); save(db); return { saved: false }; }
    const item = { id: nextId(db.saved_jobs), student_id: studentId, job_id: jobId, created_at: new Date().toISOString() };
    db.saved_jobs.push(item); save(db); return { saved: true };
  }
};
