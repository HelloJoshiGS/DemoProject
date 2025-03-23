// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findOne({ username: decoded.username });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid Token' });
  }
};