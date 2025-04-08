import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface ICustomersCreationAttr {
  customer_name: string;
  customer_id: number;
  short_name: string;
  customer_group_id: number;
}

@Table({ tableName: 'customers' })
export class Customers extends Model<Customers, ICustomersCreationAttr> {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  })
  id: number;

  @Column({
    type: DataType.STRING,
  })
  customer_name: string;

  @Column({
    type: DataType.BIGINT,
  })
  customer_id: number;

  @Column({
    type: DataType.STRING,
  })
  short_name: string;

  @Column({
    type: DataType.BIGINT,
  })
  customer_group_id: number;
}
