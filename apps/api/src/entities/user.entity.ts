import { Entity, Column, OneToMany, Generated } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Receipt } from './receipt.entity';

@Entity('User')
export class User extends BaseEntity {
  @Column({ name: 'user_sk', type: 'uuid', unique: true })
  @Generated('uuid')
  userSk: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'first_name', nullable: true })
  firstName?: string;

  @Column({ name: 'last_name', nullable: true })
  lastName?: string;

  // Computed property that combines firstName and lastName
  get displayName(): string | undefined {
    if (this.firstName || this.lastName) {
      return [this.firstName, this.lastName].filter(Boolean).join(' ');
    }
    return undefined;
  }

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ nullable: true })
  level?: string;

  // Relationships
  @OneToMany(() => Receipt, (receipt) => receipt.user)
  receipts: Receipt[];
}
