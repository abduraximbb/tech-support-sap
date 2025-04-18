import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Appeals } from './models/appeal.model';
import { AppealsService } from './appeal.service';
import { Bot } from 'src/bot/models/bot.model';
import { Calls } from './models/calls.model';
import { Customers } from 'src/admin/models/customer.model';
import { TemporaryDate } from './models/temporary-date.model';
import { TemporaryCustomersIds } from 'src/admin/models/temporary-customers-id.model';

@Module({
  imports: [SequelizeModule.forFeature([Appeals,Bot,Calls,Customers,TemporaryDate,TemporaryCustomersIds])],
  controllers: [],
  providers: [AppealsService],
  exports: [AppealsService],
})
export class AppealsModule {}
