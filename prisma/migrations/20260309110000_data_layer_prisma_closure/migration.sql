-- Close remaining data-layer gaps by moving wheel/chat/rent schemas into Prisma.

CREATE TABLE IF NOT EXISTS "LuckyWheelState" (
  "userId" TEXT NOT NULL PRIMARY KEY,
  "lastSpinAt" DATETIME,
  "totalSpins" INTEGER NOT NULL DEFAULT 0,
  "historyJson" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LuckyWheelState_updatedAt_idx"
  ON "LuckyWheelState"("updatedAt");

CREATE TABLE IF NOT EXISTS "party_chat_messages" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "party_key" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "party_chat_messages_party_key_created_at_idx"
  ON "party_chat_messages"("party_key", "created_at");

CREATE INDEX IF NOT EXISTS "party_chat_messages_user_id_created_at_idx"
  ON "party_chat_messages"("user_id", "created_at");

CREATE TABLE IF NOT EXISTS "daily_rent" (
  "user_key" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "used" INTEGER NOT NULL DEFAULT 0,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("user_key", "date")
);

CREATE INDEX IF NOT EXISTS "daily_rent_date_updated_at_idx"
  ON "daily_rent"("date", "updated_at");

CREATE TABLE IF NOT EXISTS "rental_vehicles" (
  "order_id" TEXT NOT NULL PRIMARY KEY,
  "user_key" TEXT NOT NULL,
  "guild_id" TEXT,
  "vehicle_instance_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "destroyed_at" DATETIME,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_rental_vehicles_status"
  ON "rental_vehicles"("status");

CREATE INDEX IF NOT EXISTS "idx_rental_vehicles_user_key"
  ON "rental_vehicles"("user_key");

CREATE INDEX IF NOT EXISTS "rental_vehicles_created_at_idx"
  ON "rental_vehicles"("created_at");
