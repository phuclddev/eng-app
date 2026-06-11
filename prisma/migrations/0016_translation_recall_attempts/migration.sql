CREATE TABLE `TranslationRecallAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `scriptId` VARCHAR(191) NOT NULL,
    `sentenceId` VARCHAR(191) NULL,
    `mode` ENUM('SENTENCE', 'PASSAGE') NOT NULL DEFAULT 'SENTENCE',
    `userAnswer` TEXT NOT NULL,
    `score` INTEGER NULL,
    `feedbackMarkdown` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TranslationRecallAttempt_userId_createdAt_idx`(`userId`, `createdAt` DESC),
    INDEX `TranslationRecallAttempt_userId_scriptId_createdAt_idx`(`userId`, `scriptId`, `createdAt` DESC),
    INDEX `TranslationRecallAttempt_userId_sentenceId_createdAt_idx`(`userId`, `sentenceId`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TranslationRecallAttempt`
ADD CONSTRAINT `TranslationRecallAttempt_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TranslationRecallAttempt`
ADD CONSTRAINT `TranslationRecallAttempt_scriptId_fkey`
FOREIGN KEY (`scriptId`) REFERENCES `TranslationScript`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TranslationRecallAttempt`
ADD CONSTRAINT `TranslationRecallAttempt_sentenceId_fkey`
FOREIGN KEY (`sentenceId`) REFERENCES `TranslationSentence`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;
