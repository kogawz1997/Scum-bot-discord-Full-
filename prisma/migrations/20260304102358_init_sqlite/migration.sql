-- CreateTable
CREATE TABLE "UserWallet" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "lastDaily" BIGINT,
    "lastWeekly" BIGINT
);

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "description" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RedeemCode" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "amount" INTEGER,
    "itemId" TEXT,
    "usedBy" TEXT,
    "usedAt" DATETIME
);

-- CreateTable
CREATE TABLE "VipMembership" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Bounty" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "targetName" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "claimedBy" TEXT
);

-- CreateTable
CREATE TABLE "Stats" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "playtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "squad" TEXT
);

-- CreateTable
CREATE TABLE "Link" (
    "steamId" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "inGameName" TEXT,
    "linkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ScumStatus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "onlinePlayers" INTEGER NOT NULL DEFAULT 0,
    "maxPlayers" INTEGER NOT NULL DEFAULT 90,
    "pingMs" INTEGER,
    "uptimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_code_key" ON "Purchase"("code");
