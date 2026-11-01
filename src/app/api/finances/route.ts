import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 500 });
  }

  try {
    const sql = neon(dbUrl);
    const [accounts, categories, transactions] = await Promise.all([
      sql`SELECT id, name, type, balance, account_number, color FROM accounts ORDER BY created_at ASC`,
      sql`SELECT id, name, type, icon, color FROM categories ORDER BY name ASC`,
      sql`SELECT id, amount, type, account_id, to_account_id, category_id, note, date FROM transactions ORDER BY created_at DESC LIMIT 50`,
    ]);

    return NextResponse.json({
      status: "connected",
      database: "Neon Serverless Postgres (SSL)",
      timestamp: new Date().toISOString(),
      data: {
        accounts,
        categories,
        transactions,
      },
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Database query failed", details },
      { status: 500 }
    );
  }
}
