-- Add sources persistence to Conversation
ALTER TABLE "Conversation"
ADD COLUMN "sources" JSONB,
ADD COLUMN "sourcesMode" TEXT;