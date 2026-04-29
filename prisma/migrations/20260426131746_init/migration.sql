-- CreateTable
CREATE TABLE "system_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "factoryName" TEXT NOT NULL DEFAULT 'Industrial Hub',
    "industryType" TEXT NOT NULL DEFAULT 'general',
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "setupAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "khata_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "workerName" TEXT NOT NULL,
    "workerId" TEXT,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snippetPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "node_registrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nodeSlot" INTEGER NOT NULL,
    "deviceName" TEXT NOT NULL,
    "deviceFingerprint" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'FIELD_NODE',
    "publicKeyPem" TEXT,
    "lastSeenAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "linkedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "sync_queue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operation" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" DATETIME,
    "syncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "node_registrations_nodeSlot_key" ON "node_registrations"("nodeSlot");

-- CreateIndex
CREATE UNIQUE INDEX "node_registrations_deviceFingerprint_key" ON "node_registrations"("deviceFingerprint");
