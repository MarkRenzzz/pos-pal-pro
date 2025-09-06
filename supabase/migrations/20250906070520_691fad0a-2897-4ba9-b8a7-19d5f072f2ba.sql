-- Add customer-facing order fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'takeout';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- Create order actions table for management actions
CREATE TABLE IF NOT EXISTS order_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- approve, cancel, refund, void, discount
  action_by UUID REFERENCES profiles(user_id),
  amount DECIMAL(10,2),
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create order discounts table
CREATE TABLE IF NOT EXISTS order_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL, -- percentage, fixed, senior, promotional
  discount_value DECIMAL(10,2),
  discount_amount DECIMAL(10,2),
  applied_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE order_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_discounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for order_actions
CREATE POLICY "Authenticated users can manage order actions" 
ON order_actions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create RLS policies for order_discounts  
CREATE POLICY "Authenticated users can manage order discounts" 
ON order_discounts 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Update orders table to allow public inserts for customer orders
CREATE POLICY "Public can create orders" 
ON orders 
FOR INSERT 
WITH CHECK (true);

-- Allow public to read menu items and categories for customer ordering
CREATE POLICY "Public can view menu items" 
ON menu_items 
FOR SELECT 
USING (true);

CREATE POLICY "Public can view categories" 
ON categories 
FOR SELECT 
USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_time ON orders(pickup_time);
CREATE INDEX IF NOT EXISTS idx_order_actions_order_id ON order_actions(order_id);
CREATE INDEX IF NOT EXISTS idx_order_discounts_order_id ON order_discounts(order_id);