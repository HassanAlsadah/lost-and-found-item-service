// ============================================
// Factor 15: Authentication & Authorization
// Verify JWT on every incoming request
// Zero Trust — never assume traffic is safe
// ============================================

const jwt = require('jsonwebtoken');
const logger = require('./logger');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId, email: decoded.email };
    next();
  } catch (err) {
    logger.warn({ err: err.message }, 'Invalid token');
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
