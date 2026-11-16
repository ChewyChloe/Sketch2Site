CREATE TABLE `sketch_ai_owner` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`enrolled_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sketch_ai_preflight` (
	`id` text PRIMARY KEY NOT NULL,
	`outcome` text NOT NULL,
	`input_tokens` integer,
	`reserved_micros` integer,
	`checked_at` integer NOT NULL
);
