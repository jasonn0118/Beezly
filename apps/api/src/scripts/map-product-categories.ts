import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API,
});

// Step 1: Fetch products without category mapping, using range-based pagination
async function fetchUnmappedProducts(offset: number, limit: number) {
  const { data, error } = await supabase
    .from('Product')
    .select('id, name')
    .is('category', null)
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data;
}

// Step 2: Use OpenAI to classify each product name into a 3-level category path
async function classifyCategories(products: { id: number; name: string }[]) {
  const { data: categories, error } = await supabase
    .from('pivotCategory')
    .select('category1, category2, category3')
    .is('deleted_at', null);

  if (error) throw error;

  const hierarchyPaths = Array.from(
    new Set(
      categories.map((row) =>
        [row.category1, row.category2, row.category3]
          .filter((v) => v && v !== 'EMPTY')
          .join(' > '),
      ),
    ),
  );

  const prompt = `You are a product categorization engine.

Given the following product names, classify each product into a category path.

RULES:
- Only use category paths that begin with an existing path from the list below.
- If an exact path exists (level 1~3), reuse it.
- If a more specific path is needed, you may add 1 or 2 levels (category4, category5) **under an existing path**.
- DO NOT create new root or mid-level categories.
- DO NOT change existing levels.

EXISTING CATEGORY PATHS:
${hierarchyPaths.map((p) => `- ${p}`).join('\n')}

Return the result as a JSON array with exactly this format:
[
  { "product_name": "Coca-Cola", "category_path": ["Food", "Beverages", "Soft Drinks"] },
  { "product_name": "Wireless Mouse", "category_path": ["Digital & Appliances", "Computer & Peripherals", "Mouse"] }
]

Product names:
${products.map((p, i) => `${i + 1}. ${p.name}`).join('\n')}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.choices[0].message.content || '';
  const cleaned = text.replace(/```json|```/g, '').trim();

  const jsonStart = cleaned.indexOf('[');
  const jsonEnd = cleaned.lastIndexOf(']');
  const jsonPart = cleaned.slice(jsonStart, jsonEnd + 1);

  console.log('📤 Prompt tokens:', response.usage?.prompt_tokens);
  console.log('📥 Completion tokens:', response.usage?.completion_tokens);

  try {
    return JSON.parse(jsonPart);
  } catch (err) {
    console.error('❌ Failed to parse JSON:', jsonPart.slice(-300));
    throw new Error('Final JSON parsing failed.');
  }
}

// Step 3: Recursively insert or find each level in the category path
async function getOrCreatePivotCategoryId(path: string[]): Promise<number> {
  const padded = [...path, null, null, null, null].slice(0, 5);
  const [c1, c2, c3] = padded;

  // Step 1: Try to find existing entry with exact match (null-safe)
  const { data: found, error: findError } = await supabase
    .from('pivotCategory')
    .select('id')
    .eq('category1', c1)
    .eq('category2', c2)
    .eq('category3', c3)
    .is('deleted_at', null)
    .single();

  if (found) return found.id;

  if (findError && findError.code !== 'PGRST116') {
    // Not 'No rows returned' error
    throw findError;
  }

  // Step 2: Insert exact new combination
  const now = new Date().toISOString();

  const { data: inserted, error: insertError } = await supabase
    .from('pivotCategory')
    .insert([
      {
        category1: c1,
        category2: c2,
        category3: c3,
        created_at: now,
        updated_at: now,
      },
    ])
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '23505') {
      // Race condition: another process inserted the same row
      // Retry find
      return getOrCreatePivotCategoryId(path);
    }
    console.error('❌ Insert error:', insertError);
    throw insertError;
  }

  return inserted.id;
}

// Step 4: Update Product with the final category ID (only if it is still NULL)
async function updateProductCategory(productId: number, categoryId: number) {
  const { error } = await supabase
    .from('Product')
    .update({ category: categoryId })
    .eq('id', productId)
    .is('category', null);

  if (error) throw error;
}

// Main routine
async function main() {
  const batchSize = 80;
  let offset = 0;
  let totalProcessed = 0;

  while (true) {
    const products = await fetchUnmappedProducts(offset, batchSize);
    if (!products || products.length === 0) break;

    console.log(
      `📦 Processing batch: ${offset + 1} to ${offset + products.length}`,
    );

    const classified = await classifyCategories(products);

    for (const item of classified) {
      const original = products.find((p) => p.name === item.product_name);
      if (!original) continue;

      const categoryId = await getOrCreatePivotCategoryId(item.category_path);
      await updateProductCategory(original.id, categoryId);
      console.log(`🔗 Mapped "${original.name}" → Category ID ${categoryId}`);
    }

    offset += batchSize;
    totalProcessed += products.length;
  }

  console.log(`✅ Finished mapping. Total products updated: ${totalProcessed}`);
}

main().catch(console.error);
