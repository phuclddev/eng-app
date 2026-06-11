CREATE TABLE `FamilyRoleplaySession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `scenarioId` VARCHAR(191) NULL,
    `userRole` ENUM('FATHER', 'MOTHER', 'KIWI', 'VIVI', 'GRANDPARENT') NOT NULL,
    `aiRole` ENUM('FATHER', 'MOTHER', 'KIWI', 'VIVI', 'GRANDPARENT') NOT NULL,
    `childFocus` ENUM('KIWI', 'VIVI', 'BOTH') NOT NULL DEFAULT 'BOTH',
    `targetLevel` VARCHAR(24) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'COMPLETED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `turnsLimit` INTEGER NOT NULL DEFAULT 8,
    `turnsTaken` INTEGER NOT NULL DEFAULT 0,
    `externalConversationId` VARCHAR(191) NULL,
    `finalFeedbackMarkdown` LONGTEXT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FamilyRoleplaySession_userId_updatedAt_idx`(`userId`, `updatedAt` DESC),
    INDEX `FamilyRoleplaySession_userId_status_updatedAt_idx`(`userId`, `status`, `updatedAt` DESC),
    INDEX `FamilyRoleplaySession_scenarioId_idx`(`scenarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FamilyRoleplayMessage` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `sender` ENUM('USER', 'AI') NOT NULL,
    `roleLabel` VARCHAR(48) NOT NULL,
    `content` TEXT NOT NULL,
    `turnNumber` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FamilyRoleplayMessage_sessionId_createdAt_idx`(`sessionId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `FamilyChunk`
ADD COLUMN `sourceRoleplaySessionId` VARCHAR(191) NULL;

CREATE INDEX `FamilyChunk_sourceRoleplaySessionId_idx`
ON `FamilyChunk`(`sourceRoleplaySessionId`);

ALTER TABLE `FamilyRoleplaySession`
ADD CONSTRAINT `FamilyRoleplaySession_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FamilyRoleplaySession`
ADD CONSTRAINT `FamilyRoleplaySession_scenarioId_fkey`
FOREIGN KEY (`scenarioId`) REFERENCES `FamilyScenario`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `FamilyRoleplayMessage`
ADD CONSTRAINT `FamilyRoleplayMessage_sessionId_fkey`
FOREIGN KEY (`sessionId`) REFERENCES `FamilyRoleplaySession`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FamilyChunk`
ADD CONSTRAINT `FamilyChunk_sourceRoleplaySessionId_fkey`
FOREIGN KEY (`sourceRoleplaySessionId`) REFERENCES `FamilyRoleplaySession`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;
