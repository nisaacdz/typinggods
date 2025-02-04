ALTER TABLE "auth_providers" RENAME COLUMN "authentication_url" TO "login_url";--> statement-breakpoint
ALTER TABLE "auth_providers" RENAME COLUMN "registration_url" TO "register_url";