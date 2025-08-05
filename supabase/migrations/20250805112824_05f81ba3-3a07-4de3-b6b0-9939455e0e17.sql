-- Insert categories from the menu image
INSERT INTO public.categories (name, description) VALUES
('Chill Drinks', 'Refreshing cold beverages with fruity flavors'),
('Greenland', 'Matcha and green tea based beverages'),
('Hot Coffee', 'Traditional hot coffee beverages'),
('Cold Coffee', 'Iced and cold coffee beverages'),
('Cheesecake Series', 'Creamy cheesecake flavored beverages')
ON CONFLICT (name) DO NOTHING;

-- Clear existing menu items to update with new ones
DELETE FROM public.menu_items;

-- Get category IDs for inserting menu items
WITH category_ids AS (
  SELECT id, name FROM public.categories
)
-- Insert Chill Drinks
INSERT INTO public.menu_items (name, description, price, category_id, preparation_time)
SELECT 
  'Strawberry Cocoa (16oz)', 
  'Perfect for when you want something cozy but with a fruity twist', 
  138, 
  c.id, 
  5
FROM category_ids c WHERE c.name = 'Chill Drinks'
UNION ALL
SELECT 
  'Strawberry Cocoa (22oz)', 
  'Perfect for when you want something cozy but with a fruity twist', 
  158, 
  c.id, 
  5
FROM category_ids c WHERE c.name = 'Chill Drinks'
UNION ALL
SELECT 
  'Blue Ocean Deep (16oz)', 
  'Perfect for a fun, beachy vibe. The soda gives the refreshing taste', 
  128, 
  c.id, 
  5
FROM category_ids c WHERE c.name = 'Chill Drinks'
UNION ALL
SELECT 
  'Blue Ocean Deep (22oz)', 
  'Perfect for a fun, beachy vibe. The soda gives the refreshing taste', 
  148, 
  c.id, 
  5
FROM category_ids c WHERE c.name = 'Chill Drinks'
UNION ALL
SELECT 
  'Green Lagoon (16oz)', 
  'When mixed with soda, it''s like biting into a juicy green apple', 
  128, 
  c.id, 
  5
FROM category_ids c WHERE c.name = 'Chill Drinks'
UNION ALL
SELECT 
  'Green Lagoon (22oz)', 
  'When mixed with soda, it''s like biting into a juicy green apple', 
  148, 
  c.id, 
  5
FROM category_ids c WHERE c.name = 'Chill Drinks'
UNION ALL
SELECT 
  'Wild Berry Creek (16oz)', 
  'Blueberry soda is a fizzy, sweet drink bursting with the bold flavor of ripe blueberries', 
  128, 
  c.id, 
  5
FROM category_ids c WHERE c.name = 'Chill Drinks'
UNION ALL
SELECT 
  'Wild Berry Creek (22oz)', 
  'Blueberry soda is a fizzy, sweet drink bursting with the bold flavor of ripe blueberries', 
  148, 
  c.id, 
  5
FROM category_ids c WHERE c.name = 'Chill Drinks'
UNION ALL
SELECT 
  'Cold Choco (16oz)', 
  'Cold chocolate is a smooth, chilled drink with a rich and creamy chocolate flavor', 
  128, 
  c.id, 
  5
FROM category_ids c WHERE c.name = 'Chill Drinks'
UNION ALL
SELECT 
  'Cold Choco (22oz)', 
  'Cold chocolate is a smooth, chilled drink with a rich and creamy chocolate flavor', 
  148, 
  c.id, 
  5
FROM category_ids c WHERE c.name = 'Chill Drinks'
UNION ALL
-- Insert Greenland items
SELECT 
  'Creamy Matcha Oatmilk (16oz)', 
  'Combines the earthy, slightly bitter notes of matcha with the creamy, slightly nutty flavor of oat milk', 
  128, 
  c.id, 
  6
FROM category_ids c WHERE c.name = 'Greenland'
UNION ALL
SELECT 
  'Creamy Matcha Oatmilk (22oz)', 
  'Combines the earthy, slightly bitter notes of matcha with the creamy, slightly nutty flavor of oat milk', 
  158, 
  c.id, 
  6
FROM category_ids c WHERE c.name = 'Greenland'
UNION ALL
SELECT 
  'Creamy Matcha Freshmilk (16oz)', 
  'The matcha provides a bold, grassy flavor while the fresh milk adds a silky smooth quality', 
  128, 
  c.id, 
  6
FROM category_ids c WHERE c.name = 'Greenland'
UNION ALL
SELECT 
  'Creamy Matcha Freshmilk (22oz)', 
  'The matcha provides a bold, grassy flavor while the fresh milk adds a silky smooth quality', 
  158, 
  c.id, 
  6
FROM category_ids c WHERE c.name = 'Greenland'
UNION ALL
SELECT 
  'Strawberry Matcha (16oz)', 
  'A refreshing blend of earthy green tea and sweet, juicy strawberries', 
  128, 
  c.id, 
  6
FROM category_ids c WHERE c.name = 'Greenland'
UNION ALL
SELECT 
  'Strawberry Matcha (22oz)', 
  'A refreshing blend of earthy green tea and sweet, juicy strawberries', 
  158, 
  c.id, 
  6
