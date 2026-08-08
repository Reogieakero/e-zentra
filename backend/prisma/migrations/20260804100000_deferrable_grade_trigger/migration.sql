




CREATE OR REPLACE FUNCTION enforce_grade_component_weights()
RETURNS TRIGGER AS $$
DECLARE
  total numeric;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT COALESCE(SUM(weight_percentage), 0)
      INTO total
      FROM grade_components
     WHERE subject_id = NEW.subject_id AND term_id = NEW.term_id;
    IF total <> 100 THEN
      RAISE EXCEPTION 'grade component weights for subject % / term % sum to %; must equal 100',
        NEW.subject_id, NEW.term_id, total
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF TG_OP = 'DELETE'
     OR (TG_OP = 'UPDATE'
         AND (OLD.subject_id IS DISTINCT FROM NEW.subject_id
              OR OLD.term_id IS DISTINCT FROM NEW.term_id)) THEN
    SELECT COALESCE(SUM(weight_percentage), 0)
      INTO total
      FROM grade_components
     WHERE subject_id = OLD.subject_id AND term_id = OLD.term_id;
    IF total <> 100 THEN
      RAISE EXCEPTION 'grade component weights for subject % / term % sum to %; must equal 100',
        OLD.subject_id, OLD.term_id, total
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grade_component_weights ON grade_components;
CREATE CONSTRAINT TRIGGER trg_grade_component_weights
  AFTER INSERT OR UPDATE OR DELETE ON grade_components
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION enforce_grade_component_weights();
