import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from './handler/logger.service';
import { AllExceptionsFilter } from './handler/global-logger';

async function start() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(LoggerService);

  // 🔥 Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  // 🔥 Node.js global xatoliklar
  process.on('uncaughtException', (err) => {
    logger.logError('Uncaught Exception', err);
  });

  process.on('unhandledRejection', (reason: any) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.logError('Unhandled Rejection', error);
  });

  try {
    const PORT = process.env.PORT || 3030;
    app.setGlobalPrefix('api');

    await app.listen(PORT);
    logger.logInfo(`✅ Server started at: ${PORT}`);
    console.log(`✅ Server started at: ${PORT}`);
  } catch (error) {
    logger.logError(`❌ Server start error: ${error.message}`, error);
    console.error('❌ Server start error:', error);
  }
}

start();
