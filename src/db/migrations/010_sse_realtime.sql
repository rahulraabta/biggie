-- SSE polls opportunities directly; stop writes to the obsolete broadcast outbox.
DROP TRIGGER IF EXISTS opportunity_insert_realtime ON opportunities;
DROP FUNCTION IF EXISTS notify_opportunity_insert();
