CREATE TABLE `sketch_ai_single_test` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`user_id` text NOT NULL,
	`canvas_hash` text NOT NULL,
	`reserved_micros` integer NOT NULL,
	`started_at` integer NOT NULL,
	`outcome` text NOT NULL
);
