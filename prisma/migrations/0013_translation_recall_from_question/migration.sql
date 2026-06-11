ALTER TABLE `TranslationScript`
ADD COLUMN `sourceType` VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
ADD COLUMN `sourceQuestionId` VARCHAR(191) NULL,
ADD COLUMN `generatedByAi` BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1,
ADD COLUMN `usedChunkIds` JSON NULL;

CREATE INDEX `TranslationScript_sourceQuestionId_bandLevel_version_idx`
ON `TranslationScript`(`sourceQuestionId`, `bandLevel`, `version`);

CREATE INDEX `TranslationScript_sourceQuestionId_updatedAt_idx`
ON `TranslationScript`(`sourceQuestionId`, `updatedAt` DESC);

ALTER TABLE `TranslationScript`
ADD CONSTRAINT `TranslationScript_sourceQuestionId_fkey`
FOREIGN KEY (`sourceQuestionId`) REFERENCES `IeltsQuestion`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;
