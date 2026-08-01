import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_locales" ADD COLUMN "specs_connection" varchar;
  ALTER TABLE "_products_v_locales" ADD COLUMN "version_specs_connection" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_locales" DROP COLUMN "specs_connection";
  ALTER TABLE "_products_v_locales" DROP COLUMN "version_specs_connection";`)
}
