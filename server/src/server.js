const app = require('./app');
const config = require('./config/env');
const connectDB = require('./config/db');

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(config.port, () => {
      console.log(`[DeepRead Server] Running in ${config.nodeEnv} mode on port ${config.port}`);
      console.log(`[DeepRead Server] Local access: http://localhost:${config.port}`);
    });

    const shutdown = async (signal) => {
      console.log(`[DeepRead Server] ${signal} received. Initiating graceful shutdown...`);
      server.close(() => {
        console.log('[DeepRead Server] HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[DeepRead Server Startup Error]:', error);
    process.exit(1);
  }
};

startServer();
