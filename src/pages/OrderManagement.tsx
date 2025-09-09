import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { formatPHP } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Clock, 
  DollarSign,
  Percent,
  AlertTriangle,
  Filter,
  Search,
  Phone,
  User,
  Calendar,
  MessageSquare,
  ArrowLeft,
  Home
} from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  order_type: string;
  pickup_time: string | null;
  customer_notes: string | null;
  total_amount: number;
  tax_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions: string | null;
  menu_items: {
    name: string;
    description: string;
  };
}

const OrderManagement = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<string>("");
  const [actionAmount, setActionAmount] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadOrders();
    
    // Set up real-time subscription for new orders
    const ordersSubscription = supabase
      .channel('orders-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('New order received:', payload);
          loadOrders(); // Reload orders when new one comes in
          
          // Show notification for new orders
          if (payload.new.status === 'pending') {
            toast({
              title: "New Order Received!",
              description: `Order ${payload.new.order_number} from ${payload.new.customer_name || 'Customer'}`,
            });
            
            // Browser notification
            if (Notification.permission === 'granted') {
              new Notification('New Order Received!', {
                body: `Order ${payload.new.order_number} from ${payload.new.customer_name || 'Customer'}`,
                icon: '/lovable-uploads/de766a0c-8555-4067-98ad-1830ddc6138a.png'
              });
            }
          }
        }
      )
      .subscribe();

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(ordersSubscription);
    };
  }, []);

  useEffect(() => {
    // Filter orders based on status and search
    let filtered = orders;
    
    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(order => 
        order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_phone?.includes(searchQuery)
      );
    }
    
    setFilteredOrders(filtered);
  }, [orders, statusFilter, searchQuery]);

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          menu_items (
            name,
            description
          )
        )
      `)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setOrders(data);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'preparing': return 'bg-blue-500';
      case 'ready': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'preparing': return 'secondary';
      case 'ready': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const performOrderAction = async (orderId: string, newStatus: string, actionType: string) => {
    if (!user) return;

    setIsSubmitting(true);
    
    try {
      console.log("Performing order action:", { orderId, newStatus, actionType });
      
      // Update order status
      const { error: orderError } = await supabase
        .from("orders")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

      if (orderError) {
        console.error("Order update error:", orderError);
        throw orderError;
      }

      console.log("Order status updated successfully");

      // Log the action
      const { error: actionError } = await supabase
        .from("order_actions")
        .insert({
          order_id: orderId,
          action_type: actionType,
          action_by: user.id,
          amount: actionAmount ? parseFloat(actionAmount) : null,
          reason: actionReason || null,
          notes: actionNotes || null
        });

      if (actionError) {
        console.error("Action log error:", actionError);
        throw actionError;
      }

      console.log("Action logged successfully");

      // Log activity - optional, don't fail if this fails
      try {
        const order = orders.find(o => o.id === orderId);
        await supabase
          .from("activity_logs")
          .insert({
            user_id: user.id,
            action: 'order_action',
            description: `Order ${order?.order_number} ${actionType}`,
            metadata: { order_id: orderId, action: actionType, new_status: newStatus }
          });
        console.log("Activity logged successfully");
      } catch (activityError) {
        console.warn("Activity logging failed (non-critical):", activityError);
      }

      toast({
        title: "Action Completed",
        description: `Order has been ${actionType}.`,
      });

      // Reload orders and close dialog
      await loadOrders();
      setIsActionDialogOpen(false);
      setSelectedOrder(null);
      setActionAmount("");
      setActionReason("");
      setActionNotes("");

    } catch (error) {
      console.error("Error performing order action:", error);
      toast({
        title: "Action Failed",
        description: "There was an error processing the action. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAction = (order: Order, action: string) => {
    console.log("Quick action clicked:", action, "for order:", order.order_number);
    setSelectedOrder(order);
    setActionType(action);
    
    switch (action) {
      case 'approve':
        console.log("Approving order - changing status to 'preparing'");
        performOrderAction(order.id, 'preparing', 'approve');
        break;
      case 'preparing':
        performOrderAction(order.id, 'preparing', 'preparing');
        break;
      case 'ready':
        performOrderAction(order.id, 'ready', 'ready');
        break;
      case 'complete':
        performOrderAction(order.id, 'completed', 'complete');
        break;
      default:
        setIsActionDialogOpen(true);
    }
  };

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const readyCount = orders.filter(o => o.status === 'ready').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-3">
                <img 
                  src="/lovable-uploads/de766a0c-8555-4067-98ad-1830ddc6138a.png" 
                  alt="Orijin's Coffee Shop" 
                  className="h-8 w-8 rounded"
                />
                <div>
                  <h1 className="text-xl font-bold">Order Management</h1>
                  <p className="text-xs text-primary-foreground/70">Orijin's Coffee House</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="gap-2 bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20">
                <Clock className="h-3 w-3" />
                {pendingCount} Pending
              </Badge>
              <Badge variant="outline" className="gap-2 bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20">
                <RefreshCw className="h-3 w-3" />
                {preparingCount} Preparing
              </Badge>
              <Badge variant="outline" className="gap-2 bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20">
                <CheckCircle className="h-3 w-3" />
                {readyCount} Ready
              </Badge>
              <div className="text-right">
                <p className="text-sm font-medium">{user?.email}</p>
                <p className="text-xs text-primary-foreground/80">Staff</p>
              </div>
              <Button variant="secondary" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by order number, customer name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredOrders.map(order => (
            <Card key={order.id} className={`relative overflow-hidden border-l-4 ${
              order.status === 'pending' ? 'border-l-yellow-500' : 
              order.status === 'preparing' ? 'border-l-blue-500' :
              order.status === 'ready' ? 'border-l-green-500' :
              order.status === 'completed' ? 'border-l-gray-500' :
              'border-l-red-500'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{order.order_number}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <User className="h-3 w-3" />
                      {order.customer_name || 'Walk-in Customer'}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusBadgeVariant(order.status)}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Customer Info */}
                <div className="space-y-1 text-sm">
                  {order.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span>{order.customer_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span>{new Date(order.created_at).toLocaleString()}</span>
                  </div>
                  {order.pickup_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>Pickup: {new Date(order.pickup_time).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Order Items */}
                <div className="space-y-1">
                  <p className="text-sm font-medium">Items:</p>
                  {order.order_items?.map(item => (
                    <div key={item.id} className="text-sm text-muted-foreground flex justify-between">
                      <span>{item.quantity}x {item.menu_items?.name}</span>
                      <span>{formatPHP(item.total_price)}</span>
                    </div>
                  ))}
                </div>

                {/* Customer Notes */}
                {order.customer_notes && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3 w-3 text-muted-foreground" />
                      <p className="text-sm font-medium">Notes:</p>
                    </div>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      {order.customer_notes}
                    </p>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-medium">Total:</span>
                  <span className="font-bold text-lg">{formatPHP(order.total_amount)}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {order.status === 'pending' && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => handleQuickAction(order, 'approve')}
                        className="flex-1"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => {
                          setSelectedOrder(order);
                          setActionType('cancel');
                          setIsActionDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </>
                  )}
                  
                  {order.status === 'preparing' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleQuickAction(order, 'ready')}
                      className="flex-1"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Mark Ready
                    </Button>
                  )}
                  
                  {order.status === 'ready' && (
                    <Button 
                      size="sm" 
                      onClick={() => handleQuickAction(order, 'complete')}
                      className="flex-1"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Button>
                  )}

                  {(order.status === 'completed' || order.status === 'ready') && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedOrder(order);
                          setActionType('refund');
                          setIsActionDialogOpen(true);
                        }}
                      >
                        <DollarSign className="h-3 w-3 mr-1" />
                        Refund
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedOrder(order);
                          setActionType('discount');
                          setIsActionDialogOpen(true);
                        }}
                      >
                        <Percent className="h-3 w-3 mr-1" />
                        Discount
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No orders found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'cancel' && 'Cancel Order'}
              {actionType === 'refund' && 'Refund Order'}  
              {actionType === 'discount' && 'Apply Discount'}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder && `Order: ${selectedOrder.order_number}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {(actionType === 'refund' || actionType === 'discount') && (
              <div>
                <Label htmlFor="amount">
                  {actionType === 'refund' ? 'Refund Amount' : 'Discount Amount'}
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  placeholder={actionType === 'refund' ? '0.00' : '0.00 or percentage (e.g., 10%)'}
                />
              </div>
            )}

            <div>
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Reason for this action..."
              />
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>

            <Button 
              onClick={() => {
                const newStatus = actionType === 'cancel' ? 'cancelled' : selectedOrder?.status || '';
                performOrderAction(selectedOrder?.id || '', newStatus, actionType);
              }}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Processing...' : `Confirm ${actionType.charAt(0).toUpperCase() + actionType.slice(1)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderManagement;