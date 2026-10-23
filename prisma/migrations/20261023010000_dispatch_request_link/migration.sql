ALTER TABLE "ResourceRequest"
ADD CONSTRAINT "ResourceRequest_campId_fkey"
FOREIGN KEY ("campId") REFERENCES "ReliefCamp"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RescueDispatch"
ADD COLUMN "requestId" TEXT;

ALTER TABLE "RescueDispatch"
ADD CONSTRAINT "RescueDispatch_targetCampId_fkey"
FOREIGN KEY ("targetCampId") REFERENCES "ReliefCamp"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RescueDispatch"
ADD CONSTRAINT "RescueDispatch_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "ResourceRequest"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "RescueDispatch_requestId_idx" ON "RescueDispatch"("requestId");

ALTER TABLE "DisplacedPerson" DROP CONSTRAINT "DisplacedPerson_campId_fkey";
ALTER TABLE "DisplacedPerson"
ADD CONSTRAINT "DisplacedPerson_campId_fkey"
FOREIGN KEY ("campId") REFERENCES "ReliefCamp"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
