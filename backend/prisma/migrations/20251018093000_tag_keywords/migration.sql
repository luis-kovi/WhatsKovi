-- CreateEnum
CREATE TYPE "TagMatchType" AS ENUM ('CONTAINS', 'EXACT', 'STARTS_WITH');

-- CreateTable
CREATE TABLE "tag_keywords" (
  "id" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "matchType" "TagMatchType" NOT NULL DEFAULT 'CONTAINS',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tag_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tag_keywords_tagId_keyword_key" ON "tag_keywords"("tagId", "keyword");

-- AddForeignKey
ALTER TABLE "tag_keywords"
ADD CONSTRAINT "tag_keywords_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
