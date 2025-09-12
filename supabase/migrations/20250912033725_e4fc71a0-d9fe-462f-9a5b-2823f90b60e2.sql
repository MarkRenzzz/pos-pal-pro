-- Update the orders RLS policy to allow public (anonymous) users to create orders
DROP POLICY IF EXISTS "Public can create orders" ON public.orders;

CREATE POLICY "Public can create orders"
ON public.orders
FOR INSERT
TO anon
WITH CHECK (true);

-- Update the order_items RLS policy to allow public (anonymous) users to create order items  
DROP POLICY IF EXISTS "Public can create order items" ON public.order_items;

CREATE POLICY "Public can create order items"
ON public.order_items
FOR INSERT
TO anon
WITH CHECK (true);