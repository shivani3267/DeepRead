const AuditLog = require('../models/AuditLog');

const logAction = async ({ userId = null, action, details = {}, req = null }) => {
  try {
    const ip = req ? req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress : '';
    const userAgent = req ? req.headers['user-agent'] || '' : '';

    await AuditLog.create({
      userId,
      action,
      details,
      ip,
      userAgent,
    });
  } catch (error) {
    console.error('[Audit Log Error]:', error.message);
  }
};

module.exports = {
  logAction,
};
