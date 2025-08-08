import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Users, Shield, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

const StaffManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", full_name: "", role: "cashier" });

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Failed to load staff profiles");
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  const updateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("user_id", userId);
    
    if (error) {
      toast.error("Failed to update role");
    } else {
      toast.success("Role updated successfully");
      loadProfiles();
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.full_name,
        role: newUser.role,
      },
    });

    if (error) {
      toast.error("Failed to create user");
      console.error(error);
    } else {
      toast.success("User created successfully");
      setCreateOpen(false);
      setNewUser({ email: "", password: "", full_name: "", role: "cashier" });
      loadProfiles();
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return <Shield className="h-4 w-4" />;
      case "manager": return <Users className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "manager": return "secondary";
      default: return "default";
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
          <h1 className="text-xl font-bold">Staff Management</h1>
          <div className="ml-auto">
            <Button onClick={() => setCreateOpen(true)}>Create User</Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        {/* Staff Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profiles.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Managers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profiles.filter(p => p.role === "manager").length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Cashiers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {profiles.filter(p => p.role === "cashier").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Staff List */}
        <Card>
          <CardHeader>
            <CardTitle>Staff Members</CardTitle>
            <CardDescription>
              Manage staff roles and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading staff...</div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No staff members found
              </div>
            ) : (
              <div className="space-y-4">
                {profiles.map(profile => (
                  <div key={profile.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getRoleIcon(profile.role)}
                      <div>
                        <h4 className="font-medium">
                          {profile.full_name || "Unnamed User"}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(profile.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge variant={getRoleColor(profile.role) as any}>
                        {profile.role}
                      </Badge>
                      <div className="flex gap-2">
                        {profile.role !== "admin" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRole(profile.user_id, "admin")}
                          >
                            Make Admin
                          </Button>
                        )}
                        {profile.role !== "manager" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRole(profile.user_id, "manager")}
                          >
                            Make Manager
                          </Button>
                        )}
                        {profile.role !== "cashier" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRole(profile.user_id, "cashier")}
                          >
                            Make Cashier
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={newUser.email} onChange={(e)=>setNewUser({ ...newUser, email: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={newUser.password} onChange={(e)=>setNewUser({ ...newUser, password: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" value={newUser.full_name} onChange={(e)=>setNewUser({ ...newUser, full_name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newUser.role} onValueChange={(v)=>setNewUser({ ...newUser, role: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit">Create</Button>
              <Button type="button" variant="outline" onClick={()=>setCreateOpen(false)}>Cancel</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManagement;