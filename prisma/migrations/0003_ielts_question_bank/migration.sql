CREATE TABLE `IeltsQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `skill` ENUM('SPEAKING') NOT NULL DEFAULT 'SPEAKING',
    `taskType` ENUM('PART_1', 'PART_2', 'PART_3') NOT NULL,
    `topic` VARCHAR(120) NOT NULL,
    `subTopic` VARCHAR(120) NULL,
    `prompt` TEXT NOT NULL,
    `supportingPoints` JSON NULL,
    `difficulty` INTEGER NOT NULL DEFAULT 1,
    `targetBand` DOUBLE NOT NULL DEFAULT 6,
    `notes` TEXT NULL,
    `fingerprint` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `IeltsQuestion_fingerprint_key`(`fingerprint`),
    INDEX `IeltsQuestion_skill_taskType_topic_idx`(`skill`, `taskType`, `topic`),
    INDEX `IeltsQuestion_subTopic_idx`(`subTopic`),
    INDEX `IeltsQuestion_difficulty_targetBand_idx`(`difficulty`, `targetBand`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `IeltsQuestionChunkMapping` (
    `id` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `chunkId` VARCHAR(191) NOT NULL,
    `usageRole` ENUM('HOOK', 'MAIN_IDEA', 'SUPPORTING_DETAIL', 'EXAMPLE', 'OPINION', 'CLOSING') NOT NULL,
    `exampleSentence` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `IeltsQuestionChunkMapping_questionId_chunkId_usageRole_key`(`questionId`, `chunkId`, `usageRole`),
    INDEX `IeltsQuestionChunkMapping_questionId_sortOrder_idx`(`questionId`, `sortOrder`),
    INDEX `IeltsQuestionChunkMapping_chunkId_idx`(`chunkId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `IeltsQuestion` ADD CONSTRAINT `IeltsQuestion_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `IeltsQuestionChunkMapping` ADD CONSTRAINT `IeltsQuestionChunkMapping_questionId_fkey`
    FOREIGN KEY (`questionId`) REFERENCES `IeltsQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `IeltsQuestionChunkMapping` ADD CONSTRAINT `IeltsQuestionChunkMapping_chunkId_fkey`
    FOREIGN KEY (`chunkId`) REFERENCES `Chunk`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
