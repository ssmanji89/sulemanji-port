CREATE TABLE agent_jobs (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id),
  workflow_id TEXT NOT NULL,
  source_message_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL,
  input_json TEXT NOT NULL,
  result_json TEXT,
  error_text TEXT,
  created_at TEXT NOT NULL,
  claimed_at TEXT,
  completed_at TEXT
);

CREATE UNIQUE INDEX agent_jobs_case_message_type_idx
  ON agent_jobs(case_id, source_message_id, job_type);

CREATE INDEX agent_jobs_status_created_idx
  ON agent_jobs(status, created_at);

CREATE INDEX agent_jobs_workflow_idx
  ON agent_jobs(workflow_id);
