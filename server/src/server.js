import http from 'http';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';
import { initSockets } from './sockets/index.js';

async function main() {
  await connectDB();
  const app = createApp();
  const server = http.createServer(app);
  const io = initSockets(server);
    app.set('io', io);

  server.listen(env.port, () => console.log(`Server listening on port ${env.port}`));

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    io.close();
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});