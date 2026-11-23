const fs = require('fs');
const path = require('path');

const dbFile = path.resolve(process.cwd(), process.env.DB_FILE || 'data/alumni-connect.json');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const defaultData = {
  users: [], batches: [], batch_students: [], jobs: [], mentorship_requests: []
};

let data;
try {
  data = fs.existsSync(dbFile) ? JSON.parse(fs.readFileSync(dbFile, 'utf8')) : defaultData;
} catch {
  data = defaultData;
}

function save() {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

function nextId(table) {
  const max = data[table].reduce((highest, row) => Math.max(highest, Number(row.id) || 0), 0);
  return max + 1;
}

function now() {
  return new Date().toISOString();
}

function matchesWhere(row, sql, params) {
  const conditions = [];
  if (/WHERE\s+email=\?\s+AND\s+role=\?/i.test(sql)) {
    conditions.push(row.email === params[0] && row.role === params[1]);
  } else if (/WHERE\s+id=\?\s+AND\s+institute_id=\?/i.test(sql)) {
    conditions.push(Number(row.id) === Number(params[0]) && Number(row.institute_id) === Number(params[1]), true);
  } else if (/WHERE\s+institute_id=\?/i.test(sql)) {
    conditions.push(Number(row.institute_id) === Number(params[0]), true);
  } else if (/WHERE\s+batch_id=\?/i.test(sql)) {
    conditions.push(Number(row.batch_id) === Number(params[0]), true);
  } else if (/WHERE\s+student_id=\?/i.test(sql)) {
    conditions.push(Number(row.student_id) === Number(params[0]), true);
  } else if (/WHERE\s+alumni_id=\?/i.test(sql)) {
    conditions.push(Number(row.alumni_id) === Number(params[0]) || row.alumni_id == null, true);
  } else if (/WHERE\s+id=\?/i.test(sql)) {
    conditions.push(Number(row.id) === Number(params[0]), true);
  }
  return conditions.every(Boolean);
}

function prepare(sql) {
  return {
    run(...params) {
      const trimmed = sql.trim();

      if (/^INSERT INTO users/i.test(trimmed)) {
        const [name, email, password_hash, role, graduation_year, institute, company_name] = params;
        if (data.users.some(user => user.email === email)) throw new Error('UNIQUE constraint failed: users.email');
        const row = { id: nextId('users'), name, email, password_hash, role, graduation_year, institute, company_name, created_at: now(), updated_at: now() };
        data.users.push(row); save(); return { lastInsertRowid: row.id, changes: 1 };
      }

      if (/^INSERT INTO batches/i.test(trimmed)) {
        const [institute_id, name] = params;
        if (data.batches.some(batch => Number(batch.institute_id) === Number(institute_id) && batch.name === name)) throw new Error('UNIQUE constraint failed: batches.institute_id');
        const row = { id: nextId('batches'), institute_id, name, created_at: now() }; data.batches.push(row); save(); return { lastInsertRowid: row.id, changes: 1 };
      }

      if (/^INSERT INTO batch_students/i.test(trimmed)) {
        const [batch_id, name, email, phone, graduation_year, raw_row] = params;
        const row = { id: nextId('batch_students'), batch_id, name, email, phone, graduation_year, raw_row, created_at: now() }; data.batch_students.push(row); save(); return { lastInsertRowid: row.id, changes: 1 };
      }

      if (/^INSERT INTO jobs/i.test(trimmed)) {
        const [recruiter_id, title, description, location, job_type] = params;
        const row = { id: nextId('jobs'), recruiter_id, title, description, location, job_type, status: 'open', created_at: now(), updated_at: now() }; data.jobs.push(row); save(); return { lastInsertRowid: row.id, changes: 1 };
      }

      if (/^INSERT INTO mentorship_requests/i.test(trimmed)) {
        const [student_id, alumni_id, topic, message] = params;
        const row = { id: nextId('mentorship_requests'), student_id, alumni_id: alumni_id || null, topic, message, status: 'open', created_at: now() }; data.mentorship_requests.push(row); save(); return { lastInsertRowid: row.id, changes: 1 };
      }

      if (/^UPDATE users/i.test(trimmed)) {
        const id = params[params.length - 1];
        const user = data.users.find(row => Number(row.id) === Number(id));
        if (!user) return { changes: 0 };
        const fieldMatch = trimmed.match(/SET\s+(.+?),\s*updated_at/i);
        const fields = fieldMatch ? fieldMatch[1].split(',').map(part => part.trim().replace(/\s*=\s*\?/, '').trim()) : [];
        fields.forEach((field, index) => { if (field) user[field] = params[index]; });
        user.updated_at = now(); save(); return { changes: 1 };
      }

      if (/^UPDATE mentorship_requests/i.test(trimmed)) {
        const [alumni_id, id] = params;
        const request = data.mentorship_requests.find(row => Number(row.id) === Number(id));
        if (!request) return { changes: 0 };
        request.alumni_id = alumni_id; request.status = 'accepted'; save(); return { changes: 1 };
      }

      if (/^DELETE FROM batches/i.test(trimmed)) {
        const [id, instituteId] = params;
        const before = data.batches.length;
        data.batches = data.batches.filter(row => !(Number(row.id) === Number(id) && Number(row.institute_id) === Number(instituteId)));
        data.batch_students = data.batch_students.filter(row => !data.batches.some(batch => Number(batch.id) === Number(row.batch_id)));
        save(); return { changes: before - data.batches.length };
      }

      throw new Error(`Unsupported database write: ${trimmed}`);
    },

    get(...params) {
      if (/SELECT \* FROM users WHERE id=/i.test(sql) || /SELECT \* FROM users WHERE id\s*=\?/i.test(sql)) return data.users.find(row => Number(row.id) === Number(params[0])) || undefined;
      if (/SELECT \* FROM users WHERE email=/i.test(sql) || /SELECT \* FROM users WHERE email\s*=\?/i.test(sql)) return data.users.find(row => row.email === params[0] && row.role === params[1]);
      if (/FROM batches WHERE id=/i.test(sql) || /FROM batches WHERE id\s*=\?/i.test(sql)) {
        const batch = data.batches.find(row => Number(row.id) === Number(params[0]) && (params.length === 1 || Number(row.institute_id) === Number(params[1]))); return batch;
      }
      if (/FROM mentorship_requests WHERE id=/i.test(sql) || /FROM mentorship_requests WHERE id\s*=\?/i.test(sql)) return data.mentorship_requests.find(row => Number(row.id) === Number(params[0]));
      if (/SELECT \* FROM batches WHERE id=/i.test(sql)) return data.batches.find(row => Number(row.id) === Number(params[0]));
      return undefined;
    },

    all(...params) {
      if (/FROM users/i.test(sql)) return data.users.filter(row => matchesWhere(row, sql, params));
      if (/FROM batches/i.test(sql)) {
        let rows = data.batches.filter(row => params.length ? matchesWhere(row, sql, params) : true).slice();
        rows = rows.map(batch => ({ ...batch, student_count: data.batch_students.filter(student => Number(student.batch_id) === Number(batch.id)).length })).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
        return rows;
      }
      if (/FROM batch_students/i.test(sql)) return data.batch_students.filter(row => matchesWhere(row, sql, params)).sort((a, b) => Number(a.id) - Number(b.id));
      if (/FROM jobs/i.test(sql)) {
        return data.jobs.filter(job => job.status === 'open').map(job => ({ ...job, ...(() => { const user = data.users.find(row => Number(row.id) === Number(job.recruiter_id)); return { recruiter_name: user?.name, company_name: user?.company_name }; })() })).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      }
      if (/FROM mentorship_requests/i.test(sql)) {
        let rows;
        if (/WHERE m\.alumni_id/i.test(sql)) rows = data.mentorship_requests.filter(request => Number(request.alumni_id) === Number(params[0]) || request.alumni_id == null);
        else rows = data.mentorship_requests.filter(request => Number(request.student_id) === Number(params[0]));
        return rows.map(request => {
          if (/student_name/i.test(sql)) { const student = data.users.find(user => Number(user.id) === Number(request.student_id)); return { ...request, student_name: student?.name }; }
          const alumni = data.users.find(user => Number(user.id) === Number(request.alumni_id)); return { ...request, alumni_name: alumni?.name }; 
        }).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
      }
      return [];
    }
  };
}

const db = {
  pragma() {},
  exec() {},
  prepare,
  transaction(callback) { return (...args) => callback(...args); },
  read() { return data; },
  save(nextData) { data = nextData; fs.writeFileSync(dbFile, JSON.stringify(data, null, 2)); },
  nextId(table) { return nextId(table); }
};

module.exports = db;
