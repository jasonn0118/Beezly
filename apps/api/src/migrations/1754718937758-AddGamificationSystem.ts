import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGamificationSystem1754718937758 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create Activity_log table
    await queryRunner.query(`
            CREATE TABLE "Activity_log" (
                "id" SERIAL PRIMARY KEY,
                "user_sk" uuid NOT NULL,
                "activity_type" varchar NOT NULL,
                "points_awarded" integer NOT NULL,
                "reference_id" varchar,
                "reference_type" varchar,
                "metadata" jsonb,
                "created_at" timestamp with time zone NOT NULL DEFAULT now(),
                "updated_at" timestamp with time zone NOT NULL DEFAULT now()
            )
        `);

    // Create User_ranking table
    await queryRunner.query(`
            CREATE TABLE "User_ranking" (
                "user_sk" uuid PRIMARY KEY,
                "total_points" integer NOT NULL DEFAULT 0,
                "current_rank" integer,
                "rank_tier" varchar NOT NULL DEFAULT 'bronze',
                "last_activity" timestamp with time zone NOT NULL DEFAULT now(),
                "streak_days" integer NOT NULL DEFAULT 0,
                "created_at" timestamp with time zone NOT NULL DEFAULT now(),
                "updated_at" timestamp with time zone NOT NULL DEFAULT now()
            )
        `);

    // Create User_daily_activity table
    await queryRunner.query(`
            CREATE TABLE "User_daily_activity" (
                "user_sk" uuid NOT NULL,
                "activity_date" date NOT NULL,
                "points_earned" integer NOT NULL DEFAULT 0,
                "activities_count" integer NOT NULL DEFAULT 0,
                "created_at" timestamp with time zone NOT NULL DEFAULT now(),
                "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
                PRIMARY KEY ("user_sk", "activity_date")
            )
        `);

    // Add foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "Activity_log" 
            ADD CONSTRAINT "FK_activity_log_user" 
            FOREIGN KEY ("user_sk") REFERENCES "User"("user_sk") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "Activity_log" 
            ADD CONSTRAINT "FK_activity_log_score_type" 
            FOREIGN KEY ("activity_type") REFERENCES "Score_type"("score_type") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "User_ranking" 
            ADD CONSTRAINT "FK_user_ranking_user" 
            FOREIGN KEY ("user_sk") REFERENCES "User"("user_sk") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "User_daily_activity" 
            ADD CONSTRAINT "FK_user_daily_activity_user" 
            FOREIGN KEY ("user_sk") REFERENCES "User"("user_sk") ON DELETE CASCADE
        `);

    // Create indexes for performance
    await queryRunner.query(
      `CREATE INDEX "IDX_activity_log_user_sk" ON "Activity_log" ("user_sk")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activity_log_activity_type" ON "Activity_log" ("activity_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activity_log_created_at" ON "Activity_log" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_ranking_total_points" ON "User_ranking" ("total_points" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_ranking_rank_tier" ON "User_ranking" ("rank_tier")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_daily_activity_date" ON "User_daily_activity" ("activity_date")`,
    );

    // Insert predefined score types
    await queryRunner.query(`
            INSERT INTO "Score_type" (score_type, description, default_points) VALUES
            ('RECEIPT_UPLOAD', 'Upload receipt photo', 30),
            ('OCR_VERIFICATION', 'Verify OCR data accuracy', 25),
            ('PRICE_UPDATE', 'Update product price information', 30),
            ('BARCODE_SCAN', 'Register new product barcode', 15),
            ('PRODUCT_SEARCH', 'Search for products (daily limit)', 2),
            ('PRICE_COMPARISON', 'Use price comparison feature', 8),
            ('REVIEW_WRITE', 'Write product review', 12),
            ('REFERRAL_SUCCESS', 'Successful friend referral', 75),
            ('DAILY_LOGIN', 'Daily app login', 10),
            ('BUG_REPORT', 'Submit bug report/feedback', 40),
            ('STREAK_BONUS', 'Consecutive day bonus', 5),
            ('FIRST_TIME_BONUS', 'First time activity bonus', 50)
            ON CONFLICT (score_type) DO NOTHING
        `);

    // Insert sample badges
    await queryRunner.query(`
            INSERT INTO "Badges" (name, description, icon_url) VALUES
            ('First Receipt', 'Upload your first receipt', '/badges/first-receipt.svg'),
            ('Receipt Master', 'Upload 100 receipts', '/badges/receipt-master.svg'),
            ('Data Guardian', 'Verify 50 OCR results', '/badges/data-guardian.svg'),
            ('Price Keeper', 'Update 25 product prices', '/badges/price-keeper.svg'),
            ('Searcher', 'Search for 100 products', '/badges/searcher.svg'),
            ('Comparison King', 'Compare prices 50 times', '/badges/comparison-king.svg'),
            ('Reviewer', 'Write 10 product reviews', '/badges/reviewer.svg'),
            ('Recruiter', 'Refer 5 friends', '/badges/recruiter.svg'),
            ('Week Warrior', '7-day login streak', '/badges/week-warrior.svg'),
            ('Month Master', '30-day login streak', '/badges/month-master.svg'),
            ('Bronze Star', 'Reach Bronze tier', '/badges/bronze-star.svg'),
            ('Silver Star', 'Reach Silver tier', '/badges/silver-star.svg'),
            ('Gold Star', 'Reach Gold tier', '/badges/gold-star.svg')
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    await queryRunner.query(
      `ALTER TABLE "Activity_log" DROP CONSTRAINT "FK_activity_log_score_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "Activity_log" DROP CONSTRAINT "FK_activity_log_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "User_ranking" DROP CONSTRAINT "FK_user_ranking_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "User_daily_activity" DROP CONSTRAINT "FK_user_daily_activity_user"`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_activity_log_user_sk"`);
    await queryRunner.query(`DROP INDEX "IDX_activity_log_activity_type"`);
    await queryRunner.query(`DROP INDEX "IDX_activity_log_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_user_ranking_total_points"`);
    await queryRunner.query(`DROP INDEX "IDX_user_ranking_rank_tier"`);
    await queryRunner.query(`DROP INDEX "IDX_user_daily_activity_date"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "User_daily_activity"`);
    await queryRunner.query(`DROP TABLE "User_ranking"`);
    await queryRunner.query(`DROP TABLE "Activity_log"`);

    // Remove score types (optional - might want to keep existing data)
    await queryRunner.query(`
            DELETE FROM "Score_type" WHERE score_type IN (
                'RECEIPT_UPLOAD', 'OCR_VERIFICATION', 'PRICE_UPDATE', 'BARCODE_SCAN',
                'PRODUCT_SEARCH', 'PRICE_COMPARISON', 'REVIEW_WRITE', 'REFERRAL_SUCCESS',
                'DAILY_LOGIN', 'BUG_REPORT', 'STREAK_BONUS', 'FIRST_TIME_BONUS'
            )
        `);

    // Remove sample badges
    await queryRunner.query(`
            DELETE FROM "Badges" WHERE name IN (
                'First Receipt', 'Receipt Master', 'Data Guardian', 'Price Keeper',
                'Searcher', 'Comparison King', 'Reviewer', 'Recruiter',
                'Week Warrior', 'Month Master', 'Bronze Star', 'Silver Star', 'Gold Star'
            )
        `);
  }
}
