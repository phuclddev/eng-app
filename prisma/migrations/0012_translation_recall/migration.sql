CREATE TABLE `TranslationScript` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `topic` VARCHAR(120) NOT NULL,
    `bandLevel` DOUBLE NOT NULL DEFAULT 6,
    `notes` TEXT NULL,
    `fingerprint` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TranslationScript_fingerprint_key`(`fingerprint`),
    INDEX `TranslationScript_topic_bandLevel_idx`(`topic`, `bandLevel`),
    INDEX `TranslationScript_updatedAt_idx`(`updatedAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TranslationSentence` (
    `id` VARCHAR(191) NOT NULL,
    `scriptId` VARCHAR(191) NOT NULL,
    `orderIndex` INTEGER NOT NULL DEFAULT 0,
    `englishText` TEXT NOT NULL,
    `vietnameseText` TEXT NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TranslationSentence_scriptId_orderIndex_key`(`scriptId`, `orderIndex`),
    INDEX `TranslationSentence_scriptId_idx`(`scriptId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TranslationChunkMapping` (
    `id` VARCHAR(191) NOT NULL,
    `sentenceId` VARCHAR(191) NOT NULL,
    `chunkId` VARCHAR(191) NULL,
    `englishPhrase` VARCHAR(191) NOT NULL,
    `meaningVi` VARCHAR(255) NOT NULL,
    `usageContext` TEXT NULL,
    `exampleSentence` TEXT NULL,
    `suggestedTopic` VARCHAR(120) NULL,
    `bandEstimate` DOUBLE NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TranslationChunkMapping_sentenceId_englishPhrase_key`(`sentenceId`, `englishPhrase`),
    INDEX `TranslationChunkMapping_sentenceId_idx`(`sentenceId`),
    INDEX `TranslationChunkMapping_chunkId_idx`(`chunkId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `TranslationSentenceReview` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `sentenceId` VARCHAR(191) NOT NULL,
    `reviewCount` INTEGER NOT NULL DEFAULT 0,
    `lastReviewedAt` DATETIME(3) NULL,
    `lastConfidence` ENUM('EASY', 'MEDIUM', 'HARD') NULL,
    `easyCount` INTEGER NOT NULL DEFAULT 0,
    `mediumCount` INTEGER NOT NULL DEFAULT 0,
    `hardCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TranslationSentenceReview_userId_sentenceId_key`(`userId`, `sentenceId`),
    INDEX `TranslationSentenceReview_userId_lastReviewedAt_idx`(`userId`, `lastReviewedAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TranslationScript`
ADD CONSTRAINT `TranslationScript_createdById_fkey`
FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `TranslationSentence`
ADD CONSTRAINT `TranslationSentence_scriptId_fkey`
FOREIGN KEY (`scriptId`) REFERENCES `TranslationScript`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TranslationChunkMapping`
ADD CONSTRAINT `TranslationChunkMapping_sentenceId_fkey`
FOREIGN KEY (`sentenceId`) REFERENCES `TranslationSentence`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TranslationChunkMapping`
ADD CONSTRAINT `TranslationChunkMapping_chunkId_fkey`
FOREIGN KEY (`chunkId`) REFERENCES `Chunk`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `TranslationSentenceReview`
ADD CONSTRAINT `TranslationSentenceReview_userId_fkey`
FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `TranslationSentenceReview`
ADD CONSTRAINT `TranslationSentenceReview_sentenceId_fkey`
FOREIGN KEY (`sentenceId`) REFERENCES `TranslationSentence`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
