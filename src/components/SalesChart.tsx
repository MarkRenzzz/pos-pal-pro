import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPHP } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";

interface SalesData {
  date: string;
  sales: number;
  orders: number;
}

type TimeRange = 'day' | 'week' | 'month' | 'year';

const SalesChart = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  useEffect(() => {
    loadSalesData();
  }, [timeRange]);

  const loadSalesData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id,total_amount,created_at")
        .eq("status", "completed")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const processedData = processSalesData(data || [], timeRange);
      setSalesData(processedData);
    } catch (error) {
      console.error("Failed to load sales data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processSalesData = (orders: any[], range: TimeRange): SalesData[] => {
    const now = new Date();
    const dataMap = new Map<string, { sales: number; orders: number }>();

    // Initialize data points based on time range
    const periods = generateTimePeriods(range, now);
    periods.forEach(period => {
      dataMap.set(period, { sales: 0, orders: 0 });
    });

    // Process orders
    orders.forEach(order => {
      const date = new Date(order.created_at);
      const key = formatDateKey(date, range);
      
      if (dataMap.has(key)) {
        const current = dataMap.get(key)!;
        current.sales += parseFloat(order.total_amount || 0);
        current.orders += 1;
      }
    });

    // Convert to array format
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
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'year':
        return String(date.getFullYear());
      default:
        return date.toISOString().split('T')[0];
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
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Sales & Revenue</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track your business performance over time
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={chartType} onValueChange={(value: 'bar' | 'line') => setChartType(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="line">Line</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Daily
                  </div>
                </SelectItem>
                <SelectItem value="week">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Weekly
                  </div>
                </SelectItem>
                <SelectItem value="month">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Monthly
                  </div>
                </SelectItem>
                <SelectItem value="year">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Yearly
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex gap-4 mt-4">
          <Badge variant="secondary" className="gap-2">
            <TrendingUp className="h-3 w-3" />
            Total Sales: {formatPHP(totalSales)}
          </Badge>
          <Badge variant="outline" className="gap-2">
            Total Orders: {totalOrders}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">Loading chart data...</div>
          </div>
        ) : salesData.length === 0 ? (
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No sales data available</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            {chartType === 'bar' ? (
              <BarChart data={salesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  angle={timeRange === 'week' ? -45 : 0}
                  textAnchor={timeRange === 'week' ? 'end' : 'middle'}
                  height={timeRange === 'week' ? 80 : 60}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="sales" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  name="Sales"
                />
              </BarChart>
            ) : (
              <LineChart data={salesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  angle={timeRange === 'week' ? -45 : 0}
                  textAnchor={timeRange === 'week' ? 'end' : 'middle'}
                  height={timeRange === 'week' ? 80 : 60}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: "hsl(var(--accent))" }}
                  name="Sales"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesChart;