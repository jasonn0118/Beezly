import { DataSource } from 'typeorm';
import { Category } from '../../entities/category.entity';

export async function seedCategories(dataSource: DataSource) {
  const categoryRepository = dataSource.getRepository(Category);

  // Check if categories already exist
  const existingCategories = await categoryRepository.count();
  if (existingCategories > 0) {
    console.log('  ⏭️  Categories already seeded, skipping...');
    return;
  }

  const categories = [
    // Main grocery categories
    { name: 'Produce', description: 'Fresh fruits and vegetables' },
    {
      name: 'Meat & Seafood',
      description: 'Fresh and frozen meats and seafood',
    },
    { name: 'Dairy & Eggs', description: 'Milk, cheese, yogurt, and eggs' },
    {
      name: 'Bakery & Bread',
      description: 'Fresh bread, baked goods, and pastries',
    },
    {
      name: 'Pantry & Dry Goods',
      description: 'Canned goods, pasta, rice, and cereals',
    },
    {
      name: 'Beverages',
      description: 'Soft drinks, juices, water, and coffee',
    },
    {
      name: 'Frozen Foods',
      description: 'Frozen meals, vegetables, and desserts',
    },
    {
      name: 'Snacks & Candy',
      description: 'Chips, cookies, nuts, and confectionery',
    },
    {
      name: 'Health & Beauty',
      description: 'Personal care, vitamins, and cosmetics',
    },
    {
      name: 'Household & Cleaning',
      description: 'Cleaning supplies and paper products',
    },
    {
      name: 'Baby & Kids',
      description: "Baby food, diapers, and children's products",
    },
    { name: 'Pet Care', description: 'Pet food, treats, and supplies' },
    {
      name: 'Pharmacy',
      description: 'Over-the-counter medications and first aid',
    },
    {
      name: 'Deli & Prepared Foods',
      description: 'Ready-to-eat meals and deli meats',
    },
    {
      name: 'International Foods',
      description: 'Ethnic and specialty international products',
    },
    {
      name: 'Organic & Natural',
      description: 'Organic and natural food products',
    },
    {
      name: 'Spices & Condiments',
      description: 'Spices, sauces, and cooking condiments',
    },
    {
      name: 'Baking & Desserts',
      description: 'Baking ingredients and dessert mixes',
    },
  ];

  const createdCategories = await categoryRepository.save(categories);
  console.log(`  ✅ Created ${createdCategories.length} categories`);
}
