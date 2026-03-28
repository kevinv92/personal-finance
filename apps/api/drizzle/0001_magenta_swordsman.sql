CREATE TABLE `recurring` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`expected_amount` real,
	`frequency` text NOT NULL,
	`category_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `recurring_id` text REFERENCES recurring(id);