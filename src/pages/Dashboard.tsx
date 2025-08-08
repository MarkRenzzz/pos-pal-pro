import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatPHP } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Coffee, 
  Package, 
  BarChart3, 
  FileText, 
  Users,
  AlertTriangle,
  TrendingUp
} from "lucide-react";

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  created_at: string;
  metadata?: any;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [todaySales, setTodaySales] = useState(0);
  const [ordersToday, setOrdersToday] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [menuItemsCount, setMenuItemsCount] = useState(0);

  const dashboardCards = [
    {
      title: "New Sale",
      description: "Process customer orders",
      icon: ShoppingCart,
      color: "bg-blue-500",
      path: "/pos"
    },
    {
      title: "Menu Management",
      description: "Manage your products",
      icon: Coffee,
      color: "bg-green-500", 
      path: "/menu"
    },
    {
      title: "Inventory",
      description: "Track stock levels",
      icon: Package,
      color: "bg-orange-500",
      path: "/inventory"
    },
    {
      title: "Sales History",
      description: "View and manage orders",
      icon: FileText,
      color: "bg-purple-500",
      path: "/sales"
    },
    {
      title: "Reports",
      description: "Revenue analytics",
      icon: BarChart3,
      color: "bg-red-500",
      path: "/reports"
    },
    {
      title: "Staff Management",
      description: "Manage user accounts",
      icon: Users,
      color: "bg-indigo-500",
      path: "/staff"
    }
  ];

  useEffect(() => {
    loadActivities();
    loadStats();
  }, []);

  const loadActivities = async () => {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (!error && data) {
      setActivities(data);
    }
  };

  const loadStats = async () => {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const [ordersRes, invRes, menuRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id,total_amount,created_at,status")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString())
          .eq("status", "completed"),
        supabase
          .from("inventory")
          .select("id,current_stock,min_stock_level"),
        supabase
          .from("menu_items")
          .select("id")
      ]);

      const orders = ordersRes.data || [];
      setOrdersToday(orders.length);
      setTodaySales(orders.reduce((sum, o: any) => sum + (o.total_amount || 0), 0));

      const inv = invRes.data || [];
      setLowStockCount(inv.filter((i: any) => (i.current_stock ?? 0) <= (i.min_stock_level ?? 0)).length);

      setMenuItemsCount((menuRes.data || []).length);
    } catch (e) {
      console.error("Failed to load dashboard stats", e);
    }
  };

  const getActivityColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return 'bg-green-500';
      case 'update': return 'bg-blue-500';
      case 'delete': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex h-16 items-center px-6 justify-between">
          <div className="flex items-center gap-4">
            <Coffee className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Orijins POS</h1>
              <p className="text-sm text-muted-foreground">Point of Sale System</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-2">
              <AlertTriangle className="h-3 w-3" />
              2 Low Stock Alerts
            </Badge>
            <div className="text-right">
              <p className="text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Cashier</p>
            </div>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today's Sales</p>
                  <p className="text-xl font-bold">{formatPHP(todaySales)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Orders Today</p>
                  <p className="text-xl font-bold">{ordersToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Package className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Stock Items</p>
                  <p className="text-xl font-bold">{lowStockCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Coffee className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Menu Items</p>
                  <p className="text-xl font-bold">{menuItemsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card 
                key={card.path} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(card.path)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${card.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{card.title}</CardTitle>
                      <CardDescription>{card.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Recent Activity */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest transactions and system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No recent activities
                </div>
              ) : (
                activities.map(activity => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${getActivityColor(activity.action)}`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;