ALTER TABLE `Chunk`
    ADD COLUMN `deletedAt` DATETIME(3) NULL;

CREATE INDEX `Chunk_deletedAt_idx` ON `Chunk`(`deletedAt`);
