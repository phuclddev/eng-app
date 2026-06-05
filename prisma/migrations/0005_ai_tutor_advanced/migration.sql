CREATE TABLE `AiSimulatorSession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `part` ENUM('PART_1', 'PART_2', 'PART_3', 'MIXED') NOT NULL,
    `topic` VARCHAR(120) NULL,
    `prompt` TEXT NULL,
    `targetBand` DOUBLE NULL,
    `numberOfTurns` INTEGER NOT NULL DEFAULT 5,
    `currentTurn` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'COMPLETED', 'ABANDONED') NOT NULL DEFAULT 'ACTIVE',
    `externalConversationId` VARCHAR(191) NOT NULL,
    `finalFeedback` TEXT NULL,
    `finalFeedbackSections` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AiSimulatorSession_externalConversationId_key`(`externalConversationId`),
    INDEX `AiSimulatorSession_userId_updatedAt_idx`(`userId`, `updatedAt` DESC),
    INDEX `AiSimulatorSession_status_part_idx`(`status`, `part`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AiSimulatorMessage` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `role` ENUM('EXAMINER', 'LEARNER', 'FEEDBACK') NOT NULL,
    `content` TEXT NOT NULL,
    `turnNumber` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AiSimulatorMessage_sessionId_createdAt_idx`(`sessionId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AiStudyCoachSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `sourceHash` VARCHAR(191) NOT NULL,
    `answer` TEXT NOT NULL,
    `structuredPlan` JSON NULL,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AiStudyCoachSnapshot_userId_updatedAt_idx`(`userId`, `updatedAt` DESC),
    INDEX `AiStudyCoachSnapshot_userId_sourceHash_idx`(`userId`, `sourceHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AiSimulatorSession` ADD CONSTRAINT `AiSimulatorSession_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AiSimulatorMessage` ADD CONSTRAINT `AiSimulatorMessage_sessionId_fkey`
    FOREIGN KEY (`sessionId`) REFERENCES `AiSimulatorSession`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `AiStudyCoachSnapshot` ADD CONSTRAINT `AiStudyCoachSnapshot_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