FROM category_ids c WHERE c.name = 'Greenland'
UNION ALL
-- Insert Hot Coffee items
SELECT 
  'Hot Latte', 
  'The chocolatey sweetness is balanced by the creaminess of the milk, making it a classic treat for chocolate lovers', 
  108, 
  c.id, 
  8
FROM category_ids c WHERE c.name = 'Hot Coffee'
UNION ALL
SELECT 
  'Hot Choco', 
  'Smooth and creamy, with a balance of bold espresso and frothy milk', 
  108, 
  c.id, 
  8
FROM category_ids c WHERE c.name = 'Hot Coffee'
UNION ALL
SELECT 
  'Hot Matcha', 
  'It''s creamy when made with milk, with a subtle sweetness balancing the matcha''s natural bitterness', 
  108, 
  c.id, 
  8
FROM category_ids c WHERE c.name = 'Hot Coffee'
UNION ALL
SELECT 
  'Hot Spanish Latte', 
  'The espresso adds a bold coffee kick, while the condensed milk brings a thick, sugary sweetness', 
  108, 
  c.id, 
  8
FROM category_ids c WHERE c.name = 'Hot Coffee'
UNION ALL
SELECT 
  'Hot Mocha', 
  'The espresso adds a bold coffee kick, while the white choco brings a thick, sugary sweetness', 
  108, 
  c.id, 
  8
FROM category_ids c WHERE c.name = 'Hot Coffee'
UNION ALL
SELECT 
  'Hot Americano', 
  'The espresso adds a bold coffee kick, while the warm water gives you comfort', 
  108, 
  c.id, 
  8
FROM category_ids c WHERE c.name = 'Hot Coffee'
UNION ALL
-- Insert Cold Coffee items
SELECT 
  'Tiramisu Latte (16oz)', 
  'This latte is creamy with a rich coffee flavor, reminiscent of the classic Italian dessert', 
  138, 
  c.id, 
  7
FROM category_ids c WHERE c.name = 'Cold Coffee'
UNION ALL
SELECT 
  'Tiramisu Latte (22oz)', 
  'This latte is creamy with a rich coffee flavor, reminiscent of the classic Italian dessert', 
  158, 
  c.id, 
  7
FROM category_ids c WHERE c.name = 'Cold Coffee'
UNION ALL
SELECT 
  'Spanish Latte (16oz)', 
  'Sugary sweet richness that pairs well with the strong espresso, it''s indulgent and smooth, with a silky texture', 
  128, 
  c.id, 
  7
FROM category_ids c WHERE c.name = 'Cold Coffee'
UNION ALL
SELECT 
  'Spanish Latte (22oz)', 
  'Sugary sweet richness that pairs well with the strong espresso, it''s indulgent and smooth, with a silky texture', 
  148, 
  c.id, 
  7
FROM category_ids c WHERE c.name = 'Cold Coffee'
UNION ALL
SELECT 
  'Dark Latte (16oz)', 
  'It''s a great choice for those who prefer a more pronounced coffee flavor with a chocolatey kick', 
  138, 
  c.id, 
  7
FROM category_ids c WHERE c.name = 'Cold Coffee'
UNION ALL
SELECT 
  'Dark Latte (22oz)', 
  'It''s a great choice for those who prefer a more pronounced coffee flavor with a chocolatey kick', 
  158, 
  c.id, 
  7
FROM category_ids c WHERE c.name = 'Cold Coffee'
UNION ALL
SELECT 
  'Salted Caramel Latte (16oz)', 
  'A delightful blend of sweet and salty flavors. This latte has a buttery caramel taste, creating a perfect balance', 
  138, 
  c.id, 
  7
FROM category_ids c WHERE c.name = 'Cold Coffee'
UNION ALL
SELECT 
  'Salted Caramel Latte (22oz)', 
  'A delightful blend of sweet and salty flavors. This latte has a buttery caramel taste, creating a perfect balance', 
  158, 
  c.id, 
  7
FROM category_ids c WHERE c.name = 'Cold Coffee'
UNION ALL
SELECT 
  'Iced Americano (16oz)', 
  'The cold water dilutes the espresso, making it refreshing and less acidic', 
  118, 
  c.id, 
  6
FROM category_ids c WHERE c.name = 'Cold Coffee'
UNION ALL
SELECT 
  'Iced Americano (22oz)', 
  'The cold water dilutes the espresso, making it refreshing and less acidic', 
  128, 
  c.id, 
  6
FROM category_ids c WHERE c.name = 'Cold Coffee'
UNION ALL
SELECT 
  'Lotus Biscoff Latte (16oz)', 
  'Biscoff cookies with the robust taste of espresso', 
  158, 
  c.id, 
  7
FROM category_ids c WHERE c.name = 'Cold Coffee'
UNION ALL
SELECT 
  'Lotus Biscoff Latte (22oz)', 
  'Biscoff cookies with the robust taste of espresso', 
  178, 
  c.id, 
  7
