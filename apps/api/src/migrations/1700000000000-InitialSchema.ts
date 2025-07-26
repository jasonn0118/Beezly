import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial Schema Migration for New Developers
 *
 * This migration creates the complete database schema from scratch.
 * It should only be run on empty databases (new developer setup).
 *
 * For existing environments (staging/production), use the baseline migration instead.
 */
export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create UUID extension if it doesn't exist
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create Store table
    await queryRunner.query(
      `CREATE TABLE "Store" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "store_sk" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "address" character varying, "city" character varying, "province" character varying, "postal_code" character varying, "latitude" double precision, "longitude" double precision, "place_id" character varying, CONSTRAINT "UQ_c87d6d368ad70873403dc0417a1" UNIQUE ("store_sk"), CONSTRAINT "UQ_f1c45a7e5a9c58bbe2402dc86a0" UNIQUE ("place_id"), CONSTRAINT "PK_f20e3845680debc547e49355a89" PRIMARY KEY ("id"))`,
    );

    // Create Category table
    await queryRunner.query(
      `CREATE TABLE "Category" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "parent_id" integer, "name" text, "slug" text, "level" bigint, "use_yn" boolean, CONSTRAINT "PK_c2727780c5b9b0c564c29a4977c" PRIMARY KEY ("id"))`,
    );

    // Create Product barcode type enum
    await queryRunner.query(
      `CREATE TYPE "public"."Product_barcode_type_enum" AS ENUM('code39', 'ean8', 'ean13', 'codabar', 'itf14', 'code128', 'upc_a', 'upc_e')`,
    );

    // Create Product table
    await queryRunner.query(
      `CREATE TABLE "Product" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "product_sk" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "barcode" character varying, "barcode_type" "public"."Product_barcode_type_enum", "category" integer, "image_url" character varying, "credit_score" numeric, "verified_count" integer, "flagged_count" integer, CONSTRAINT "UQ_5408c8f688443edfa94aa95ec77" UNIQUE ("product_sk"), CONSTRAINT "PK_9fc040db7872192bbc26c515710" PRIMARY KEY ("id"))`,
    );

    // Create ReceiptItem table with generated column
    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (current_database(), 'public', 'ReceiptItem', 'GENERATED_COLUMN', 'line_total', '"price" * "quantity"')`,
    );
    await queryRunner.query(
      `CREATE TABLE "ReceiptItem" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "receiptitem_sk" uuid NOT NULL DEFAULT uuid_generate_v4(), "receipt_sk" uuid, "product_sk" uuid, "price" numeric NOT NULL, "quantity" integer NOT NULL DEFAULT '1', "line_total" numeric GENERATED ALWAYS AS ("price" * "quantity") STORED NOT NULL, CONSTRAINT "UQ_ccaa04aaef141c8c0706bba5f33" UNIQUE ("receiptitem_sk"), CONSTRAINT "PK_63dbeaf2451849f0f8b492ea3e5" PRIMARY KEY ("id"))`,
    );

    // Create Receipt table
    await queryRunner.query(
      `CREATE TABLE "Receipt" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "receipt_sk" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_sk" uuid, "store_sk" uuid, "image_url" character varying, "status" character varying NOT NULL DEFAULT 'pending', "parsed_data" jsonb, "purchase_date" date, CONSTRAINT "UQ_c24cc7ef00df9b1a6292feac52c" UNIQUE ("receipt_sk"), CONSTRAINT "PK_83a8032351433085916cc8318b0" PRIMARY KEY ("id"))`,
    );

    // Create User table
    await queryRunner.query(
      `CREATE TABLE "User" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_sk" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "display_name" character varying, "points" integer NOT NULL DEFAULT '0', "level" character varying, CONSTRAINT "UQ_95c0e2d50d9176084c974ea3fa5" UNIQUE ("user_sk"), CONSTRAINT "UQ_4a257d2c9837248d70640b3e36e" UNIQUE ("email"), CONSTRAINT "PK_9862f679340fb2388436a5ab3e4" PRIMARY KEY ("id"))`,
    );

    // Create User_badges table
    await queryRunner.query(
      `CREATE TABLE "User_badges" ("user_sk" uuid NOT NULL, "badge_id" integer NOT NULL, "awarded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_005fff6dbf1d043501ba528742b" PRIMARY KEY ("user_sk", "badge_id"))`,
    );

    // Create Badges table
    await queryRunner.query(
      `CREATE TABLE "Badges" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "icon_url" character varying, "description" character varying, CONSTRAINT "PK_1003fe1bcfbe3e128ad9daefba2" PRIMARY KEY ("id"))`,
    );

    // Create User_score table
    await queryRunner.query(
      `CREATE TABLE "User_score" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_sk" uuid, "score_type" character varying NOT NULL, "points" integer NOT NULL, CONSTRAINT "PK_08d046ad2009ab791b95a391b74" PRIMARY KEY ("id"))`,
    );

    // Create Score_type table
    await queryRunner.query(
      `CREATE TABLE "Score_type" ("score_type" character varying NOT NULL, "description" character varying, "default_points" integer, CONSTRAINT "PK_cbf7665169d7c4f0805e2eb0b4e" PRIMARY KEY ("score_type"))`,
    );

    // Create Price table
    await queryRunner.query(
      `CREATE TABLE "Price" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "price_sk" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_sk" uuid, "store_sk" uuid, "price" numeric NOT NULL, "recorded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "currency" character varying, "credit_score" numeric, "verified_count" integer, "flagged_count" integer, CONSTRAINT "UQ_188d5c74aa4d3872f539aec220f" UNIQUE ("price_sk"), CONSTRAINT "PK_31cabc719b61fdc590129ba463f" PRIMARY KEY ("id"))`,
    );

    // Create Verification_logs table
    await queryRunner.query(
      `CREATE TABLE "Verification_logs" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_sk" uuid, "target_type" character varying, "target_id" character varying, "action" character varying, CONSTRAINT "PK_dbc4afa9e14e08689c5069f0242" PRIMARY KEY ("id"))`,
    );

    // Add foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "Category" ADD CONSTRAINT "FK_41185546107ec4b4774da68df2f" FOREIGN KEY ("parent_id") REFERENCES "Category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Product" ADD CONSTRAINT "FK_9047547e9cdfe85d2d24e446c49" FOREIGN KEY ("category") REFERENCES "Category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ReceiptItem" ADD CONSTRAINT "FK_1b3d51e1bf97156a807c54b2e9b" FOREIGN KEY ("receipt_sk") REFERENCES "Receipt"("receipt_sk") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "ReceiptItem" ADD CONSTRAINT "FK_70e8dd41ce1484e46e914d712e0" FOREIGN KEY ("product_sk") REFERENCES "Product"("product_sk") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Receipt" ADD CONSTRAINT "FK_afde56c91e09dd01fc77b3192af" FOREIGN KEY ("user_sk") REFERENCES "User"("user_sk") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Receipt" ADD CONSTRAINT "FK_114a297ea6961f84c1b4d337aab" FOREIGN KEY ("store_sk") REFERENCES "Store"("store_sk") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "User_badges" ADD CONSTRAINT "FK_afcc0f658c230862befd166eb4a" FOREIGN KEY ("user_sk") REFERENCES "User"("user_sk") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "User_badges" ADD CONSTRAINT "FK_04bb4f4d22861ac7f5347cb5d58" FOREIGN KEY ("badge_id") REFERENCES "Badges"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "User_score" ADD CONSTRAINT "FK_51879e1530aedebad89a8226beb" FOREIGN KEY ("user_sk") REFERENCES "User"("user_sk") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "User_score" ADD CONSTRAINT "FK_0c892d281fd7e225fb5be6e5fc1" FOREIGN KEY ("score_type") REFERENCES "Score_type"("score_type") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Price" ADD CONSTRAINT "FK_d09b0c0ee17c3054b894aa2dc4f" FOREIGN KEY ("product_sk") REFERENCES "Product"("product_sk") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Price" ADD CONSTRAINT "FK_fc22a308d4c252f16d52e382b3a" FOREIGN KEY ("store_sk") REFERENCES "Store"("store_sk") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "Verification_logs" ADD CONSTRAINT "FK_ad21f536f813604347eb2386cf3" FOREIGN KEY ("user_sk") REFERENCES "User"("user_sk") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all foreign key constraints first
    await queryRunner.query(
      `ALTER TABLE "Verification_logs" DROP CONSTRAINT "FK_ad21f536f813604347eb2386cf3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Price" DROP CONSTRAINT "FK_fc22a308d4c252f16d52e382b3a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Price" DROP CONSTRAINT "FK_d09b0c0ee17c3054b894aa2dc4f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "User_score" DROP CONSTRAINT "FK_0c892d281fd7e225fb5be6e5fc1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "User_score" DROP CONSTRAINT "FK_51879e1530aedebad89a8226beb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "User_badges" DROP CONSTRAINT "FK_04bb4f4d22861ac7f5347cb5d58"`,
    );
    await queryRunner.query(
      `ALTER TABLE "User_badges" DROP CONSTRAINT "FK_afcc0f658c230862befd166eb4a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Receipt" DROP CONSTRAINT "FK_114a297ea6961f84c1b4d337aab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Receipt" DROP CONSTRAINT "FK_afde56c91e09dd01fc77b3192af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ReceiptItem" DROP CONSTRAINT "FK_70e8dd41ce1484e46e914d712e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ReceiptItem" DROP CONSTRAINT "FK_1b3d51e1bf97156a807c54b2e9b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Product" DROP CONSTRAINT "FK_9047547e9cdfe85d2d24e446c49"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Category" DROP CONSTRAINT "FK_41185546107ec4b4774da68df2f"`,
    );

    // Drop all tables
    await queryRunner.query(`DROP TABLE "Verification_logs"`);
    await queryRunner.query(`DROP TABLE "Price"`);
    await queryRunner.query(`DROP TABLE "Score_type"`);
    await queryRunner.query(`DROP TABLE "User_score"`);
    await queryRunner.query(`DROP TABLE "Badges"`);
    await queryRunner.query(`DROP TABLE "User_badges"`);
    await queryRunner.query(`DROP TABLE "User"`);
    await queryRunner.query(`DROP TABLE "Receipt"`);
    await queryRunner.query(`DROP TABLE "ReceiptItem"`);
    await queryRunner.query(`DROP TABLE "Product"`);
    await queryRunner.query(`DROP TABLE "Category"`);
    await queryRunner.query(`DROP TABLE "Store"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "public"."Product_barcode_type_enum"`);

    // Clean up typeorm metadata
    await queryRunner.query(
      `DELETE FROM "typeorm_metadata" WHERE "type" = 'GENERATED_COLUMN' AND "name" = 'line_total' AND "table" = 'ReceiptItem'`,
    );
  }
}
