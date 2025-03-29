import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from './handler/logger.service';

async function start() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(LoggerService); // 🟢 LoggerService ni NestJS ichidan olish

  try {
    const PORT = process.env.PORT || 3030;

    app.setGlobalPrefix('api');
    
    await app.listen(PORT);
    logger.logInfo(`✅ Server started at: ${PORT}`);
    console.log(`✅ Server started at: ${PORT}`);
  } catch (error) {
    logger.logError(`❌ Server start error: ${error.message}`);
    console.error('❌ Server start error:', error);
  }
}

start();
