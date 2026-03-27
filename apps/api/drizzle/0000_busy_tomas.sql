CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`bank_id` text NOT NULL,
	`name` text NOT NULL,
	`account_number` text,
	`type` text NOT NULL,
	`currency` text DEFAULT 'AUD' NOT NULL,
	`csv_signature` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `banks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `category_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`category_id` text NOT NULL,
	`match_field` text NOT NULL,
	`match_type` text NOT NULL,
	`match_values` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `saved_filters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`conditions` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transaction_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`category_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`external_id` text,
	`date` text NOT NULL,
	`date_processed` text,
	`type` text,
	`payee` text NOT NULL,
	`memo` text,
	`amount` real NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action
);
