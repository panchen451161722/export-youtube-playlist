CREATE TABLE `guest_checkout` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`browser_token_hash` text NOT NULL,
	`email` text NOT NULL,
	`active_browser_hash` text,
	`trial_email_hash` text,
	`trial_decision` text,
	`purchase_mode` text DEFAULT 'trial' NOT NULL,
	`retry_of` text,
	`last_checked_at` text,
	`product_id` text NOT NULL,
	`locale` text NOT NULL,
	`status` text NOT NULL,
	`checkout_session_id` text,
	`order_no` text,
	`collection_id` text,
	`claimed_by_user_id` text,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`lease_token` text,
	`lease_expires_at` text,
	`mail_sent_at` text,
	`mail_attempt_at` text,
	`last_error` text,
	`backup` text NOT NULL,
	`checkout_url` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`claimed_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_guest_active_browser_hash` ON `guest_checkout` (`active_browser_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_guest_trial_email` ON `guest_checkout` (`trial_email_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_guest_retry` ON `guest_checkout` (`retry_of`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_guest_session` ON `guest_checkout` (`checkout_session_id`);--> statement-breakpoint
CREATE INDEX `idx_guest_browser` ON `guest_checkout` (`browser_token_hash`);--> statement-breakpoint
CREATE INDEX `idx_guest_order` ON `guest_checkout` (`order_no`);