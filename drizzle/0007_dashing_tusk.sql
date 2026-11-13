CREATE TABLE `adminMessageRecipients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int NOT NULL,
	`recipientAdminId` int NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminMessageRecipients_id` PRIMARY KEY(`id`)
);
