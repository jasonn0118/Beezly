import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';
import { ReceiptItem } from './receipt-item.entity';
import { NormalizedProduct } from './normalized-product.entity';

@Entity('receipt_item_normalizations')
@Index(['receiptItemSk', 'normalizedProductSk'], { unique: true })
@Index(['receiptItemSk'])
@Index(['normalizedProductSk'])
export class ReceiptItemNormalization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ReceiptItem, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receipt_item_sk' })
  receiptItem: ReceiptItem;

  @Column({ name: 'receipt_item_sk', type: 'uuid' })
  receiptItemSk: string;

  @ManyToOne(() => NormalizedProduct, { nullable: false })
  @JoinColumn({ name: 'normalized_product_sk' })
  normalizedProduct: NormalizedProduct;

  @Column({ name: 'normalized_product_sk', type: 'uuid' })
  normalizedProductSk: string;

  @Column({
    name: 'confidence_score',
    type: 'decimal',
    precision: 5,
    scale: 4,
    comment: 'Confidence score for this specific match',
  })
  confidenceScore: number;

  @Column({
    name: 'normalization_method',
    type: 'varchar',
    length: 50,
    comment: 'Method used for normalization (exact_match, ai_generated, etc.)',
  })
  normalizationMethod: string;

  @Column({
    name: 'is_selected',
    type: 'boolean',
    default: false,
    comment: 'Whether this is the selected normalization for the receipt item',
  })
  isSelected: boolean;

  @Column({
    name: 'similarity_score',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
    comment: 'Similarity score if using embedding-based matching',
  })
  similarityScore?: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
