import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface IAdminStepsCreationAttr {
  admin_id: number;
  last_step: string;
  customer_id: number;
}

@Table({ tableName: 'admin_steps' })
export class AdminSteps extends Model<AdminSteps, IAdminStepsCreationAttr> {
  @Column({
    type: DataType.BIGINT,
  })
  admin_id: number;

  @Column({
    type: DataType.STRING,
  })
  last_step: string;

  @Column({
    type: DataType.INTEGER,
  })
  customer_id: number;
}
