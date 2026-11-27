ALTER TABLE publication_effects ADD COLUMN merge_admission_date TEXT;
ALTER TABLE publication_effects ADD COLUMN merge_settled_date TEXT;
ALTER TABLE publication_effects ADD COLUMN new_articles INTEGER NOT NULL DEFAULT 0 CHECK (new_articles >= 0);
ALTER TABLE publication_effects ADD COLUMN refreshes INTEGER NOT NULL DEFAULT 0 CHECK (refreshes >= 0);

CREATE INDEX publication_capacity_by_day ON publication_effects(merge_admission_date, merge_settled_date)
WHERE merge_admission_date IS NOT NULL;
