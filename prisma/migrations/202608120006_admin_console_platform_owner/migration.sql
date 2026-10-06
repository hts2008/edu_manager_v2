-- Preserve all existing privileges. Owner approval belongs to the operator:
-- bootstrap requires an immutable approved owner ID, or explicit fresh approval.
BEGIN;

SELECT pg_advisory_xact_lock(hashtext('edu_manager:platform-owner:v1'));

COMMIT;
