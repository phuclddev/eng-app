ALTER TABLE `FamilyScenario`
ADD COLUMN `normalizedTitle` VARCHAR(191) NOT NULL DEFAULT '',
ADD COLUMN `status` ENUM('SUGGESTED', 'APPROVED', 'ARCHIVED') NOT NULL DEFAULT 'APPROVED',
ADD COLUMN `source` ENUM('MANUAL', 'AI') NOT NULL DEFAULT 'MANUAL',
ADD COLUMN `aiReason` TEXT NULL,
ADD COLUMN `suggestedGoals` JSON NULL,
ADD COLUMN `suggestedChunks` JSON NULL;

UPDATE `FamilyScenario`
SET `normalizedTitle` = LOWER(TRIM(`title`));

UPDATE `FamilyScenario`
SET `status` = 'APPROVED'
WHERE `isActive` = true;

UPDATE `FamilyScenario`
SET `status` = 'ARCHIVED'
WHERE `isActive` = false;

CREATE UNIQUE INDEX `FamilyScenario_userId_normalizedTitle_key`
ON `FamilyScenario`(`userId`, `normalizedTitle`);

CREATE INDEX `FamilyScenario_userId_status_updatedAt_idx`
ON `FamilyScenario`(`userId`, `status`, `updatedAt` DESC);
