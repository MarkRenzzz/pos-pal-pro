-- Allow anonymous customers to create order_items from the public CustomerMenu
CREATE POLICY IF NOT EXISTS "Public can create order items"
ON public.order_items
FOR INSERT
TO anon
WITH CHECK (true);