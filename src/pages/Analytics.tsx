import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Eye, Sparkles, Users, TrendingUp, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ADMIN_PASSWORD = "movprompt2024";

const COLORS = ["hsl(190, 90%, 50%)", "hsl(35, 90%, 55%)", "hsl(280, 70%, 60%)", "hsl(140, 70%, 50%)", "hsl(350, 70%, 55%)"];

interface Stats {
  totalVisits: number;
  uniqueSessions: number;
  totalGenerations: number;
  visitsToday: number;
  generationsToday: number;
  workflowBreakdown: { name: string; value: number }[];
  modelBreakdown: { name: string; value: number }[];
  dailyTrend: { date: string; visits: number; generations: number }[];
}

const Analytics = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [visitsRes, gensRes, visitsTodayRes, gensTodayRes, uniqueRes] = await Promise.all([
        supabase.from("page_visits").select("*", { count: "exact", head: true }),
        supabase.from("generation_events").select("*", { count: "exact", head: true }),
        supabase.from("page_visits").select("*", { count: "exact", head: true }).gte("visited_at", todayStart),
        supabase.from("generation_events").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
        supabase.from("page_visits").select("session_id"),
      ]);

      // Workflow breakdown
      const { data: genData } = await supabase.from("generation_events").select("workflow_type, target_model");
      
      const workflowCounts: Record<string, number> = {};
      const modelCounts: Record<string, number> = {};
      (genData || []).forEach((e) => {
        workflowCounts[e.workflow_type] = (workflowCounts[e.workflow_type] || 0) + 1;
        modelCounts[e.target_model] = (modelCounts[e.target_model] || 0) + 1;
      });

      // Daily trend (last 30 days)
      const { data: recentVisits } = await supabase
        .from("page_visits")
        .select("visited_at")
        .gte("visited_at", thirtyDaysAgo);
      const { data: recentGens } = await supabase
        .from("generation_events")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo);

      const dailyMap: Record<string, { visits: number; generations: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split("T")[0];
        dailyMap[key] = { visits: 0, generations: 0 };
      }
      (recentVisits || []).forEach((v) => {
        const key = v.visited_at.split("T")[0];
        if (dailyMap[key]) dailyMap[key].visits++;
      });
      (recentGens || []).forEach((g) => {
        const key = g.created_at.split("T")[0];
        if (dailyMap[key]) dailyMap[key].generations++;
      });

      const uniqueSessionIds = new Set((uniqueRes.data || []).map((r) => r.session_id));

      setStats({
        totalVisits: visitsRes.count || 0,
        uniqueSessions: uniqueSessionIds.size,
        totalGenerations: gensRes.count || 0,
        visitsToday: visitsTodayRes.count || 0,
        generationsToday: gensTodayRes.count || 0,
        workflowBreakdown: Object.entries(workflowCounts).map(([name, value]) => ({ name, value })),
        modelBreakdown: Object.entries(modelCounts).map(([name, value]) => ({ name, value })),
        dailyTrend: Object.entries(dailyMap).map(([date, d]) => ({ date, ...d })),
      });
    } catch (e) {
      console.error("Failed to fetch analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading analytics...</p>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: "Total Visits", value: stats.totalVisits, icon: Eye, sub: `${stats.visitsToday} today` },
    { label: "Unique Visitors", value: stats.uniqueSessions, icon: Users, sub: "approximate" },
    { label: "Total Generations", value: stats.totalGenerations, icon: Sparkles, sub: `${stats.generationsToday} today` },
    { label: "Conversion Rate", value: stats.totalVisits ? `${((stats.totalGenerations / stats.totalVisits) * 100).toFixed(1)}%` : "0%", icon: TrendingUp, sub: "visits → generations" },
  ];

  const chartConfig = {
    visits: { label: "Visits", color: "hsl(190, 90%, 50%)" },
    generations: { label: "Generations", color: "hsl(35, 90%, 55%)" },
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-mono font-bold mb-2">
          Mov<span className="text-primary">Prompt</span> Analytics
        </h1>
        <p className="text-muted-foreground mb-8">Anonymous usage tracking dashboard</p>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s) => (
            <Card key={s.label} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Daily Trend */}
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <LineChart data={stats.dailyTrend}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="visits" stroke="hsl(190, 90%, 50%)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="generations" stroke="hsl(35, 90%, 55%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Breakdowns */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium">By Workflow Type</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.workflowBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={stats.workflowBreakdown}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="hsl(190, 90%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium">By Target Model</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.modelBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <PieChart>
                    <Pie data={stats.modelBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
                      {stats.modelBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
