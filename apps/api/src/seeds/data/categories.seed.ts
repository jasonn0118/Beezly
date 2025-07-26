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
    { category1: 'Produce', category2: 'Fruits', category3: 'Citrus' },
    { category1: 'Produce', category2: 'Fruits', category3: 'Berries' },
    {
      category1: 'Produce',
      category2: 'Vegetables',
      category3: 'Leafy Greens',
    },
    {
      category1: 'Produce',
      category2: 'Vegetables',
      category3: 'Root Vegetables',
    },

    { category1: 'Meat & Seafood', category2: 'Meat', category3: 'Beef' },
    { category1: 'Meat & Seafood', category2: 'Meat', category3: 'Poultry' },
    { category1: 'Meat & Seafood', category2: 'Seafood', category3: 'Fish' },
    {
      category1: 'Meat & Seafood',
      category2: 'Seafood',
      category3: 'Shellfish',
    },

    { category1: 'Dairy & Eggs', category2: 'Dairy', category3: 'Milk' },
    { category1: 'Dairy & Eggs', category2: 'Dairy', category3: 'Cheese' },
    { category1: 'Dairy & Eggs', category2: 'Eggs', category3: 'Eggs' },

    {
      category1: 'Bakery & Bread',
      category2: 'Bread',
      category3: 'White Bread',
    },
    {
      category1: 'Bakery & Bread',
      category2: 'Bread',
      category3: 'Whole Grain',
    },
    {
      category1: 'Bakery & Bread',
      category2: 'Pastries',
      category3: 'Croissants',
    },

    {
      category1: 'Pantry & Dry Goods',
      category2: 'Pasta & Rice',
      category3: 'Spaghetti',
    },
    {
      category1: 'Pantry & Dry Goods',
      category2: 'Canned Goods',
      category3: 'Beans',
    },
    {
      category1: 'Pantry & Dry Goods',
      category2: 'Cereals',
      category3: 'Granola',
    },

    { category1: 'Beverages', category2: 'Soft Drinks', category3: 'Cola' },
    { category1: 'Beverages', category2: 'Juices', category3: 'Orange Juice' },
    {
      category1: 'Beverages',
      category2: 'Coffee & Tea',
      category3: 'Ground Coffee',
    },

    {
      category1: 'Frozen Foods',
      category2: 'Frozen Meals',
      category3: 'Pizza',
    },
    {
      category1: 'Frozen Foods',
      category2: 'Frozen Vegetables',
      category3: null,
    },

    { category1: 'Snacks & Candy', category2: 'Snacks', category3: 'Chips' },
    { category1: 'Snacks & Candy', category2: 'Candy', category3: 'Chocolate' },

    {
      category1: 'Health & Beauty',
      category2: 'Personal Care',
      category3: 'Soap',
    },
    {
      category1: 'Health & Beauty',
      category2: 'Vitamins',
      category3: 'Multivitamins',
    },

    {
      category1: 'Household & Cleaning',
      category2: 'Cleaning Supplies',
      category3: 'Disinfectant',
    },
    {
      category1: 'Household & Cleaning',
      category2: 'Paper Products',
      category3: 'Toilet Paper',
    },

    { category1: 'Baby & Kids', category2: 'Baby Food', category3: 'Formula' },
    { category1: 'Baby & Kids', category2: 'Diapers', category3: 'Newborn' },

    { category1: 'Pet Care', category2: 'Pet Food', category3: 'Dog Food' },
    { category1: 'Pet Care', category2: 'Pet Supplies', category3: 'Litter' },

    {
      category1: 'Pharmacy',
      category2: 'OTC Medications',
      category3: 'Pain Relief',
    },
    { category1: 'Pharmacy', category2: 'First Aid', category3: 'Bandages' },

    {
      category1: 'Deli & Prepared Foods',
      category2: 'Deli Meats',
      category3: 'Ham',
    },
    {
      category1: 'Deli & Prepared Foods',
      category2: 'Prepared Meals',
      category3: 'Salad',
    },

    {
      category1: 'International Foods',
      category2: 'Asian',
      category3: 'Soy Sauce',
    },
    {
      category1: 'International Foods',
      category2: 'Mexican',
      category3: 'Tortillas',
    },

    {
      category1: 'Organic & Natural',
      category2: 'Produce',
      category3: 'Organic Apples',
    },
    {
      category1: 'Organic & Natural',
      category2: 'Pantry',
      category3: 'Organic Beans',
    },

    {
      category1: 'Spices & Condiments',
      category2: 'Spices',
      category3: 'Cumin',
    },
    {
      category1: 'Spices & Condiments',
      category2: 'Sauces',
      category3: 'Hot Sauce',
    },

    {
      category1: 'Baking & Desserts',
      category2: 'Baking Ingredients',
      category3: 'Flour',
    },
    {
      category1: 'Baking & Desserts',
      category2: 'Desserts',
      category3: 'Cake Mix',
    },
  ];

  const createdCategories = await categoryRepository.save(categories);
  console.log(`  ✅ Created ${createdCategories.length} categories`);
}
