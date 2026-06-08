-- Add AI-generated professional program content to voice notes
-- Run in Supabase SQL Editor after 001–005

ALTER TABLE voice_notes
  ADD COLUMN IF NOT EXISTS generated_content text;

CREATE INDEX IF NOT EXISTS idx_voice_notes_status ON voice_notes(user_id, processing_status);
