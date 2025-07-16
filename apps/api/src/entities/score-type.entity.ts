import { Entity, Column, OneToMany, PrimaryColumn } from 'typeorm';
import { UserScore } from './user-score.entity';

@Entity('Score_type')
export class ScoreType {
  @PrimaryColumn({ name: 'score_type' })
  scoreType: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ name: 'default_points', type: 'int', nullable: true })
  defaultPoints?: number;

  // Relationships
  @OneToMany(() => UserScore, (userScore) => userScore.scoreTypeEntity)
  userScores: UserScore[];
}