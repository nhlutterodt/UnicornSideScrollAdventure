-- Family Space SQLite foundation v1 (development only)
-- No existing business database is used. Convert this migration explicitly for PostgreSQL.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS family_schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS family_questions (
  id TEXT PRIMARY KEY,
  current_revision INTEGER NOT NULL DEFAULT 1 CHECK(current_revision > 0),
  subject TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS family_question_versions (
  question_id TEXT NOT NULL REFERENCES family_questions(id) ON DELETE RESTRICT,
  revision INTEGER NOT NULL CHECK(revision > 0),
  document_json TEXT NOT NULL CHECK(json_valid(document_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(question_id,revision)
);
CREATE TABLE IF NOT EXISTS family_assignments (
  id TEXT PRIMARY KEY,
  current_revision INTEGER NOT NULL DEFAULT 1 CHECK(current_revision > 0),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS family_assignment_versions (
  assignment_id TEXT NOT NULL REFERENCES family_assignments(id) ON DELETE RESTRICT,
  revision INTEGER NOT NULL CHECK(revision > 0),
  document_json TEXT NOT NULL CHECK(json_valid(document_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(assignment_id,revision)
);
-- Submissions are recorded against an immutable assignment revision.
CREATE TABLE IF NOT EXISTS family_attempts (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  assignment_revision INTEGER NOT NULL,
  development_learner_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted')),
  answers_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(answers_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TEXT,
  FOREIGN KEY(assignment_id,assignment_revision)
    REFERENCES family_assignment_versions(assignment_id,revision) ON DELETE RESTRICT,
  CHECK((status='draft' AND submitted_at IS NULL) OR
        (status='submitted' AND submitted_at IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS family_evaluations (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL UNIQUE REFERENCES family_attempts(id) ON DELETE RESTRICT,
  review_status TEXT NOT NULL CHECK(review_status IN ('pending','manual_review','reviewed')),
  feedback_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(feedback_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_family_attempts_learner ON family_attempts(development_learner_id,status);
-- Published revisions and submitted attempts must be immutable even in development.
CREATE TRIGGER IF NOT EXISTS family_question_versions_no_update BEFORE UPDATE ON family_question_versions BEGIN SELECT RAISE(ABORT,'question revisions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS family_question_versions_no_delete BEFORE DELETE ON family_question_versions BEGIN SELECT RAISE(ABORT,'question revisions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS family_assignment_versions_no_update BEFORE UPDATE ON family_assignment_versions BEGIN SELECT RAISE(ABORT,'assignment revisions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS family_assignment_versions_no_delete BEFORE DELETE ON family_assignment_versions BEGIN SELECT RAISE(ABORT,'assignment revisions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS family_attempts_no_submitted_update BEFORE UPDATE ON family_attempts WHEN OLD.status='submitted' BEGIN SELECT RAISE(ABORT,'submitted attempts are immutable'); END;
CREATE TRIGGER IF NOT EXISTS family_attempts_no_submitted_delete BEFORE DELETE ON family_attempts WHEN OLD.status='submitted' BEGIN SELECT RAISE(ABORT,'submitted attempts are immutable'); END;
INSERT OR IGNORE INTO family_schema_migrations(version) VALUES (1);
