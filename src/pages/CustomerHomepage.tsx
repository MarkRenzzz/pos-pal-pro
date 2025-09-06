import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { formatPHP } from "@/lib/utils";
import { 
  Coffee, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Search,
  Clock,
  Phone,
  User,
  MapPin,
  UserCog
} from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  is_available: boolean;
  image_url: string | null;
  size: string | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface CartItem extends MenuItem {
  quantity: number;
  special_instructions?: string;
}

const CustomerHomepage = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  
  // Customer form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState("takeout");
  const [pickupTime, setPickupTime] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    if (!error && data) {
      setMenuItems(data);
    }
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    
    if (!error && data) {
      setCategories(data);
    }
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === "all" || item.category_id === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart.`,
    });
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setCart(cart.filter(item => item.id !== itemId));
    } else {
      setCart(cart.map(item => 
        item.id === itemId 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const updateInstructions = (itemId: string, instructions: string) => {
    setCart(cart.map(item => 
      item.id === itemId 
        ? { ...item, special_instructions: instructions }
        : item
    ));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTax = (subtotal: number) => {
    return subtotal * 0.12; // 12% VAT
  };

  const submitOrder = async () => {
    if (!customerName || !customerPhone) {
      toast({
        title: "Missing Information",
        description: "Please provide your name and phone number.",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to your cart before ordering.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const subtotal = calculateTotal();
      const tax = calculateTax(subtotal);
      const total = subtotal + tax;

      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          customer_name: customerName,
          customer_phone: customerPhone,
          order_type: orderType,
          pickup_time: pickupTime ? new Date(pickupTime).toISOString() : null,
          customer_notes: customerNotes,
          total_amount: total,
          tax_amount: tax,
          status: "pending",
          payment_method: "pending"
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

      // Log activity
      await supabase.rpc('log_activity', {
        action_type: 'create',
        description_text: `New customer order ${orderNumber} placed`,
        metadata_json: { order_id: order.id, customer: customerName }
      });

      toast({
        title: "Order Placed Successfully!",
        description: `Your order ${orderNumber} has been submitted. We'll contact you when it's ready.`,
      });

      // Reset form and cart
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setOrderType("takeout");
      setPickupTime("");
      setCustomerNotes("");
      setIsCheckoutOpen(false);
      setIsCartOpen(false);

    } catch (error) {
      console.error("Error submitting order:", error);
      toast({
        title: "Order Failed",
        description: "There was an error submitting your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cartTotal = calculateTotal();
  const cartTax = calculateTax(cartTotal);
  const cartGrandTotal = cartTotal + cartTax;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <img 
                src="/lovable-uploads/de766a0c-8555-4067-98ad-1830ddc6138a.png" 
                alt="Orijins Coffee House" 
                className="h-8 w-8"
              />
              <div>
                <h1 className="text-xl font-semibold">Welcome to Orijins Coffee House</h1>
                <p className="text-xs text-primary-foreground/80">Order your favorite coffee & treats</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Cart Button */}
              <Button
                variant="secondary"
                onClick={() => setIsCartOpen(true)}
                className="relative"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Cart
                {cart.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-accent text-accent-foreground">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </Badge>
                )}
              </Button>
              
              {/* Admin Login */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = "/admin"}
                className="bg-background text-foreground border-primary-foreground/20"
              >
                <UserCog className="h-4 w-4 mr-2" />
                Staff Login
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary/10 to-primary/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Freshly Brewed, Just For You
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Discover our premium coffee selection and delicious treats. Order online for pickup!
          </p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </section>

      {/* Menu Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
              size="sm"
            >
              All Items
            </Button>
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                size="sm"
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map(item => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Coffee className="h-12 w-12 text-primary/50" />
                  )}
                </div>
                
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <Badge variant="secondary" className="text-sm font-bold">
                      {formatPHP(item.price)}
                    </Badge>
                  </div>
                  {item.size && (
                    <Badge variant="outline" className="w-fit">
                      {item.size}
                    </Badge>
                  )}
                </CardHeader>
                
                <CardContent>
                  <CardDescription className="mb-4 line-clamp-2">
                    {item.description}
                  </CardDescription>
                  
                  <Button 
                    onClick={() => addToCart(item)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Coffee className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">No items found matching your search.</p>
            </div>
          )}
        </div>
      </section>

      {/* Cart Sidebar */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Your Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
            </DialogTitle>
            <DialogDescription>
              Review your order and proceed to checkout
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
            ) : (
              <>
                {cart.map(item => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{item.name}</h4>
                        <span className="font-bold">{formatPHP(item.price * item.quantity)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
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
                      
                      <Input
                        placeholder="Special instructions..."
                        value={item.special_instructions || ""}
                        onChange={(e) => updateInstructions(item.id, e.target.value)}
                        className="text-sm"
                      />
                    </CardContent>
                  </Card>
                ))}

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatPHP(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (12%):</span>
                    <span>{formatPHP(cartTax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatPHP(cartGrandTotal)}</span>
                  </div>
                </div>

                <Button 
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full"
                  size="lg"
                >
                  Proceed to Checkout
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Form */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Order</DialogTitle>
            <DialogDescription>
              Please provide your details to complete the order
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="09XX XXX XXXX"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="orderType">Order Type</Label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="takeout">Takeout</SelectItem>
                  <SelectItem value="dine-in">Dine In</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="pickup">Preferred Pickup Time (Optional)</Label>
              <Input
                id="pickup"
                type="datetime-local"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div>
              <Label htmlFor="notes">Special Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="Any special requests or notes..."
                rows={3}
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between font-bold text-lg mb-4">
                <span>Total:</span>
                <span>{formatPHP(cartGrandTotal)}</span>
              </div>
              
              <Button 
                onClick={submitOrder}
                disabled={isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? "Placing Order..." : "Place Order"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerHomepage;