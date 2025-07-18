import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import slugify from 'slugify';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface CategoryTag {
  id: string; // e.g., "en:plant-based-foods-and-beverages"
  name: string;
}

async function fetchAllCategories(pages = 100): Promise<CategoryTag[]> {
  const categories: CategoryTag[] = [];
  for (let page = 1; page <= pages; page++) {
    const res = await axios.get(
      `https://world.openfoodfacts.org/facets/categories.json?page=${page}`,
    );
    categories.push(...res.data.tags);
  }

  const unique = new Map<string, CategoryTag>();
  for (const tag of categories) {
    if (!unique.has(tag.id)) {
      unique.set(tag.id, { id: tag.id, name: tag.name });
    }
  }

  return Array.from(unique.values());
}

function getParentSlugFromId(id: string): string | null {
  const parts = id.split(':')[1].split('-');
  if (parts.length <= 1) return null;
  for (let i = parts.length - 1; i > 0; i--) {
    const parentSlug = parts.slice(0, i).join('-');
    return slugify(parentSlug, { lower: true });
  }
  return null;
}

async function main() {
  const categories = await fetchAllCategories();
  console.log(`Total unique categories: ${categories.length}`);

  // STEP 1: Upsert all without parent_id
  for (const cat of categories) {
    const slug = slugify(cat.id.replace(/^en:/, ''), { lower: true });
    const level = cat.id.split('-').length;

    const { error } = await supabase.from('Category').upsert(
      [
        {
          name: cat.name,
          slug,
          level,
          use_yn: true,
        },
      ],
      { onConflict: 'slug' },
    );

    if (error) {
      console.error(`❌ Upsert failed for ${cat.name}: ${error.message}`);
    }
  }

  console.log('✅ Initial upsert complete.');

  // STEP 2: Update parent_id where applicable
  for (const cat of categories) {
    const slug = slugify(cat.id.replace(/^en:/, ''), { lower: true });
    const parentSlug = getParentSlugFromId(cat.id);
    if (!parentSlug) continue;

    const { data: parent, error: parentError } = await supabase
      .from('Category')
      .select('id')
      .eq('slug', parentSlug)
      .single();

    if (parentError || !parent) {
      console.warn(`⚠️ Parent not found for ${cat.name}: ${parentSlug}`);
      continue;
    }

    const { error: updateError } = await supabase
      .from('Category')
      .update({ parent_id: parent.id })
      .eq('slug', slug);

    if (updateError) {
      console.error(
        `❌ Failed to update parent for ${slug}: ${updateError.message}`,
      );
    }
  }

  console.log('✅ Parent assignment complete.');
}

main();
