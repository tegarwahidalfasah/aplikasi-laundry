-- AlterTable
ALTER TABLE `order` ADD COLUMN `phoneNumber` VARCHAR(191) NULL,
    MODIFY `serviceType` VARCHAR(191) NOT NULL DEFAULT 'Cuci Lipat';
