import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AdminServise } from './admin.service';
import { Appeals } from 'src/appeal/models/appeal.model';
import { Calls } from 'src/appeal/models/calls.model';

@Module({
  imports: [SequelizeModule.forFeature([Appeals,Calls])],
  controllers: [],
  providers: [AdminServise],
  exports: [AdminServise],
})
export class AdminModule {}
