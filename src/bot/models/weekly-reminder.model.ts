import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface IWeeklyReminderCreationAttr {
  text: string;
  video_id: string;
}

@Table({ tableName: 'weekly_reminder', timestamps: false })
export class Weekly_reminder extends Model<
  Weekly_reminder,
  IWeeklyReminderCreationAttr
> {
  @Column({
    type: DataType.TEXT,
  })
  text: string;

  @Column({
    type: DataType.STRING,
  })
  video_id: string;
}
