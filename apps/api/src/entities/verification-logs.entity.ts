import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('Verification_logs')
export class VerificationLogs extends BaseEntity {
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_sk', referencedColumnName: 'userSk' })
  user?: User;

  @Column({ name: 'user_sk', type: 'uuid', nullable: true })
  userSk?: string;

  @Column({
    type: 'varchar',
    name: 'target_type',
    nullable: true,
  })
  targetType?: 'Price' | 'Product';

  @Column({ name: 'target_id', nullable: true })
  targetId?: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  action?: 'Verify' | 'Flag' | 'Correct';
}
