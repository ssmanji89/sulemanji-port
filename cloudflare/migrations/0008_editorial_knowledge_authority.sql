ALTER TABLE editorial_control
  ADD COLUMN knowledge_generation INTEGER NOT NULL DEFAULT 0 CHECK(knowledge_generation >= 0);

CREATE TRIGGER editorial_knowledge_insert
AFTER INSERT ON public_knowledge
BEGIN
  UPDATE editorial_control SET knowledge_generation = knowledge_generation + 1 WHERE singleton = 1;
END;

CREATE TRIGGER editorial_knowledge_update
AFTER UPDATE ON public_knowledge
BEGIN
  UPDATE editorial_control SET knowledge_generation = knowledge_generation + 1 WHERE singleton = 1;
END;

CREATE TRIGGER editorial_knowledge_delete
AFTER DELETE ON public_knowledge
BEGIN
  UPDATE editorial_control SET knowledge_generation = knowledge_generation + 1 WHERE singleton = 1;
END;
