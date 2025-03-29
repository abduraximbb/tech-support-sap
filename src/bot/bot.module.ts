import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { Bot } from './models/bot.model';
import { BotUpdate } from './bot.update';
import { AppealsModule } from 'src/appeal/appeal.module';
import { AdminModule } from 'src/admin/admin.module';
import { Customers } from 'src/admin/models/customer.model';
import { Weekly_reminder } from './models/weekly-reminder.model';

@Module({
  imports: [SequelizeModule.forFeature([Bot,Customers,Weekly_reminder]),AppealsModule,AdminModule],
  controllers: [],
  providers: [BotService,BotUpdate],
})
export class BotModule {}
