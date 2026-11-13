CREATE TABLE `adminMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderAdminId` int NOT NULL,
	`subject` varchar(200) NOT NULL,
	`message` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adminMessages_id` PRIMARY KEY(`id`)
);
