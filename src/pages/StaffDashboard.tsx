import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { formatPHP } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  DollarSign, 
  Users, 
  Coffee, 
  BarChart3, 
  Settings,
  Bell,
  User,
  LogOut,
  TrendingUp,
  Clock,
  CheckCircle
} from "lucide-react";
import { Link, useLocation, Outlet, Navigate } from "react-router-dom";

interface DashboardStats {
  dailySales: number;
  pendingOrders: number;
  totalOrders: number;
  revenue: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

const StaffDashboard = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [stats, setStats] = useState<DashboardStats>({
    dailySales: 0,
    pendingOrders: 0,
    totalOrders: 0,
    revenue: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadUserProfile();
      
      // Set up real-time subscription for new orders
      const channel = supabase
        .channel('orders-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders'
          },
          () => {
            loadDashboardData();
            toast({
              title: "New Order Received!",
              description: "A new customer order has been placed.",
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch daily sales
      const { data: dailyOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)
        .eq('status', 'completed');

      // Fetch pending orders count
      const { data: pendingOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'pending');

      // Fetch total orders for today
      const { data: todayOrders } = await supabase
        .from('orders')
        .select('id')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      // Fetch recent orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      const dailySales = dailyOrders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const totalRevenue = dailySales; // For now, using daily sales as revenue

      setStats({
        dailySales,
        pendingOrders: pendingOrders?.length || 0,
        totalOrders: todayOrders?.length || 0,
        revenue: totalRevenue
      });

      setRecentOrders(orders || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const loadUserProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (data) {
      setUserProfile(data);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const navigationItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Order Management", url: "/order-management", icon: ShoppingBag },
    { title: "Sales Management", url: "/sales", icon: DollarSign },
    { title: "Account Management", url: "/staff", icon: Users },
    { title: "Menu Management", url: "/menu", icon: Coffee },
    { title: "Reports", url: "/reports", icon: BarChart3 },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  const canAccess = (item: any) => {
    const role = userProfile?.role;
    if (role === 'admin' || role === 'owner') return true;
    if (role === 'cashier') {
      return ['Dashboard', 'Order Management', 'Sales Management'].includes(item.title);
    }
    if (role === 'staff') {
      return ['Dashboard', 'Order Management'].includes(item.title);
    }
    return false;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'preparing': return 'bg-blue-500 text-white';
      case 'ready': return 'bg-success text-success-foreground';
      case 'completed': return 'bg-green-600 text-white';
      case 'cancelled': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const isHomePage = location.pathname === '/dashboard';

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar className="border-sidebar-border">
          <SidebarContent className="bg-sidebar text-sidebar-foreground">
            <div className="p-4 border-b border-sidebar-border">
              <div className="flex items-center space-x-3">
                <img 
                  src="/lovable-uploads/de766a0c-8555-4067-98ad-1830ddc6138a.png" 
                  alt="Orijin's Coffee Shop" 
                  className="h-8 w-8 rounded"
                />
                <div>
                  <h2 className="text-lg font-bold">Orijin's Coffee</h2>
                  <p className="text-xs text-sidebar-foreground/70">Staff Portal</p>
                </div>
              </div>
            </div>
            
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.filter(canAccess).map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <Link 
                          to={item.url}
                          className={location.pathname === item.url ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1">
          {/* Top Navigation */}
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <SidebarTrigger />
              <h1 className="text-2xl font-bold text-foreground">
                {navigationItems.find(item => item.url === location.pathname)?.title || 'Dashboard'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {stats.pendingOrders > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-warning text-warning-foreground text-xs">
                    {stats.pendingOrders}
                  </Badge>
                )}
              </Button>
              
              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {userProfile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-sm font-medium">{userProfile?.full_name || user?.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{userProfile?.role || 'Staff'}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-6">
            {isHomePage ? (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Daily Sales</CardTitle>
                      <DollarSign className="h-4 w-4 text-success" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-success">{formatPHP(stats.dailySales)}</div>
                      <p className="text-xs text-muted-foreground">Today's completed orders</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                      <Clock className="h-4 w-4 text-warning" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-warning">{stats.pendingOrders}</div>
                      <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                      <ShoppingBag className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">{stats.totalOrders}</div>
                      <p className="text-xs text-muted-foreground">Orders today</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                      <TrendingUp className="h-4 w-4 text-accent" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-accent">{formatPHP(stats.revenue)}</div>
                      <p className="text-xs text-muted-foreground">Daily revenue</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Orders */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Recent Orders
                    </CardTitle>
                    <CardDescription>Latest orders from customers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentOrders.length > 0 ? (
                        recentOrders.map((order) => (
                          <div key={order.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                            <div>
                              <p className="font-medium">{order.order_number}</p>
                              <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{formatPHP(order.total_amount)}</p>
                              <Badge className={getStatusColor(order.status)}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-muted-foreground py-8">No recent orders</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default StaffDashboard;