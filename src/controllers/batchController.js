const { parse } = require('csv-parse/sync');
const Batch = require('../models/Batch');

exports.list = (req, res) => res.json({ batches: Batch.listByInstitute(req.auth.sub) });

exports.create = (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Batch name is required' });
  try { res.status(201).json({ batch: Batch.create(req.auth.sub, name) }); }
  catch (error) { if (String(error).includes('UNIQUE')) return res.status(409).json({ error: 'Batch already exists' }); throw error; }
};

exports.remove = (req, res) => {
  const result = Batch.remove(req.params.id, req.auth.sub);
  if (!result.changes) return res.status(404).json({ error: 'Batch not found' });
  res.status(204).end();
};

exports.importStudents = (req, res) => {
  const batch = Batch.findOwned(req.params.id, req.auth.sub);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  if (!req.file) return res.status(400).json({ error: 'CSV file is required' });
  try {
    const rows = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
    res.status(201).json({ imported: Batch.importStudents(batch.id, rows) });
  } catch (error) { res.status(400).json({ error: 'Invalid CSV file', details: error.message }); }
};

exports.listStudents = (req, res) => {
  const batch = Batch.findOwned(req.params.id, req.auth.sub);
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  res.json({ students: Batch.listStudents(batch.id) });
};
