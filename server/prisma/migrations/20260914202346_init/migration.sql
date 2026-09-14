-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "authorId" TEXT,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "charCount" INTEGER NOT NULL,
    "charCountNoSpaces" INTEGER NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "sentenceCount" INTEGER NOT NULL,
    "paragraphCount" INTEGER NOT NULL DEFAULT 0,
    "pageCount" INTEGER NOT NULL,
    "avgSentenceLength" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "readingTimeMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "language" TEXT,
    "languageBreakdown" JSONB,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "failedStage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorpusDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "contentHash" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorpusDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shingle" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "Shingle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorpusShingle" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "CorpusShingle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentenceEmbedding" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sentence" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "embedding" vector(384) NOT NULL,

    CONSTRAINT "SentenceEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorpusSentenceEmbedding" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sentence" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "embedding" vector(384) NOT NULL,

    CONSTRAINT "CorpusSentenceEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisResult" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "originalityPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "plagiarismPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paraphrasePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "selfPlagiarismPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "citedPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spamPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "junkWordsPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grammarErrors" INTEGER NOT NULL DEFAULT 0,
    "readabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiProbability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiVerdict" BOOLEAN NOT NULL DEFAULT false,
    "detailsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TamperingFlag" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "position" INTEGER,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TamperingFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentMetadata" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "createdAtRaw" TIMESTAMP(3),
    "modifiedAtRaw" TIMESTAMP(3),
    "author" TEXT,
    "producer" TEXT,
    "suspicious" BOOLEAN NOT NULL DEFAULT false,
    "suspicionNote" TEXT,

    CONSTRAINT "DocumentMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetectorWeight" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DetectorWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JunkWord" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,

    CONSTRAINT "JunkWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClicheWord" (
    "id" TEXT NOT NULL,
    "phrase" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'AI_CLICHE',

    CONSTRAINT "ClicheWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Document_contentHash_key" ON "Document"("contentHash");

-- CreateIndex
CREATE INDEX "Document_authorId_idx" ON "Document"("authorId");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CorpusDocument_contentHash_key" ON "CorpusDocument"("contentHash");

-- CreateIndex
CREATE INDEX "Shingle_hash_idx" ON "Shingle"("hash");

-- CreateIndex
CREATE INDEX "Shingle_documentId_idx" ON "Shingle"("documentId");

-- CreateIndex
CREATE INDEX "CorpusShingle_hash_idx" ON "CorpusShingle"("hash");

-- CreateIndex
CREATE INDEX "CorpusShingle_documentId_idx" ON "CorpusShingle"("documentId");

-- CreateIndex
CREATE INDEX "SentenceEmbedding_documentId_idx" ON "SentenceEmbedding"("documentId");

-- CreateIndex
CREATE INDEX "CorpusSentenceEmbedding_documentId_idx" ON "CorpusSentenceEmbedding"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisResult_documentId_key" ON "AnalysisResult"("documentId");

-- CreateIndex
CREATE INDEX "TamperingFlag_documentId_idx" ON "TamperingFlag"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentMetadata_documentId_key" ON "DocumentMetadata"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DetectorWeight_feature_key" ON "DetectorWeight"("feature");

-- CreateIndex
CREATE UNIQUE INDEX "JunkWord_word_key" ON "JunkWord"("word");

-- CreateIndex
CREATE UNIQUE INDEX "ClicheWord_phrase_key" ON "ClicheWord"("phrase");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shingle" ADD CONSTRAINT "Shingle_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorpusShingle" ADD CONSTRAINT "CorpusShingle_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CorpusDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentenceEmbedding" ADD CONSTRAINT "SentenceEmbedding_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorpusSentenceEmbedding" ADD CONSTRAINT "CorpusSentenceEmbedding_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CorpusDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisResult" ADD CONSTRAINT "AnalysisResult_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TamperingFlag" ADD CONSTRAINT "TamperingFlag_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentMetadata" ADD CONSTRAINT "DocumentMetadata_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
