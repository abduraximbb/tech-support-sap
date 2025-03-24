import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface ICallsCreationAttr {
  id: number;
  user_id: number;
  sap_id:number
  phone: string;
  company_name: string;
  name: string;
}

@Table({ tableName: 'calls' })
export class Calls extends Model<Calls, ICallsCreationAttr> {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.INTEGER,
  })
  user_id: number;

  @Column({
    type: DataType.INTEGER,
  })
  sap_id: number;

  @Column({
    type: DataType.STRING,
  })
  phone: string;

  @Column({
    type: DataType.STRING,
  })
  company_name: string;

  @Column({
    type: DataType.STRING,
  })
  name: string;
}
