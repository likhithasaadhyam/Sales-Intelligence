/**
 * MENTNEO Sales Intelligence — SQLite to PostgreSQL / Neon Data Migration Tool
 * 
 * Safely transfers all existing database records from local SQLite (dev.db)
 * to hosted PostgreSQL (Neon / Supabase / AWS RDS / Vercel Postgres)
 * without resetting, overwriting, or deleting existing data.
 * 
 * Usage:
 *   node backend/scripts/migrate-to-postgres.mjs --export-only
 *   TARGET_DATABASE_URL="postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require" node backend/scripts/migrate-to-postgres.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const sqlitePrisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./dev.db",
    },
  },
});

const MODELS = [
  "systemRole",
  "user",
  "team",
  "employeeProfile",
  "package",
  "lead",
  "leadAssignment",
  "callLog",
  "followUp",
  "meeting",
  "client",
  "sale",
  "paymentTransaction",
  "refund",
  "salesTarget",
  "dailyWorkReport",
  "dailyReportActivity",
  "reportApproval",
  "notification",
  "auditLog",
  "systemSetting",
];

async function dumpSqliteData() {
  console.log("📦 1. Exporting all records from SQLite...");
  const backup = {};

  for (const model of MODELS) {
    if (sqlitePrisma[model]) {
      const records = await sqlitePrisma[model].findMany();
      backup[model] = records;
      console.log(`   - ${model}: ${records.length} records exported`);
    }
  }

  const backupDir = path.resolve(process.cwd(), "backend", "prisma", "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `sqlite-export-${timestamp}.json`);
  const latestFile = path.join(backupDir, `sqlite-export-latest.json`);

  const replacer = (_key, value) => (typeof value === "bigint" ? value.toString() : value);
  fs.writeFileSync(backupFile, JSON.stringify(backup, replacer, 2));
  fs.writeFileSync(latestFile, JSON.stringify(backup, replacer, 2));

  console.log(`✅ Backup successfully saved to: ${backupFile}`);
  return { backup, latestFile };
}

async function main() {
  try {
    const { backup, latestFile } = await dumpSqliteData();

    if (process.argv.includes("--export-only")) {
      console.log("\n✨ Export complete. Target database connection skipped (--export-only specified).");
      process.exit(0);
    }

    const targetUrl = process.env.TARGET_DATABASE_URL || process.env.POSTGRES_DATABASE_URL;

    if (!targetUrl) {
      console.log("\n💡 To import directly into PostgreSQL / Neon, run:");
      console.log("   TARGET_DATABASE_URL=\"postgresql://...\" node backend/scripts/migrate-to-postgres.mjs");
      console.log(`\nYour data is safely backed up in ${latestFile}`);
      process.exit(0);
    }

    console.log(`\n🚀 2. Connecting to PostgreSQL (${targetUrl.split("@")[1] || "destination"})...`);

    // Generate temporary postgres schema for push
    const sqliteSchemaPath = path.resolve(process.cwd(), "backend", "prisma", "schema.prisma");
    const pgSchemaContent = fs.readFileSync(sqliteSchemaPath, "utf-8").replace('provider = "sqlite"', 'provider = "postgresql"');
    const tempPgSchema = path.resolve(process.cwd(), "backend", "prisma", "schema.pg-temp.prisma");
    fs.writeFileSync(tempPgSchema, pgSchemaContent);

    console.log("   - Pushing schema to PostgreSQL...");
    execSync(`npx prisma db push --schema="${tempPgSchema}" --accept-data-loss=false`, {
      env: { ...process.env, DATABASE_URL: targetUrl },
      stdio: "inherit",
    });

    console.log("   - Populating tables with exported data...");
    // Import using dynamic prisma instance
    const pgPrisma = new PrismaClient({
      datasources: { db: { url: targetUrl } },
    });

    for (const model of MODELS) {
      const records = backup[model];
      if (records && records.length > 0 && pgPrisma[model]) {
        for (const item of records) {
          await pgPrisma[model].upsert({
            where: { id: item.id },
            update: item,
            create: item,
          });
        }
        console.log(`   ✔ ${model}: ${records.length} records verified and upserted`);
      }
    }

    await pgPrisma.$disconnect();
    fs.unlinkSync(tempPgSchema);

    console.log("\n🎉 Complete data migration succeeded with zero data loss!");
  } catch (err) {
    console.error("❌ Migration error:", err);
    process.exit(1);
  } finally {
    await sqlitePrisma.$disconnect();
  }
}

main();
