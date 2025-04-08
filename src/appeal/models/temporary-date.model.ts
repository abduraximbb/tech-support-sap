import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface ITemporaryDateCreationAttr {
  user_id: number;
  date: number[]; // Massivda faqat number yoki string bo‘lishi mumkin
}

@Table({ tableName: 'temporary_date' })
export class TemporaryDate extends Model<
  TemporaryDate,
  ITemporaryDateCreationAttr
> {
  @Column({
    type: DataType.BIGINT,
  })
  user_id: number;

  @Column({
    type: DataType.JSON, // JSON sifatida saqlanadi
  })
  date: number[];
}
