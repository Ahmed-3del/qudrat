CREATE TABLE `memberSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`memberId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memberSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `memberSessions_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `memberUsers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(120) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`isVerified` int NOT NULL DEFAULT 0,
	`verificationCodeHash` varchar(128),
	`verificationExpiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memberUsers_id` PRIMARY KEY(`id`),
	CONSTRAINT `memberUsers_email_unique` UNIQUE(`email`)
);
