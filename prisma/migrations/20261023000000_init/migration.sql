-- CreateTable
CREATE TABLE "ReliefCamp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "capacity" INTEGER NOT NULL,
    "currentOccupancy" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "foodPackets" INTEGER NOT NULL,
    "waterLiters" INTEGER NOT NULL,
    "medicalKits" INTEGER NOT NULL,
    "shelterTents" INTEGER NOT NULL,
    "burnRatePerHour" INTEGER NOT NULL,
    "facilitiesJson" TEXT NOT NULL DEFAULT '{}',
    "verificationJson" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReliefCamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceRequest" (
    "id" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "campName" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "quantityNeeded" INTEGER NOT NULL,
    "urgencyScore" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "duplicateFlag" BOOLEAN NOT NULL DEFAULT false,
    "reasoningJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyDepot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "foodStock" INTEGER NOT NULL,
    "waterStock" INTEGER NOT NULL,
    "medicineStock" INTEGER NOT NULL,
    "shelterStock" INTEGER NOT NULL,

    CONSTRAINT "SupplyDepot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RescueDispatch" (
    "id" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "unitCode" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "originName" TEXT NOT NULL,
    "targetCampId" TEXT NOT NULL,
    "targetCampName" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "etaMinutes" INTEGER NOT NULL,
    "routeStatus" TEXT NOT NULL,
    "progressPercent" INTEGER NOT NULL,
    "stockApplied" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RescueDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisplacedPerson" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "medicalNeeds" TEXT NOT NULL,
    "currentCampName" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "familyGroupCode" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "DisplacedPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'RELIEF_CAMP',
    "campId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TriageWeights" (
    "id" TEXT NOT NULL,
    "routeReliability" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "burnDrift" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "facilityPenalty" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "historyJson" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TriageWeights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationLog" (
    "id" TEXT NOT NULL,
    "campId" TEXT NOT NULL,
    "campName" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reported" INTEGER NOT NULL,
    "modelExpected" INTEGER NOT NULL,
    "groundTruth" INTEGER NOT NULL,
    "accuracyBefore" INTEGER NOT NULL,
    "accuracyAfter" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "prevHash" TEXT NOT NULL,
    "by" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetryEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionReceipt" (
    "id" TEXT NOT NULL,
    "actorBadgeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- AddForeignKey
ALTER TABLE "DisplacedPerson" ADD CONSTRAINT "DisplacedPerson_campId_fkey" FOREIGN KEY ("campId") REFERENCES "ReliefCamp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
