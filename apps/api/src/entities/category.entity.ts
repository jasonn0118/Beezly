import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Product } from './product.entity';

@Entity('Category')
export class Category extends BaseEntity {
  @Column({ type: 'text', nullable: true })
  category1?: string;

  @Column({ type: 'text', nullable: true })
  category2?: string | null;

  @Column({ type: 'text', nullable: true })
  category3?: string | null;

  @OneToMany(() => Product, (product) => product.categoryEntity)
  products: Product[];
}
