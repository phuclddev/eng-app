CREATE TABLE `FamilyConversationRecallLine` (
    `id` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL DEFAULT 0,
    `speaker` VARCHAR(48) NOT NULL,
    `englishText` TEXT NOT NULL,
    `vietnameseText` TEXT NOT NULL,
    `usedChunks` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FamilyConversationRecallLine_conversationId_orderIndex_key`(`conversationId`, `orderIndex`),
    INDEX `FamilyConversationRecallLine_conversationId_idx`(`conversationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FamilyConversationRecallAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `conversationId` VARCHAR(191) NOT NULL,
    `lineId` VARCHAR(191) NULL,
    `mode` ENUM('LINE', 'FULL') NOT NULL DEFAULT 'LINE',
    `userAnswer` TEXT NOT NULL,
    `score` INTEGER NULL,
    `feedbackMarkdown` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FamilyConversationRecallAttempt_userId_createdAt_idx`(`userId`, `createdAt` DESC),
    INDEX `FamilyConversationRecallAttempt_userId_conversationId_createdAt_idx`(`userId`, `conversationId`, `createdAt` DESC),
    INDEX `FamilyConversationRecallAttempt_userId_lineId_createdAt_idx`(`userId`, `lineId`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `FamilyConversationRecallLine`
ADD CONSTRAINT `FamilyConversationRecallLine_conversationId_fkey`
FOREIGN KEY (`conversationId`) REFERENCES `FamilyConversation`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FamilyConversationRecallAttempt`
ADD CONSTRAINT `FamilyConversationRecallAttempt_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FamilyConversationRecallAttempt`
ADD CONSTRAINT `FamilyConversationRecallAttempt_conversationId_fkey`
FOREIGN KEY (`conversationId`) REFERENCES `FamilyConversation`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FamilyConversationRecallAttempt`
ADD CONSTRAINT `FamilyConversationRecallAttempt_lineId_fkey`
FOREIGN KEY (`lineId`) REFERENCES `FamilyConversationRecallLine`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;
