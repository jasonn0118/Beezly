import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import { NormalizedProductDTO } from '../../../packages/types/dto/product';
import OpenAI from 'openai';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API!,
});

const BASE_URL = 'https://world.openfoodfacts.org/country/canada.json';
const CATEGORY_API_URL = 'https://beezly.onrender.com/category';

type CategoryMap = Record<string, number>; // name → id
const categoryCache = new Map<string, number>(); // categories_tags → id

async function fetchProducts(page = 1) {
  const url = `${BASE_URL}?page=${page}`;
  const res = await axios.get(url);
  return res.data;
}

async function fetchCategoryMap(): Promise<CategoryMap> {
  const res = await axios.get(CATEGORY_API_URL);
  const categories: { id: number; name: string }[] = res.data;
  const map: CategoryMap = {};
  for (const cat of categories) {
    map[cat.name.toLowerCase()] = cat.id;
  }
  return map;
}

async function getBestCategoryFromOpenAI(
  sourceCategories: string[],
  beezlyCategoryNames: string[],
): Promise<string | null> {
  const prompt = `
Given the following product categories from an external API:
- ${sourceCategories.join('\n- ')}

Which one of the following internal category names is the best match?

Internal Categories:
- ${beezlyCategoryNames.join('\n- ')}

Respond with only the best matching internal category name.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const bestMatch = response.choices[0].message.content?.trim();
    if (!bestMatch) return null;

    return (
      beezlyCategoryNames.find(
        (name) => name.toLowerCase() === bestMatch.toLowerCase(),
      ) || null
    );
  } catch (error) {
    console.error('❌ OpenAI category mapping failed:', error);
    return null;
  }
}

async function findBestCategoryIdAI(
  raw: any,
  categoryMap: CategoryMap,
): Promise<number | undefined> {
  const sourceCats = [
    ...(raw.categories_tags || []),
    ...(raw.categories ? raw.categories.split(',') : []),
  ]
    .map((c) => c.trim().replace(/_/g, ' '))
    .filter(Boolean);

  if (sourceCats.length === 0) return undefined;

  const key = sourceCats.sort().join('|');

  // 1. check cache first
  if (categoryCache.has(key)) {
    return categoryCache.get(key);
  }

  // 2. call OpenAI
  const beezlyNames = Object.keys(categoryMap);
  const bestCategoryName = await getBestCategoryFromOpenAI(
    sourceCats,
    beezlyNames,
  );
  if (!bestCategoryName) return undefined;

  const categoryId = categoryMap[bestCategoryName.toLowerCase()];
  if (categoryId !== undefined) {
    categoryCache.set(key, categoryId); // cache it
    return categoryId;
  }

  return undefined;
}

async function mapToProductDTO(
  raw: any,
  categoryMap: CategoryMap,
): Promise<NormalizedProductDTO> {
  const category = await findBestCategoryIdAI(raw, categoryMap);

  return {
    product_sk: uuidv4(),
    name: raw.product_name || null,
    barcode: raw.code,
    image_url: raw.image_url || null,
    credit_score: 0,
    verified_count: 0,
    flagged_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category,
  };
}

async function insertProduct(dto: NormalizedProductDTO) {
  const { error } = await supabase.from('Product').insert([dto]);
  if (error) {
    console.error(
      `❌ Failed to insert product (${dto.barcode}): ${error.message}`,
    );
  }
}

async function run() {
  const categoryMap = await fetchCategoryMap();
  const maxPages = 900;

  for (let page = 11; page <= maxPages; page++) {
    const data = await fetchProducts(page);
    for (const raw of data.products) {
      if (raw.code && raw.product_name) {
        const dto = await mapToProductDTO(raw, categoryMap);
        await insertProduct(dto);
      }
    }
    console.log(`✅ Page ${page} processed`);
  }

  console.log(`🧠 Total unique OpenAI mappings cached: ${categoryCache.size}`);
}

run();
