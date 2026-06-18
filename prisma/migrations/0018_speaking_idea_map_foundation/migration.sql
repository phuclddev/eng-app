CREATE TABLE `SpeakingIdea` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `shortLabel` VARCHAR(80) NOT NULL,
    `descriptionVi` TEXT NOT NULL,
    `descriptionEn` TEXT NOT NULL,
    `popularityScore` INTEGER NOT NULL DEFAULT 3,
    `reuseScore` INTEGER NOT NULL DEFAULT 3,
    `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SpeakingIdea_status_updatedAt_idx`(`status`, `updatedAt` DESC),
    INDEX `SpeakingIdea_popularityScore_reuseScore_idx`(`popularityScore`, `reuseScore`),
    INDEX `SpeakingIdea_shortLabel_idx`(`shortLabel`),
    INDEX `SpeakingIdea_title_idx`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SpeakingIdeaVariant` (
    `id` VARCHAR(191) NOT NULL,
    `ideaId` VARCHAR(191) NOT NULL,
    `bandLevel` DOUBLE NOT NULL,
    `phrase` VARCHAR(191) NOT NULL,
    `exampleSentence` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SpeakingIdeaVariant_ideaId_bandLevel_idx`(`ideaId`, `bandLevel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SpeakingIdeaSupport` (
    `id` VARCHAR(191) NOT NULL,
    `ideaId` VARCHAR(191) NOT NULL,
    `supportType` ENUM('REASON', 'EXAMPLE', 'RESULT', 'CONTRAST', 'DETAIL', 'PERSONAL_EXPERIENCE') NOT NULL,
    `text` TEXT NOT NULL,
    `example` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SpeakingIdeaSupport_ideaId_supportType_idx`(`ideaId`, `supportType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SpeakingIdeaPattern` (
    `id` VARCHAR(191) NOT NULL,
    `ideaId` VARCHAR(191) NOT NULL,
    `patternText` TEXT NOT NULL,
    `variablesJson` JSON NULL,
    `exampleAnswer` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SpeakingIdeaPattern_ideaId_idx`(`ideaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SpeakingIdeaQuestionMap` (
    `id` VARCHAR(191) NOT NULL,
    `ideaId` VARCHAR(191) NOT NULL,
    `speakingQuestionId` VARCHAR(191) NOT NULL,
    `relevanceScore` INTEGER NOT NULL DEFAULT 3,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `aiReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SpeakingIdeaQuestionMap_ideaId_speakingQuestionId_key`(`ideaId`, `speakingQuestionId`),
    INDEX `SpeakingIdeaQuestionMap_speakingQuestionId_relevanceScore_idx`(`speakingQuestionId`, `relevanceScore`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SpeakingIdeaVariant`
ADD CONSTRAINT `SpeakingIdeaVariant_ideaId_fkey`
FOREIGN KEY (`ideaId`) REFERENCES `SpeakingIdea`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SpeakingIdeaSupport`
ADD CONSTRAINT `SpeakingIdeaSupport_ideaId_fkey`
FOREIGN KEY (`ideaId`) REFERENCES `SpeakingIdea`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SpeakingIdeaPattern`
ADD CONSTRAINT `SpeakingIdeaPattern_ideaId_fkey`
FOREIGN KEY (`ideaId`) REFERENCES `SpeakingIdea`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SpeakingIdeaQuestionMap`
ADD CONSTRAINT `SpeakingIdeaQuestionMap_ideaId_fkey`
FOREIGN KEY (`ideaId`) REFERENCES `SpeakingIdea`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SpeakingIdeaQuestionMap`
ADD CONSTRAINT `SpeakingIdeaQuestionMap_speakingQuestionId_fkey`
FOREIGN KEY (`speakingQuestionId`) REFERENCES `IeltsQuestion`(`id`)
ON DELETE CASCADE ON UPDATE CASCADE;
