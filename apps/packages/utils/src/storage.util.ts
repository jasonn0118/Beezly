import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { Transformer } from "@napi-rs/image";
import * as heicConvert from "heic-convert";

const RECEIPT_BUCKET = "receipt";
const PRODUCT_BUCKET = "product";

// Create a Supabase client with service role key for server-side operations
function getServiceRoleClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase service role configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function upload_receipt(
  user_sk: string = "default_user",
  store_sk: string = "default_store",
  file: Buffer,
  mimeType: string = "image/png"
): Promise<string | null> {
  try {
    console.log("Starting upload_receipt function");

    // Use service role client for server-side operations
    const supabase = getServiceRoleClient();

    console.log("Supabase config:", {
      url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    // Determine file extension from mime type
    const getFileExtension = (mimeType: string): string => {
      const mimeToExt: { [key: string]: string } = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/bmp": "bmp",
        "image/tiff": "tiff",
        "image/webp": "webp",
        "image/heic": "heic",
        "image/heif": "heif",
      };
      return mimeToExt[mimeType] || "png";
    };

    // Convert to WebP format for consistency and performance
    let uploadBuffer: Buffer;
    let uploadMimeType: string;
    let fileExtension: string;
    
    try {
      console.log(`Converting ${mimeType} image to WebP format...`);
      console.log(`MIME type check: ${mimeType === "image/heic"} || ${mimeType === "image/heif"}`);
      
      if (mimeType === "image/heic" || mimeType === "image/heif") {
        // For HEIC files, use heic-convert first, then @napi-rs/image for WebP
        console.log("✅ HEIC detected! Converting HEIC to JPEG first, then to WebP");
        
        // Step 1: Convert HEIC to JPEG using heic-convert
        const jpegBuffer = await heicConvert({
          buffer: file,
          format: 'JPEG',
          quality: 0.9,
        });
        
        // Step 2: Convert JPEG to WebP using @napi-rs/image
        const transformer = new Transformer(Buffer.from(jpegBuffer));
        uploadBuffer = Buffer.from(await transformer.webp(85)); // 85% quality
        console.log(`HEIC converted to WebP successfully. Original size: ${file.length}, WebP size: ${uploadBuffer.length}`);
      } else {
        // Use @napi-rs/image directly for other formats
        console.log("❌ HEIC NOT detected! Using @napi-rs/image for non-HEIC formats");
        console.log(`Actual MIME type: "${mimeType}"`);
        const transformer = new Transformer(file);
        uploadBuffer = Buffer.from(await transformer.webp(85)); // 85% quality
        console.log(`Image converted to WebP successfully. Original size: ${file.length}, WebP size: ${uploadBuffer.length}`);
      }
      
      uploadMimeType = "image/webp";
      fileExtension = "webp";
      
    } catch (conversionError) {
      console.error("Failed to convert image to WebP:", conversionError);
      console.log("Falling back to original format");
      uploadBuffer = file;
      uploadMimeType = mimeType;
      fileExtension = getFileExtension(mimeType);
    }

    // Use appropriate extension based on whether conversion succeeded
    const filename = `receipt_${Date.now()}_${uuidv4()}.${fileExtension}`;
    const path = `${user_sk}/${store_sk}/${filename}`;

    console.log("Upload details:", {
      bucket: RECEIPT_BUCKET,
      path,
      fileSize: uploadBuffer.length,
      contentType: uploadMimeType,
    });

    // Add timeout to prevent infinite waiting
    const uploadPromise = supabase.storage
      .from(RECEIPT_BUCKET)
      .upload(path, uploadBuffer, {
        contentType: uploadMimeType,
        upsert: true,
      });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Upload timeout after 30 seconds")),
        30000
      );
    });

    const result = await Promise.race([uploadPromise, timeoutPromise]);
    const { error } = result as any;

    if (error) {
      console.error("Upload receipt failed:", error.message);
      console.error("Error details:", error);
      return null;
    }

    console.log("Upload successful:", path);
    return path;
  } catch (error) {
    console.error("Upload receipt error:", error);
    return null;
  }
}

export async function upload_product(
  user_sk: string,
  store_sk: string,
  file: Buffer
): Promise<string | null> {
  try {
    // Use service role client for server-side operations
    const supabase = getServiceRoleClient();

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
  } catch (error) {
    console.error("Upload product error:", error);
    return null;
  }
}

export async function fetch_image(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    // Use service role client for server-side operations
    const supabase = getServiceRoleClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error("Fetch image URL failed:", error.message);
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Fetch image error:", error);
    return null;
  }
}
