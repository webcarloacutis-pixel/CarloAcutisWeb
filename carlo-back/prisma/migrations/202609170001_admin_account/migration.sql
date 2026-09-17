-- Additive account permission; existing and publicly registered users remain ordinary users.
ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;
