-- Add video embed fields to properties

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VideoProvider') THEN
    CREATE TYPE "VideoProvider" AS ENUM ('YOUTUBE', 'VIMEO');
  END IF;
END$$;

ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "videoProvider" "VideoProvider";
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "videoId" TEXT;
