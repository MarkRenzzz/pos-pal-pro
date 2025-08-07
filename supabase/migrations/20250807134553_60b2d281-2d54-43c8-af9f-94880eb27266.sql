-- Fix function search path security issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'cashier'
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  order_num TEXT;
BEGIN
  order_num := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_sequence')::TEXT, 4, '0');
  RETURN order_num;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.log_activity(
  action_type TEXT,
  description_text TEXT,
  metadata_json JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (user_id, action, description, metadata)
  VALUES (auth.uid(), action_type, description_text, metadata_json)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;