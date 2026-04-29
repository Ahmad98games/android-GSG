-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_system_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "factoryName" TEXT NOT NULL DEFAULT 'Industrial Hub',
    "companyLogo" TEXT,
    "themeId" TEXT NOT NULL DEFAULT 'onyx-gold',
    "industryType" TEXT NOT NULL DEFAULT 'general',
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "setupAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_system_settings" ("companyLogo", "factoryName", "id", "industryType", "onboardingComplete", "setupAt", "updatedAt") SELECT "companyLogo", "factoryName", "id", "industryType", "onboardingComplete", "setupAt", "updatedAt" FROM "system_settings";
DROP TABLE "system_settings";
ALTER TABLE "new_system_settings" RENAME TO "system_settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
