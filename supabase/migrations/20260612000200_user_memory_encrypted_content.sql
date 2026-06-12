-- Phase 0 / ITEM 3: user_memory was missing the encrypted_content column.
-- memory-crud's encryption path was dead code (never called, so never caught), and
-- ITEM 3 wired BOTH memory-crud and extract-user-context to write encrypted_content +
-- encryption_version. Without these columns every encrypted memory write 500s (manual
-- add AND voice/text capture). Additive + idempotent. Applied to prod 2026-06-12.
alter table user_memory add column if not exists encrypted_content text;
alter table user_memory add column if not exists encryption_version integer default 1;
