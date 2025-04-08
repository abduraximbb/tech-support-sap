import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface ITemporaryCustomersId {
  admin_id: number;
  customer_id: number;
  appeal_id: number;
}

@Table({ tableName: 'temporary_customers_ids' })
export class TemporaryCustomersIds extends Model<
  TemporaryCustomersIds,
  ITemporaryCustomersId
> {
  @Column({
    type: DataType.BIGINT,
  })
  admin_id: number;

  @Column({
    type: DataType.BIGINT,
  })
  customer_id: number;

  @Column({
    type: DataType.BIGINT,
  })
  appeal_id: number;
}
