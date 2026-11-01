import { neon } from "@neondatabase/serverless";

const dbUrl = "postgresql://neondb_owner:npg_2Y5smvEijTLt@ep-fancy-firefly-b3dhsppe-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(dbUrl);

async function migrate() {
  console.log("Creating tables in Neon PostgreSQL...");

  await sql`
    DO $$ BEGIN
      CREATE TYPE account_type AS ENUM ('bank', 'ewallet', 'cash', 'investment');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    DO $$ BEGIN
      CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type account_type NOT NULL DEFAULT 'bank',
      balance INTEGER NOT NULL DEFAULT 0,
      account_number TEXT,
      color TEXT NOT NULL DEFAULT '#047857',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type transaction_type NOT NULL DEFAULT 'expense',
      icon TEXT NOT NULL DEFAULT 'tag',
      color TEXT NOT NULL DEFAULT '#78716c'
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      amount INTEGER NOT NULL,
      type transaction_type NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      to_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      note TEXT,
      date TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  console.log("Seeding default accounts and categories...");

  // Seed default accounts
  await sql`
    INSERT INTO accounts (id, name, type, balance, account_number, color)
    VALUES 
      ('acc-bca', 'BCA Tabungan', 'bank', 14250000, '5410192831', '#047857'),
      ('acc-mandiri', 'Bank Mandiri', 'bank', 5800000, '137001928374', '#1e40af'),
      ('acc-gopay', 'GoPay', 'ewallet', 340000, '081234567890', '#0284c7'),
      ('acc-cash', 'Tunai / Cash', 'cash', 650000, NULL, '#d97706')
    ON CONFLICT (id) DO NOTHING;
  `;

  // Seed default categories
  await sql`
    INSERT INTO categories (id, name, type, icon, color)
    VALUES
      ('cat-gaji', 'Gaji & Upah', 'income', 'briefcase', '#047857'),
      ('cat-freelance', 'Freelance & Side Job', 'income', 'laptop', '#059669'),
      ('cat-makan', 'Makanan & Minuman', 'expense', 'utensils', '#e11d48'),
      ('cat-transport', 'Transportasi & Bensin', 'expense', 'car', '#d97706'),
      ('cat-tagihan', 'Tagihan & Utilitas', 'expense', 'zap', '#7c3aed'),
      ('cat-lain', 'Lain-lain', 'expense', 'tag', '#78716c')
    ON CONFLICT (id) DO NOTHING;
  `;

  console.log("Migration & seeding complete!");
}

migrate().catch(console.error);
