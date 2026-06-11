CREATE TABLE `FamilyPracticeSession` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `mode` ENUM('DAILY', 'REVIEW', 'MIXED') NOT NULL DEFAULT 'DAILY',
    `exerciseTypes` JSON NOT NULL,
    `totalQuestions` INTEGER NOT NULL DEFAULT 0,
    `correctAnswers` INTEGER NOT NULL DEFAULT 0,
    `score` INTEGER NOT NULL DEFAULT 0,
    `averageResponseMs` INTEGER NOT NULL DEFAULT 0,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FamilyPracticeSession_userId_startedAt_idx`(`userId`, `startedAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FamilyPracticeAnswer` (
    `id` VARCHAR(191) NOT NULL,
    `sessionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `familyChunkId` VARCHAR(191) NOT NULL,
    `exerciseType` ENUM('VI_TO_CHUNK', 'FILL_IN_DIALOG', 'NATURAL_RESPONSE', 'CONTINUE_CONVERSATION', 'FAMILY_CHUNK_RECALL') NOT NULL,
    `prompt` TEXT NOT NULL,
    `expectedAnswer` TEXT NOT NULL,
    `userAnswer` TEXT NOT NULL,
    `isCorrect` BOOLEAN NOT NULL,
    `responseTimeMs` INTEGER NOT NULL,
    `confidenceLevel` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL,
    `feedback` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FamilyPracticeAnswer_userId_familyChunkId_createdAt_idx`(`userId`, `familyChunkId`, `createdAt` DESC),
    INDEX `FamilyPracticeAnswer_sessionId_idx`(`sessionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `FamilyReviewSchedule` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `familyChunkId` VARCHAR(191) NOT NULL,
    `nextReviewAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastReviewedAt` DATETIME(3) NULL,
    `intervalDays` INTEGER NOT NULL DEFAULT 1,
    `easeFactor` DOUBLE NOT NULL DEFAULT 2.5,
    `reviewCount` INTEGER NOT NULL DEFAULT 0,
    `lastConfidence` ENUM('EASY', 'MEDIUM', 'HARD') NULL,
    `lastCorrect` BOOLEAN NULL,
    `masteryScore` INTEGER NOT NULL DEFAULT 0,
    `totalAttempts` INTEGER NOT NULL DEFAULT 0,
    `correctAttempts` INTEGER NOT NULL DEFAULT 0,
    `averageResponseMs` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FamilyReviewSchedule_userId_familyChunkId_key`(`userId`, `familyChunkId`),
    INDEX `FamilyReviewSchedule_userId_nextReviewAt_idx`(`userId`, `nextReviewAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `FamilyPracticeSession`
ADD CONSTRAINT `FamilyPracticeSession_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FamilyPracticeAnswer`
ADD CONSTRAINT `FamilyPracticeAnswer_sessionId_fkey`
FOREIGN KEY (`sessionId`) REFERENCES `FamilyPracticeSession`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FamilyPracticeAnswer`
ADD CONSTRAINT `FamilyPracticeAnswer_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FamilyPracticeAnswer`
ADD CONSTRAINT `FamilyPracticeAnswer_familyChunkId_fkey`
FOREIGN KEY (`familyChunkId`) REFERENCES `FamilyChunk`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FamilyReviewSchedule`
ADD CONSTRAINT `FamilyReviewSchedule_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `FamilyReviewSchedule`
ADD CONSTRAINT `FamilyReviewSchedule_familyChunkId_fkey`
FOREIGN KEY (`familyChunkId`) REFERENCES `FamilyChunk`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
