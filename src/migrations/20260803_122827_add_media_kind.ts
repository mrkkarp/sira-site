import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds `media.kind` (photo | drawing).
 *
 * Hand-edited away from what `migrate:create` generated, which was a bare
 * `CREATE TYPE` + `ADD COLUMN`. The database this runs against already has
 * both, because the field was first added while a dev server was connected and
 * Payload's postgres adapter pushes schema changes automatically outside
 * production. The generated statements would therefore fail with
 * `type "enum_media_kind" already exists`, and `runMigrationFile` treats any
 * throw as fatal — `process.exit(1)`, which fails the whole Vercel build.
 *
 * Written to converge instead: create what is missing, leave what is already
 * there. The end state is identical either way, and the migration can run
 * against a database that has been dev-pushed, one that hasn't, and a fresh
 * one.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
    CREATE TYPE "public"."enum_media_kind" AS ENUM('photo', 'drawing');
   EXCEPTION WHEN duplicate_object THEN null;
   END $$;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "kind" "enum_media_kind" DEFAULT 'photo' NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" DROP COLUMN IF EXISTS "kind";
  DROP TYPE IF EXISTS "public"."enum_media_kind";`)
}
