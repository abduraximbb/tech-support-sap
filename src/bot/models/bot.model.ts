import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface IBotCreationAttr {
  user_id: number;
  name: string;
  language: string;
  last_step: string;
  phone: string;
  id: number;
  company_name:string
}

@Table({ tableName: 'users' })
export class Bot extends Model<Bot, IBotCreationAttr> {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
  })
  user_id: number;

  @Column({
    type: DataType.STRING,
  })
  phone: string;

  @Column({
    type: DataType.STRING,
  })
  name: string;

  @Column({
    type: DataType.BIGINT,
  })
  sap_id: number;

  @Column({
    type: DataType.STRING,
  })
  language: string;

  @Column({
    type: DataType.STRING,
    defaultValue: false,
  })
  last_step: string;

  @Column({
    type: DataType.STRING,
  })
  company_name: string;
}
