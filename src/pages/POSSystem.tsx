import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Plus, Minus, ShoppingCart, Printer, CreditCard, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatPHP } from "@/lib/utils";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  is_available: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface CartItem extends MenuItem {
  quantity: number;
  special_instructions?: string;
}

const POSSystem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMenuItems();
    loadCategories();
  }, []);

  const loadMenuItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("is_available", true)
      .order("name");
    
    if (error) {
      toast.error("Failed to load menu items");
    } else {
      setMenuItems(data || []);
    }
  };

  const loadCategories = async () => {
    let { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    
    if (error) {
      toast.error("Failed to load categories");
    } else {
      const hasRice = (data || []).some(c => c.name?.trim().toLowerCase() === 'rice meal');
      if (!hasRice) {
        const { data: inserted } = await supabase
          .from("categories")
          .insert({ name: "RICE MEAL", description: "Rice meal items" })
          .select()
          .single();
        if (inserted) {
          data = [...(data || []), inserted];
        }
      }
      const banned = new Set(['beverages','beverage','coffee','pastries','sandwiches','tea']);
      const filtered = (data || []).filter(c => !banned.has(c.name?.trim().toLowerCase()));
      setCategories(filtered);
    }
  };

  const addToCart = (item: MenuItem) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem.id === item.id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
    toast.success(`${item.name} added to cart`);
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCart(cart.filter(item => item.id !== itemId));
    } else {
      setCart(cart.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const updateInstructions = (itemId: string, instructions: string) => {
    setCart(cart.map(item => 
      item.id === itemId ? { ...item, special_instructions: instructions } : item
    ));
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTax = (subtotal: number) => {
    return subtotal * 0.10; // 10% tax
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    return subtotal + tax;
  };

  const processOrder = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    setLoading(true);
    try {
      const subtotal = calculateSubtotal();
      const tax = calculateTax(subtotal);
      const total = calculateTotal();

      // Generate order number
      const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}`;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          customer_name: customerName || null,
          total_amount: total,
          tax_amount: tax,
          payment_method: paymentMethod,
          status: "completed",
          cashier_id: user?.id
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        special_instructions: item.special_instructions || null
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Log the sale
      await supabase
        .from("sales_logs")
        .insert({
          action: "sale_completed",
          description: `Order ${orderNumber} completed`,
          user_id: user?.id,
          order_id: order.id,
          amount: total,
          metadata: { 
            items_count: cart.length,
            payment_method: paymentMethod,
            customer_name: customerName
          }
        });

      // Also log to activity feed
      await supabase.rpc('log_activity', {
        action_type: 'CREATE',
        description_text: `Completed sale: ${orderNumber}`,
        metadata_json: {
          order_id: order.id,
          amount: total,
          items_count: cart.length,
          payment_method: paymentMethod
        }
      });

      toast.success("Order completed successfully!");
      
      // Clear cart and reset form
      setCart([]);
      setCustomerName("");
      setPaymentMethod("cash");

      // Print receipt (would integrate with printer)
      printReceipt(order, orderItems, subtotal, tax, total);

    } catch (error) {
      console.error("Error processing order:", error);
      toast.error("Failed to process order");
    } finally {
      setLoading(false);
    }
  };

  const printReceipt = (order: any, items: any[], subtotal: number, tax: number, total: number) => {
    // This would integrate with a receipt printer
    const receiptContent = `
      ORIJINS COFFEE HOUSE
      ==================
      Order: ${order.order_number}
      Date: ${new Date().toLocaleString()}
      Cashier: ${user?.email}
      ${customerName ? `Customer: ${customerName}` : ''}
      
      Items:
      ${cart.map(item => `${item.name} x${item.quantity} - ${formatPHP(item.price * item.quantity)}`).join('\n')}
      
      ==================
      Subtotal: ${formatPHP(subtotal)}
      Tax (10%): ${formatPHP(tax)}
      Total: ${formatPHP(total)}
      Payment: ${paymentMethod.toUpperCase()}
      
      Thank you for your visit!
    `;
    
    console.log("Receipt:", receiptContent);
    // In production, this would send to thermal printer
  };

  const filteredItems = selectedCategory === "all" 
    ? menuItems 
    : menuItems.filter(item => item.category_id === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex h-16 items-center px-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Point of Sale</h1>
        </div>
      </div>

      <div className="flex">
        {/* Left Panel - Menu Items */}
        <div className="flex-1 p-6">
          {/* Category Filter */}
          <div className="mb-6">
            <Label htmlFor="category">Filter by Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <Card 
                key={item.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => addToCart(item)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {item.description}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{formatPHP(item.price)}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end">
                    <Button size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-96 border-l bg-card">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Current Order</h2>
            </div>

            {/* Customer Info */}
            <div className="space-y-4 mb-6">
              <div>
                <Label htmlFor="customer">Customer Name (Optional)</Label>
                <Input
                  id="customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
            </div>

            <Separator className="mb-4" />

            {/* Cart Items */}
            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Cart is empty
                </p>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="bg-background p-3 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatPHP(item.price)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      placeholder="Special instructions..."
                      value={item.special_instructions || ""}
                      onChange={(e) => updateInstructions(item.id, e.target.value)}
                      className="mt-2 text-sm"
                      rows={2}
                    />
                    <div className="text-right mt-2">
                      <span className="font-medium">
                        {formatPHP(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <>
                <Separator className="mb-4" />
                
                {/* Totals */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatPHP(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (10%):</span>
                    <span>{formatPHP(calculateTax(calculateSubtotal()))}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatPHP(calculateTotal())}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-6">
                  <Label htmlFor="payment">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Cash
                        </div>
                      </SelectItem>
                      <SelectItem value="card">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Card
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={processOrder}
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Complete Order"}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setCart([])}
                  >
                    Clear Cart
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSSystem;