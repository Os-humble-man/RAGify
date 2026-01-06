import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';
const logDir = path.join(__dirname, 'logs');
const securityLogDir = path.join(logDir, 'security');

export const logSecurityEvent = (
   req: any,
   eventType: string,
   details: string
) => {
   const logEntry = {
      timestamp: new Date().toISOString(),
      event: eventType,
      ip: req.ip,
      xForwardedFor: req.headers['x-forwarded-for'],
      method: req.method,
      path: req.path,
      userAgent: req.get('User-Agent'),
      details: details,
      requestId:
         req.headers['x-request-id'] || crypto.randomBytes(8).toString('hex'),
   };

   const logLine = JSON.stringify(logEntry) + '\n';

   // Write to the security log file
   fs.appendFileSync(path.join(securityLogDir, 'security_events.log'), logLine);

   if (isProduction) {
      console.warn(
         `🔒 SECURITY: ${eventType} - ${req.ip} - ${req.method} ${req.path}`
      );
   }
};
