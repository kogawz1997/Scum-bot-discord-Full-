ALTER TABLE "ShopItem" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'item';
ALTER TABLE "ShopItem" ADD COLUMN "gameItemId" TEXT;
ALTER TABLE "ShopItem" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ShopItem" ADD COLUMN "iconUrl" TEXT;

UPDATE "ShopItem"
SET "kind" = 'vip'
WHERE lower("id") LIKE 'vip%';
