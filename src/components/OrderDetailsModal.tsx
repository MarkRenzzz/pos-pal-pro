import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Edit, Save, X, Printer, Receipt, Trash2, Shield, Bluetooth } from "lucide-react";
import { formatPHP } from "@/lib/utils";
import { useBluetoothPrinter } from "@/hooks/useBluetoothPrinter";

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions?: string;
  menu_item_id: string;
  menu_items?: {
    name: string;
    description: string;
  };
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  updated_at: string;
  cashier_id?: string;
}

interface OrderDetailsModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: () => void;
}

const OrderDetailsModal = ({ orderId, isOpen, onClose, onOrderUpdated }: OrderDetailsModalProps) => {
  const { user } = useAuth();
  const { connect, disconnect, print, isConnected } = useBluetoothPrinter();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedOrder, setEditedOrder] = useState<Order | null>(null);
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");

  useEffect(() => {
    if (orderId && isOpen) {
      loadOrderDetails();
      loadUserRole();
    }
  }, [orderId, isOpen]);

  const loadUserRole = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();
    
    if (!error && data) {
      setUserRole(data.role);
    }
  };

  const loadOrderDetails = async () => {
    if (!orderId) return;
    
    setLoading(true);
    
    // Load order details
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError) {
      toast.error("Failed to load order details");
      setLoading(false);
      return;
    }

    setOrder(orderData);
    setEditedOrder(orderData);

    // Load order items with menu item details
    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select(`
        *,
        menu_items (
          name,
          description
        )
      `)
      .eq("order_id", orderId);

    if (itemsError) {
      toast.error("Failed to load order items");
    } else {
      setOrderItems(itemsData || []);
    }
    
    setLoading(false);
  };

  const handleSaveChanges = async () => {
    if (!order || !orderId || !editedOrder) return;

    const { error } = await supabase
      .from("orders")
      .update({
        customer_name: editedOrder.customer_name,
        status: editedOrder.status,
        payment_method: editedOrder.payment_method,
        total_amount: editedOrder.total_amount,
        tax_amount: editedOrder.tax_amount,
        discount_amount: editedOrder.discount_amount,
      })
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to update order");
    } else {
      toast.success("Order updated successfully");
      // Log activity
      await supabase.rpc('log_activity', {
        action_type: 'UPDATE',
        description_text: `Updated order: ${order.order_number}`,
        metadata_json: { order_id: orderId, action: 'update_order' }
      });
      setEditing(false);
      onOrderUpdated();
      loadOrderDetails();
    }
  };

  const handleVoidOrder = () => {
    if (userRole === 'admin') {
      performVoidOrder();
    } else {
      setShowVoidDialog(true);
    }
  };

  const performVoidOrder = async () => {
    if (!order) return;
    
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "void" })
        .eq("id", order.id);
      
      if (error) throw error;
      
      toast.success("Order voided successfully");
      onOrderUpdated();
      onClose();
    } catch (error) {
      console.error("Error voiding order:", error);
      toast.error("Failed to void order");
    }
  };

  const handleAdminPasswordSubmit = async () => {
    if (!adminPassword) {
      toast.error("Please enter admin password");
      return;
    }
    
    // For security, you would verify this password against admin credentials
    // This is a simplified implementation - in production, use proper authentication
    if (adminPassword === "admin123") { // Replace with proper authentication
      setShowVoidDialog(false);
      setAdminPassword("");
      performVoidOrder();
    } else {
      toast.error("Invalid admin password");
    }
  };

  const handlePrintReceipt = async () => {
    if (!order || !orderItems) return;

    try {
      if (isConnected) {
        // Print via Bluetooth
        const receiptContent = `
            Orijins Coffee House
            418 General Luna Street
            09610537663
        ================================
        INV#: ${order.order_number}
        DATE: ${new Date(order.created_at).toLocaleDateString('en-GB')} 
        TIME: ${new Date(order.created_at).toLocaleTimeString('en-GB', { hour12: false })}
        ================================
        ${orderItems.map(item => 
          `${item.menu_items?.name}${item.special_instructions ? `\n(${item.special_instructions})` : ''}\n${item.quantity}.0 x ${formatPHP(item.unit_price)} = ${formatPHP(item.total_price)}`
        ).join('\n\n')}
        ================================
        ${orderItems.reduce((total, item) => total + item.quantity, 0)}.0 Item(s)
        SUBTOTAL: ${formatPHP(order.total_amount)}
        
        TOTAL: ${formatPHP(order.total_amount)}
        ================================
        PAYMENT RECEIVED:
        ${order.payment_method.toUpperCase()}: ${formatPHP(order.total_amount)}
        CHANGE AMOUNT: ₱0.00
        
        Acknowledgement Receipt
        Thank you for your business!
        `;

        await print(receiptContent);
        toast.success("Receipt printed successfully!");
      } else {
        // Fallback to regular print
        const printContent = `
          <div style="font-family: Arial, sans-serif; max-width: 300px; margin: 0 auto; font-size: 12px;">
            <div style="text-align: center; margin-bottom: 10px;">
              <h2 style="margin: 0;">Orijins Coffee House</h2>
              <p style="margin: 2px 0;">418 General Luna Street</p>
              <p style="margin: 2px 0;">09610537663</p>
            </div>
            <hr>
            <p><strong>INV#:</strong> ${order.order_number}</p>
            <p><strong>DATE:</strong> ${new Date(order.created_at).toLocaleDateString('en-GB')} <strong>TIME:</strong> ${new Date(order.created_at).toLocaleTimeString('en-GB', { hour12: false })}</p>
            <hr>
            ${orderItems.map(item => `
              <div style="margin-bottom: 8px;">
                <p style="margin: 0; font-weight: bold;">${item.menu_items?.name}${item.special_instructions ? ` (${item.special_instructions})` : ''}</p>
                <p style="margin: 0;">${item.quantity}.0 x ${formatPHP(item.unit_price)} = ${formatPHP(item.total_price)}</p>
              </div>
            `).join('')}
            <hr>
            <p><strong>${orderItems.reduce((total, item) => total + item.quantity, 0)}.0 Item(s)</strong></p>
            <p><strong>SUBTOTAL: ${formatPHP(order.total_amount)}</strong></p>
            <p style="font-size: 16px;"><strong>TOTAL: ${formatPHP(order.total_amount)}</strong></p>
            <hr>
            <p><strong>PAYMENT RECEIVED:</strong></p>
            <p>${order.payment_method.toUpperCase()}: ${formatPHP(order.total_amount)}</p>
            <p><strong>CHANGE AMOUNT:</strong> ₱0.00</p>
            <br>
            <p style="text-align: center;">Acknowledgement Receipt</p>
            <p style="text-align: center;">Thank you for your business!</p>
          </div>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head><title>Receipt - ${order.order_number}</title></head>
              <body>${printContent}</body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
          toast.success("Receipt sent to printer!");
        }
      }
    } catch (error) {
      console.error('Print error:', error);
      toast.error("Failed to print receipt");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "pending": return "secondary";
      case "cancelled": return "destructive";
      case "void": return "outline";
      default: return "outline";
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="text-center py-8">Loading order details...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!order) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="text-center py-8">Order not found</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Order Details - {order.order_number}</span>
              <div className="flex gap-2">
                {!editing ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={handlePrintReceipt}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant={isConnected ? "default" : "outline"} 
                      onClick={isConnected ? handlePrintReceipt : connect}
                    >
                      <Bluetooth className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleVoidOrder}
                      className="text-red-600 border-red-600 hover:bg-red-50"
                      disabled={order?.status === "void"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" onClick={handleSaveChanges}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customer_name">Customer Name</Label>
                    {editing ? (
                      <Input
                        id="customer_name"
                        value={editedOrder?.customer_name || ""}
                        onChange={(e) => setEditedOrder({ ...editedOrder!, customer_name: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm">{order.customer_name || "Walk-in customer"}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="status">Status</Label>
                    {editing ? (
                      <Select 
                        value={editedOrder?.status} 
                        onValueChange={(value) => setEditedOrder({ ...editedOrder!, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          {userRole === 'admin' && (
                            <SelectItem value="void">Void</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={getStatusColor(order.status) as any}>
                        {order.status}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Created Date</Label>
                    <p className="text-sm">{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="payment_method">Payment Method</Label>
                    {editing ? (
                      <Select 
                        value={editedOrder?.payment_method} 
                        onValueChange={(value) => setEditedOrder({ ...editedOrder!, payment_method: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="digital">Digital</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm capitalize">{order.payment_method}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 border rounded">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.menu_items?.name}</h4>
                        <p className="text-sm text-muted-foreground">
                        Qty: {item.quantity} × {formatPHP(item.unit_price)}
                        </p>
                        {item.special_instructions && (
                          <p className="text-xs text-muted-foreground italic">
                            Note: {item.special_instructions}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatPHP(item.total_price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatPHP(order.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount:</span>
                    <span>-{formatPHP(order.discount_amount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatPHP(order.total_amount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Password Dialog for Void */}
      <AlertDialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin Authorization Required
            </AlertDialogTitle>
            <AlertDialogDescription>
              Only administrators can void orders. Please enter the admin password to continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label htmlFor="adminPassword">Admin Password</Label>
            <Input
              id="adminPassword"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter admin password"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowVoidDialog(false); setAdminPassword(""); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleAdminPasswordSubmit}>
              Authorize Void
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OrderDetailsModal;