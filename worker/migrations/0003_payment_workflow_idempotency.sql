CREATE UNIQUE INDEX workflow_events_workflow_type_idx
  ON workflow_events(workflow_id, event_type);
