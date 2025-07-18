import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API!,
});

interface Product {
  product_sk: string;
  name: string;
  barcode: string;
}

interface CategoryPath {
  product: string;
  path: string[];
}

async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('Product')
    .select('product_sk, name, barcode')
    .is('category', null);

  if (error) throw new Error(`❌ Failed to fetch products: ${error.message}`);
  return data || [];
}

async function generateCategoryTree(
  products: Product[],
): Promise<CategoryPath[]> {
  const prompt = `
Given the following products (name and barcode), generate a category path for each, with up to 5 levels.
Return as JSON like:
[{ "product": "Apple Juice", "path": ["Food", "Beverages", "Juice", "Fruit Juice", "Apple"] }]
Products:
${products.map((p) => `- ${p.name} (${p.barcode})`).join('\n')}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo-1106',
    messages: [{ role: 'user', content: prompt }],
  });

  let raw = response.choices[0].message.content?.trim() || '';

  // 👇 Remove markdown formatting like ```json or ```
  if (raw.startsWith('```')) {
    raw = raw
      .replace(/^```(?:json)?/, '')
      .replace(/```$/, '')
      .trim();
  }

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('❌ Failed to parse OpenAI response:', e);
    console.error('🔎 Raw response was:', raw.slice(0, 500));
    return [];
  }
}

async function insertCategoryTree(
  paths: string[][],
): Promise<Map<string, number>> {
  const categoryMap = new Map<string, number>();
  const now = new Date().toISOString();

  for (const path of paths) {
    let parentId: number | null = null;
    let accumulatedPath = '';

    for (let level = 0; level < path.length; level++) {
      const name = path[level];
      accumulatedPath += `>${name}`;

      if (categoryMap.has(accumulatedPath)) {
        parentId = categoryMap.get(accumulatedPath)!;
        continue;
      }

      // Insert new category
      const { data, error } = await supabase
        .from('Category')
        .insert({
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          level: level + 1,
          parent_id: parentId,
          use_yn: true,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();

      if (error)
        throw new Error(
          `❌ Failed to insert category "${name}": ${error.message}`,
        );

      categoryMap.set(accumulatedPath, data.id);
      parentId = data.id;
    }
  }

  return categoryMap;
}

async function updateProductCategory(productSk: string, categoryId: number) {
  const { error } = await supabase
    .from('Product')
    .update({ category: categoryId })
    .eq('product_sk', productSk);

  if (error) {
    console.error(`❌ Failed to update product ${productSk}: ${error.message}`);
  } else {
    console.log(`✅ Product ${productSk} updated with category ${categoryId}`);
  }
}

async function run() {
  const products = await getProducts();
  if (products.length === 0)
    return console.log('⚠️ No uncategorized products.');

  const batchSize = 40;
  const concurrencyLimit = 10;
  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const allCategoryPaths: CategoryPath[] = [];

  const batches: Product[][] = [];
  for (let i = 0; i < products.length; i += batchSize) {
    batches.push(products.slice(i, i + batchSize));
  }

  let index = 0;

  async function processBatch(batch: Product[]) {
    try {
      const result = await generateCategoryTree(batch);
      allCategoryPaths.push(...result);
    } catch (err) {
      console.error(`❌ Failed batch ${index + 1}:`, err);
    }
  }

  while (index < batches.length) {
    const batchGroup = batches.slice(index, index + concurrencyLimit);
    console.log(
      `🚀 Processing batches ${index + 1} ~ ${index + batchGroup.length}`,
    );
    await Promise.all(batchGroup.map((batch) => processBatch(batch)));
    index += concurrencyLimit;
    await delay(1000);
  }

  // Insert categories
  const uniquePaths = allCategoryPaths.map((p) => p.path);
  const pathMap = await insertCategoryTree(uniquePaths);

  for (const item of allCategoryPaths) {
    const fullPath = item.path.join('>');
    const categoryId = pathMap.get(fullPath);
    const matchedProduct = products.find((p) => p.name === item.product);

    if (categoryId && matchedProduct) {
      await updateProductCategory(matchedProduct.product_sk, categoryId);
    }
  }

  console.log(
    `✅ Finished. Total products updated: ${allCategoryPaths.length}`,
  );
}

run();
