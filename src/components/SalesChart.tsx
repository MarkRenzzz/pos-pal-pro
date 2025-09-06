import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPHP } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { toZonedTime, format } from "date-fns-tz";

interface SalesData {
  date: string;
  sales: number;
  orders: number;
}

type TimeRange = 'day' | 'week' | 'month' | 'year';

interface SalesChartProps {
  filterPeriod?: TimeRange;
}

const SalesChart = ({ filterPeriod = 'day' }: SalesChartProps) => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(false);
  
  const timeZone = 'Asia/Manila';

  useEffect(() => {
    loadSalesData();
  }, [filterPeriod]);

  const loadSalesData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id,total_amount,created_at,paid_at")
        .not("status", "in", '("canceled","void","refunded","test")')
        .order("created_at", { ascending: true });

      if (error) throw error;

      const processedData = processSalesData(data || [], filterPeriod);
      setSalesData(processedData);
    } catch (error) {
      console.error("Failed to load sales data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processSalesData = (orders: any[], range: TimeRange): SalesData[] => {
    const now = toZonedTime(new Date(), timeZone);
    const dataMap = new Map<string, { sales: number; orders: number }>();

    // Initialize data points based on time range
    const periods = generateTimePeriods(range, now);
    periods.forEach(period => {
      dataMap.set(period, { sales: 0, orders: 0 });
    });

    // Process orders using paid_at or fallback to created_at
    orders.forEach(order => {
      const orderDate = order.paid_at ? new Date(order.paid_at) : new Date(order.created_at);
      const zonedDate = toZonedTime(orderDate, timeZone);
      const key = formatDateKey(zonedDate, range);
      
      if (dataMap.has(key)) {
        const current = dataMap.get(key)!;
        current.sales += parseFloat(order.total_amount || 0);
        current.orders += 1;
      }
    });

    // Convert to array format and ensure all periods are shown (including 0s)
    return Array.from(dataMap.entries())
      .map(([date, data]) => ({
        date: formatDisplayDate(date, range),
        sales: data.sales,
        orders: data.orders
      }))
      .slice(-getDisplayLimit(range));
  };

  const generateTimePeriods = (range: TimeRange, endDate: Date): string[] => {
    const periods: string[] = [];
    const current = new Date(endDate);

    switch (range) {
      case 'day':
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date(current);
          date.setDate(date.getDate() - i);
          periods.push(formatDateKey(date, range));
        }
        break;
      case 'week':
        // Last 8 weeks
        for (let i = 7; i >= 0; i--) {
          const date = new Date(current);
          date.setDate(date.getDate() - (i * 7));
          periods.push(formatDateKey(date, range));
        }
        break;
      case 'month':
        // Last 12 months
        for (let i = 11; i >= 0; i--) {
          const date = new Date(current);
          date.setMonth(date.getMonth() - i);
          periods.push(formatDateKey(date, range));
        }
        break;
      case 'year':
        // Last 5 years
        for (let i = 4; i >= 0; i--) {
          const date = new Date(current);
          date.setFullYear(date.getFullYear() - i);
          periods.push(formatDateKey(date, range));
        }
        break;
    }

    return periods;
  };

  const formatDateKey = (date: Date, range: TimeRange): string => {
    switch (range) {
      case 'day':
        return format(date, 'yyyy-MM-dd', { timeZone });
      case 'week':
        const weekStart = new Date(date);
        // Set to Monday (start of week) 
        const dayOfWeek = date.getDay();
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart.setDate(date.getDate() - daysToSubtract);
        return format(weekStart, 'yyyy-MM-dd', { timeZone });
      case 'month':
        return format(date, 'yyyy-MM', { timeZone });
      case 'year':
        return format(date, 'yyyy', { timeZone });
      default:
        return format(date, 'yyyy-MM-dd', { timeZone });
    }
  };

  const formatDisplayDate = (dateKey: string, range: TimeRange): string => {
    switch (range) {
      case 'day':
        return new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'week':
        const weekStart = new Date(dateKey);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      case 'month':
        const [year, month] = dateKey.split('-');
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case 'year':
        return dateKey;
      default:
        return dateKey;
    }
  };

  const getDisplayLimit = (range: TimeRange): number => {
    switch (range) {
      case 'day': return 7;
      case 'week': return 8;
      case 'month': return 12;
      case 'year': return 5;
      default: return 10;
    }
  };

  const totalSales = salesData.reduce((sum, data) => sum + data.sales, 0);
  const totalOrders = salesData.reduce((sum, data) => sum + data.orders, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-primary">
            Sales: <span className="font-bold">{formatPHP(payload[0].value)}</span>
          </p>
          <p className="text-accent">
            Orders: <span className="font-bold">{payload[1]?.value || 0}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Sales Trends</CardTitle>
              <p className="text-xs text-muted-foreground">
                Revenue performance - {filterPeriod === 'day' ? 'Daily' : filterPeriod === 'week' ? 'Weekly' : filterPeriod === 'month' ? 'Monthly' : 'Yearly'} view
              </p>
            </div>
          </div>
        
        <div className="flex gap-3 mt-3">
          <Badge variant="secondary" className="text-xs">
            Total: {formatPHP(totalSales)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Orders: {totalOrders}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="h-60 flex items-center justify-center">
            <div className="text-muted-foreground">Loading chart data...</div>
          </div>
        ) : salesData.length === 0 ? (
          <div className="h-60 flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No sales data available</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={salesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                angle={filterPeriod === 'week' ? -45 : 0}
                textAnchor={filterPeriod === 'week' ? 'end' : 'middle'}
                height={filterPeriod === 'week' ? 70 : 50}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="sales" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                fill="url(#salesGradient)"
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, fill: "hsl(var(--accent))" }}
                name="Sales"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesChart;