CREATE TABLE `AiConversation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `externalConversationId` VARCHAR(191) NOT NULL,
    `purpose` ENUM('GENERAL_CHAT', 'SENTENCE_CORRECTION', 'SPEAKING_COACH', 'CHUNK_EXPLANATION') NOT NULL DEFAULT 'GENERAL_CHAT',
    `title` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AiConversation_externalConversationId_key`(`externalConversationId`),
    INDEX `AiConversation_userId_updatedAt_idx`(`userId`, `updatedAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AiConversation` ADD CONSTRAINT `AiConversation_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
