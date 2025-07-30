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

  // OCR-specific fields
  @Column({ name: 'raw_text', type: 'jsonb', nullable: true })
  rawText?: any;

  @Column({
    name: 'ocr_confidence',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  ocrConfidence?: number;

  @Column({ name: 'engine_used', type: 'varchar', length: 50, nullable: true })
  engineUsed?: string;

  @Column({ name: 'ocr_data', type: 'jsonb', nullable: true })
  ocrData?: any;

  @Column({ name: 'normalization_summary', type: 'jsonb', nullable: true })
  normalizationSummary?: any;

  @Column({ name: 'receipt_date', type: 'timestamp', nullable: true })
  receiptDate?: Date;

  @Column({ name: 'receipt_time', type: 'varchar', length: 10, nullable: true })
  receiptTime?: string;

  @Column({
    name: 'subtotal',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  subtotal?: number;

  @Column({
    name: 'tax',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  tax?: number;

  @Column({
    name: 'total',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  total?: number;

  // Relationships
  @OneToMany(() => ReceiptItem, (item) => item.receipt)
  items: ReceiptItem[];
}
