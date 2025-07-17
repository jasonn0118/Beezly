import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1752710172007 implements MigrationInterface {
  name = 'InitialMigration1752710172007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable PostGIS extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "postgis"`);

    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create Category table
    await queryRunner.query(`
            CREATE TABLE "Category" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "name" character varying NOT NULL,
                "slug" character varying,
                "level" integer NOT NULL DEFAULT '1',
                "parent_id" integer,
                "use_yn" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id")
            )
        `);

    // Create Score_type table
    await queryRunner.query(`
            CREATE TABLE "Score_type" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "score_type" character varying NOT NULL,
                "description" character varying,
                CONSTRAINT "UQ_7f7a0c0e8b4e8b4e8b4e8b4e8b4" UNIQUE ("score_type"),
                CONSTRAINT "PK_a1b2c3d4e5f6789012345678901" PRIMARY KEY ("id")
            )
        `);

    // Create Badges table
    await queryRunner.query(`
            CREATE TABLE "Badges" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "name" character varying NOT NULL,
                "description" character varying,
                "icon_url" character varying,
                "criteria" character varying,
                CONSTRAINT "PK_1c5f6e4e8b4e8b4e8b4e8b4e8b4" PRIMARY KEY ("id")
            )
        `);

    // Create User table
    await queryRunner.query(`
            CREATE TABLE "User" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "user_sk" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "password_hash" character varying NOT NULL,
                "display_name" character varying,
                "points" integer NOT NULL DEFAULT '0',
                "level" character varying,
                CONSTRAINT "UQ_4a257d2c9837248d70640b3e36e" UNIQUE ("user_sk"),
                CONSTRAINT "UQ_29a05908a0fa0728526d2833657" UNIQUE ("email"),
                CONSTRAINT "PK_9862f679340fb2388436a5ab3e4" PRIMARY KEY ("id")
            )
        `);

    // Create Store table
    await queryRunner.query(`
            CREATE TABLE "Store" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "store_sk" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "address" character varying,
                "city" character varying,
                "province" character varying,
                "postal_code" character varying,
                "latitude" double precision,
                "longitude" double precision,
                "place_id" character varying,
                CONSTRAINT "UQ_1c8f4e5e8b4e8b4e8b4e8b4e8b5" UNIQUE ("store_sk"),
                CONSTRAINT "UQ_2c9f5e6e8b4e8b4e8b4e8b4e8b6" UNIQUE ("place_id"),
                CONSTRAINT "PK_1c8f4e5e8b4e8b4e8b4e8b4e8b4" PRIMARY KEY ("id")
            )
        `);

    // Create Product table
    await queryRunner.query(`
            CREATE TABLE "Product" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "product_sk" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "barcode" character varying,
                "category" integer,
                "image_url" character varying,
                "credit_score" numeric NOT NULL DEFAULT '0',
                "verified_count" integer NOT NULL DEFAULT '0',
                "flagged_count" integer NOT NULL DEFAULT '0',
                CONSTRAINT "UQ_3d0f6e7e8b4e8b4e8b4e8b4e8b7" UNIQUE ("product_sk"),
                CONSTRAINT "PK_2d0f6e7e8b4e8b4e8b4e8b4e8b6" PRIMARY KEY ("id")
            )
        `);

    // Create Receipt table
    await queryRunner.query(`
            CREATE TABLE "Receipt" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "receipt_sk" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_sk" uuid,
                "store_sk" uuid,
                "image_url" character varying,
                "status" character varying NOT NULL DEFAULT 'pending',
                "parsed_data" jsonb,
                "purchase_date" date,
                CONSTRAINT "UQ_4e1f7e8e8b4e8b4e8b4e8b4e8b8" UNIQUE ("receipt_sk"),
                CONSTRAINT "PK_3e1f7e8e8b4e8b4e8b4e8b4e8b7" PRIMARY KEY ("id")
            )
        `);

    // Create ReceiptItem table
    await queryRunner.query(`
            CREATE TABLE "ReceiptItem" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "receiptitem_sk" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "receipt_sk" uuid,
                "product_sk" uuid,
                "price" numeric NOT NULL,
                "quantity" integer NOT NULL DEFAULT '1',
                "line_total" numeric NOT NULL,
                CONSTRAINT "UQ_5f2f8e9e8b4e8b4e8b4e8b4e8b9" UNIQUE ("receiptitem_sk"),
                CONSTRAINT "PK_4f2f8e9e8b4e8b4e8b4e8b4e8b8" PRIMARY KEY ("id")
            )
        `);

    // Create Price table
    await queryRunner.query(`
            CREATE TABLE "Price" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "price_sk" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "product_sk" uuid,
                "store_sk" uuid,
                "price" numeric NOT NULL,
                "verified_at" TIMESTAMP,
                CONSTRAINT "UQ_6g3f9faf8b4e8b4e8b4e8b4e8ba" UNIQUE ("price_sk"),
                CONSTRAINT "PK_5g3f9faf8b4e8b4e8b4e8b4e8b9" PRIMARY KEY ("id")
            )
        `);

    // Create User_badges table (junction table)
    await queryRunner.query(`
            CREATE TABLE "User_badges" (
                "user_sk" uuid NOT NULL,
                "badge_id" integer NOT NULL,
                "awarded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_7h4fafbf8b4e8b4e8b4e8b4e8bb" PRIMARY KEY ("user_sk", "badge_id")
            )
        `);

    // Create User_score table
    await queryRunner.query(`
            CREATE TABLE "User_score" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "user_sk" uuid,
                "score_type" character varying NOT NULL,
                "points" integer NOT NULL,
                CONSTRAINT "PK_8i5fbfcf8b4e8b4e8b4e8b4e8bc" PRIMARY KEY ("id")
            )
        `);

    // Create Verification_logs table
    await queryRunner.query(`
            CREATE TABLE "Verification_logs" (
                "id" SERIAL NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "user_sk" uuid,
                "target_type" character varying,
                "target_id" character varying,
                "action" character varying,
                CONSTRAINT "PK_9j6fbfdf8b4e8b4e8b4e8b4e8bd" PRIMARY KEY ("id")
            )
        `);

    // Add foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "Category" 
            ADD CONSTRAINT "FK_category_parent" 
            FOREIGN KEY ("parent_id") REFERENCES "Category"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "Product" 
            ADD CONSTRAINT "FK_product_category" 
            FOREIGN KEY ("category") REFERENCES "Category"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "Receipt" 
            ADD CONSTRAINT "FK_receipt_user" 
            FOREIGN KEY ("user_sk") REFERENCES "User"("user_sk") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "Receipt" 
            ADD CONSTRAINT "FK_receipt_store" 
            FOREIGN KEY ("store_sk") REFERENCES "Store"("store_sk") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "ReceiptItem" 
            ADD CONSTRAINT "FK_receiptitem_receipt" 
            FOREIGN KEY ("receipt_sk") REFERENCES "Receipt"("receipt_sk") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "ReceiptItem" 
            ADD CONSTRAINT "FK_receiptitem_product" 
            FOREIGN KEY ("product_sk") REFERENCES "Product"("product_sk") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "Price" 
            ADD CONSTRAINT "FK_price_product" 
            FOREIGN KEY ("product_sk") REFERENCES "Product"("product_sk") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "Price" 
            ADD CONSTRAINT "FK_price_store" 
            FOREIGN KEY ("store_sk") REFERENCES "Store"("store_sk") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "User_badges" 
            ADD CONSTRAINT "FK_userbadges_user" 
            FOREIGN KEY ("user_sk") REFERENCES "User"("user_sk") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "User_badges" 
            ADD CONSTRAINT "FK_userbadges_badge" 
            FOREIGN KEY ("badge_id") REFERENCES "Badges"("id") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "User_score" 
            ADD CONSTRAINT "FK_userscore_user" 
            FOREIGN KEY ("user_sk") REFERENCES "User"("user_sk") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "User_score" 
            ADD CONSTRAINT "FK_userscore_scoretype" 
            FOREIGN KEY ("score_type") REFERENCES "Score_type"("score_type") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "Verification_logs" 
            ADD CONSTRAINT "FK_verificationlogs_user" 
            FOREIGN KEY ("user_sk") REFERENCES "User"("user_sk") 
            ON DELETE NO ACTION ON UPDATE NO ACTION
        `);

    // Add indexes for performance
    await queryRunner.query(
      `CREATE INDEX "IDX_user_email" ON "User" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_product_barcode" ON "Product" ("barcode")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_receipt_status" ON "Receipt" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_receipt_purchase_date" ON "Receipt" ("purchase_date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_store_name" ON "Store" ("name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_store_city" ON "Store" ("city")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_store_province" ON "Store" ("province")`,
    );

    // Add geospatial indexes (when lat/lng are used for location)
    await queryRunner.query(`
            CREATE INDEX "IDX_store_location" ON "Store" 
            USING GIST (ST_Point(longitude, latitude)) 
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_location"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_province"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_city"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_store_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_receipt_purchase_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_receipt_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_product_barcode"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_email"`);

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "Verification_logs" DROP CONSTRAINT IF EXISTS "FK_verificationlogs_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "User_score" DROP CONSTRAINT IF EXISTS "FK_userscore_scoretype"`,
    );
    await queryRunner.query(
      `ALTER TABLE "User_score" DROP CONSTRAINT IF EXISTS "FK_userscore_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "User_badges" DROP CONSTRAINT IF EXISTS "FK_userbadges_badge"`,
    );
    await queryRunner.query(
      `ALTER TABLE "User_badges" DROP CONSTRAINT IF EXISTS "FK_userbadges_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Price" DROP CONSTRAINT IF EXISTS "FK_price_store"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Price" DROP CONSTRAINT IF EXISTS "FK_price_product"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ReceiptItem" DROP CONSTRAINT IF EXISTS "FK_receiptitem_product"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ReceiptItem" DROP CONSTRAINT IF EXISTS "FK_receiptitem_receipt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Receipt" DROP CONSTRAINT IF EXISTS "FK_receipt_store"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Receipt" DROP CONSTRAINT IF EXISTS "FK_receipt_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "FK_product_category"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "FK_category_parent"`,
    );

    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS "Verification_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "User_score"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "User_badges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "Price"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ReceiptItem"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "Receipt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "Product"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "Store"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "User"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "Badges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "Score_type"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "Category"`);

    // Drop extensions (only if no other tables depend on them)
    await queryRunner.query(`DROP EXTENSION IF EXISTS "postgis"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
