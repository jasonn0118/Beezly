import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserBadges } from './user-badges.entity';

@Entity('Badges')
export class Badges extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'icon_url', nullable: true })
  iconUrl?: string;

  @Column({ nullable: true })
  description?: string;

  // Relationships
  @OneToMany(() => UserBadges, (userBadge) => userBadge.badge)
  userBadges: UserBadges[];
}