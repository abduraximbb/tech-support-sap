import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function start() {
  try {
    const PORT = process.env.PORT || 3030;
    console.log(PORT);

    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('api');

    await app.listen(PORT, () => {
      console.log(`Server started at: ${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
}
start();
