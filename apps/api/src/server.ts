import { createApp } from './app.js';
import { env } from './config/env.js';
import { disconnectPrisma } from './lib/prisma.js';
import { logger } from './lib/logger.js';

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info('server_started', { port: env.port, environment: env.nodeEnv });
});

function shutdown(signal: string): void {
  logger.info('server_shutdown_requested', { signal });

  server.close(async (error) => {
    if (error) {
      logger.error('server_shutdown_failed', { error });
      process.exitCode = 1;
    }

    try {
      await disconnectPrisma();
    } catch (disconnectError) {
      logger.error('prisma_disconnect_failed', { error: disconnectError });
      process.exitCode = 1;
    }

    process.exit(process.exitCode ?? 0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  logger.error('uncaught_exception', { error });
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', { error: reason });
});
