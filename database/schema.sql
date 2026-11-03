CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`data` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_code_unique` ON `products` (`code`);--> statement-breakpoint
CREATE TABLE `sales` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`date` text NOT NULL,
	`data` text NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stores_name_unique` ON `stores` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL
);

CREATE TABLE `saved_views` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`scope` text NOT NULL,
	`name` text NOT NULL,
	`filters` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `store_sellers` (
	`id` text PRIMARY KEY NOT NULL,
	`store_id` text NOT NULL,
	`data` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);

CREATE TABLE system_settings (id TEXT PRIMARY KEY, data TEXT NOT NULL, revision INTEGER NOT NULL);
CREATE TABLE accounts (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, email TEXT NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','seller')), active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, client_hash TEXT NOT NULL);
CREATE TABLE login_attempts (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL);
CREATE TABLE installation (id INTEGER PRIMARY KEY CHECK(id=1), completed_at INTEGER NOT NULL);
