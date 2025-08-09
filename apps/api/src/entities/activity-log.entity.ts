import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { ScoreType } from './score-type.entity';

@Entity('Activity_log')
@Index(['userSk'])
@Index(['activityType'])
@Index(['createdAt'])
export class ActivityLog extends BaseEntity {
  @Column({ name: 'user_sk', type: 'uuid' })
  userSk: string;

  @Column({ name: 'activity_type' })
  activityType: string;

  @Column({ name: 'points_awarded', type: 'int' })
  pointsAwarded: number;

  @Column({ name: 'reference_id', nullable: true })
  referenceId?: string;

  @Column({ name: 'reference_type', nullable: true })
  referenceType?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Relationships
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_sk', referencedColumnName: 'userSk' })
  user: User;

  @ManyToOne(() => ScoreType, { nullable: false })
  @JoinColumn({ name: 'activity_type', referencedColumnName: 'scoreType' })
  scoreType: ScoreType;
}
