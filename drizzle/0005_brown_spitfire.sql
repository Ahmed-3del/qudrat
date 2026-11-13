CREATE TABLE `memberProgress` (
	`memberId` int NOT NULL,
	`data` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memberProgress_memberId` PRIMARY KEY(`memberId`)
);
