import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('User_daily_activity')
@Index(['activityDate'])
export class UserDailyActivity {
  @PrimaryColumn({ name: 'user_sk', type: 'uuid' })
  userSk: string;

  @PrimaryColumn({ name: 'activity_date', type: 'date' })
  activityDate: string; // YYYY-MM-DD format

  @Column({ name: 'points_earned', type: 'int', default: 0 })
  pointsEarned: number;

  @Column({ name: 'activities_count', type: 'int', default: 0 })
  activitiesCount: number;

  @Column({
    name: 'created_at',
    type: 'timestamp with time zone',
    default: () => 'now()',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp with time zone',
    default: () => 'now()',
  })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_sk', referencedColumnName: 'userSk' })
  user: User;
}
