-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studyId" INTEGER NOT NULL,
    "participantRef" TEXT NOT NULL,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "durationSecs" INTEGER,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "excluded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("completedAt", "consentGiven", "createdAt", "durationSecs", "id", "participantRef", "startedAt", "studyId", "submitted") SELECT "completedAt", "consentGiven", "createdAt", "durationSecs", "id", "participantRef", "startedAt", "studyId", "submitted" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
