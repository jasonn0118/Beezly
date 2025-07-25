import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { ScoreType } from './score-type.entity';

@Entity('User_score')
export class UserScore extends BaseEntity {
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_sk', referencedColumnName: 'userSk' })
  user?: User;

  @Column({ name: 'user_sk', type: 'uuid', nullable: true })
  userSk?: string;

  @ManyToOne(() => ScoreType)
  @JoinColumn({ name: 'score_type', referencedColumnName: 'scoreType' })
  scoreTypeEntity: ScoreType;

  @Column({ name: 'score_type' })
  scoreType: string;

  @Column({ type: 'int' })
  points: number;
}
