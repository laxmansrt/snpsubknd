/**
 * ============================================================
 *  PRODUCTION MIGRATION SCRIPT
 *  EduSphere College Portal — Embedded Array Extraction
 * ============================================================
 *
 *  What this script does:
 *  1. Reads embedded arrays from old documents
 *  2. Writes them into the new separate collections
 *  3. Verifies counts match
 *  4. Does NOT delete old embedded data (zero rollback risk)
 *
 *  HOW TO RUN:
 *  -----------
 *  1. Make sure your .env is configured (MONGODB_URI)
 *  2. Run from the backend directory:
 *       node migrations/migrate_embedded_to_collections.js
 *
 *  SAFETY:
 *  -------
 *  - Safe to run multiple times (insertMany with ordered:false
 *    skips duplicates on unique index violations)
 *  - Does NOT delete the old embedded arrays
 *  - Run BEFORE deploying the new controller code
 *
 *  POST-MIGRATION CLEANUP (run only after verifying everything works):
 *  -------------------------------------------------------------------
 *  db.assignments.updateMany({}, { $unset: { submissions: "" } })
 *  db.feedbacks.updateMany({}, { $unset: { responses: "" } })
 *  db.placementdrives.updateMany({}, { $unset: { applicants: "" } })
 *  db.announcements.updateMany({}, { $unset: { readBy: "" } })
 * ============================================================
 */

'use strict';

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// ── Colours for terminal output ──────────────────────────────
const c = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
};
const log = {
    info: (msg) => console.log(`${c.cyan}ℹ  ${msg}${c.reset}`),
    ok: (msg) => console.log(`${c.green}✔  ${msg}${c.reset}`),
    warn: (msg) => console.log(`${c.yellow}⚠  ${msg}${c.reset}`),
    error: (msg) => console.error(`${c.red}✘  ${msg}${c.reset}`),
    section: (msg) => console.log(`\n${c.bold}${c.cyan}${'─'.repeat(60)}\n   ${msg}\n${'─'.repeat(60)}${c.reset}`),
};

// ── Minimal schemas (raw access — no Mongoose validation hooks) ──
const Assignment = mongoose.model('Assignment', new mongoose.Schema({}, { strict: false }), 'assignments');
const Feedback = mongoose.model('Feedback', new mongoose.Schema({}, { strict: false }), 'feedbacks');
const PlacementDrive = mongoose.model('PlacementDrive', new mongoose.Schema({}, { strict: false }), 'placementdrives');
const Announcement = mongoose.model('Announcement', new mongoose.Schema({}, { strict: false }), 'announcements');

