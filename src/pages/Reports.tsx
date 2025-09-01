import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Download, TrendingUp, DollarSign, ShoppingCart, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatPHP } from "@/lib/utils";

interface SalesData {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalTax: number;
  topItems: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

const Reports = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [salesData, setSalesData] = useState<SalesData>({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalTax: 0,
    topItems: []
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReportsData();
  }, [dateRange]);

  const loadReportsData = async () => {
    setLoading(true);
    try {
      // Get orders in date range
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", `${dateRange.startDate}T00:00:00.000Z`)
        .lte("created_at", `${dateRange.endDate}T23:59:59.999Z`)
        .eq("status", "completed");

      if (ordersError) throw ordersError;

      // Get order items with menu item details
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select(`
          *,
          menu_items (name),
          orders!inner (
            created_at,
            status
          )
        `)
        .gte("orders.created_at", `${dateRange.startDate}T00:00:00.000Z`)
        .lte("orders.created_at", `${dateRange.endDate}T23:59:59.999Z`)
        .eq("orders.status", "completed");

      if (itemsError) throw itemsError;

      // Calculate metrics
      const totalSales = orders?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      const totalOrders = orders?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

      // Calculate top items
      const itemSales = new Map();
      orderItems?.forEach(item => {
        const itemName = item.menu_items?.name || "Unknown Item";
        if (itemSales.has(itemName)) {
          const existing = itemSales.get(itemName);
          itemSales.set(itemName, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + item.total_price
          });
        } else {
          itemSales.set(itemName, {
            quantity: item.quantity,
            revenue: item.total_price
          });
        }
      });

      const topItems = Array.from(itemSales.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setSalesData({
        totalSales,
        totalOrders,
        averageOrderValue,
        totalTax: 0, // Removed tax tracking
        topItems
      });

    } catch (error) {
      console.error("Error loading reports:", error);
      toast.error("Failed to load reports data");
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-xl font-bold">Reports & Analytics</h1>
        </div>
      </div>

      <div className="container mx-auto p-6">
        {/* Date Range Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Date Range</CardTitle>
            <CardDescription>Select the date range for your reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-8">Loading reports...</div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPHP(salesData.totalSales)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{salesData.totalOrders}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPHP(salesData.averageOrderValue)}</div>
                </CardContent>
              </Card>

            </div>

            {/* Top Selling Items */}
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Items</CardTitle>
                <CardDescription>Best performing menu items in the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                {salesData.topItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No sales data available for the selected period
                  </div>
                ) : (
                  <div className="space-y-4">
                    {salesData.topItems.map((item, index) => (
                      <div key={item.name} className="flex justify-between items-center p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                          <div>
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} units sold
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatPHP(item.revenue)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatPHP(item.revenue / item.quantity)} avg
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;