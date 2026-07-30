import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('uk', 'en', 'pl');
  CREATE TYPE "public"."enum_users_role" AS ENUM('superAdmin', 'owner', 'contentManager', 'productManager', 'salesManager', 'translator', 'viewer');
  CREATE TYPE "public"."category_legacy_source" AS ENUM('horoshop');
  CREATE TYPE "public"."category_migration_status" AS ENUM('pending', 'imported', 'updated', 'skipped', 'conflict', 'failed');
  CREATE TYPE "public"."enum_categories_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__categories_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__categories_v_published_locale" AS ENUM('uk', 'en', 'pl');
  CREATE TYPE "public"."enum_colours_text_mode" AS ENUM('dark', 'light');
  CREATE TYPE "public"."enum_colours_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__colours_v_version_text_mode" AS ENUM('dark', 'light');
  CREATE TYPE "public"."enum__colours_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__colours_v_published_locale" AS ENUM('uk', 'en', 'pl');
  CREATE TYPE "public"."enum_products_specs_usage" AS ENUM('indoor', 'outdoor');
  CREATE TYPE "public"."enum_products_variants_status" AS ENUM('inStock', 'madeToOrder', 'availableForOrder', 'quoteOnly', 'unavailable');
  CREATE TYPE "public"."enum_products_editorial_status" AS ENUM('draft', 'readyForReview', 'published', 'scheduled', 'archived', 'discontinued');
  CREATE TYPE "public"."enum_products_stock_status" AS ENUM('inStock', 'madeToOrder', 'availableForOrder', 'quoteOnly', 'unavailable');
  CREATE TYPE "public"."enum_products_specs_width_unit" AS ENUM('mm', 'cm', 'm');
  CREATE TYPE "public"."enum_products_specs_depth_unit" AS ENUM('mm', 'cm', 'm');
  CREATE TYPE "public"."enum_products_specs_height_unit" AS ENUM('mm', 'cm', 'm');
  CREATE TYPE "public"."enum_products_specs_diameter_unit" AS ENUM('mm', 'cm', 'm');
  CREATE TYPE "public"."enum_products_specs_thickness_unit" AS ENUM('mm', 'cm', 'm');
  CREATE TYPE "public"."enum_products_specs_weight_unit" AS ENUM('kg');
  CREATE TYPE "public"."enum_products_specs_weight_per_area_unit" AS ENUM('kg/m2');
  CREATE TYPE "public"."enum_products_specs_drain_diameter_unit" AS ENUM('mm', 'cm', 'm');
  CREATE TYPE "public"."enum_products_specs_coverage_area_unit" AS ENUM('m2');
  CREATE TYPE "public"."enum_products_specs_pieces_per_pack_unit" AS ENUM('pcs');
  CREATE TYPE "public"."enum_products_pricing_currency" AS ENUM('UAH');
  CREATE TYPE "public"."enum_products_pricing_vat_state" AS ENUM('included', 'excluded');
  CREATE TYPE "public"."product_capacity_status" AS ENUM('normal', 'high', 'paused');
  CREATE TYPE "public"."product_legacy_source" AS ENUM('horoshop');
  CREATE TYPE "public"."product_migration_status" AS ENUM('pending', 'imported', 'updated', 'skipped', 'conflict', 'failed');
  CREATE TYPE "public"."enum_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__products_v_version_specs_usage" AS ENUM('indoor', 'outdoor');
  CREATE TYPE "public"."enum__products_v_version_variants_status" AS ENUM('inStock', 'madeToOrder', 'availableForOrder', 'quoteOnly', 'unavailable');
  CREATE TYPE "public"."enum__products_v_version_editorial_status" AS ENUM('draft', 'readyForReview', 'published', 'scheduled', 'archived', 'discontinued');
  CREATE TYPE "public"."enum__products_v_version_stock_status" AS ENUM('inStock', 'madeToOrder', 'availableForOrder', 'quoteOnly', 'unavailable');
  CREATE TYPE "public"."enum__products_v_version_specs_width_unit" AS ENUM('mm', 'cm', 'm');
  CREATE TYPE "public"."enum__products_v_version_specs_depth_unit" AS ENUM('mm', 'cm', 'm');
  CREATE TYPE "public"."enum__products_v_version_specs_height_unit" AS ENUM('mm', 'cm', 'm');
  CREATE TYPE "public"."enum__products_v_version_specs_diameter_unit" AS ENUM('mm', 'cm', 'm');
  CREATE TYPE "public"."enum__products_v_version_specs_thickness_unit" AS ENUM('mm', 'cm', 'm');
  CREATE TYPE "public"."enum__products_v_version_specs_weight_unit" AS ENUM('kg');
  CREATE TYPE "public"."enum__products_v_version_specs_weight_per_area_unit" AS ENUM('kg/m2');
  CREATE TYPE "public"."enum__products_v_version_specs_drain_diameter_unit" AS ENUM('mm', 'cm', 'm');
  CREATE TYPE "public"."enum__products_v_version_specs_coverage_area_unit" AS ENUM('m2');
  CREATE TYPE "public"."enum__products_v_version_specs_pieces_per_pack_unit" AS ENUM('pcs');
  CREATE TYPE "public"."enum__products_v_version_pricing_currency" AS ENUM('UAH');
  CREATE TYPE "public"."enum__products_v_version_pricing_vat_state" AS ENUM('included', 'excluded');
  CREATE TYPE "public"."enum__products_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__products_v_published_locale" AS ENUM('uk', 'en', 'pl');
  CREATE TYPE "public"."enum_pages_blocks_spacer_size" AS ENUM('sm', 'md', 'lg', 'xl');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_blocks_spacer_size" AS ENUM('sm', 'md', 'lg', 'xl');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_published_locale" AS ENUM('uk', 'en', 'pl');
  CREATE TYPE "public"."enum_documents_format" AS ENUM('pdf', 'dwg', 'dxf', 'skp', 'obj', 'stl', 'bim', 'installInstructions', 'careInstructions', 'warranty', 'spec', 'dimensionalDrawing');
  CREATE TYPE "public"."enum_documents_language" AS ENUM('uk', 'en', 'pl');
  CREATE TYPE "public"."enum_documents_visibility" AS ENUM('public', 'private', 'designerOnly');
  CREATE TYPE "public"."enum_carts_lines_options_option_key" AS ENUM('colour', 'size', 'material', 'coating', 'mount', 'faucetType', 'hole', 'overflow', 'connection', 'kit', 'custom');
  CREATE TYPE "public"."enum_carts_lines_unit_price_currency" AS ENUM('UAH');
  CREATE TYPE "public"."enum_carts_currency" AS ENUM('UAH');
  CREATE TYPE "public"."enum_orders_lines_options_option_key" AS ENUM('colour', 'size', 'material', 'coating', 'mount', 'faucetType', 'hole', 'overflow', 'connection', 'kit', 'custom');
  CREATE TYPE "public"."enum_orders_currency" AS ENUM('UAH');
  CREATE TYPE "public"."enum_orders_delivery_method_type" AS ENUM('novaPoshtaBranch', 'novaPoshtaCourier', 'courier', 'pickup');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'awaitingPayment', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'refunded', 'failed');
  CREATE TYPE "public"."enum_payments_provider" AS ENUM('liqpay', 'manual');
  CREATE TYPE "public"."enum_payments_amount_currency" AS ENUM('UAH');
  CREATE TYPE "public"."enum_payments_status" AS ENUM('pending', 'success', 'failure', 'reversed', 'sandbox');
  CREATE TYPE "public"."enum_leads_type" AS ENUM('contact', 'callback', 'quote', 'designer', 'warranty', 'sample');
  CREATE TYPE "public"."enum_leads_status" AS ENUM('new', 'inProgress', 'waitingForCustomer', 'quoted', 'won', 'lost', 'spam', 'closed');
  CREATE TYPE "public"."enum_leads_locale" AS ENUM('uk', 'en', 'pl');
  CREATE TYPE "public"."enum_redirects_status_code" AS ENUM('301', '302');
  CREATE TYPE "public"."enum_import_batches_source" AS ENUM('horoshop');
  CREATE TYPE "public"."enum_import_batches_mode" AS ENUM('dryRun', 'live');
  CREATE TYPE "public"."enum_import_batches_status" AS ENUM('running', 'completed', 'failed');
  CREATE TYPE "public"."enum_import_warnings_entity_type" AS ENUM('product', 'category', 'colour', 'material', 'page', 'article', 'project', 'faqItem', 'stockist', 'resource', 'navigationItem');
  CREATE TYPE "public"."enum_import_warnings_severity" AS ENUM('warning', 'error');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'viewer' NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"caption" varchar,
  	"credit" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "categories_legacy_migration_warnings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"warning" varchar
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"parent_id" integer,
  	"sort_order" numeric DEFAULT 0,
  	"show_in_menu" boolean DEFAULT true,
  	"old_url" varchar,
  	"legacy_legacy_source" "category_legacy_source" DEFAULT 'horoshop',
  	"legacy_legacy_id" varchar,
  	"legacy_legacy_url" varchar,
  	"legacy_legacy_slug" varchar,
  	"legacy_imported_at" timestamp(3) with time zone,
  	"legacy_import_batch_id_id" integer,
  	"legacy_migration_status" "category_migration_status",
  	"legacy_source_checksum" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_categories_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "categories_locales" (
  	"name" varchar,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_categories_v_version_legacy_migration_warnings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"warning" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_categories_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_parent_id" integer,
  	"version_sort_order" numeric DEFAULT 0,
  	"version_show_in_menu" boolean DEFAULT true,
  	"version_old_url" varchar,
  	"version_legacy_legacy_source" "category_legacy_source" DEFAULT 'horoshop',
  	"version_legacy_legacy_id" varchar,
  	"version_legacy_legacy_url" varchar,
  	"version_legacy_legacy_slug" varchar,
  	"version_legacy_imported_at" timestamp(3) with time zone,
  	"version_legacy_import_batch_id_id" integer,
  	"version_legacy_migration_status" "category_migration_status",
  	"version_legacy_source_checksum" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__categories_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__categories_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_categories_v_locales" (
  	"version_name" varchar,
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "colours" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"digital_preview_hex" varchar,
  	"texture_image_id" integer,
  	"ral_or_ncs_reference" varchar,
  	"text_mode" "enum_colours_text_mode" DEFAULT 'dark',
  	"physical_sample_available" boolean DEFAULT false,
  	"surcharge" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_colours_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "colours_locales" (
  	"display_name" varchar,
  	"disclaimer" varchar DEFAULT 'Колір на екрані — орієнтовний. Точний відтінок бетону залежить від партії цементу та умов освітлення.',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "colours_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer
  );
  
  CREATE TABLE "_colours_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_digital_preview_hex" varchar,
  	"version_texture_image_id" integer,
  	"version_ral_or_ncs_reference" varchar,
  	"version_text_mode" "enum__colours_v_version_text_mode" DEFAULT 'dark',
  	"version_physical_sample_available" boolean DEFAULT false,
  	"version_surcharge" numeric,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__colours_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__colours_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_colours_v_locales" (
  	"version_display_name" varchar,
  	"version_disclaimer" varchar DEFAULT 'Колір на екрані — орієнтовний. Точний відтінок бетону залежить від партії цементу та умов освітлення.',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_colours_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer
  );
  
  CREATE TABLE "products_specs_usage" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_products_specs_usage",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "products_price_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"old_value" numeric,
  	"new_value" numeric,
  	"changed_by_id" integer,
  	"changed_at" timestamp(3) with time zone,
  	"reason" varchar
  );
  
  CREATE TABLE "products_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"sku" varchar,
  	"option_axes_colour_id" integer,
  	"option_axes_size" varchar,
  	"option_axes_material" varchar,
  	"option_axes_coating" varchar,
  	"option_axes_mount" varchar,
  	"option_axes_faucet_type" varchar,
  	"option_axes_hole" varchar,
  	"option_axes_overflow" varchar,
  	"option_axes_connection" varchar,
  	"option_axes_kit" varchar,
  	"option_axes_custom" varchar,
  	"price" numeric,
  	"status" "enum_products_variants_status" DEFAULT 'madeToOrder',
  	"shopify_id" varchar
  );
  
  CREATE TABLE "products_variants_locales" (
  	"lead_time_override" varchar,
  	"stock_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_seo_old_urls" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar
  );
  
  CREATE TABLE "products_legacy_migration_warnings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"warning" varchar
  );
  
  CREATE TABLE "products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"sku" varchar,
  	"category_id" integer,
  	"main_image_id" integer,
  	"editorial_status" "enum_products_editorial_status" DEFAULT 'draft',
  	"stock_status" "enum_products_stock_status" DEFAULT 'madeToOrder',
  	"specs_width_value" numeric,
  	"specs_width_unit" "enum_products_specs_width_unit" DEFAULT 'mm',
  	"specs_depth_value" numeric,
  	"specs_depth_unit" "enum_products_specs_depth_unit" DEFAULT 'mm',
  	"specs_height_value" numeric,
  	"specs_height_unit" "enum_products_specs_height_unit" DEFAULT 'mm',
  	"specs_diameter_value" numeric,
  	"specs_diameter_unit" "enum_products_specs_diameter_unit" DEFAULT 'mm',
  	"specs_thickness_value" numeric,
  	"specs_thickness_unit" "enum_products_specs_thickness_unit" DEFAULT 'mm',
  	"specs_weight_value" numeric,
  	"specs_weight_unit" "enum_products_specs_weight_unit" DEFAULT 'kg',
  	"specs_weight_per_area_value" numeric,
  	"specs_weight_per_area_unit" "enum_products_specs_weight_per_area_unit" DEFAULT 'kg/m2',
  	"specs_drain_diameter_value" numeric,
  	"specs_drain_diameter_unit" "enum_products_specs_drain_diameter_unit" DEFAULT 'mm',
  	"specs_coverage_area_value" numeric,
  	"specs_coverage_area_unit" "enum_products_specs_coverage_area_unit" DEFAULT 'm2',
  	"specs_pieces_per_pack_value" numeric,
  	"specs_pieces_per_pack_unit" "enum_products_specs_pieces_per_pack_unit" DEFAULT 'pcs',
  	"specs_country_of_origin" varchar,
  	"base_price" numeric,
  	"pricing_currency" "enum_products_pricing_currency" DEFAULT 'UAH',
  	"pricing_compare_at_price" numeric,
  	"pricing_cost_price" numeric,
  	"pricing_vat_state" "enum_products_pricing_vat_state" DEFAULT 'included',
  	"pricing_promo_price" numeric,
  	"pricing_promo_start_date" timestamp(3) with time zone,
  	"pricing_promo_end_date" timestamp(3) with time zone,
  	"lead_time_days_min" numeric,
  	"lead_time_days_max" numeric,
  	"lead_time_days_urgent_lead_time_days" numeric,
  	"lead_time_days_production_capacity_status" "product_capacity_status",
  	"lead_time_days_temporary_extension_until" timestamp(3) with time zone,
  	"old_url" varchar,
  	"seo_focus_keyword" varchar,
  	"seo_og_image_id" integer,
  	"seo_canonical_url" varchar,
  	"seo_no_index" boolean DEFAULT false,
  	"legacy_legacy_source" "product_legacy_source" DEFAULT 'horoshop',
  	"legacy_legacy_id" varchar,
  	"legacy_legacy_url" varchar,
  	"legacy_legacy_slug" varchar,
  	"legacy_imported_at" timestamp(3) with time zone,
  	"legacy_import_batch_id_id" integer,
  	"legacy_migration_status" "product_migration_status",
  	"legacy_source_checksum" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_products_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "products_locales" (
  	"name" varchar,
  	"short_description" varchar,
  	"specs_material" varchar,
  	"specs_technology" varchar,
  	"specs_reinforcement" varchar,
  	"specs_coating" varchar,
  	"specs_mount_type" varchar,
  	"specs_faucet_type" varchar,
  	"specs_faucet_hole" varchar,
  	"specs_overflow" varchar,
  	"specs_wall_connection" varchar,
  	"specs_floor_connection" varchar,
  	"specs_drainage" varchar,
  	"specs_fixing_method" varchar,
  	"specs_packaging_type" varchar,
  	"specs_warranty" varchar,
  	"specs_care" varchar,
  	"lead_time_days_text_override" varchar,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"colours_id" integer,
  	"media_id" integer,
  	"documents_id" integer
  );
  
  CREATE TABLE "_products_v_version_specs_usage" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__products_v_version_specs_usage",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_products_v_version_price_history" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"old_value" numeric,
  	"new_value" numeric,
  	"changed_by_id" integer,
  	"changed_at" timestamp(3) with time zone,
  	"reason" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"sku" varchar,
  	"option_axes_colour_id" integer,
  	"option_axes_size" varchar,
  	"option_axes_material" varchar,
  	"option_axes_coating" varchar,
  	"option_axes_mount" varchar,
  	"option_axes_faucet_type" varchar,
  	"option_axes_hole" varchar,
  	"option_axes_overflow" varchar,
  	"option_axes_connection" varchar,
  	"option_axes_kit" varchar,
  	"option_axes_custom" varchar,
  	"price" numeric,
  	"status" "enum__products_v_version_variants_status" DEFAULT 'madeToOrder',
  	"shopify_id" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_variants_locales" (
  	"lead_time_override" varchar,
  	"stock_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_version_seo_old_urls" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v_version_legacy_migration_warnings" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"warning" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_products_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_sku" varchar,
  	"version_category_id" integer,
  	"version_main_image_id" integer,
  	"version_editorial_status" "enum__products_v_version_editorial_status" DEFAULT 'draft',
  	"version_stock_status" "enum__products_v_version_stock_status" DEFAULT 'madeToOrder',
  	"version_specs_width_value" numeric,
  	"version_specs_width_unit" "enum__products_v_version_specs_width_unit" DEFAULT 'mm',
  	"version_specs_depth_value" numeric,
  	"version_specs_depth_unit" "enum__products_v_version_specs_depth_unit" DEFAULT 'mm',
  	"version_specs_height_value" numeric,
  	"version_specs_height_unit" "enum__products_v_version_specs_height_unit" DEFAULT 'mm',
  	"version_specs_diameter_value" numeric,
  	"version_specs_diameter_unit" "enum__products_v_version_specs_diameter_unit" DEFAULT 'mm',
  	"version_specs_thickness_value" numeric,
  	"version_specs_thickness_unit" "enum__products_v_version_specs_thickness_unit" DEFAULT 'mm',
  	"version_specs_weight_value" numeric,
  	"version_specs_weight_unit" "enum__products_v_version_specs_weight_unit" DEFAULT 'kg',
  	"version_specs_weight_per_area_value" numeric,
  	"version_specs_weight_per_area_unit" "enum__products_v_version_specs_weight_per_area_unit" DEFAULT 'kg/m2',
  	"version_specs_drain_diameter_value" numeric,
  	"version_specs_drain_diameter_unit" "enum__products_v_version_specs_drain_diameter_unit" DEFAULT 'mm',
  	"version_specs_coverage_area_value" numeric,
  	"version_specs_coverage_area_unit" "enum__products_v_version_specs_coverage_area_unit" DEFAULT 'm2',
  	"version_specs_pieces_per_pack_value" numeric,
  	"version_specs_pieces_per_pack_unit" "enum__products_v_version_specs_pieces_per_pack_unit" DEFAULT 'pcs',
  	"version_specs_country_of_origin" varchar,
  	"version_base_price" numeric,
  	"version_pricing_currency" "enum__products_v_version_pricing_currency" DEFAULT 'UAH',
  	"version_pricing_compare_at_price" numeric,
  	"version_pricing_cost_price" numeric,
  	"version_pricing_vat_state" "enum__products_v_version_pricing_vat_state" DEFAULT 'included',
  	"version_pricing_promo_price" numeric,
  	"version_pricing_promo_start_date" timestamp(3) with time zone,
  	"version_pricing_promo_end_date" timestamp(3) with time zone,
  	"version_lead_time_days_min" numeric,
  	"version_lead_time_days_max" numeric,
  	"version_lead_time_days_urgent_lead_time_days" numeric,
  	"version_lead_time_days_production_capacity_status" "product_capacity_status",
  	"version_lead_time_days_temporary_extension_until" timestamp(3) with time zone,
  	"version_old_url" varchar,
  	"version_seo_focus_keyword" varchar,
  	"version_seo_og_image_id" integer,
  	"version_seo_canonical_url" varchar,
  	"version_seo_no_index" boolean DEFAULT false,
  	"version_legacy_legacy_source" "product_legacy_source" DEFAULT 'horoshop',
  	"version_legacy_legacy_id" varchar,
  	"version_legacy_legacy_url" varchar,
  	"version_legacy_legacy_slug" varchar,
  	"version_legacy_imported_at" timestamp(3) with time zone,
  	"version_legacy_import_batch_id_id" integer,
  	"version_legacy_migration_status" "product_migration_status",
  	"version_legacy_source_checksum" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__products_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__products_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_products_v_locales" (
  	"version_name" varchar,
  	"version_short_description" varchar,
  	"version_specs_material" varchar,
  	"version_specs_technology" varchar,
  	"version_specs_reinforcement" varchar,
  	"version_specs_coating" varchar,
  	"version_specs_mount_type" varchar,
  	"version_specs_faucet_type" varchar,
  	"version_specs_faucet_hole" varchar,
  	"version_specs_overflow" varchar,
  	"version_specs_wall_connection" varchar,
  	"version_specs_floor_connection" varchar,
  	"version_specs_drainage" varchar,
  	"version_specs_fixing_method" varchar,
  	"version_specs_packaging_type" varchar,
  	"version_specs_warranty" varchar,
  	"version_specs_care" varchar,
  	"version_lead_time_days_text_override" varchar,
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"colours_id" integer,
  	"media_id" integer,
  	"documents_id" integer
  );
  
  CREATE TABLE "pages_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"internal_label" varchar,
  	"hide_on_mobile" boolean DEFAULT false,
  	"hide_on_desktop" boolean DEFAULT false,
  	"image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_hero_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"internal_label" varchar,
  	"hide_on_mobile" boolean DEFAULT false,
  	"hide_on_desktop" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_rich_text_locales" (
  	"content" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_spacer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"internal_label" varchar,
  	"hide_on_mobile" boolean DEFAULT false,
  	"hide_on_desktop" boolean DEFAULT false,
  	"size" "enum_pages_blocks_spacer_size" DEFAULT 'md',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"status" "enum_pages_status" DEFAULT 'draft',
  	"publish_at" timestamp(3) with time zone,
  	"seo_og_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pages_locales" (
  	"title" varchar,
  	"seo_meta_title" varchar,
  	"seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"internal_label" varchar,
  	"hide_on_mobile" boolean DEFAULT false,
  	"hide_on_desktop" boolean DEFAULT false,
  	"image_id" integer,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_hero_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"internal_label" varchar,
  	"hide_on_mobile" boolean DEFAULT false,
  	"hide_on_desktop" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text_locales" (
  	"content" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_spacer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"internal_label" varchar,
  	"hide_on_mobile" boolean DEFAULT false,
  	"hide_on_desktop" boolean DEFAULT false,
  	"size" "enum__pages_v_blocks_spacer_size" DEFAULT 'md',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"version_publish_at" timestamp(3) with time zone,
  	"version_seo_og_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__pages_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_pages_v_locales" (
  	"version_title" varchar,
  	"version_seo_meta_title" varchar,
  	"version_seo_meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"format" "enum_documents_format" NOT NULL,
  	"language" "enum_documents_language",
  	"version" varchar,
  	"document_date" timestamp(3) with time zone,
  	"visibility" "enum_documents_visibility" DEFAULT 'public' NOT NULL,
  	"linked_product_id" integer,
  	"linked_variant_sku" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "carts_lines_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"option_key" "enum_carts_lines_options_option_key" NOT NULL,
  	"value" varchar NOT NULL,
  	"label_uk" varchar NOT NULL,
  	"label_en" varchar,
  	"label_pl" varchar
  );
  
  CREATE TABLE "carts_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id_id" integer,
  	"product_ref" varchar NOT NULL,
  	"variant_sku" varchar NOT NULL,
  	"sku" varchar NOT NULL,
  	"name_uk" varchar NOT NULL,
  	"name_en" varchar,
  	"name_pl" varchar,
  	"media_id_id" integer,
  	"quantity" numeric NOT NULL,
  	"unit_price_currency" "enum_carts_lines_unit_price_currency" DEFAULT 'UAH',
  	"unit_price_minor_units" numeric NOT NULL,
  	"added_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "carts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"session_token" varchar NOT NULL,
  	"currency" "enum_carts_currency" DEFAULT 'UAH' NOT NULL,
  	"expires_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "orders_lines_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"option_key" "enum_orders_lines_options_option_key" NOT NULL,
  	"value" varchar NOT NULL,
  	"label_uk" varchar NOT NULL,
  	"label_en" varchar,
  	"label_pl" varchar
  );
  
  CREATE TABLE "orders_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id_id" integer,
  	"product_ref" varchar NOT NULL,
  	"variant_sku" varchar NOT NULL,
  	"sku" varchar NOT NULL,
  	"name_uk" varchar NOT NULL,
  	"name_en" varchar,
  	"name_pl" varchar,
  	"media_id_id" integer,
  	"quantity" numeric NOT NULL,
  	"unit_price_minor_units" numeric NOT NULL,
  	"line_total_minor_units" numeric NOT NULL
  );
  
  CREATE TABLE "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_number" varchar NOT NULL,
  	"currency" "enum_orders_currency" DEFAULT 'UAH' NOT NULL,
  	"totals_subtotal_minor_units" numeric NOT NULL,
  	"totals_discount_total_minor_units" numeric DEFAULT 0 NOT NULL,
  	"totals_delivery_total_minor_units" numeric DEFAULT 0 NOT NULL,
  	"totals_total_minor_units" numeric NOT NULL,
  	"delivery_method_type" "enum_orders_delivery_method_type" NOT NULL,
  	"delivery_method_city_name" varchar,
  	"delivery_method_branch_number" varchar,
  	"delivery_method_branch_address" varchar,
  	"delivery_method_address" varchar,
  	"delivery_method_stockist_note" varchar,
  	"customer_full_name" varchar NOT NULL,
  	"customer_phone" varchar NOT NULL,
  	"customer_email" varchar,
  	"customer_company_name" varchar,
  	"customer_notes" varchar,
  	"status" "enum_orders_status" DEFAULT 'pending' NOT NULL,
  	"payment_id_id" integer,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_id_id" integer NOT NULL,
  	"provider" "enum_payments_provider" NOT NULL,
  	"amount_currency" "enum_payments_amount_currency" DEFAULT 'UAH',
  	"amount_minor_units" numeric NOT NULL,
  	"status" "enum_payments_status" DEFAULT 'pending' NOT NULL,
  	"external_id" varchar,
  	"signature_verified" boolean DEFAULT false,
  	"raw_callback_payload" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "leads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum_leads_type" NOT NULL,
  	"status" "enum_leads_status" DEFAULT 'new' NOT NULL,
  	"locale" "enum_leads_locale" NOT NULL,
  	"source_path" varchar,
  	"name" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"email" varchar,
  	"message" varchar,
  	"preferred_time" varchar,
  	"product_id_id" integer,
  	"variant_sku" varchar,
  	"quantity" numeric,
  	"company_name" varchar,
  	"portfolio_url" varchar,
  	"order_number" varchar,
  	"issue_description" varchar,
  	"address" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "leads_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"products_id" integer
  );
  
  CREATE TABLE "redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from_path" varchar NOT NULL,
  	"to_path" varchar NOT NULL,
  	"status_code" "enum_redirects_status_code" DEFAULT '301' NOT NULL,
  	"note" varchar,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "import_batches" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"source" "enum_import_batches_source" DEFAULT 'horoshop' NOT NULL,
  	"mode" "enum_import_batches_mode" NOT NULL,
  	"status" "enum_import_batches_status" DEFAULT 'running' NOT NULL,
  	"started_at" timestamp(3) with time zone NOT NULL,
  	"finished_at" timestamp(3) with time zone,
  	"totals_created_count" numeric DEFAULT 0,
  	"totals_updated_count" numeric DEFAULT 0,
  	"totals_skipped_count" numeric DEFAULT 0,
  	"totals_conflict_count" numeric DEFAULT 0,
  	"totals_failed_count" numeric DEFAULT 0,
  	"triggered_by_id" integer,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "import_warnings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"import_batch_id" integer NOT NULL,
  	"entity_type" "enum_import_warnings_entity_type" NOT NULL,
  	"legacy_id" varchar NOT NULL,
  	"severity" "enum_import_warnings_severity" DEFAULT 'warning' NOT NULL,
  	"message" varchar NOT NULL,
  	"resolved" boolean DEFAULT false,
  	"resolution_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"categories_id" integer,
  	"colours_id" integer,
  	"products_id" integer,
  	"pages_id" integer,
  	"documents_id" integer,
  	"carts_id" integer,
  	"orders_id" integer,
  	"payments_id" integer,
  	"leads_id" integer,
  	"redirects_id" integer,
  	"import_batches_id" integer,
  	"import_warnings_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_legacy_migration_warnings" ADD CONSTRAINT "categories_legacy_migration_warnings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_legacy_import_batch_id_id_import_batches_id_fk" FOREIGN KEY ("legacy_import_batch_id_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_locales" ADD CONSTRAINT "categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_categories_v_version_legacy_migration_warnings" ADD CONSTRAINT "_categories_v_version_legacy_migration_warnings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_categories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_categories_v" ADD CONSTRAINT "_categories_v_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_categories_v" ADD CONSTRAINT "_categories_v_version_parent_id_categories_id_fk" FOREIGN KEY ("version_parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_categories_v" ADD CONSTRAINT "_categories_v_version_legacy_import_batch_id_id_import_batches_id_fk" FOREIGN KEY ("version_legacy_import_batch_id_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_categories_v_locales" ADD CONSTRAINT "_categories_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_categories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "colours" ADD CONSTRAINT "colours_texture_image_id_media_id_fk" FOREIGN KEY ("texture_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "colours_locales" ADD CONSTRAINT "colours_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."colours"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "colours_rels" ADD CONSTRAINT "colours_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."colours"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "colours_rels" ADD CONSTRAINT "colours_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_colours_v" ADD CONSTRAINT "_colours_v_parent_id_colours_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."colours"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_colours_v" ADD CONSTRAINT "_colours_v_version_texture_image_id_media_id_fk" FOREIGN KEY ("version_texture_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_colours_v_locales" ADD CONSTRAINT "_colours_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_colours_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_colours_v_rels" ADD CONSTRAINT "_colours_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_colours_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_colours_v_rels" ADD CONSTRAINT "_colours_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_specs_usage" ADD CONSTRAINT "products_specs_usage_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_price_history" ADD CONSTRAINT "products_price_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_price_history" ADD CONSTRAINT "products_price_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_variants" ADD CONSTRAINT "products_variants_option_axes_colour_id_colours_id_fk" FOREIGN KEY ("option_axes_colour_id") REFERENCES "public"."colours"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_variants" ADD CONSTRAINT "products_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_variants_locales" ADD CONSTRAINT "products_variants_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_seo_old_urls" ADD CONSTRAINT "products_seo_old_urls_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_legacy_migration_warnings" ADD CONSTRAINT "products_legacy_migration_warnings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_main_image_id_media_id_fk" FOREIGN KEY ("main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products" ADD CONSTRAINT "products_legacy_import_batch_id_id_import_batches_id_fk" FOREIGN KEY ("legacy_import_batch_id_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_locales" ADD CONSTRAINT "products_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_colours_fk" FOREIGN KEY ("colours_id") REFERENCES "public"."colours"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_specs_usage" ADD CONSTRAINT "_products_v_version_specs_usage_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_price_history" ADD CONSTRAINT "_products_v_version_price_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_price_history" ADD CONSTRAINT "_products_v_version_price_history_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_variants" ADD CONSTRAINT "_products_v_version_variants_option_axes_colour_id_colours_id_fk" FOREIGN KEY ("option_axes_colour_id") REFERENCES "public"."colours"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_version_variants" ADD CONSTRAINT "_products_v_version_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_variants_locales" ADD CONSTRAINT "_products_v_version_variants_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v_version_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_seo_old_urls" ADD CONSTRAINT "_products_v_version_seo_old_urls_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_version_legacy_migration_warnings" ADD CONSTRAINT "_products_v_version_legacy_migration_warnings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_main_image_id_media_id_fk" FOREIGN KEY ("version_main_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v" ADD CONSTRAINT "_products_v_version_legacy_import_batch_id_id_import_batches_id_fk" FOREIGN KEY ("version_legacy_import_batch_id_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_products_v_locales" ADD CONSTRAINT "_products_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_colours_fk" FOREIGN KEY ("colours_id") REFERENCES "public"."colours"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_products_v_rels" ADD CONSTRAINT "_products_v_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_hero_locales" ADD CONSTRAINT "pages_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rich_text" ADD CONSTRAINT "pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rich_text_locales" ADD CONSTRAINT "pages_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_spacer" ADD CONSTRAINT "pages_blocks_spacer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero" ADD CONSTRAINT "_pages_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_hero_locales" ADD CONSTRAINT "_pages_v_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text" ADD CONSTRAINT "_pages_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text_locales" ADD CONSTRAINT "_pages_v_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_spacer" ADD CONSTRAINT "_pages_v_blocks_spacer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "documents" ADD CONSTRAINT "documents_linked_product_id_products_id_fk" FOREIGN KEY ("linked_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_lines_options" ADD CONSTRAINT "carts_lines_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."carts_lines"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "carts_lines" ADD CONSTRAINT "carts_lines_product_id_id_products_id_fk" FOREIGN KEY ("product_id_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_lines" ADD CONSTRAINT "carts_lines_media_id_id_media_id_fk" FOREIGN KEY ("media_id_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "carts_lines" ADD CONSTRAINT "carts_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_lines_options" ADD CONSTRAINT "orders_lines_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders_lines"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders_lines" ADD CONSTRAINT "orders_lines_product_id_id_products_id_fk" FOREIGN KEY ("product_id_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_lines" ADD CONSTRAINT "orders_lines_media_id_id_media_id_fk" FOREIGN KEY ("media_id_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_lines" ADD CONSTRAINT "orders_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_id_id_payments_id_fk" FOREIGN KEY ("payment_id_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_id_orders_id_fk" FOREIGN KEY ("order_id_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_product_id_id_products_id_fk" FOREIGN KEY ("product_id_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads_rels" ADD CONSTRAINT "leads_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "leads_rels" ADD CONSTRAINT "leads_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "leads_rels" ADD CONSTRAINT "leads_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_triggered_by_id_users_id_fk" FOREIGN KEY ("triggered_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "import_warnings" ADD CONSTRAINT "import_warnings_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_colours_fk" FOREIGN KEY ("colours_id") REFERENCES "public"."colours"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_documents_fk" FOREIGN KEY ("documents_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_carts_fk" FOREIGN KEY ("carts_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payments_fk" FOREIGN KEY ("payments_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_leads_fk" FOREIGN KEY ("leads_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "public"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_import_batches_fk" FOREIGN KEY ("import_batches_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_import_warnings_fk" FOREIGN KEY ("import_warnings_id") REFERENCES "public"."import_warnings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "categories_legacy_migration_warnings_order_idx" ON "categories_legacy_migration_warnings" USING btree ("_order");
  CREATE INDEX "categories_legacy_migration_warnings_parent_id_idx" ON "categories_legacy_migration_warnings" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");
  CREATE INDEX "categories_legacy_legacy_import_batch_id_idx" ON "categories" USING btree ("legacy_import_batch_id_id");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE INDEX "categories__status_idx" ON "categories" USING btree ("_status");
  CREATE UNIQUE INDEX "categories_locales_locale_parent_id_unique" ON "categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_categories_v_version_legacy_migration_warnings_order_idx" ON "_categories_v_version_legacy_migration_warnings" USING btree ("_order");
  CREATE INDEX "_categories_v_version_legacy_migration_warnings_parent_id_idx" ON "_categories_v_version_legacy_migration_warnings" USING btree ("_parent_id");
  CREATE INDEX "_categories_v_parent_idx" ON "_categories_v" USING btree ("parent_id");
  CREATE INDEX "_categories_v_version_version_slug_idx" ON "_categories_v" USING btree ("version_slug");
  CREATE INDEX "_categories_v_version_version_parent_idx" ON "_categories_v" USING btree ("version_parent_id");
  CREATE INDEX "_categories_v_version_legacy_version_legacy_import_batch_idx" ON "_categories_v" USING btree ("version_legacy_import_batch_id_id");
  CREATE INDEX "_categories_v_version_version_updated_at_idx" ON "_categories_v" USING btree ("version_updated_at");
  CREATE INDEX "_categories_v_version_version_created_at_idx" ON "_categories_v" USING btree ("version_created_at");
  CREATE INDEX "_categories_v_version_version__status_idx" ON "_categories_v" USING btree ("version__status");
  CREATE INDEX "_categories_v_created_at_idx" ON "_categories_v" USING btree ("created_at");
  CREATE INDEX "_categories_v_updated_at_idx" ON "_categories_v" USING btree ("updated_at");
  CREATE INDEX "_categories_v_snapshot_idx" ON "_categories_v" USING btree ("snapshot");
  CREATE INDEX "_categories_v_published_locale_idx" ON "_categories_v" USING btree ("published_locale");
  CREATE INDEX "_categories_v_latest_idx" ON "_categories_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_categories_v_locales_locale_parent_id_unique" ON "_categories_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "colours_slug_idx" ON "colours" USING btree ("slug");
  CREATE INDEX "colours_texture_image_idx" ON "colours" USING btree ("texture_image_id");
  CREATE INDEX "colours_updated_at_idx" ON "colours" USING btree ("updated_at");
  CREATE INDEX "colours_created_at_idx" ON "colours" USING btree ("created_at");
  CREATE INDEX "colours__status_idx" ON "colours" USING btree ("_status");
  CREATE UNIQUE INDEX "colours_locales_locale_parent_id_unique" ON "colours_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "colours_rels_order_idx" ON "colours_rels" USING btree ("order");
  CREATE INDEX "colours_rels_parent_idx" ON "colours_rels" USING btree ("parent_id");
  CREATE INDEX "colours_rels_path_idx" ON "colours_rels" USING btree ("path");
  CREATE INDEX "colours_rels_categories_id_idx" ON "colours_rels" USING btree ("categories_id");
  CREATE INDEX "_colours_v_parent_idx" ON "_colours_v" USING btree ("parent_id");
  CREATE INDEX "_colours_v_version_version_slug_idx" ON "_colours_v" USING btree ("version_slug");
  CREATE INDEX "_colours_v_version_version_texture_image_idx" ON "_colours_v" USING btree ("version_texture_image_id");
  CREATE INDEX "_colours_v_version_version_updated_at_idx" ON "_colours_v" USING btree ("version_updated_at");
  CREATE INDEX "_colours_v_version_version_created_at_idx" ON "_colours_v" USING btree ("version_created_at");
  CREATE INDEX "_colours_v_version_version__status_idx" ON "_colours_v" USING btree ("version__status");
  CREATE INDEX "_colours_v_created_at_idx" ON "_colours_v" USING btree ("created_at");
  CREATE INDEX "_colours_v_updated_at_idx" ON "_colours_v" USING btree ("updated_at");
  CREATE INDEX "_colours_v_snapshot_idx" ON "_colours_v" USING btree ("snapshot");
  CREATE INDEX "_colours_v_published_locale_idx" ON "_colours_v" USING btree ("published_locale");
  CREATE INDEX "_colours_v_latest_idx" ON "_colours_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_colours_v_locales_locale_parent_id_unique" ON "_colours_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_colours_v_rels_order_idx" ON "_colours_v_rels" USING btree ("order");
  CREATE INDEX "_colours_v_rels_parent_idx" ON "_colours_v_rels" USING btree ("parent_id");
  CREATE INDEX "_colours_v_rels_path_idx" ON "_colours_v_rels" USING btree ("path");
  CREATE INDEX "_colours_v_rels_categories_id_idx" ON "_colours_v_rels" USING btree ("categories_id");
  CREATE INDEX "products_specs_usage_order_idx" ON "products_specs_usage" USING btree ("order");
  CREATE INDEX "products_specs_usage_parent_idx" ON "products_specs_usage" USING btree ("parent_id");
  CREATE INDEX "products_price_history_order_idx" ON "products_price_history" USING btree ("_order");
  CREATE INDEX "products_price_history_parent_id_idx" ON "products_price_history" USING btree ("_parent_id");
  CREATE INDEX "products_price_history_changed_by_idx" ON "products_price_history" USING btree ("changed_by_id");
  CREATE INDEX "products_variants_order_idx" ON "products_variants" USING btree ("_order");
  CREATE INDEX "products_variants_parent_id_idx" ON "products_variants" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_variants_sku_idx" ON "products_variants" USING btree ("sku");
  CREATE INDEX "products_variants_option_axes_option_axes_colour_idx" ON "products_variants" USING btree ("option_axes_colour_id");
  CREATE UNIQUE INDEX "products_variants_locales_locale_parent_id_unique" ON "products_variants_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_seo_old_urls_order_idx" ON "products_seo_old_urls" USING btree ("_order");
  CREATE INDEX "products_seo_old_urls_parent_id_idx" ON "products_seo_old_urls" USING btree ("_parent_id");
  CREATE INDEX "products_legacy_migration_warnings_order_idx" ON "products_legacy_migration_warnings" USING btree ("_order");
  CREATE INDEX "products_legacy_migration_warnings_parent_id_idx" ON "products_legacy_migration_warnings" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_slug_idx" ON "products" USING btree ("slug");
  CREATE UNIQUE INDEX "products_sku_idx" ON "products" USING btree ("sku");
  CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");
  CREATE INDEX "products_main_image_idx" ON "products" USING btree ("main_image_id");
  CREATE INDEX "products_seo_seo_og_image_idx" ON "products" USING btree ("seo_og_image_id");
  CREATE INDEX "products_legacy_legacy_import_batch_id_idx" ON "products" USING btree ("legacy_import_batch_id_id");
  CREATE INDEX "products_updated_at_idx" ON "products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "products" USING btree ("created_at");
  CREATE INDEX "products__status_idx" ON "products" USING btree ("_status");
  CREATE UNIQUE INDEX "products_locales_locale_parent_id_unique" ON "products_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_rels_order_idx" ON "products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "products_rels" USING btree ("path");
  CREATE INDEX "products_rels_colours_id_idx" ON "products_rels" USING btree ("colours_id");
  CREATE INDEX "products_rels_media_id_idx" ON "products_rels" USING btree ("media_id");
  CREATE INDEX "products_rels_documents_id_idx" ON "products_rels" USING btree ("documents_id");
  CREATE INDEX "_products_v_version_specs_usage_order_idx" ON "_products_v_version_specs_usage" USING btree ("order");
  CREATE INDEX "_products_v_version_specs_usage_parent_idx" ON "_products_v_version_specs_usage" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_price_history_order_idx" ON "_products_v_version_price_history" USING btree ("_order");
  CREATE INDEX "_products_v_version_price_history_parent_id_idx" ON "_products_v_version_price_history" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_price_history_changed_by_idx" ON "_products_v_version_price_history" USING btree ("changed_by_id");
  CREATE INDEX "_products_v_version_variants_order_idx" ON "_products_v_version_variants" USING btree ("_order");
  CREATE INDEX "_products_v_version_variants_parent_id_idx" ON "_products_v_version_variants" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_variants_sku_idx" ON "_products_v_version_variants" USING btree ("sku");
  CREATE INDEX "_products_v_version_variants_option_axes_option_axes_col_idx" ON "_products_v_version_variants" USING btree ("option_axes_colour_id");
  CREATE UNIQUE INDEX "_products_v_version_variants_locales_locale_parent_id_unique" ON "_products_v_version_variants_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_version_seo_old_urls_order_idx" ON "_products_v_version_seo_old_urls" USING btree ("_order");
  CREATE INDEX "_products_v_version_seo_old_urls_parent_id_idx" ON "_products_v_version_seo_old_urls" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_legacy_migration_warnings_order_idx" ON "_products_v_version_legacy_migration_warnings" USING btree ("_order");
  CREATE INDEX "_products_v_version_legacy_migration_warnings_parent_id_idx" ON "_products_v_version_legacy_migration_warnings" USING btree ("_parent_id");
  CREATE INDEX "_products_v_parent_idx" ON "_products_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_version_slug_idx" ON "_products_v" USING btree ("version_slug");
  CREATE INDEX "_products_v_version_version_sku_idx" ON "_products_v" USING btree ("version_sku");
  CREATE INDEX "_products_v_version_version_category_idx" ON "_products_v" USING btree ("version_category_id");
  CREATE INDEX "_products_v_version_version_main_image_idx" ON "_products_v" USING btree ("version_main_image_id");
  CREATE INDEX "_products_v_version_seo_version_seo_og_image_idx" ON "_products_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_products_v_version_legacy_version_legacy_import_batch_i_idx" ON "_products_v" USING btree ("version_legacy_import_batch_id_id");
  CREATE INDEX "_products_v_version_version_updated_at_idx" ON "_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_products_v_version_version_created_at_idx" ON "_products_v" USING btree ("version_created_at");
  CREATE INDEX "_products_v_version_version__status_idx" ON "_products_v" USING btree ("version__status");
  CREATE INDEX "_products_v_created_at_idx" ON "_products_v" USING btree ("created_at");
  CREATE INDEX "_products_v_updated_at_idx" ON "_products_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_snapshot_idx" ON "_products_v" USING btree ("snapshot");
  CREATE INDEX "_products_v_published_locale_idx" ON "_products_v" USING btree ("published_locale");
  CREATE INDEX "_products_v_latest_idx" ON "_products_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_products_v_locales_locale_parent_id_unique" ON "_products_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_products_v_rels_order_idx" ON "_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_colours_id_idx" ON "_products_v_rels" USING btree ("colours_id");
  CREATE INDEX "_products_v_rels_media_id_idx" ON "_products_v_rels" USING btree ("media_id");
  CREATE INDEX "_products_v_rels_documents_id_idx" ON "_products_v_rels" USING btree ("documents_id");
  CREATE INDEX "pages_blocks_hero_order_idx" ON "pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_parent_id_idx" ON "pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_path_idx" ON "pages_blocks_hero" USING btree ("_path");
  CREATE INDEX "pages_blocks_hero_image_idx" ON "pages_blocks_hero" USING btree ("image_id");
  CREATE UNIQUE INDEX "pages_blocks_hero_locales_locale_parent_id_unique" ON "pages_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_rich_text_order_idx" ON "pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_rich_text_parent_id_idx" ON "pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_path_idx" ON "pages_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_rich_text_locales_locale_parent_id_unique" ON "pages_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_spacer_order_idx" ON "pages_blocks_spacer" USING btree ("_order");
  CREATE INDEX "pages_blocks_spacer_parent_id_idx" ON "pages_blocks_spacer" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_spacer_path_idx" ON "pages_blocks_spacer" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "pages" USING btree ("slug");
  CREATE INDEX "pages_seo_seo_og_image_idx" ON "pages" USING btree ("seo_og_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_order_idx" ON "_pages_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_hero_parent_id_idx" ON "_pages_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_hero_path_idx" ON "_pages_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_hero_image_idx" ON "_pages_v_blocks_hero" USING btree ("image_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_hero_locales_locale_parent_id_unique" ON "_pages_v_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_order_idx" ON "_pages_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_rich_text_parent_id_idx" ON "_pages_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_path_idx" ON "_pages_v_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_rich_text_locales_locale_parent_id_unique" ON "_pages_v_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_spacer_order_idx" ON "_pages_v_blocks_spacer" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_spacer_parent_id_idx" ON "_pages_v_blocks_spacer" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_spacer_path_idx" ON "_pages_v_blocks_spacer" USING btree ("_path");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v" USING btree ("version_slug");
  CREATE INDEX "_pages_v_version_seo_version_seo_og_image_idx" ON "_pages_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_snapshot_idx" ON "_pages_v" USING btree ("snapshot");
  CREATE INDEX "_pages_v_published_locale_idx" ON "_pages_v" USING btree ("published_locale");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_autosave_idx" ON "_pages_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_pages_v_locales_locale_parent_id_unique" ON "_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "documents_linked_product_idx" ON "documents" USING btree ("linked_product_id");
  CREATE INDEX "documents_updated_at_idx" ON "documents" USING btree ("updated_at");
  CREATE INDEX "documents_created_at_idx" ON "documents" USING btree ("created_at");
  CREATE UNIQUE INDEX "documents_filename_idx" ON "documents" USING btree ("filename");
  CREATE INDEX "carts_lines_options_order_idx" ON "carts_lines_options" USING btree ("_order");
  CREATE INDEX "carts_lines_options_parent_id_idx" ON "carts_lines_options" USING btree ("_parent_id");
  CREATE INDEX "carts_lines_order_idx" ON "carts_lines" USING btree ("_order");
  CREATE INDEX "carts_lines_parent_id_idx" ON "carts_lines" USING btree ("_parent_id");
  CREATE INDEX "carts_lines_product_id_idx" ON "carts_lines" USING btree ("product_id_id");
  CREATE INDEX "carts_lines_media_id_idx" ON "carts_lines" USING btree ("media_id_id");
  CREATE UNIQUE INDEX "carts_session_token_idx" ON "carts" USING btree ("session_token");
  CREATE INDEX "carts_updated_at_idx" ON "carts" USING btree ("updated_at");
  CREATE INDEX "carts_created_at_idx" ON "carts" USING btree ("created_at");
  CREATE INDEX "orders_lines_options_order_idx" ON "orders_lines_options" USING btree ("_order");
  CREATE INDEX "orders_lines_options_parent_id_idx" ON "orders_lines_options" USING btree ("_parent_id");
  CREATE INDEX "orders_lines_order_idx" ON "orders_lines" USING btree ("_order");
  CREATE INDEX "orders_lines_parent_id_idx" ON "orders_lines" USING btree ("_parent_id");
  CREATE INDEX "orders_lines_product_id_idx" ON "orders_lines" USING btree ("product_id_id");
  CREATE INDEX "orders_lines_media_id_idx" ON "orders_lines" USING btree ("media_id_id");
  CREATE UNIQUE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");
  CREATE INDEX "orders_payment_id_idx" ON "orders" USING btree ("payment_id_id");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id_id");
  CREATE UNIQUE INDEX "payments_external_id_idx" ON "payments" USING btree ("external_id");
  CREATE INDEX "payments_updated_at_idx" ON "payments" USING btree ("updated_at");
  CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");
  CREATE INDEX "leads_product_id_idx" ON "leads" USING btree ("product_id_id");
  CREATE INDEX "leads_updated_at_idx" ON "leads" USING btree ("updated_at");
  CREATE INDEX "leads_created_at_idx" ON "leads" USING btree ("created_at");
  CREATE INDEX "leads_rels_order_idx" ON "leads_rels" USING btree ("order");
  CREATE INDEX "leads_rels_parent_idx" ON "leads_rels" USING btree ("parent_id");
  CREATE INDEX "leads_rels_path_idx" ON "leads_rels" USING btree ("path");
  CREATE INDEX "leads_rels_media_id_idx" ON "leads_rels" USING btree ("media_id");
  CREATE INDEX "leads_rels_products_id_idx" ON "leads_rels" USING btree ("products_id");
  CREATE UNIQUE INDEX "redirects_from_path_idx" ON "redirects" USING btree ("from_path");
  CREATE INDEX "redirects_updated_at_idx" ON "redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "redirects" USING btree ("created_at");
  CREATE INDEX "import_batches_triggered_by_idx" ON "import_batches" USING btree ("triggered_by_id");
  CREATE INDEX "import_batches_updated_at_idx" ON "import_batches" USING btree ("updated_at");
  CREATE INDEX "import_batches_created_at_idx" ON "import_batches" USING btree ("created_at");
  CREATE INDEX "import_warnings_import_batch_idx" ON "import_warnings" USING btree ("import_batch_id");
  CREATE INDEX "import_warnings_updated_at_idx" ON "import_warnings" USING btree ("updated_at");
  CREATE INDEX "import_warnings_created_at_idx" ON "import_warnings" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_colours_id_idx" ON "payload_locked_documents_rels" USING btree ("colours_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("documents_id");
  CREATE INDEX "payload_locked_documents_rels_carts_id_idx" ON "payload_locked_documents_rels" USING btree ("carts_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("payments_id");
  CREATE INDEX "payload_locked_documents_rels_leads_id_idx" ON "payload_locked_documents_rels" USING btree ("leads_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload_locked_documents_rels" USING btree ("redirects_id");
  CREATE INDEX "payload_locked_documents_rels_import_batches_id_idx" ON "payload_locked_documents_rels" USING btree ("import_batches_id");
  CREATE INDEX "payload_locked_documents_rels_import_warnings_id_idx" ON "payload_locked_documents_rels" USING btree ("import_warnings_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "categories_legacy_migration_warnings" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "categories_locales" CASCADE;
  DROP TABLE "_categories_v_version_legacy_migration_warnings" CASCADE;
  DROP TABLE "_categories_v" CASCADE;
  DROP TABLE "_categories_v_locales" CASCADE;
  DROP TABLE "colours" CASCADE;
  DROP TABLE "colours_locales" CASCADE;
  DROP TABLE "colours_rels" CASCADE;
  DROP TABLE "_colours_v" CASCADE;
  DROP TABLE "_colours_v_locales" CASCADE;
  DROP TABLE "_colours_v_rels" CASCADE;
  DROP TABLE "products_specs_usage" CASCADE;
  DROP TABLE "products_price_history" CASCADE;
  DROP TABLE "products_variants" CASCADE;
  DROP TABLE "products_variants_locales" CASCADE;
  DROP TABLE "products_seo_old_urls" CASCADE;
  DROP TABLE "products_legacy_migration_warnings" CASCADE;
  DROP TABLE "products" CASCADE;
  DROP TABLE "products_locales" CASCADE;
  DROP TABLE "products_rels" CASCADE;
  DROP TABLE "_products_v_version_specs_usage" CASCADE;
  DROP TABLE "_products_v_version_price_history" CASCADE;
  DROP TABLE "_products_v_version_variants" CASCADE;
  DROP TABLE "_products_v_version_variants_locales" CASCADE;
  DROP TABLE "_products_v_version_seo_old_urls" CASCADE;
  DROP TABLE "_products_v_version_legacy_migration_warnings" CASCADE;
  DROP TABLE "_products_v" CASCADE;
  DROP TABLE "_products_v_locales" CASCADE;
  DROP TABLE "_products_v_rels" CASCADE;
  DROP TABLE "pages_blocks_hero" CASCADE;
  DROP TABLE "pages_blocks_hero_locales" CASCADE;
  DROP TABLE "pages_blocks_rich_text" CASCADE;
  DROP TABLE "pages_blocks_rich_text_locales" CASCADE;
  DROP TABLE "pages_blocks_spacer" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_hero" CASCADE;
  DROP TABLE "_pages_v_blocks_hero_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_spacer" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_locales" CASCADE;
  DROP TABLE "documents" CASCADE;
  DROP TABLE "carts_lines_options" CASCADE;
  DROP TABLE "carts_lines" CASCADE;
  DROP TABLE "carts" CASCADE;
  DROP TABLE "orders_lines_options" CASCADE;
  DROP TABLE "orders_lines" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "payments" CASCADE;
  DROP TABLE "leads" CASCADE;
  DROP TABLE "leads_rels" CASCADE;
  DROP TABLE "redirects" CASCADE;
  DROP TABLE "import_batches" CASCADE;
  DROP TABLE "import_warnings" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."category_legacy_source";
  DROP TYPE "public"."category_migration_status";
  DROP TYPE "public"."enum_categories_status";
  DROP TYPE "public"."enum__categories_v_version_status";
  DROP TYPE "public"."enum__categories_v_published_locale";
  DROP TYPE "public"."enum_colours_text_mode";
  DROP TYPE "public"."enum_colours_status";
  DROP TYPE "public"."enum__colours_v_version_text_mode";
  DROP TYPE "public"."enum__colours_v_version_status";
  DROP TYPE "public"."enum__colours_v_published_locale";
  DROP TYPE "public"."enum_products_specs_usage";
  DROP TYPE "public"."enum_products_variants_status";
  DROP TYPE "public"."enum_products_editorial_status";
  DROP TYPE "public"."enum_products_stock_status";
  DROP TYPE "public"."enum_products_specs_width_unit";
  DROP TYPE "public"."enum_products_specs_depth_unit";
  DROP TYPE "public"."enum_products_specs_height_unit";
  DROP TYPE "public"."enum_products_specs_diameter_unit";
  DROP TYPE "public"."enum_products_specs_thickness_unit";
  DROP TYPE "public"."enum_products_specs_weight_unit";
  DROP TYPE "public"."enum_products_specs_weight_per_area_unit";
  DROP TYPE "public"."enum_products_specs_drain_diameter_unit";
  DROP TYPE "public"."enum_products_specs_coverage_area_unit";
  DROP TYPE "public"."enum_products_specs_pieces_per_pack_unit";
  DROP TYPE "public"."enum_products_pricing_currency";
  DROP TYPE "public"."enum_products_pricing_vat_state";
  DROP TYPE "public"."product_capacity_status";
  DROP TYPE "public"."product_legacy_source";
  DROP TYPE "public"."product_migration_status";
  DROP TYPE "public"."enum_products_status";
  DROP TYPE "public"."enum__products_v_version_specs_usage";
  DROP TYPE "public"."enum__products_v_version_variants_status";
  DROP TYPE "public"."enum__products_v_version_editorial_status";
  DROP TYPE "public"."enum__products_v_version_stock_status";
  DROP TYPE "public"."enum__products_v_version_specs_width_unit";
  DROP TYPE "public"."enum__products_v_version_specs_depth_unit";
  DROP TYPE "public"."enum__products_v_version_specs_height_unit";
  DROP TYPE "public"."enum__products_v_version_specs_diameter_unit";
  DROP TYPE "public"."enum__products_v_version_specs_thickness_unit";
  DROP TYPE "public"."enum__products_v_version_specs_weight_unit";
  DROP TYPE "public"."enum__products_v_version_specs_weight_per_area_unit";
  DROP TYPE "public"."enum__products_v_version_specs_drain_diameter_unit";
  DROP TYPE "public"."enum__products_v_version_specs_coverage_area_unit";
  DROP TYPE "public"."enum__products_v_version_specs_pieces_per_pack_unit";
  DROP TYPE "public"."enum__products_v_version_pricing_currency";
  DROP TYPE "public"."enum__products_v_version_pricing_vat_state";
  DROP TYPE "public"."enum__products_v_version_status";
  DROP TYPE "public"."enum__products_v_published_locale";
  DROP TYPE "public"."enum_pages_blocks_spacer_size";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_blocks_spacer_size";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum__pages_v_published_locale";
  DROP TYPE "public"."enum_documents_format";
  DROP TYPE "public"."enum_documents_language";
  DROP TYPE "public"."enum_documents_visibility";
  DROP TYPE "public"."enum_carts_lines_options_option_key";
  DROP TYPE "public"."enum_carts_lines_unit_price_currency";
  DROP TYPE "public"."enum_carts_currency";
  DROP TYPE "public"."enum_orders_lines_options_option_key";
  DROP TYPE "public"."enum_orders_currency";
  DROP TYPE "public"."enum_orders_delivery_method_type";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_payments_provider";
  DROP TYPE "public"."enum_payments_amount_currency";
  DROP TYPE "public"."enum_payments_status";
  DROP TYPE "public"."enum_leads_type";
  DROP TYPE "public"."enum_leads_status";
  DROP TYPE "public"."enum_leads_locale";
  DROP TYPE "public"."enum_redirects_status_code";
  DROP TYPE "public"."enum_import_batches_source";
  DROP TYPE "public"."enum_import_batches_mode";
  DROP TYPE "public"."enum_import_batches_status";
  DROP TYPE "public"."enum_import_warnings_entity_type";
  DROP TYPE "public"."enum_import_warnings_severity";`)
}
