import { createClient } from '@supabase/supabase-js';
// import { supabase } from '../supabase.client';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  'https://gphxnnwzuolhgfxrfhzn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwaHhubnd6dW9saGdmeHJmaHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzODIxNDgsImV4cCI6MjA2Njk1ODE0OH0.wjAV30YUDGBDAF0BwXBt_wqhipgMvuqwpGe9ZWqghLo',
);

const BATCH_SIZE = 100;
const DELAY_MS = 5; // API rate control

async function getTotalProductCount(): Promise<number> {
  const { count, error } = await supabase
    .from('Product')
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw new Error(`Failed to get total product count: ${error.message}`);
  }

  return count || 0;
}

// async function fetchBarcodesWithoutBrand(limit: number, offset: number) {
//   const { data, error } = await supabase
//     .from('Product')
//     .select('id, barcode')
//     .is('brandName', null)
//     .not('barcode', 'is', null)
//     .range(offset, offset + limit - 1);

//   if (error) throw new Error(`Failed to fetch products: ${error.message}`);
//   return data;
// }
async function fetchAllBarcodesWithoutBrand() {
  const { data, error } = await supabase
    .from('Product')
    .select('id, barcode')
    .is('brandName', null)
    .not('barcode', 'is', null)
    .limit(10000);

  if (error) throw new Error(`Failed to fetch products: ${error.message}`);
  return data;
}

async function fetchBrandFromAPI(barcode: string): Promise<string | null> {
  try {
    const res = await axios.get(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
    );
    if (res.data.status === 1 && res.data.product?.brands) {
      return res.data.product.brands.split(',')[0].trim();
    }
    return null;
  } catch (error) {
    console.warn(`❌ Barcode ${barcode} fetch failed: ${error}`);
    return null;
  }
}

async function updateBrandName(id: number, brandName: string) {
  const { error } = await supabase
    .from('Product')
    .update({ brandName })
    .eq('id', id);

  if (error) {
    console.warn(`❌ Update failed for ID ${id}: ${error.message}`);
  } else {
    console.log(`✅ Updated ID ${id} with brand "${brandName}"`);
  }
}

// async function process() {
//   const total = await getTotalProductCount();
//   const totalBatches = Math.ceil(total / BATCH_SIZE);

//   console.log(`📦 Total records: ${total}`);
//   console.log(`🔄 Processing in ${totalBatches} batches of ${BATCH_SIZE}`);

//   for (let batch = 0; batch < totalBatches; batch++) {
//     const offset = batch * BATCH_SIZE;
//     console.log(`🚀 Batch ${batch + 1}/${totalBatches} (offset: ${offset})`);

//     const products = await fetchBarcodesWithoutBrand(BATCH_SIZE, offset);

//     for (const product of products) {
//       const brand = await fetchBrandFromAPI(product.barcode);
//       if (brand) {
//         await updateBrandName(product.id, brand);
//       } else {
//         console.log(
//           `ℹ️ ID: ${product.id} - No brand found for barcode ${product.barcode}`,
//         );
//       }

//       await new Promise((r) => setTimeout(r, DELAY_MS)); // API throttling
//     }

//     console.log(`✅ Finished batch ${batch + 1}/${totalBatches}`);
//   }

//   console.log('🎉 All batches processed!');
// }
async function process() {
  console.log(`🚀 Fetching all products without brand...`);
  const products = await fetchAllBarcodesWithoutBrand();
  console.log(`📦 Total records to process: ${products.length}`);

  let count = 0;
  for (const product of products) {
    const brand = await fetchBrandFromAPI(product.barcode);
    if (brand) {
      await updateBrandName(product.id, brand);
    } else {
      console.log(
        `ℹ️ ID ${product.id} - No brand for barcode ${product.barcode}`,
      );
    }

    count++;
    if (count % 100 === 0) {
      console.log(`✅ Processed ${count}/${products.length}`);
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  console.log('🎉 All records processed!');
}

process().catch((err) => console.error('❌ Script failed:', err));
