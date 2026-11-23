const Resource = require('../models/Resource');

exports.listJobs = (req, res) => res.json({ jobs: Resource.jobs.list() });
exports.createJob = (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Job title is required' });
  res.status(201).json({ job: Resource.jobs.create(req.auth.sub, req.body) });
};

exports.listMentorship = (req, res) => {
  if (req.auth.role === 'Alumni') return res.json({ requests: Resource.mentorship.listForAlumni(req.auth.sub) });
  if (req.auth.role === 'Student') return res.json({ requests: Resource.mentorship.listForStudent(req.auth.sub) });
  res.status(403).json({ error: 'Insufficient permissions' });
};
exports.createMentorship = (req, res) => {
  if (!req.body.topic) return res.status(400).json({ error: 'Topic is required' });
  res.status(201).json({ request: Resource.mentorship.create(req.auth.sub, req.body) });
};
exports.acceptMentorship = (req, res) => {
  const request = Resource.mentorship.findById(req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  if (request.alumni_id && request.alumni_id !== req.auth.sub) return res.status(403).json({ error: 'Request belongs to another mentor' });
  res.json({ request: Resource.mentorship.accept(req.params.id, req.auth.sub) });
};
