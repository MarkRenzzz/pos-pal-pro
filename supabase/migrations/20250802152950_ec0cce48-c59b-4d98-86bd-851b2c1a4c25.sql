-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  preparation_time INTEGER DEFAULT 5, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory table
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER NOT NULL DEFAULT 10,
  max_stock_level INTEGER NOT NULL DEFAULT 100,
  unit TEXT NOT NULL DEFAULT 'pieces',
  cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
  supplier TEXT,
  last_restocked TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  cashier_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales_logs table for tracking all actions
CREATE TABLE public.sales_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount DECIMAL(10,2),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create low_stock_alerts table
CREATE TABLE public.low_stock_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  alert_level TEXT NOT NULL DEFAULT 'low' CHECK (alert_level IN ('low', 'critical', 'out_of_stock')),
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all authenticated users to access POS data)
CREATE POLICY "Authenticated users can manage categories" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage menu items" ON public.menu_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage inventory" ON public.inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage order items" ON public.order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can view sales logs" ON public.sales_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can manage alerts" ON public.low_stock_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add update triggers for timestamps
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate order numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  order_num TEXT;
BEGIN
  order_num := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_sequence')::TEXT, 4, '0');
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_sequence START 1;

-- Create function to check low stock and create alerts
CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete existing alerts for this inventory item
  DELETE FROM public.low_stock_alerts WHERE inventory_id = NEW.id AND is_acknowledged = false;
  
  -- Check if stock is critically low (0)
  IF NEW.current_stock = 0 THEN
    INSERT INTO public.low_stock_alerts (inventory_id, alert_level)
    VALUES (NEW.id, 'out_of_stock');
  -- Check if stock is below minimum level
  ELSIF NEW.current_stock <= NEW.min_stock_level THEN
    INSERT INTO public.low_stock_alerts (inventory_id, alert_level)
    VALUES (NEW.id, CASE WHEN NEW.current_stock <= (NEW.min_stock_level * 0.5) THEN 'critical' ELSE 'low' END);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for low stock alerts
CREATE TRIGGER inventory_low_stock_check
  AFTER UPDATE ON public.inventory
  FOR EACH ROW
  WHEN (OLD.current_stock IS DISTINCT FROM NEW.current_stock)
  EXECUTE FUNCTION public.check_low_stock();

-- Insert sample data
INSERT INTO public.categories (name, description) VALUES
('Coffee', 'Hot and cold coffee beverages'),
('Tea', 'Various tea selections'),
('Pastries', 'Fresh baked goods'),
('Sandwiches', 'Light meals and sandwiches'),
('Beverages', 'Non-coffee drinks');

INSERT INTO public.menu_items (name, description, price, category_id, preparation_time) VALUES
('Espresso', 'Classic Italian espresso shot', 2.50, (SELECT id FROM public.categories WHERE name = 'Coffee'), 2),
('Cappuccino', 'Espresso with steamed milk and foam', 4.00, (SELECT id FROM public.categories WHERE name = 'Coffee'), 3),
('Latte', 'Smooth espresso with steamed milk', 4.50, (SELECT id FROM public.categories WHERE name = 'Coffee'), 3),
('Green Tea', 'Fresh brewed green tea', 2.00, (SELECT id FROM public.categories WHERE name = 'Tea'), 3),
('Croissant', 'Buttery French pastry', 3.00, (SELECT id FROM public.categories WHERE name = 'Pastries'), 1),
('Club Sandwich', 'Triple decker with chicken and bacon', 8.50, (SELECT id FROM public.categories WHERE name = 'Sandwiches'), 5);

INSERT INTO public.inventory (item_name, current_stock, min_stock_level, max_stock_level, unit, cost_per_unit) VALUES
('Coffee Beans', 50, 10, 100, 'kg', 15.00),
('Milk', 20, 5, 50, 'liters', 2.50),
('Sugar', 30, 5, 50, 'kg', 1.20),
('Croissants', 25, 10, 50, 'pieces', 1.50),
('Bread', 15, 5, 30, 'loaves', 2.00),
('Chicken', 8, 5, 20, 'kg', 8.00);