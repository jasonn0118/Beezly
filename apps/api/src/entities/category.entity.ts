import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Product } from './product.entity';

@Entity('Category')
export class Category extends BaseEntity {
  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent?: Category;

  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId?: number;

  @Column({ type: 'text', nullable: true })
  name?: string;

  @Column({ type: 'text', nullable: true })
  slug?: string;

  @Column({ type: 'bigint', nullable: true })
  level?: number;

  @Column({ name: 'use_yn', type: 'boolean', nullable: true })
  useYn?: boolean;

  // Relationships
  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @OneToMany(() => Product, (product) => product.categoryEntity)
  products: Product[];
}