FROM category_ids c WHERE c.name = 'Cold Coffee'
UNION ALL
SELECT 
  'White Mocha Latte (16oz)', 
  'The white mocha latte is sweet and creamy, with a smooth, velvety texture', 
  138, 
  c.id, 
  7
FROM category_ids c WHERE c.name = 'Cold Coffee'
UNION ALL
SELECT 
  'White Mocha Latte (22oz)', 
  'The white mocha latte is sweet and creamy, with a smooth, velvety texture', 
  158, 
  c.id, 
  7
FROM category_ids c WHERE c.name = 'Cold Coffee'
UNION ALL
SELECT 
  'Cinnamon Latte (16oz)', 
  'It''s warmly comforting with a warm and comforting drink to curl up. This drink is the best', 
  138, 
  c.id, 
  7
FROM category_ids c WHERE c.name = 'Cold Coffee'
UNION ALL
SELECT 
  'Cinnamon Latte (22oz)', 
  'It''s warmly comforting with a warm and comforting drink to curl up. This drink is the best', 
  158, 
  c.id, 
  7
FROM category_ids c WHERE c.name = 'Cold Coffee'
UNION ALL
-- Insert Cheesecake Series items
SELECT 
  'Nutella Cheesecake (16oz)', 
  'Creamy texture with a luscious chocolate-hazelnut flavor from the Nutella, combined with a hint of tangy cream cheese', 
  148, 
  c.id, 
  8
FROM category_ids c WHERE c.name = 'Cheesecake Series'
UNION ALL
SELECT 
  'Nutella Cheesecake (22oz)', 
  'Creamy texture with a luscious chocolate-hazelnut flavor from the Nutella, combined with a hint of tangy cream cheese', 
  168, 
  c.id, 
  8
FROM category_ids c WHERE c.name = 'Cheesecake Series'
UNION ALL
SELECT 
  'Blueberry Cheesecake (16oz)', 
  'Sweet, creamy, milky, and fruity taste with a bit of sourness and cheesy kick', 
  148, 
  c.id, 
  8
FROM category_ids c WHERE c.name = 'Cheesecake Series'
UNION ALL
SELECT 
  'Blueberry Cheesecake (22oz)', 
  'Sweet, creamy, milky, and fruity taste with a bit of sourness and cheesy kick', 
  168, 
  c.id, 
  8
FROM category_ids c WHERE c.name = 'Cheesecake Series'
UNION ALL
SELECT 
  'Strawberry Cheesecake (16oz)', 
  'Sweet, creamy, milky and fruity taste with a bit of cheesy kick taste', 
  148, 
  c.id, 
  8
FROM category_ids c WHERE c.name = 'Cheesecake Series'
UNION ALL
SELECT 
  'Strawberry Cheesecake (22oz)', 
  'Sweet, creamy, milky and fruity taste with a bit of cheesy kick taste', 
  168, 
  c.id, 
  8
FROM category_ids c WHERE c.name = 'Cheesecake Series'
UNION ALL
SELECT 
  'Ube Cheesecake (16oz)', 
  'Rich and creamy with a hint of purple yam and cheesecake flavors in a sweet, indulgent beverage', 
  148, 
  c.id, 
  8
FROM category_ids c WHERE c.name = 'Cheesecake Series'
UNION ALL
SELECT 
  'Ube Cheesecake (22oz)', 
  'Rich and creamy with a hint of purple yam and cheesecake flavors in a sweet, indulgent beverage', 
  168, 
  c.id, 
  8
FROM category_ids c WHERE c.name = 'Cheesecake Series';

-- Create an activity_logs table to track recent activities for the dashboard
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(user_id),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for activity_logs
CREATE POLICY "Authenticated users can view and insert activity logs" 
  ON public.activity_logs FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Create function to log activities
CREATE OR REPLACE FUNCTION public.log_activity(
  p_action TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.activity_logs (action, description, user_id, metadata)
  VALUES (p_action, p_description, auth.uid(), p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to log order activities
CREATE OR REPLACE FUNCTION public.log_order_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(
      'order_created',
      'Order ' || NEW.order_number || ' created',
      jsonb_build_object('order_id', NEW.id, 'total_amount', NEW.total_amount)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      PERFORM public.log_activity(
        'order_status_changed',
        'Order ' || NEW.order_number || ' status changed to ' || NEW.status,
        jsonb_build_object('order_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for order activities
DROP TRIGGER IF EXISTS trigger_log_order_activity ON public.orders;
CREATE TRIGGER trigger_log_order_activity
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.log_order_activity();

-- Create trigger function to log menu item activities
CREATE OR REPLACE FUNCTION public.log_menu_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(
      'menu_item_added',
      'New menu item added: ' || NEW.name,
      jsonb_build_object('menu_item_id', NEW.id, 'price', NEW.price)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_activity(
      'menu_item_updated',
      'Menu item updated: ' || NEW.name,
      jsonb_build_object('menu_item_id', NEW.id)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for menu activities
DROP TRIGGER IF EXISTS trigger_log_menu_activity ON public.menu_items;
CREATE TRIGGER trigger_log_menu_activity
  AFTER INSERT OR UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.log_menu_activity();