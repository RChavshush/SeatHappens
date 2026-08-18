-- DropIndex
DROP INDEX "seats_row_label_seat_number_key";

-- AlterTable
ALTER TABLE "seats" DROP COLUMN "row_label",
DROP COLUMN "section";

-- CreateIndex
CREATE UNIQUE INDEX "seats_row_index_seat_number_key" ON "seats"("row_index", "seat_number");
