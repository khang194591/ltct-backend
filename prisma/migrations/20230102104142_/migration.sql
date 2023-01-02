-- CreateEnum
CREATE TYPE "Type" AS ENUM ('IMPORT', 'EXPORT', 'INSURANCE_EXPORT', 'RETURN');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('GOOD', 'BAD');

-- CreateEnum
CREATE TYPE "PackingStatus" AS ENUM ('DONE', 'PENDING');

-- CreateTable
CREATE TABLE "Item" (
    "itemId" INTEGER NOT NULL,
    "goodQuantity" INTEGER NOT NULL,
    "badQuantity" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "guildline" TEXT NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("itemId")
);

-- CreateTable
CREATE TABLE "History" (
    "historyId" SERIAL NOT NULL,
    "status" "RequestStatus" DEFAULT 'PENDING',
    "packingStatus" "PackingStatus",
    "type" "Type" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "History_pkey" PRIMARY KEY ("historyId")
);

-- CreateTable
CREATE TABLE "HistoryItem" (
    "historyItemId" SERIAL NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "ItemStatus" DEFAULT 'GOOD',
    "itemId" INTEGER NOT NULL,
    "historyId" INTEGER,

    CONSTRAINT "HistoryItem_pkey" PRIMARY KEY ("historyItemId")
);

-- AddForeignKey
ALTER TABLE "HistoryItem" ADD CONSTRAINT "HistoryItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("itemId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoryItem" ADD CONSTRAINT "HistoryItem_historyId_fkey" FOREIGN KEY ("historyId") REFERENCES "History"("historyId") ON DELETE SET NULL ON UPDATE CASCADE;
