import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Plus, Edit, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatPHP } from "@/lib/utils";

interface InventoryItem {
  id: string;
  item_name: string;
  current_stock: number;
  min_stock_level: number;
  max_stock_level: number;
  unit: string;
  cost_per_unit: number;
  supplier: string;
  last_restocked: string;
}

const InventoryManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    item_name: "",
    current_stock: "",
    min_stock_level: "",
    max_stock_level: "",
    unit: "pieces",
    cost_per_unit: "",
    supplier: ""
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("item_name");
    
    if (error) {
      toast.error("Failed to load inventory");
    } else {
      setInventory(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemData = {
      item_name: formData.item_name,
      current_stock: parseInt(formData.current_stock),
      min_stock_level: parseInt(formData.min_stock_level),
      max_stock_level: parseInt(formData.max_stock_level),
      unit: formData.unit,
      cost_per_unit: parseFloat(formData.cost_per_unit),
      supplier: formData.supplier,
      last_restocked: new Date().toISOString()
    };

    if (isEditing && selectedItem) {
      const { error } = await supabase
        .from("inventory")
        .update(itemData)
        .eq("id", selectedItem.id);
      
      if (error) {
        toast.error("Failed to update inventory item");
      } else {
        toast.success("Inventory item updated successfully");
        // Log activity
        await supabase.rpc('log_activity', {
          action_type: 'UPDATE',
          description_text: `Updated inventory item: ${formData.item_name}`,
          metadata_json: { inventory_id: selectedItem.id }
        });
        resetForm();
        loadInventory();
      }
    } else {
      const { data: inserted, error } = await supabase
        .from("inventory")
        .insert(itemData)
        .select()
        .single();
      
      if (error) {
        toast.error("Failed to create inventory item");
      } else {
        toast.success("Inventory item created successfully");
        // Log activity
        await supabase.rpc('log_activity', {
          action_type: 'CREATE',
          description_text: `Created inventory item: ${formData.item_name}`,
          metadata_json: { inventory_id: inserted?.id }
        });
        resetForm();
        loadInventory();
      }
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsEditing(true);
    setFormData({
      item_name: item.item_name,
      current_stock: item.current_stock.toString(),
      min_stock_level: item.min_stock_level.toString(),
      max_stock_level: item.max_stock_level.toString(),
      unit: item.unit,
      cost_per_unit: item.cost_per_unit.toString(),
      supplier: item.supplier || ""
    });
  };

  const resetForm = () => {
    setFormData({
      item_name: "",
      current_stock: "",
      min_stock_level: "",
      max_stock_level: "",
      unit: "pieces",
      cost_per_unit: "",
      supplier: ""
    });
    setSelectedItem(null);
    setIsEditing(false);
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (item.current_stock <= item.min_stock_level) return { label: "Low Stock", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  return (
    <div className="min-h-screen bg-background">
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
          <h1 className="text-xl font-bold">Inventory Management</h1>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>{isEditing ? "Edit Inventory Item" : "Add New Item"}</CardTitle>
              <CardDescription>
                {isEditing ? "Update the inventory item details" : "Add a new item to inventory"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="item_name">Item Name</Label>
                  <Input
                    id="item_name"
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="current_stock">Current Stock</Label>
                    <Input
                      id="current_stock"
                      type="number"
                      value={formData.current_stock}
                      onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="min_stock_level">Min Level</Label>
                    <Input
                      id="min_stock_level"
                      type="number"
                      value={formData.min_stock_level}
                      onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_stock_level">Max Level</Label>
                    <Input
                      id="max_stock_level"
                      type="number"
                      value={formData.max_stock_level}
                      onChange={(e) => setFormData({ ...formData, max_stock_level: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="unit">Unit</Label>
                    <Input
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cost_per_unit">Cost per Unit (₱)</Label>
                    <Input
                      id="cost_per_unit"
                      type="number"
                      step="0.01"
                      value={formData.cost_per_unit}
                      onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button type="submit">
                    {isEditing ? "Update" : "Create"}
                  </Button>
                  {isEditing && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Inventory List */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
              <CardDescription>Current inventory status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {inventory.map(item => {
                  const status = getStockStatus(item);
                  return (
                    <div key={item.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{item.item_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.current_stock} {item.unit} - {formatPHP(item.cost_per_unit)} each
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={status.variant}>{status.label}</Badge>
                          {item.current_stock <= item.min_stock_level && (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InventoryManagement;