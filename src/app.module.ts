import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BOT_NAME } from './app.constants';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { BotModule } from './bot/bot.module';
import { Bot } from './bot/models/bot.model';
import { Appeals } from './appeal/models/appeal.model';
import { Customers } from './admin/models/customer.model';
import { Calls } from './appeal/models/calls.model';
import { TemporaryDate } from './appeal/models/temporary-date.model';
import { Weekly_reminder } from './bot/models/weekly-reminder.model';
import { LoggerModule } from './handler/logger.module';
import { TemporaryCustomersIds } from './admin/models/temporary-customers-id.model';
import { AdminSteps } from './admin/models/admin-steps.model';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      botName: BOT_NAME,
      useFactory: () => ({
        token: process.env.BOT_TOKEN,
        include: [],
      }),
    }),
    ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true }),
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      models: [
        Bot,
        Appeals,
        Customers,
        Calls,
        TemporaryDate,
        Weekly_reminder,
        TemporaryCustomersIds,
        AdminSteps,
      ],
      autoLoadModels: true,
      sync: { alter: true }, //force
      logging: false,
    }),
    BotModule,
    LoggerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
