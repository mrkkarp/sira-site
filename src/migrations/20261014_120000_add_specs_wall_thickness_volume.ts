import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `specs.wallThickness` and `specs.volume` — a planter's wall and capacity,
 * first needed for Flute (2026-10-14). Written by hand on the pattern of
 * `20260801_150554_add_specs_connection`: the latest schema snapshot predates
 * `20260804_124500_add_lead_qualification`, so `migrate:create` would diff
 * against stale state and re-emit that migration's changes.
 *
 * Purely additive — two nullable columns and an enum per measurement on the
 * live table and its versions table — so it is safe to apply before the code
 * that reads them is deployed.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_specs_wall_thickness_unit" AS ENUM('mm', 'cm', 'm');
  CREATE TYPE "public"."enum_products_specs_volume_unit" AS ENUM('l');
  CREATE TYPE "public"."enum__products_v_version_specs_wall_thickness_unit" AS ENUM('mm', 'cm', 'm');
  CREATE TYPE "public"."enum__products_v_version_specs_volume_unit" AS ENUM('l');
  ALTER TABLE "products" ADD COLUMN "specs_wall_thickness_value" numeric;
  ALTER TABLE "products" ADD COLUMN "specs_wall_thickness_unit" "enum_products_specs_wall_thickness_unit" DEFAULT 'mm';
  ALTER TABLE "products" ADD COLUMN "specs_volume_value" numeric;
  ALTER TABLE "products" ADD COLUMN "specs_volume_unit" "enum_products_specs_volume_unit" DEFAULT 'l';
  ALTER TABLE "_products_v" ADD COLUMN "version_specs_wall_thickness_value" numeric;
  ALTER TABLE "_products_v" ADD COLUMN "version_specs_wall_thickness_unit" "enum__products_v_version_specs_wall_thickness_unit" DEFAULT 'mm';
  ALTER TABLE "_products_v" ADD COLUMN "version_specs_volume_value" numeric;
  ALTER TABLE "_products_v" ADD COLUMN "version_specs_volume_unit" "enum__products_v_version_specs_volume_unit" DEFAULT 'l';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products" DROP COLUMN "specs_wall_thickness_value";
  ALTER TABLE "products" DROP COLUMN "specs_wall_thickness_unit";
  ALTER TABLE "products" DROP COLUMN "specs_volume_value";
  ALTER TABLE "products" DROP COLUMN "specs_volume_unit";
  ALTER TABLE "_products_v" DROP COLUMN "version_specs_wall_thickness_value";
  ALTER TABLE "_products_v" DROP COLUMN "version_specs_wall_thickness_unit";
  ALTER TABLE "_products_v" DROP COLUMN "version_specs_volume_value";
  ALTER TABLE "_products_v" DROP COLUMN "version_specs_volume_unit";
  DROP TYPE "public"."enum_products_specs_wall_thickness_unit";
  DROP TYPE "public"."enum_products_specs_volume_unit";
  DROP TYPE "public"."enum__products_v_version_specs_wall_thickness_unit";
  DROP TYPE "public"."enum__products_v_version_specs_volume_unit";`)
}
