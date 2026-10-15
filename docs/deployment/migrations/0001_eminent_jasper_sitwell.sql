CREATE TABLE `guard_collection` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`slot` integer,
	`source_key` text,
	`document` text NOT NULL,
	`summary` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`next_sync_at` text,
	`lease_token` text,
	`lease_expires_at` text,
	`last_attempt_at` text,
	`created_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_guard_user_slot` ON `guard_collection` (`user_id`,`slot`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_guard_user_source` ON `guard_collection` (`user_id`,`source_key`);--> statement-breakpoint
CREATE INDEX `idx_guard_due` ON `guard_collection` (`enabled`,`next_sync_at`);--> statement-breakpoint
CREATE INDEX `idx_guard_owner` ON `guard_collection` (`user_id`,`deleted_at`);--> statement-breakpoint
CREATE TABLE `guard_delivery` (
	`id` text PRIMARY KEY NOT NULL,
	`collection_id` text NOT NULL,
	`user_id` text NOT NULL,
	`recipient` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` text NOT NULL,
	`lease_token` text,
	`lease_expires_at` text,
	`created_at` text NOT NULL,
	`sent_at` text,
	`last_error` text,
	`provider_message_id` text,
	FOREIGN KEY (`collection_id`) REFERENCES `guard_collection`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_guard_delivery_due` ON `guard_delivery` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE INDEX `idx_guard_delivery_owner` ON `guard_delivery` (`user_id`,`collection_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `guard_workspace` (
	`user_id` text PRIMARY KEY NOT NULL,
	`trial_started_at` text,
	`trial_ends_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `youtube_connection` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`channel_title` text NOT NULL,
	`thumbnail` text NOT NULL,
	`credentials` text,
	`client_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_youtube_connection_owner_channel` ON `youtube_connection` (`user_id`,`channel_id`);--> statement-breakpoint
CREATE INDEX `idx_youtube_connection_owner` ON `youtube_connection` (`user_id`);