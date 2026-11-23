const Platform = require('../models/Platform');

exports.listDirectory = (req, res) => {
  const role = ['Alumni', 'Student', 'Recruiter', 'Institute'].includes(req.query.role) ? req.query.role : null;
  res.json({ users: Platform.listDirectory(role) });
};
exports.listEvents = (req, res) => res.json({ events: Platform.listEvents() });
exports.createEvent = (req, res) => {
  if (!req.body.title) return res.status(400).json({ error: 'Event title is required' });
  res.status(201).json({ event: Platform.createEvent(req.body) });
};
exports.listMessages = (req, res) => res.json({ messages: Platform.listMessages() });
exports.listApplications = (req, res) => res.json({ applications: Platform.listApplications(req.auth.sub) });
exports.applyToJob = (req, res) => {
  if (!req.body.job_id) return res.status(400).json({ error: 'Job ID is required' });
  const result = Platform.applyToJob(req.auth.sub, req.body.job_id);
  if (result.duplicate) return res.status(409).json({ error: 'You have already applied' });
  res.status(201).json({ application: result });
};
exports.listSavedJobs = (req, res) => res.json({ saved_jobs: Platform.listSavedJobs(req.auth.sub) });
exports.toggleSavedJob = (req, res) => {
  if (!req.body.job_id) return res.status(400).json({ error: 'Job ID is required' });
  res.json(Platform.toggleSavedJob(req.auth.sub, req.body.job_id));
};
exports.createMessage = (req, res) => {
  const senderId = req.auth?.sub || req.body.sender_id || 1;
  const message = Platform.createMessage(senderId, req.body.message);
  if (!message) return res.status(400).json({ error: 'Message cannot be empty' });
  res.status(201).json({ message });
};
