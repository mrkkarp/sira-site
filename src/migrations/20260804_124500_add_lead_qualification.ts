import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds `leads.project_type` and `leads.timeline` — the two qualification
 * answers on the quote and designer forms (`src/domain/leads/qualification.ts`).
 *
 * Both columns are nullable with no default, which is the schema saying what
 * the forms say: the questions are optional, and "not answered" is a real,
 * expected state rather than a gap to be back-filled. Every lead already in the
 * table keeps `NULL` for both, correctly — nobody was ever asked.
 *
 * Written to converge rather than to assume a starting point, for the same
 * reason as `add_media_kind`: outside production Payload's postgres adapter
 * pushes schema changes automatically as soon as a dev server connects, so by
 * the time this runs the local database may already have both types and both
 * columns. A bare `CREATE TYPE` would then throw `already exists`, and
 * `runMigrationFile` treats any throw as fatal (`process.exit(1)`), failing the
 * whole Vercel build. `IF NOT EXISTS` plus the duplicate-object guard makes the
 * end state identical whether this meets a fresh database, a dev-pushed one, or
 * one that has already had it applied.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
    CREATE TYPE "public"."enum_leads_project_type" AS ENUM('private', 'commercial', 'outdoor', 'other');
   EXCEPTION WHEN duplicate_object THEN null;
   END $$;
   DO $$ BEGIN
    CREATE TYPE "public"."enum_leads_timeline" AS ENUM('now', 'quarter', 'exploring');
   EXCEPTION WHEN duplicate_object THEN null;
   END $$;
  ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "project_type" "enum_leads_project_type";
  ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "timeline" "enum_leads_timeline";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "leads" DROP COLUMN IF EXISTS "project_type";
   ALTER TABLE "leads" DROP COLUMN IF EXISTS "timeline";
  DROP TYPE IF EXISTS "public"."enum_leads_project_type";
  DROP TYPE IF EXISTS "public"."enum_leads_timeline";`)
}
