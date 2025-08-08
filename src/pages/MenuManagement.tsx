import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  is_available: boolean;
  preparation_time: number;
  size?: string;
}

interface Category {
  id: string;
  name: string;
}

const MenuManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    is_available: true,
    preparation_time: "",
    size: ""
  });

  useEffect(() => {
    loadMenuItems();
    loadCategories();
  }, []);

  const loadMenuItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("name");
    
    if (error) {
      toast.error("Failed to load menu items");
    } else {
      setMenuItems(data || []);
    }
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    
    if (error) {
      toast.error("Failed to load categories");
    } else {
      setCategories(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      category_id: formData.category_id,
      is_available: formData.is_available,
      preparation_time: parseInt(formData.preparation_time),
      size: formData.size || null
    };

    if (isEditing && selectedItem) {
      const { error } = await supabase
        .from("menu_items")
        .update(itemData)
        .eq("id", selectedItem.id);
      
      if (error) {
        toast.error("Failed to update menu item");
      } else {
        toast.success("Menu item updated successfully");
        // Log activity
        await supabase.rpc('log_activity', {
          action_type: 'UPDATE',
          description_text: `Updated menu item: ${formData.name}`,
          metadata_json: { item_id: selectedItem.id, action: 'update_menu_item' }
        });
        resetForm();
        loadMenuItems();
      }
    } else {
      const { error } = await supabase
        .from("menu_items")
        .insert(itemData);
      
      if (error) {
        toast.error("Failed to create menu item");
      } else {
        toast.success("Menu item created successfully");
        // Log activity
        await supabase.rpc('log_activity', {
          action_type: 'CREATE',
          description_text: `Created menu item: ${formData.name}`,
          metadata_json: { action: 'create_menu_item' }
        });
        resetForm();
        loadMenuItems();
      }
    }
  };

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item);
    setIsEditing(true);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: (item.price ?? 0).toString(),
      category_id: item.category_id || "",
      is_available: item.is_available ?? true,
      preparation_time: (item.preparation_time ?? "").toString(),
      size: item.size || ""
    });
  };

  const handleDelete = async (id: string) => {
    const item = menuItems.find(item => item.id === id);
    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Failed to delete menu item");
    } else {
      toast.success("Menu item deleted successfully");
      // Log activity
      await supabase.rpc('log_activity', {
        action_type: 'DELETE',
        description_text: `Deleted menu item: ${item?.name}`,
        metadata_json: { item_id: id, action: 'delete_menu_item' }
      });
      loadMenuItems();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      category_id: "",
      is_available: true,
      preparation_time: "",
      size: ""
    });
    setSelectedItem(null);
    setIsEditing(false);
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
          <h1 className="text-xl font-bold">Menu Management</h1>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>{isEditing ? "Edit Menu Item" : "Add New Menu Item"}</CardTitle>
              <CardDescription>
                {isEditing ? "Update the menu item details" : "Create a new menu item"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={formData.category_id || undefined} 
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="preparation_time">Preparation Time (minutes)</Label>
                  <Input
                    id="preparation_time"
                    type="number"
                    value={formData.preparation_time}
                    onChange={(e) => setFormData({ ...formData, preparation_time: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="size">Size (Optional)</Label>
                  <Select 
                    value={formData.size || undefined} 
                    onValueChange={(value) => setFormData({ ...formData, size: value === "__none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select size (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">No specific size</SelectItem>
                      <SelectItem value="16oz">16oz</SelectItem>
                      <SelectItem value="22oz">22oz</SelectItem>
                    </SelectContent>
                  </Select>
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

          {/* Menu Items List */}
          <Card>
            <CardHeader>
              <CardTitle>Menu Items</CardTitle>
              <CardDescription>Manage your menu items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {menuItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 border rounded">
                     <div>
                       <h4 className="font-medium">{item.name} {item.size && `(${item.size})`}</h4>
                       <p className="text-sm text-muted-foreground">${Number(item.price ?? 0).toFixed(2)}</p>
                       <p className="text-xs text-muted-foreground">
                         {item.is_available ? "Available" : "Unavailable"}
                       </p>
                     </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;