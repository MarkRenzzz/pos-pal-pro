import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Edit, Trash2, Printer, Save, X } from "lucide-react";
import { formatPHP } from "@/lib/utils";

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
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedOrder, setEditedOrder] = useState<Partial<Order>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderId && isOpen) {
      loadOrderDetails();
    }
  }, [orderId, isOpen]);

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
    if (!order || !orderId) return;

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
      setIsEditing(false);
      onOrderUpdated();
      loadOrderDetails();
    }
  };

  const handleDeleteOrder = async () => {
    if (!order || !orderId) return;
    
    if (!confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      return;
    }

    // Delete order items first
    await supabase.from("order_items").delete().eq("order_id", orderId);
    
    // Delete the order
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to delete order");
    } else {
      toast.success("Order deleted successfully");
      // Log activity
      await supabase.rpc('log_activity', {
        action_type: 'DELETE',
        description_text: `Deleted order: ${order.order_number}`,
        metadata_json: { order_id: orderId, action: 'delete_order' }
      });
      onOrderUpdated();
      onClose();
    }
  };

  const handlePrintOrder = () => {
    if (!order) return;
    
    const printContent = `
      <div style="font-family: Arial, sans-serif; max-width: 300px; margin: 0 auto;">
        <h2 style="text-align: center;">Orijins POS</h2>
        <h3 style="text-align: center;">Order Receipt</h3>
        <hr>
        <p><strong>Order:</strong> ${order.order_number}</p>
        <p><strong>Customer:</strong> ${order.customer_name || 'Walk-in'}</p>
        <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <hr>
        <h4>Items:</h4>
        ${orderItems.map(item => `
          <div style="margin-bottom: 10px;">
            <p><strong>${item.menu_items?.name}</strong></p>
            <p>Qty: ${item.quantity} × ${formatPHP(item.unit_price)} = ${formatPHP(item.total_price)}</p>
            ${item.special_instructions ? `<p><em>Note: ${item.special_instructions}</em></p>` : ''}
          </div>
        `).join('')}
        <hr>
        <p><strong>Subtotal:</strong> ${formatPHP(order.total_amount - order.tax_amount)}</p>
        <p><strong>Tax:</strong> ${formatPHP(order.tax_amount)}</p>
        <p><strong>Discount:</strong> -${formatPHP(order.discount_amount)}</p>
        <p style="font-size: 18px;"><strong>Total: ${formatPHP(order.total_amount)}</strong></p>
        <p><strong>Payment:</strong> ${order.payment_method}</p>
        <hr>
        <p style="text-align: center;">Thank you for your business!</p>
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "pending": return "secondary";
      case "cancelled": return "destructive";
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Order Details - {order.order_number}</span>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handlePrintOrder}>
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleDeleteOrder}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" onClick={handleSaveChanges}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            View and manage order information
          </DialogDescription>
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
                  {isEditing ? (
                    <Input
                      id="customer_name"
                      value={editedOrder.customer_name || ""}
                      onChange={(e) => setEditedOrder({ ...editedOrder, customer_name: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{order.customer_name || "Walk-in customer"}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  {isEditing ? (
                    <Select 
                      value={editedOrder.status} 
                      onValueChange={(value) => setEditedOrder({ ...editedOrder, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
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
                  {isEditing ? (
                    <Select 
                      value={editedOrder.payment_method} 
                      onValueChange={(value) => setEditedOrder({ ...editedOrder, payment_method: value })}
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
                  <span>{formatPHP(order.total_amount - order.tax_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatPHP(order.tax_amount)}</span>
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
  );
};

export default OrderDetailsModal;