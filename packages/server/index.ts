import express from 'express';
import dotenv from 'dotenv';
import 'reflect-metadata';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import './strategies/google.strategy';
import './strategies/github.strategy';

import { errorHandler } from './middleware/errorHandler';
import { makeApiRouter } from './routes';
import { swaggerDocs } from './utils/swagger';
import helmet from 'helmet';
import crypto from 'crypto';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { logger, requestLogger } from './middleware/logger';
import morgan from 'morgan';
import { maliciousBots, sensitivePaths } from './utils/sensitivePaths';
import { logSecurityEvent } from './utils/logSecurityEvent';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// Validation of required environment variables
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0 && isProduction) {
   console.error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
   process.exit(1);
}

const logDir = path.join(__dirname, 'logs');
const securityLogDir = path.join(logDir, 'security');

if (!fs.existsSync(logDir)) {
   fs.mkdirSync(logDir, { recursive: true });
}
if (!fs.existsSync(securityLogDir)) {
   fs.mkdirSync(securityLogDir, { recursive: true });
}

// Security middlewareapp.use(
app.use(
   helmet({
      contentSecurityPolicy: {
         directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: [
               "'self'",
               "'unsafe-inline'",
               'https://fonts.googleapis.com',
            ],
            imgSrc: ["'self'", 'data:', 'https:'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
         },
      },
      hidePoweredBy: true,
      hsts: {
         maxAge: 31536000,
         includeSubDomains: true,
         preload: true,
      },
      noSniff: true,
      xssFilter: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-site' },
   })
);

// Protection against scanning attacks
app.use((req, res, next) => {
   const path = req.path.toLowerCase();
   const userAgent = req.get('User-Agent') || '';

   // Check sensitive paths
   for (const sensitivePath of sensitivePaths) {
      if (
         path.includes(sensitivePath.replace('/', '')) ||
         path === sensitivePath
      ) {
         logSecurityEvent(req, 'TENTATIVE_ACCES_CHEMIN_SENSIBLE', path);
         return res.status(404).json({
            error: 'Not Found',
            timestamp: new Date().toISOString(),
         });
      }
   }

   // Check malicious bots
   for (const bot of maliciousBots) {
      if (userAgent.toLowerCase().includes(bot)) {
         logSecurityEvent(req, 'MALICIOUS_BOT_DETECTED', userAgent);
         return res.status(403).json({
            error: 'Forbidden',
            timestamp: new Date().toISOString(),
         });
      }
   }

   // Protection against directory traversal
   if (path.includes('../') || path.includes('..\\')) {
      logSecurityEvent(req, 'DIRECTORY_TRAVERSAL_ATTEMPT', path);
      return res.status(400).json({
         error: 'Bad Request',
         timestamp: new Date().toISOString(),
      });
   }

   next();
});

// CORS configuration

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
   'http://localhost:3000',
   'https://www.ragifyapp.live',
   'https://ragifyapp.live',
];

