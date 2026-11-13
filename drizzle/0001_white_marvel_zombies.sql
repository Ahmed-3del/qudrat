CREATE TABLE `adminSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `adminSessions_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `adminUsers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(120) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`role` enum('admin','superadmin') NOT NULL DEFAULT 'admin',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastLoginAt` timestamp,
	CONSTRAINT `adminUsers_id` PRIMARY KEY(`id`),
	CONSTRAINT `adminUsers_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120),
	`email` varchar(320),
	`message` text NOT NULL,
	`status` enum('new','read','in_progress','resolved') NOT NULL DEFAULT 'new',
	`adminNote` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `complaints_id` PRIMARY KEY(`id`)
);
