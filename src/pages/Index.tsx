import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-4 justify-between">
          <h1 className="text-xl font-semibold">Orijins POS System</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.email}
            </span>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">POS Dashboard</h2>
          <p className="text-muted-foreground">Your point of sale system is ready to use</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold mb-2">Sales</h3>
            <p className="text-sm text-muted-foreground">Process customer orders</p>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold mb-2">Menu</h3>
            <p className="text-sm text-muted-foreground">Manage your products</p>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold mb-2">Inventory</h3>
            <p className="text-sm text-muted-foreground">Track stock levels</p>
          </div>
          
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="font-semibold mb-2">Reports</h3>
            <p className="text-sm text-muted-foreground">View sales analytics</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
