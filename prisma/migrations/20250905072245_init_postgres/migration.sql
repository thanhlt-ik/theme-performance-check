-- CreateEnum
CREATE TYPE "public"."DeviceType" AS ENUM ('DESKTOP', 'MOBILE');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PerformanceMeasurement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "deviceType" "public"."DeviceType" NOT NULL,
    "measurementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performanceScore" INTEGER NOT NULL,
    "fcp" INTEGER,
    "lcp" INTEGER,
    "cls" DOUBLE PRECISION,
    "fid" INTEGER,
    "ttfb" INTEGER,
    "speedIndex" INTEGER,
    "tbt" INTEGER,
    "opportunity" JSONB,
    "diagnostics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MeasurementJob" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "deviceType" "public"."DeviceType" NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeasurementJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_url_key" ON "public"."Product"("url");

-- CreateIndex
CREATE INDEX "PerformanceMeasurement_productId_deviceType_measurementDate_idx" ON "public"."PerformanceMeasurement"("productId", "deviceType", "measurementDate");

-- CreateIndex
CREATE INDEX "PerformanceMeasurement_measurementDate_idx" ON "public"."PerformanceMeasurement"("measurementDate");

-- CreateIndex
CREATE INDEX "MeasurementJob_status_scheduledAt_idx" ON "public"."MeasurementJob"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "public"."SystemConfig"("key");

-- AddForeignKey
ALTER TABLE "public"."PerformanceMeasurement" ADD CONSTRAINT "PerformanceMeasurement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
