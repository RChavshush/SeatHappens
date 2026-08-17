-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "HoldStatus" AS ENUM ('active', 'confirmed', 'cancelled', 'expired');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,

    CONSTRAINT "movies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "screenings" (
    "id" TEXT NOT NULL,
    "movie_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "screenings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seats" (
    "id" TEXT NOT NULL,
    "row_label" TEXT NOT NULL,
    "row_index" INTEGER NOT NULL,
    "seat_number" INTEGER NOT NULL,
    "section" TEXT NOT NULL,

    CONSTRAINT "seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_holds" (
    "id" TEXT NOT NULL,
    "screening_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "HoldStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seat_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_hold_seats" (
    "hold_id" TEXT NOT NULL,
    "seat_id" TEXT NOT NULL,
    "screening_id" TEXT NOT NULL,

    CONSTRAINT "seat_hold_seats_pkey" PRIMARY KEY ("hold_id","seat_id")
);

-- CreateTable
CREATE TABLE "seat_locks" (
    "screening_id" TEXT NOT NULL,
    "seat_id" TEXT NOT NULL,
    "hold_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seat_locks_pkey" PRIMARY KEY ("screening_id","seat_id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" TEXT NOT NULL,
    "screening_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "hold_id" TEXT NOT NULL,
    "reference_code" TEXT NOT NULL,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_seats" (
    "reservation_id" TEXT NOT NULL,
    "seat_id" TEXT NOT NULL,
    "screening_id" TEXT NOT NULL,

    CONSTRAINT "reservation_seats_pkey" PRIMARY KEY ("reservation_id","seat_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "screenings_starts_at_key" ON "screenings"("starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "seats_row_label_seat_number_key" ON "seats"("row_label", "seat_number");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_hold_id_key" ON "reservations"("hold_id");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_reference_code_key" ON "reservations"("reference_code");

-- CreateIndex
CREATE UNIQUE INDEX "reservation_seats_screening_id_seat_id_key" ON "reservation_seats"("screening_id", "seat_id");

-- AddForeignKey
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_holds" ADD CONSTRAINT "seat_holds_screening_id_fkey" FOREIGN KEY ("screening_id") REFERENCES "screenings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_holds" ADD CONSTRAINT "seat_holds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_hold_seats" ADD CONSTRAINT "seat_hold_seats_hold_id_fkey" FOREIGN KEY ("hold_id") REFERENCES "seat_holds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_hold_seats" ADD CONSTRAINT "seat_hold_seats_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_locks" ADD CONSTRAINT "seat_locks_screening_id_fkey" FOREIGN KEY ("screening_id") REFERENCES "screenings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_locks" ADD CONSTRAINT "seat_locks_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_locks" ADD CONSTRAINT "seat_locks_hold_id_fkey" FOREIGN KEY ("hold_id") REFERENCES "seat_holds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_screening_id_fkey" FOREIGN KEY ("screening_id") REFERENCES "screenings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_hold_id_fkey" FOREIGN KEY ("hold_id") REFERENCES "seat_holds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_seats" ADD CONSTRAINT "reservation_seats_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_seats" ADD CONSTRAINT "reservation_seats_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Partial unique index: at most one active hold per user per screening.
-- Not expressible in the Prisma schema, so applied as raw SQL here.
CREATE UNIQUE INDEX "one_active_hold_per_user"
  ON "seat_holds" ("user_id", "screening_id")
  WHERE "status" = 'active';
