CREATE TABLE `FamilyChunk` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `text` VARCHAR(191) NOT NULL,
    `normalizedText` VARCHAR(191) NOT NULL,
    `meaningVi` VARCHAR(255) NOT NULL,
    `usageContext` TEXT NOT NULL,
    `speakerRole` ENUM('FATHER', 'CHILD', 'MOTHER', 'GRANDPARENT', 'GENERAL') NOT NULL DEFAULT 'GENERAL',
    `childFocus` ENUM('KIWI', 'VIVI', 'BOTH', 'GENERAL') NOT NULL DEFAULT 'GENERAL',
    `scenarioCategory` VARCHAR(120) NOT NULL,
    `difficulty` INTEGER NOT NULL DEFAULT 1,
    `frequencyScore` INTEGER NOT NULL DEFAULT 1,
    `personalizationScore` INTEGER NOT NULL DEFAULT 1,
    `exampleSentence` TEXT NULL,
    `notes` TEXT NULL,
    `sourceConversationId` VARCHAR(191) NULL,
    `status` ENUM('SUGGESTED', 'APPROVED', 'ARCHIVED') NOT NULL DEFAULT 'SUGGESTED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FamilyChunk_userId_normalizedText_key`(`userId`, `normalizedText`),
    INDEX `FamilyChunk_userId_status_updatedAt_idx`(`userId`, `status`, `updatedAt` DESC),
    INDEX `FamilyChunk_userId_childFocus_speakerRole_idx`(`userId`, `childFocus`, `speakerRole`),
    INDEX `FamilyChunk_sourceConversationId_idx`(`sourceConversationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `FamilyChunk`
ADD CONSTRAINT `FamilyChunk_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FamilyChunk`
ADD CONSTRAINT `FamilyChunk_sourceConversationId_fkey`
FOREIGN KEY (`sourceConversationId`) REFERENCES `FamilyConversation`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;
