-- Add service type to invoices (what the invoice is for)
-- Run in Supabase SQL Editor after 004

CREATE TYPE invoice_service_type AS ENUM (
  'flight',
  'hotel',
  'ferry',
  'car_rental',
  'travel_insurance',
  'cruise',
  'travel_package',
  'other'
);

ALTER TABLE invoices
  ADD COLUMN service_type invoice_service_type;

CREATE INDEX idx_invoices_service_type ON invoices(user_id, service_type);
