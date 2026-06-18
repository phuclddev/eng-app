-- AlterTable
ALTER TABLE `SpeakingIdea`
  ADD COLUMN `aiReason` TEXT NULL,
  ADD COLUMN `generatedBatchId` VARCHAR(64) NULL;

-- CreateIndex
CREATE INDEX `SpeakingIdea_generatedBatchId_idx` ON `SpeakingIdea`(`generatedBatchId`);
