import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AdminServise } from './admin.service';
import { Appeals } from 'src/appeal/models/appeal.model';
import { Calls } from 'src/appeal/models/calls.model';
import { TemporaryCustomersIds } from './models/temporary-customers-id.model';
import { Bot } from 'src/bot/models/bot.model';
import { AdminSteps } from './models/admin-steps.model';
import { Customers } from './models/customer.model';

@Module({
  imports: [SequelizeModule.forFeature([Appeals,Calls,TemporaryCustomersIds,Bot,AdminSteps,Customers])],
  controllers: [],
  providers: [AdminServise],
  exports: [AdminServise],
})
export class AdminModule {}
