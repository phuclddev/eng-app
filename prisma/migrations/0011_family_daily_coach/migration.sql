CREATE TABLE `FamilyFavorite` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `targetType` ENUM('CONVERSATION', 'CHUNK', 'ROLEPLAY', 'SCENARIO') NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `note` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `FamilyFavorite_userId_targetType_targetId_key`(`userId`, `targetType`, `targetId`),
    INDEX `FamilyFavorite_userId_targetType_createdAt_idx`(`userId`, `targetType`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FamilyDailyPlanSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `childFocus` ENUM('KIWI', 'VIVI', 'BOTH') NOT NULL DEFAULT 'BOTH',
    `sourceHash` VARCHAR(191) NOT NULL,
    `answer` LONGTEXT NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FamilyDailyPlanSnapshot_userId_childFocus_updatedAt_idx`(`userId`, `childFocus`, `updatedAt` DESC),
    INDEX `FamilyDailyPlanSnapshot_userId_sourceHash_idx`(`userId`, `sourceHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `FamilyFavorite`
ADD CONSTRAINT `FamilyFavorite_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FamilyDailyPlanSnapshot`
ADD CONSTRAINT `FamilyDailyPlanSnapshot_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
