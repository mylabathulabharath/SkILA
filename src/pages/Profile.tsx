import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Shield, Hash, Save, ArrowLeft, Camera, Sparkles, GraduationCap, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Profile = () => {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fullName, setFullName] = useState("");
    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate("/login");
                return;
            }

            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            if (error) throw error;
            setProfile(data);
            setFullName(data.full_name || "");
        } catch (error: any) {
            toast({
                title: "Error fetching profile",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from("profiles")
                .update({ full_name: fullName })
                .eq("id", user.id);

            if (error) throw error;

            toast({
                title: "Profile Updated",
                description: "Your preferences have been saved successfully.",
            });
            
            fetchProfile();
        } catch (error: any) {
            toast({
                title: "Update failed",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Profile</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            <DashboardHeader studentName={profile?.full_name || "Learner"} />
            
            <main className="container mx-auto px-4 py-12 max-w-4xl">
                <div className="flex items-center justify-between mb-10">
                    <div className="space-y-1">
                        <button 
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-2 text-slate-400 hover:text-primary transition-colors mb-4 group"
                        >
                            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Back to Dashboard</span>
                        </button>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Account <span className="text-gradient">Preferences</span></h1>
                        <p className="text-sm font-medium text-slate-500">Manage your personal information and portal settings.</p>
                    </div>
                    
                    <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="btn-premium h-14 px-8 rounded-2xl shadow-primary group"
                    >
                        <Save className="mr-2.5 h-4 w-4" />
                        <span className="text-xs font-black uppercase tracking-widest">Save Changes</span>
                    </Button>
                </div>

                <div className="grid gap-8">
                    {/* Identity Overview */}
                    <Card className="glass-card border-0 rounded-[2.5rem] overflow-hidden shadow-premium-sm">
                        <CardContent className="p-0">
                            <div className="h-32 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 relative">
                                <div className="absolute -bottom-12 left-10">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-3xl bg-white p-1.5 shadow-xl border border-slate-100">
                                            <div className="w-full h-full rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-white font-black text-2xl">
                                                {profile?.full_name?.[0] || profile?.email?.[0]?.toUpperCase()}
                                            </div>
                                        </div>
                                        <button className="absolute bottom-1 -right-1 p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-500 hover:text-primary transition-all active:scale-90">
                                            <Camera className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="pt-16 pb-10 px-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                                        {profile?.full_name || "New Candidate"}
                                        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                                    </h2>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">{profile?.role || "Student"} • Digital ID: {profile?.id?.slice(0, 8)}</p>
                                </div>
                                <div className="flex gap-3">
                                    <Badge className="bg-emerald-50 text-emerald-600 border-none px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">Account Verified</Badge>
                                    <Badge className="bg-blue-50 text-blue-600 border-none px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">{profile?.batch_id || "Global"}</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Personal Details Form */}
                        <div className="md:col-span-2 space-y-8">
                            <Card className="glass-card border-0 rounded-[2.5rem] shadow-premium-sm p-8">
                                <CardHeader className="px-0 pt-0 pb-8 flex flex-row items-center justify-between border-b border-slate-50 mb-8">
                                    <div>
                                        <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Personal Information</CardTitle>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Core identity parameters</p>
                                    </div>
                                    <User className="h-5 w-5 text-slate-300" />
                                </CardHeader>
                                <CardContent className="px-0 space-y-8">
                                    <div className="grid gap-8">
                                        <div className="space-y-3">
                                            <Label htmlFor="fullName" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Legal Full Name</Label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <Input 
                                                    id="fullName" 
                                                    value={fullName}
                                                    onChange={(e) => setFullName(e.target.value)}
                                                    className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-bold text-slate-800"
                                                    placeholder="Enter your full name"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3 opacity-60 cursor-not-allowed">
                                            <Label htmlFor="email" className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Email Address</Label>
                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                    <Mail className="h-4 w-4" />
                                                </div>
                                                <Input 
                                                    id="email" 
                                                    value={profile?.email || ""}
                                                    disabled
                                                    className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-100/50 font-bold text-slate-500 cursor-not-allowed"
                                                />
                                            </div>
                                            <p className="text-[10px] font-medium text-slate-400 italic mt-2 ml-1">Email cannot be modified for security reasons.</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* System Metadata Side Card */}
                        <div className="space-y-8">
                            <Card className="glass-card border-0 rounded-[2.5rem] shadow-premium-sm p-8 bg-slate-900 text-white overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -mr-16 -mt-16"></div>
                                <CardHeader className="px-0 pt-0 pb-6 border-b border-white/10 mb-6">
                                    <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                                        System Access
                                        <Shield className="h-4 w-4 text-primary-glow" />
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-0 space-y-6">
                                    <div className="space-y-1.5">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Role</p>
                                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-3 rounded-xl">
                                            <GraduationCap className="h-4 w-4 text-primary-glow" />
                                            <span className="text-sm font-bold uppercase tracking-widest text-white/90">{profile?.role}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1.5">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Batch Assignment</p>
                                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-3 rounded-xl">
                                            <Hash className="h-4 w-4 text-primary-glow" />
                                            <span className="text-sm font-bold uppercase tracking-widest text-white/90">{profile?.batch_id || "NOT ASSIGNED"}</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 mt-4 border-t border-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Instance Active</span>
                                        </div>
                                        <p className="text-[9px] text-slate-500 mt-2 leading-relaxed">Your account is currently synced with the global learning network.</p>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            <Button 
                                variant="outline" 
                                className="w-full h-14 rounded-2xl border-rose-100 text-rose-500 hover:bg-rose-50 hover:text-rose-600 font-black uppercase tracking-widest text-[10px] transition-all"
                                onClick={async () => {
                                    await supabase.auth.signOut();
                                    navigate("/");
                                }}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Revoke Session
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile;
