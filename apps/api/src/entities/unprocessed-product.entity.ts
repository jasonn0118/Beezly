import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NormalizedProduct } from './normalized-product.entity';

export enum UnprocessedProductStatus {
  PENDING_REVIEW = 'pending_review',
  UNDER_REVIEW = 'under_review',
  APPROVED_FOR_CREATION = 'approved_for_creation',
  REJECTED = 'rejected',
  PROCESSED = 'processed',
}

export enum UnprocessedProductReason {
  NO_BARCODE_MATCH = 'no_barcode_match',
  NO_EMBEDDING_MATCH = 'no_embedding_match',
  LOW_SIMILARITY_SCORE = 'low_similarity_score',
  MULTIPLE_MATCHES_FOUND = 'multiple_matches_found',
  USER_CREATED_NEW_ITEM = 'user_created_new_item',
}

@Entity('unprocessed_products')
@Index(['status', 'createdAt'])
@Index(['reason', 'status'])
@Index(['merchant'])
export class UnprocessedProduct {
  @PrimaryGeneratedColumn('uuid', { name: 'unprocessed_product_sk' })
  unprocessedProductSk: string;

  @Column({ name: 'normalized_product_sk', type: 'uuid' })
  normalizedProductSk: string;

  @ManyToOne(() => NormalizedProduct, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'normalized_product_sk' })
  normalizedProduct: NormalizedProduct;

  @Column({ name: 'raw_name', type: 'text' })
  rawName: string;

  @Column({ name: 'normalized_name', type: 'text' })
  normalizedName: string;

  @Column({ name: 'brand', type: 'text', nullable: true })
  brand?: string;

  @Column({ name: 'category', type: 'text', nullable: true })
  category?: string;

  @Column({ name: 'merchant', type: 'text' })
  merchant: string;

  @Column({ name: 'confidence_score', type: 'decimal', precision: 5, scale: 4 })
  confidenceScore: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: UnprocessedProductStatus,
    default: UnprocessedProductStatus.PENDING_REVIEW,
  })
  status: UnprocessedProductStatus;

  @Column({
    name: 'reason',
    type: 'enum',
    enum: UnprocessedProductReason,
  })
  reason: UnprocessedProductReason;

  @Column({ name: 'item_code', type: 'text', nullable: true })
  itemCode?: string;

  @Column({ name: 'suggested_barcode', type: 'text', nullable: true })
  suggestedBarcode?: string;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes?: string;

  @Column({ name: 'reviewer_id', type: 'uuid', nullable: true })
  reviewerId?: string;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date;

  @Column({ name: 'created_product_sk', type: 'uuid', nullable: true })
  createdProductSk?: string;

  @Column({ name: 'occurrence_count', type: 'integer', default: 1 })
  occurrenceCount: number;

  @Column({
    name: 'priority_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  priorityScore: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
