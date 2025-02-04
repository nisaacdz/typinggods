DO $$ BEGIN
 CREATE TYPE "public"."challenge_privacy" AS ENUM('Open', 'Invitational');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_challenge_status" AS ENUM('Accepted', 'Rejected', 'Pending');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_providers" (
	"provider_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_name" varchar(50) NOT NULL,
	"authentication_url" text NOT NULL,
	"registration_url" text NOT NULL,
	"logo_url" text,
	CONSTRAINT "auth_providers_provider_name_unique" UNIQUE("provider_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "challenges" (
	"challenge_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"start_time" timestamp,
	"privacy" "challenge_privacy" DEFAULT 'Open' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_challenges" (
	"user_id" uuid NOT NULL,
	"challenge_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(256) NOT NULL,
	"password" varchar(256),
	"auth_provider_id" uuid,
	"external_id" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "challenges" ADD CONSTRAINT "challenges_created_by_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_challenges" ADD CONSTRAINT "user_challenges_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_challenges" ADD CONSTRAINT "user_challenges_challenge_id_challenges_challenge_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("challenge_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_auth_provider_id_auth_providers_provider_id_fk" FOREIGN KEY ("auth_provider_id") REFERENCES "public"."auth_providers"("provider_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_challenges_pk" ON "user_challenges" USING btree ("user_id","challenge_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_id_idx" ON "user_challenges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "challenge_id_index" ON "user_challenges" USING btree ("challenge_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "username_unique_idx" ON "users" USING btree (lower("username"));--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "external_auth_unique_idx" ON "users" USING btree ("auth_provider_id","external_id") WHERE "users"."auth_provider_id" IS NOT NULL;