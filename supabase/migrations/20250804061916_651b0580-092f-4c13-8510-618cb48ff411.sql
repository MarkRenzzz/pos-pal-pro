-- Fix foreign key constraint issue by ensuring profiles table has proper constraints
-- and create a trigger to automatically create profiles for new users

-- Add foreign key constraint to orders table referencing profiles
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_cashier_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_cashier_id_fkey 
  FOREIGN KEY (cashier_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Create trigger to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
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

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create profiles for existing users who don't have one
INSERT INTO public.profiles (user_id, full_name, role)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email, 'User'),
  'cashier'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL;

-- Update RLS policies for profiles to allow users to see all profiles (needed for staff management)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view all profiles" 
  ON public.profiles FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to update any profile (for role management)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update any profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Ensure menu_items have proper foreign key
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;
ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_category_id_fkey 
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;

-- Ensure order_items have proper foreign keys
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey 
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS order_items_menu_item_id_fkey;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_menu_item_id_fkey 
  FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE RESTRICT;