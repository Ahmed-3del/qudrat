ALTER TABLE `adminUsers` ADD `permissions` varchar(1000) DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `memberUsers` ADD `isBanned` int DEFAULT 0 NOT NULL;