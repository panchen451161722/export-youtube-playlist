CREATE TABLE `youtube_revocation` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`connection_id` text NOT NULL,
	`credentials` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` text NOT NULL,
	`lease_token` text,
	`lease_expires_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_youtube_revocation_due` ON `youtube_revocation` (`next_attempt_at`,`lease_expires_at`);--> statement-breakpoint
ALTER TABLE `youtube_connection` ADD `verified_at` text;--> statement-breakpoint
ALTER TABLE `youtube_connection` ADD `next_validation_at` text;--> statement-breakpoint
ALTER TABLE `youtube_connection` ADD `validation_token` text;--> statement-breakpoint
CREATE INDEX `idx_youtube_connection_validation` ON `youtube_connection` (`next_validation_at`,`verified_at`);