app.use(
   cors({
      origin: (origin, callback) => {
         // Allow requests without origin (like mobile apps)
         if (!origin) return callback(null, true);

         if (allowedOrigins.indexOf(origin) === -1) {
            const msg = `L'origine ${origin} n'est pas autorisée par CORS`;
            logger.warn(`CORS_VIOLATION: ${msg}`);
            return callback(new Error(msg), false);
         }
         return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
      maxAge: 86400, // 24 h
   })
);

// Rate limiting by route type
const generalLimiter = rateLimit({
   windowMs: 15 * 60 * 1000, // 15 minutes
   max: isProduction ? 100 : 1000,
   message: {
      error: 'Too many requests from this IP',
      timestamp: new Date().toISOString(),
      retryAfter: '15 minutes',
   },
   standardHeaders: true,
   legacyHeaders: false,
   skip: (req) => req.ip === '127.0.0.1', // Do not limit localhost
});

const authLimiter = rateLimit({
   windowMs: 15 * 60 * 1000, // 15 minutes
   max: isProduction ? 10 : 50, // Stricter limit for authentication
   message: {
      error: 'Too many authentication attempts',
      timestamp: new Date().toISOString(),
      retryAfter: '15 minutes',
   },
   standardHeaders: true,
   legacyHeaders: false,
});

app.use(generalLimiter);
app.use(`${API_PREFIX}/auth`, authLimiter);

// Compression
app.use(
   compression({
      filter: (req, res) => {
         if (req.headers['x-no-compression']) {
            return false;
         }
         return compression.filter(req, res);
      },
      level: 6,
      threshold: 1024, // Seuil minimal de 1KB
   })
);

// Parsing middleware
app.use(
   express.json({
      limit: '10mb',
      verify: (req, res, buf) => {
         // Vérifier le type de contenu
         try {
            JSON.parse(buf.toString());
         } catch (e) {
            logSecurityEvent(req, 'JSON_INVALIDE', 'JSON mal formé');
            throw new Error('Invalid JSON');
         }
      },
   })
);

app.use(
   express.urlencoded({
      extended: true,
      limit: '10mb',
      parameterLimit: 100, // Limit the number of parameters
   })
);

// Cookie parser for authentication
app.use(
   cookieParser(
      process.env.COOKIE_SECRET || crypto.randomBytes(64).toString('hex')
   )
);

// Passport initialization
app.use(passport.initialize());

// security event logging function

app.use((req, res, next) => {
   req.headers['x-request-id'] = crypto.randomBytes(8).toString('hex');
   next();
});

// Request logging
app.use(requestLogger);
app.use(
   morgan(isProduction ? 'combined' : 'dev', {
      stream: {
         write: (msg) => {
            logger.info(msg.trim());
            // Also write to a file
            if (isProduction) {
               fs.appendFileSync(
                  path.join(logDir, 'access.log'),
                  `[${new Date().toISOString()}] ${msg}`
               );
            }
         },
      },
      skip: (req) => {
         // Ignore health checks in logs
         return req.path === '/health' || req.path === `${API_PREFIX}/health`;
      },
   })
);
// === HEALTH CHECK ===
app.get('/health', (req, res) => {
   const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
   };
   res.json(healthData);
});

app.get(`${API_PREFIX}/health`, (req, res) => {
   const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      api: 'online',
      database: 'connected', // To be adapted with a DB ping
   };
   res.json(healthData);
});
// API routes
makeApiRouter(app);

app.use(errorHandler);

// Swagger configuration (only in development)
if (!isProduction) {
   swaggerDocs(app, Number(PORT));
}

// Server startup
const server = app.listen(PORT, '0.0.0.0', () => {
   logger.info(`=========================================`);
   logger.info(`🚀 Server started successfully`);
   logger.info(`📡 Port: ${PORT}`);
   logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
   logger.info(`🔒 Secure mode: ${isProduction ? 'ACTIVE' : 'DEVELOPMENT'}`);
   logger.info(`📊 API Prefix: ${API_PREFIX}`);
   logger.info(`📁 Logs: ${logDir}`);
   logger.info(`⏰ Time: ${new Date().toISOString()}`);
   logger.info(`=========================================`);

   if (!isProduction) {
      logger.info(`📚 Documentation API: http://localhost:${PORT}/api-docs`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
   }
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
   logger.info(`\n📭 Signal ${signal} received, shutting down server...`);

   // Close open connections
   server.close((err) => {
      if (err) {
         logger.error('Error closing server:', err);
         process.exit(1);
      }

      logger.info('✅ Server stopped gracefully');
      // Flush logs
      logger.info('💾 Saving logs...');

      process.exit(0);
   });

   // Forced shutdown after 30 seconds
   setTimeout(() => {
      logger.error('⏰ Forced shutdown after timeout');
      process.exit(1);
   }, 30000);
};

// Listen for shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (error) => {
   logger.error('🚨 Uncaught exception:', error);

   // Log the error to a file
   const crashLog = `[${new Date().toISOString()}] CRASH: ${error.message}\n${error.stack}\n`;
   fs.appendFileSync(path.join(logDir, 'crashes.log'), crashLog);

   process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
   logger.error('🚨 Unhandled promise rejection:', reason);

   const rejectionLog = `[${new Date().toISOString()}] UNHANDLED_REJECTION: ${reason}\n`;
   fs.appendFileSync(path.join(logDir, 'rejections.log'), rejectionLog);
});

export default app;
