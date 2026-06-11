ALTER TABLE `IeltsQuestionChunkMapping`
MODIFY `usageRole` ENUM(
  'HOOK', 'MAIN_IDEA', 'SUPPORTING_DETAIL', 'EXAMPLE', 'OPINION', 'CLOSING',
  'OPENING', 'REASON', 'CONTRAST', 'DETAIL', 'EMOTION', 'STORYTELLING',
  'SPECULATION', 'COMPARISON', 'ENDING', 'FILLER'
) NOT NULL;

ALTER TABLE `IeltsQuestion`
ADD COLUMN `normalizedPrompt` VARCHAR(191) NOT NULL DEFAULT '',
ADD COLUMN `status` ENUM('SUGGESTED', 'APPROVED', 'ARCHIVED') NOT NULL DEFAULT 'APPROVED',
ADD COLUMN `source` ENUM('MANUAL', 'CSV_IMPORT', 'AI_GENERATED') NOT NULL DEFAULT 'MANUAL',
ADD COLUMN `aiReason` TEXT NULL,
ADD COLUMN `popularityScore` INTEGER NOT NULL DEFAULT 3,
ADD COLUMN `predictedUsefulnessScore` INTEGER NOT NULL DEFAULT 3,
ADD COLUMN `generatedBatchId` VARCHAR(64) NULL;

UPDATE `IeltsQuestion`
SET `normalizedPrompt` = LOWER(TRIM(LEFT(`prompt`, 191)));

CREATE INDEX `IeltsQuestion_status_taskType_idx`
ON `IeltsQuestion`(`status`, `taskType`);

CREATE INDEX `IeltsQuestion_generatedBatchId_idx`
ON `IeltsQuestion`(`generatedBatchId`);

CREATE INDEX `IeltsQuestion_skill_taskType_normalizedPrompt_idx`
ON `IeltsQuestion`(`skill`, `taskType`, `normalizedPrompt`);
