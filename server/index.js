/**
 * College Course Prerequisite Explorer
 * Express.js Backend Application Entry Point
 */
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { verifyConnectivity, closeDriver } = require('./db');

// Route Modules
const coursesRouter = require('./routes/courses');
const graphRouter = require('./routes/graph');
const eligibilityRouter = require('./routes/eligibility');
const degreesRouter = require('./routes/degrees');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allows React dev/CDN scripts & Cytoscape canvas
  crossOriginEmbedderPolicy: false
}));

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
  : '*';

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'College Course Prerequisite Explorer API'
  });
});

// API Routes
app.use('/api/courses', coursesRouter);
app.use('/api/graph', graphRouter);
app.use('/api/eligibility', eligibilityRouter);
app.use('/api/degrees', degreesRouter);

// Serve static React production build if available
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      // In development when Vite runs separately
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>College Course Explorer API</title><meta charset="utf-8"/></head>
          <body style="font-family:sans-serif;background:#0a0a0f;color:#f1f5f9;padding:40px;text-align:center;">
            <h1>🎓 College Course Prerequisite Explorer API Server</h1>
            <p>API is running on port ${PORT}.</p>
            <p>For the React Frontend, run <code style="background:#1e1e2e;padding:4px 8px;border-radius:4px;">npm run dev</code></p>
          </body>
        </html>
      `);
    }
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(`[Server Error] ${req.method} ${req.url}:`, err.message || err);

  if (err.code === 'DB_UNAVAILABLE' || err.status === 503) {
    return res.status(503).json({
      error: 'Database is currently unavailable. Please verify CognoDB credentials.',
      code: 'DB_UNAVAILABLE',
      details: err.message
    });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error occurred.',
    code: err.code || 'INTERNAL_ERROR'
  });
});

// Start Server & Check DB Connectivity
let server;
async function startServer() {
  await verifyConnectivity();
  server = app.listen(PORT, () => {
    console.log(`🚀 College Course Explorer backend listening at http://localhost:${PORT}`);
  });
}

startServer();

// Graceful Shutdown
async function handleShutdown(signal) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  if (server) {
    server.close(() => {
      console.log('   HTTP server closed.');
    });
  }
  await closeDriver();
  console.log('   Database connections closed.');
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

module.exports = app;
