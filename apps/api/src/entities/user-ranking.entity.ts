import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum RankTier {
  BUZZLING_EGG = 'buzzling_egg',
  TINY_LARVA = 'tiny_larva',
  COZY_PUPA = 'cozy_pupa',
  NEW_BEE = 'new_bee',
  NECTAR_NIBBLER = 'nectar_nibbler',
  STICKY_GATHERER = 'sticky_gatherer',
  HIVE_HOARDER = 'hive_hoarder',
  QUEENS_ATTENDANT = 'queens_attendant',
  QUEEN_BEE = 'queen_bee',
  LEGENDARY_QUEEN = 'legendary_queen',
  THE_BEEZLY = 'the_beezly',
}

@Entity('User_ranking')
@Index(['totalPoints'])
@Index(['rankTier'])
export class UserRanking {
  @PrimaryColumn({ name: 'user_sk', type: 'uuid' })
  userSk: string;

  @Column({ name: 'total_points', type: 'int', default: 0 })
  totalPoints: number;

  @Column({ name: 'current_rank', type: 'int', nullable: true })
  currentRank?: number;

  @Column({
    name: 'rank_tier',
    type: 'varchar',
    default: RankTier.BUZZLING_EGG,
  })
  rankTier: RankTier;

  @Column({
    name: 'last_activity',
    type: 'timestamp with time zone',
    default: () => 'now()',
  })
  lastActivity: Date;

  @Column({ name: 'streak_days', type: 'int', default: 0 })
  streakDays: number;

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
