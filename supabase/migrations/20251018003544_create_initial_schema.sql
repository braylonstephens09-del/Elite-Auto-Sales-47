/*
  # Elite Auto Sales Initial Schema

  1. New Tables
    - `vehicles`
      - `id` (uuid, primary key)
      - `make` (text, vehicle manufacturer)
      - `model` (text, vehicle model)
      - `year` (integer, year of manufacture)
      - `price` (numeric, retail price)
      - `down_payment` (numeric, required down payment)
      - `seats` (integer, number of seats)
      - `image_url` (text, primary vehicle image)
      - `maintenance` (text, maintenance history)
      - `sold` (boolean, sale status)
      - `created_at` (timestamptz, creation timestamp)

    - `customers`
      - `id` (uuid, primary key)
      - `name` (text, customer name)
      - `email` (text, customer email)
      - `phone` (text, customer phone)
      - `vehicle_id` (uuid, reference to purchased vehicle)
      - `balance_remaining` (numeric, remaining balance)
      - `payment_plan` (text, payment schedule)
      - `next_payment_due` (date, next payment date)
      - `created_at` (timestamptz, creation timestamp)

    - `payments`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, reference to customer)
      - `vehicle_id` (uuid, reference to vehicle)
      - `amount` (numeric, payment amount)
      - `method` (text, payment method)
      - `notes` (text, additional notes)
      - `timestamp` (timestamptz, payment timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Public read access for vehicles table
*/

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make text NOT NULL,
  model text NOT NULL,
  year integer,
  price numeric NOT NULL,
  down_payment numeric DEFAULT 0,
  seats integer,
  image_url text,
  maintenance text,
  sold boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  vehicle_id uuid REFERENCES vehicles(id),
  balance_remaining numeric DEFAULT 0,
  payment_plan text DEFAULT 'semi-monthly',
  next_payment_due date,
  created_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  vehicle_id uuid REFERENCES vehicles(id),
  amount numeric NOT NULL,
  method text NOT NULL,
  notes text,
  timestamp timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Vehicles policies (public can view available vehicles)
CREATE POLICY "Anyone can view vehicles"
  ON vehicles FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicles"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Customers policies (authenticated users only)
CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Payments policies (authenticated users only)
CREATE POLICY "Authenticated users can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicles_sold ON vehicles(sold);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_vehicle_id ON customers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_timestamp ON payments(timestamp DESC);
