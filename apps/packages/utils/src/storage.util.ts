import { supabase } from "./supabase.client";
import { v4 as uuidv4 } from "uuid";

const RECEIPT_BUCKET = "receipt";
const PRODUCT_BUCKET = "product";

export async function upload_receipt(
  user_sk: string,
  store_sk: string,
  file: Buffer
): Promise<string | null> {
  const filename = `receipt_${Date.now()}_${uuidv4()}.png`;
  const path = `${user_sk}/${store_sk}/${filename}`;

  const { error } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(path, file, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) {
    console.error("Upload receipt failed:", error.message);
    return null;
  }

  return path;
}

export async function upload_product(
  user_sk: string,
  store_sk: string,
  file: Buffer
): Promise<string | null> {
  const filename = `product_${Date.now()}_${uuidv4()}.jpg`;
  const path = `${user_sk}/${store_sk}/${filename}`;

  const { error } = await supabase.storage
    .from(PRODUCT_BUCKET)
    .upload(path, file, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) {
    console.error("Upload product failed:", error.message);
    return null;
  }

  return path;
}

export async function fetch_image(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error("Fetch image URL failed:", error.message);
    return null;
  }

  return data.signedUrl;
}
