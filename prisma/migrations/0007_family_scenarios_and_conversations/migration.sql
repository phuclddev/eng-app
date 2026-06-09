CREATE TABLE `FamilyScenario` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `category` VARCHAR(120) NOT NULL,
    `childFocus` ENUM('KIWI', 'VIVI', 'BOTH') NOT NULL DEFAULT 'BOTH',
    `description` TEXT NOT NULL,
    `difficulty` INTEGER NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FamilyScenario_userId_title_key`(`userId`, `title`),
    INDEX `FamilyScenario_userId_isActive_idx`(`userId`, `isActive`),
    INDEX `FamilyScenario_userId_category_childFocus_idx`(`userId`, `category`, `childFocus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FamilyConversation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `scenarioId` VARCHAR(191) NOT NULL,
    `childFocus` ENUM('KIWI', 'VIVI', 'BOTH') NOT NULL DEFAULT 'BOTH',
    `title` VARCHAR(191) NOT NULL,
    `conversationMarkdown` LONGTEXT NOT NULL,
    `aiConversationId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FamilyConversation_userId_updatedAt_idx`(`userId`, `updatedAt` DESC),
    INDEX `FamilyConversation_scenarioId_createdAt_idx`(`scenarioId`, `createdAt` DESC),
    INDEX `FamilyConversation_userId_childFocus_idx`(`userId`, `childFocus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `FamilyScenario`
ADD CONSTRAINT `FamilyScenario_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FamilyConversation`
ADD CONSTRAINT `FamilyConversation_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FamilyConversation`
ADD CONSTRAINT `FamilyConversation_scenarioId_fkey`
FOREIGN KEY (`scenarioId`) REFERENCES `FamilyScenario`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