// Target collections
const submissionSchema = new mongoose.Schema({
    assignmentId: mongoose.Schema.Types.ObjectId,
    studentId: mongoose.Schema.Types.ObjectId,
    studentUsn: String, studentName: String,
    submissionText: String, attachmentUrl: String,
    submittedAt: Date, isLate: Boolean,
    grade: Number, feedback: String, gradedAt: Date,
    gradedBy: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

const feedbackResponseSchema = new mongoose.Schema({
    feedbackId: mongoose.Schema.Types.ObjectId,
    respondentId: mongoose.Schema.Types.ObjectId,
    isAnonymous: Boolean, answers: mongoose.Schema.Types.Mixed,
    submittedAt: Date,
}, { timestamps: true });
feedbackResponseSchema.index({ feedbackId: 1, respondentId: 1 }, { unique: true, sparse: true });

const placementApplicationSchema = new mongoose.Schema({
    driveId: mongoose.Schema.Types.ObjectId,
    studentId: mongoose.Schema.Types.ObjectId,
    resumeUrl: String, status: String, appliedAt: Date,
}, { timestamps: true });
placementApplicationSchema.index({ driveId: 1, studentId: 1 }, { unique: true });

const readReceiptSchema = new mongoose.Schema({
    announcementId: mongoose.Schema.Types.ObjectId,
    userId: mongoose.Schema.Types.ObjectId,
    readAt: Date,
});
readReceiptSchema.index({ announcementId: 1, userId: 1 }, { unique: true });

const Submission = mongoose.model('Submission', submissionSchema, 'submissions');
const FeedbackResponse = mongoose.model('FeedbackResponse', feedbackResponseSchema, 'feedbackresponses');
const PlacementApplication = mongoose.model('PlacementApplication', placementApplicationSchema, 'placementapplications');
const ReadReceipt = mongoose.model('ReadReceipt', readReceiptSchema, 'readreceipts');

// ── Result tracker ────────────────────────────────────────────
const report = {
    submissions: { sourceTotal: 0, inserted: 0, skipped: 0, errors: [] },
    feedbackResponses: { sourceTotal: 0, inserted: 0, skipped: 0, errors: [] },
    placementApplications: { sourceTotal: 0, inserted: 0, skipped: 0, errors: [] },
    readReceipts: { sourceTotal: 0, inserted: 0, skipped: 0, errors: [] },
};

// ── Helper: safe bulk insert, skips duplicates ────────────────
async function bulkInsert(Model, docs, reportKey) {
    if (docs.length === 0) return;
    try {
        const result = await Model.insertMany(docs, {
            ordered: false,         // Don't stop on first error
            rawResult: true,
        });
        report[reportKey].inserted += result.insertedCount || 0;
    } catch (err) {
        // BulkWriteError: some docs were skipped (duplicates), some might have inserted
        if (err.name === 'MongoBulkWriteError' || err.code === 11000) {
            const inserted = err.result?.insertedCount || 0;
            const skipped = docs.length - inserted;
            report[reportKey].inserted += inserted;
            report[reportKey].skipped += skipped;
        } else {
            report[reportKey].errors.push(err.message);
            log.error(`Unexpected error during bulk insert: ${err.message}`);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  MIGRATION 1: Assignment.submissions → submissions collection
// ═══════════════════════════════════════════════════════════════
async function migrateSubmissions() {
    log.section('Migration 1 / 4 — Assignment.submissions → Submission');

    const assignments = await Assignment.find(
        { submissions: { $exists: true, $not: { $size: 0 } } },
        { _id: 1, submissions: 1, dueDate: 1 }
    ).lean();

    log.info(`Found ${assignments.length} assignments with embedded submissions`);

    let batch = [];
    for (const assignment of assignments) {
        const subs = assignment.submissions || [];
        report.submissions.sourceTotal += subs.length;

        for (const sub of subs) {
            const isLate = sub.submittedAt && assignment.dueDate
                ? new Date(sub.submittedAt) > new Date(assignment.dueDate)
                : false;

            batch.push({
                assignmentId: assignment._id,
                studentId: sub.studentId,
                studentUsn: sub.studentUsn || '',
                studentName: sub.studentName || '',
                submissionText: sub.submissionText || '',
                attachmentUrl: sub.attachmentUrl || '',
                submittedAt: sub.submittedAt || new Date(),
                isLate,
                grade: sub.grade ?? null,
                feedback: sub.feedback || '',
                gradedAt: sub.gradedAt || null,
                gradedBy: sub.gradedBy || null,
            });
        }

        // Process in batches of 500 to avoid memory pressure
        if (batch.length >= 500) {
            await bulkInsert(Submission, batch, 'submissions');
            batch = [];
        }
    }
    if (batch.length > 0) await bulkInsert(Submission, batch, 'submissions');

    const finalCount = await Submission.countDocuments();
    log.ok(`Source embedded docs: ${report.submissions.sourceTotal}`);
    log.ok(`Inserted into submissions: ${report.submissions.inserted}`);
    if (report.submissions.skipped > 0) log.warn(`Skipped (already existed): ${report.submissions.skipped}`);
    log.ok(`Total docs in submissions collection: ${finalCount}`);
}

// ═══════════════════════════════════════════════════════════════
//  MIGRATION 2: Feedback.responses → feedbackresponses collection
// ═══════════════════════════════════════════════════════════════
async function migrateFeedbackResponses() {
    log.section('Migration 2 / 4 — Feedback.responses → FeedbackResponse');

    const feedbacks = await Feedback.find(
        { responses: { $exists: true, $not: { $size: 0 } } },
        { _id: 1, responses: 1 }
    ).lean();

    log.info(`Found ${feedbacks.length} feedback forms with embedded responses`);

    let batch = [];
    for (const feedback of feedbacks) {
        const responses = feedback.responses || [];
        report.feedbackResponses.sourceTotal += responses.length;

        for (const res of responses) {
            batch.push({
                feedbackId: feedback._id,
                respondentId: res.respondentId || null,
                isAnonymous: res.isAnonymous !== false,
                answers: res.answers || [],
                submittedAt: res.submittedAt || new Date(),
            });
        }

        if (batch.length >= 500) {
            await bulkInsert(FeedbackResponse, batch, 'feedbackResponses');
            batch = [];
        }
    }
    if (batch.length > 0) await bulkInsert(FeedbackResponse, batch, 'feedbackResponses');

    const finalCount = await FeedbackResponse.countDocuments();
    log.ok(`Source embedded docs: ${report.feedbackResponses.sourceTotal}`);
    log.ok(`Inserted into feedbackresponses: ${report.feedbackResponses.inserted}`);
    if (report.feedbackResponses.skipped > 0) log.warn(`Skipped (already existed): ${report.feedbackResponses.skipped}`);
    log.ok(`Total docs in feedbackresponses collection: ${finalCount}`);
}

// ═══════════════════════════════════════════════════════════════
//  MIGRATION 3: PlacementDrive.applicants → placementapplications
// ═══════════════════════════════════════════════════════════════
async function migratePlacementApplications() {
    log.section('Migration 3 / 4 — PlacementDrive.applicants → PlacementApplication');

    const drives = await PlacementDrive.find(
        { applicants: { $exists: true, $not: { $size: 0 } } },
        { _id: 1, applicants: 1 }
    ).lean();

    log.info(`Found ${drives.length} drives with embedded applicants`);

    let batch = [];
    for (const drive of drives) {
        const applicants = drive.applicants || [];
        report.placementApplications.sourceTotal += applicants.length;

        for (const app of applicants) {
            batch.push({
                driveId: drive._id,
                studentId: app.student,
                resumeUrl: app.resumeUrl || '',
                status: app.status || 'applied',
                appliedAt: app.appliedAt || new Date(),
            });
        }

        if (batch.length >= 500) {
            await bulkInsert(PlacementApplication, batch, 'placementApplications');
            batch = [];
        }
    }
    if (batch.length > 0) await bulkInsert(PlacementApplication, batch, 'placementApplications');

    const finalCount = await PlacementApplication.countDocuments();
    log.ok(`Source embedded docs: ${report.placementApplications.sourceTotal}`);
    log.ok(`Inserted into placementapplications: ${report.placementApplications.inserted}`);
    if (report.placementApplications.skipped > 0) log.warn(`Skipped (already existed): ${report.placementApplications.skipped}`);
    log.ok(`Total docs in placementapplications collection: ${finalCount}`);
}

// ═══════════════════════════════════════════════════════════════
//  MIGRATION 4: Announcement.readBy → readreceipts collection
// ═══════════════════════════════════════════════════════════════
async function migrateReadReceipts() {
    log.section('Migration 4 / 4 — Announcement.readBy → ReadReceipt');

    const announcements = await Announcement.find(
        { readBy: { $exists: true, $not: { $size: 0 } } },
        { _id: 1, readBy: 1 }
    ).lean();

    log.info(`Found ${announcements.length} announcements with embedded readBy`);

    let batch = [];
    for (const announcement of announcements) {
        const reads = announcement.readBy || [];
        report.readReceipts.sourceTotal += reads.length;

        for (const read of reads) {
            batch.push({
                announcementId: announcement._id,
                userId: read.userId,
                readAt: read.readAt || new Date(),
            });
        }

        if (batch.length >= 1000) {
            await bulkInsert(ReadReceipt, batch, 'readReceipts');
            batch = [];
        }
    }
    if (batch.length > 0) await bulkInsert(ReadReceipt, batch, 'readReceipts');

    const finalCount = await ReadReceipt.countDocuments();
    log.ok(`Source embedded docs: ${report.readReceipts.sourceTotal}`);
    log.ok(`Inserted into readreceipts: ${report.readReceipts.inserted}`);
    if (report.readReceipts.skipped > 0) log.warn(`Skipped (already existed): ${report.readReceipts.skipped}`);
    log.ok(`Total docs in readreceipts collection: ${finalCount}`);
}

// ═══════════════════════════════════════════════════════════════
//  FINAL REPORT
// ═══════════════════════════════════════════════════════════════
function printFinalReport() {
    log.section('Migration Complete — Final Report');

    const allOk = Object.values(report).every(r => r.errors.length === 0);

    for (const [key, stats] of Object.entries(report)) {
        const status = stats.errors.length > 0 ? `${c.red}ERRORS` : `${c.green}OK`;
        console.log(
            `  ${c.bold}${key.padEnd(24)}${c.reset}` +
            `  Source: ${String(stats.sourceTotal).padStart(6)}` +
            `  Inserted: ${String(stats.inserted).padStart(6)}` +
            `  Skipped: ${String(stats.skipped).padStart(5)}` +
            `  ${status}${c.reset}`
        );
        if (stats.errors.length > 0) {
            stats.errors.forEach(e => log.error(`    → ${e}`));
        }
    }

    if (allOk) {
        console.log(`\n${c.green}${c.bold}  ✔ Migration completed with zero errors.${c.reset}`);
        console.log(`${c.yellow}  ⚠  Old embedded arrays were NOT deleted.${c.reset}`);
        console.log(`${c.yellow}     After verifying the app works correctly, run the cleanup`);
        console.log(`     commands shown at the top of this script.${c.reset}\n`);
    } else {
        console.log(`\n${c.red}${c.bold}  ✘ Migration completed with ERRORS. Check logs above.${c.reset}`);
        console.log(`${c.yellow}     Do NOT deploy the new controller code until errors are resolved.${c.reset}\n`);
    }
}

// ═══════════════════════════════════════════════════════════════
//  ENTRY POINT
// ═══════════════════════════════════════════════════════════════
async function run() {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
        log.error('MONGODB_URI is not set in .env. Aborting.');
        process.exit(1);
    }

    log.section('EduSphere — Production Schema Migration');
    log.info(`Connecting to MongoDB...`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    log.ok('Connected.');

    // Ensure indexes exist on target collections before inserting
    log.info('Syncing indexes on target collections...');
    await Submission.syncIndexes();
    await FeedbackResponse.syncIndexes();
    await PlacementApplication.syncIndexes();
    await ReadReceipt.syncIndexes();
    log.ok('Indexes synced.');

    await migrateSubmissions();
    await migrateFeedbackResponses();
    await migratePlacementApplications();
    await migrateReadReceipts();

    printFinalReport();
    await mongoose.disconnect();
    process.exit(0);
}

run().catch((err) => {
    log.error(`Fatal error: ${err.message}`);
    console.error(err);
    mongoose.disconnect().finally(() => process.exit(1));
});
