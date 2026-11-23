const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try { req.auth = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'development-only-change-this-secret'); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired token' }); }
}

function allowRoles(...roles) {
  return (req, res, next) => roles.includes(req.auth.role) ? next() : res.status(403).json({ error: 'Insufficient permissions' });
}

module.exports = { authenticate, allowRoles };
