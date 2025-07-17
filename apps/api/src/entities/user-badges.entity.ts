import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';
import { Badges } from './badges.entity';

@Entity('User_badges')
export class UserBadges {
  @PrimaryColumn({ name: 'user_sk', type: 'uuid' })
  userSk: string;

  @PrimaryColumn({ name: 'badge_id', type: 'int' })
  badgeId: number;

  @Column({
    name: 'awarded_at',
    type: 'timestamp with time zone',
    default: () => 'now()',
  })
  awardedAt: Date;

  // Relationships
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_sk', referencedColumnName: 'userSk' })
  user: User;

  @ManyToOne(() => Badges)
  @JoinColumn({ name: 'badge_id' })
  badge: Badges;
}
