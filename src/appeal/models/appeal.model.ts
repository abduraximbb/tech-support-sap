import { Column, DataType, Model, Table } from 'sequelize-typescript';

export enum ImportanceLevel {
  LOW = 'low', // Past daraja
  MEDIUM = 'medium', // O‘rta daraja
  HIGH = 'high', // Yuqori daraja
}

export enum Status {
  ORDERING = 'ordering',
  WAITING = 'waiting',
  COMPLETED = 'completed',
}

// Media fayl obyekti interfeysi
interface IMedia {
  key: string;
  file_name: string;
}

// IAppealCreationAttr interfeys
interface IAppealCreationAttr {
  id: number;
  user_id: number;
  sap_id: number;
  text: string;
  media: IMedia[]; // Media fayllarni array sifatida saqlash
  importance_level: ImportanceLevel; // Enum turiga bog‘lash
  status: Status;
  answered_time: Date;
  company_name: string;
  name: string;
  answer_bal: number;
}

@Table({ tableName: 'appeals' })
export class Appeals extends Model<Appeals, IAppealCreationAttr> {
  @Column({
    type: DataType.BIGINT,
    primaryKey: true,
  })
  id: number;

  @Column({
    type: DataType.BIGINT,
  })
  user_id: number;

  @Column({
    type: DataType.BIGINT,
  })
  sap_id: number;

  @Column({
    type: DataType.TEXT,
  })
  text: string;

  @Column({
    type: DataType.JSONB, // Media array ichida objectlar sifatida saqlanadi
    defaultValue: [], // Standart bo‘sh array
  })
  media: IMedia[];

  @Column({
    type: DataType.ENUM(...Object.values(ImportanceLevel)), // ENUM qiymatlari
    allowNull: false,
    defaultValue: ImportanceLevel.MEDIUM, // Standart qiymat o‘rta daraja
  })
  importance_level!: ImportanceLevel;

  @Column({
    type: DataType.ENUM(...Object.values(Status)), // ENUM qiymatlari
    allowNull: false,
    defaultValue: Status.ORDERING, // Standart qiymat o‘rta daraja
  })
  status!: Status;

  @Column({
    type: DataType.DATE,
  })
  answered_time: Date;

  @Column({
    type: DataType.STRING,
  })
  company_name: string;

  @Column({
    type: DataType.STRING,
  })
  name: string;

  @Column({
    type: DataType.INTEGER,
  })
  answer_bal: number;
}
