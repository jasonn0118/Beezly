import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Generated,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Store } from './store.entity';
import { ReceiptItem } from './receipt-item.entity';

@Entity('Receipt')
export class Receipt extends BaseEntity {
  @Column({ name: 'receipt_sk', type: 'uuid', unique: true })
  @Generated('uuid')
  receiptSk: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_sk', referencedColumnName: 'userSk' })
  user?: User;

  @Column({ name: 'user_sk', type: 'uuid', nullable: true })
  userSk?: string;

  @ManyToOne(() => Store, { nullable: true })
  @JoinColumn({ name: 'store_sk', referencedColumnName: 'storeSk' })
  store?: Store;

  @Column({ name: 'store_sk', type: 'uuid', nullable: true })
  storeSk?: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({
    type: 'varchar',
    default: 'pending',
  })
  status: 'pending' | 'processing' | 'failed' | 'manual_review' | 'done';

  @Column({ name: 'parsed_data', type: 'jsonb', nullable: true })
  parsedData?: any;

  @Column({ name: 'purchase_date', type: 'date', nullable: true })
  purchaseDate?: Date;

  // Relationships
  @OneToMany(() => ReceiptItem, (item) => item.receipt)
  items: ReceiptItem[];
}
