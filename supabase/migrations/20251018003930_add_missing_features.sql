/*
  # Add Missing Features to Schema

  1. Changes to customers table
    - Add insurance jsonb field for insurance details
    - Add pickup_note jsonb field for pickup notes

  2. New Tables
    - `staff_alerts`
      - `id` (uuid, primary key)
      - `type` (text, alert type)
      - `customer_id` (uuid, reference to customer)
      - `details` (text, alert details)
      - `seen` (boolean, whether alert has been handled)
      - `date` (timestamptz, alert date)

  3. Security
    - Enable RLS on staff_alerts table
    - Add policies for authenticated users
*/

-- Add new fields to customers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'insurance'
  ) THEN
    ALTER TABLE customers ADD COLUMN insurance jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'pickup_note'
  ) THEN
    ALTER TABLE customers ADD COLUMN pickup_note jsonb;
  END IF;
END $$;

-- Create staff_alerts table
CREATE TABLE IF NOT EXISTS staff_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  customer_id uuid REFERENCES customers(id),
  details text,
  seen boolean DEFAULT false,
  date timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE staff_alerts ENABLE ROW LEVEL SECURITY;

-- Staff alerts policies (authenticated users only)
CREATE POLICY "Authenticated users can view alerts"
  ON staff_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert alerts"
  ON staff_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update alerts"
  ON staff_alerts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_staff_alerts_date ON staff_alerts(date DESC);
CREATE INDEX IF NOT EXISTS idx_staff_alerts_seen ON staff_alerts(seen);
