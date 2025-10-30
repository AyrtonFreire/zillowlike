-- CreateEnum
CREATE TYPE "FinishFloor" AS ENUM ('PORCELANATO', 'MADEIRA', 'VINILICO', 'OUTRO');

-- CreateEnum
CREATE TYPE "SunOrientation" AS ENUM ('NASCENTE', 'POENTE', 'OUTRA');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'AGENCY';

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "accAccessibleElevator" BOOLEAN,
ADD COLUMN     "accRamps" BOOLEAN,
ADD COLUMN     "accTactile" BOOLEAN,
ADD COLUMN     "accWideDoors" BOOLEAN,
ADD COLUMN     "comfortAC" BOOLEAN,
ADD COLUMN     "comfortHeating" BOOLEAN,
ADD COLUMN     "comfortLED" BOOLEAN,
ADD COLUMN     "comfortNoiseWindows" BOOLEAN,
ADD COLUMN     "comfortSolar" BOOLEAN,
ADD COLUMN     "comfortWaterReuse" BOOLEAN,
ADD COLUMN     "condoRules" TEXT,
ADD COLUMN     "finishCabinets" BOOLEAN,
ADD COLUMN     "finishCounterGranite" BOOLEAN,
ADD COLUMN     "finishCounterQuartz" BOOLEAN,
ADD COLUMN     "finishFloor" "FinishFloor",
ADD COLUMN     "hasBalcony" BOOLEAN,
ADD COLUMN     "hasConcierge24h" BOOLEAN,
ADD COLUMN     "hasElevator" BOOLEAN,
ADD COLUMN     "hasGourmet" BOOLEAN,
ADD COLUMN     "hasGym" BOOLEAN,
ADD COLUMN     "hasPartyRoom" BOOLEAN,
ADD COLUMN     "hasPlayground" BOOLEAN,
ADD COLUMN     "hasPool" BOOLEAN,
ADD COLUMN     "petsLarge" BOOLEAN,
ADD COLUMN     "petsSmall" BOOLEAN,
ADD COLUMN     "positionBack" BOOLEAN,
ADD COLUMN     "positionFront" BOOLEAN,
ADD COLUMN     "sunByRoomNote" TEXT,
ADD COLUMN     "sunOrientation" "SunOrientation",
ADD COLUMN     "totalFloors" INTEGER,
ADD COLUMN     "viewCity" BOOLEAN,
ADD COLUMN     "viewSea" BOOLEAN,
ADD COLUMN     "yearRenovated" INTEGER;
