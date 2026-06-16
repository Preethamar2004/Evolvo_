import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Activity, Target, Zap, Clock } from 'lucide-react';
import * as api from '../services/apiServices';

export default function AnalyticsPage() {
    const { data: analytics, isLoading, error } = useQuery({
        queryKey: ['analytics'],
        queryFn: api.getAnalyticsDashboard
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
                <p className="text-red-400">Failed to load analytics: {error.message}</p>
            </div>
        );
    }

    const { xp_growth, category_distribution, mission_statistics, forecast } = analytics || {};
    
    // Find max value for chart scaling
    const maxDailyXp = xp_growth ? Math.max(...xp_growth.map(d => d.daily_xp), 1) : 1;
    const maxCategory = category_distribution ? Math.max(...Object.values(category_distribution), 1) : 1;

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-6 pb-20 md:pb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/10 blur-[150px] rounded-full pointer-events-none" />
            
            <div className="max-w-7xl mx-auto relative z-10">
                <header className="mb-10">
                    <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-500 mb-4 flex items-center gap-3">
                        <BarChart3 className="text-emerald-400" size={40} /> Evolution Analytics
                    </h1>
                    <p className="text-gray-400 text-lg">Track your growth trajectory, analyze your habits, and forecast your future potential.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatCard 
                        icon={<Activity />} 
                        title="Completion Rate" 
                        value={`${mission_statistics?.completion_rate || 0}%`} 
                        subtitle={`${mission_statistics?.total_completed || 0} / ${mission_statistics?.total_started || 0} missions`}
                        color="from-blue-500 to-cyan-500"
                    />
                    <StatCard 
                        icon={<TrendingUp />} 
                        title="30-Day Projection" 
                        value={`Level ${forecast?.projected_level_1_month || 0}`} 
                        subtitle={`${forecast?.projected_xp_1_month || 0} total XP`}
                        color="from-emerald-500 to-teal-500"
                    />
                    <StatCard 
                        icon={<Zap />} 
                        title="Velocity" 
                        value={`${forecast?.avg_daily_xp || 0} XP`} 
                        subtitle="Average daily gain"
                        color="from-orange-500 to-amber-500"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-200">
                            <Clock className="text-gray-400" size={20} /> 30-Day Activity Heatmap
                        </h2>
                        
                        <div className="h-64 flex items-end gap-2 px-2">
                            {xp_growth?.map((day, idx) => {
                                const height = Math.max((day.daily_xp / maxDailyXp) * 100, 2);
                                return (
                                    <div key={idx} className="flex-1 flex flex-col items-center group relative">
                                        <div 
                                            className="w-full bg-emerald-500/80 rounded-t-sm transition-all duration-500 group-hover:bg-emerald-400 group-hover:shadow-[0_0_15px_rgba(52,211,153,0.5)]" 
                                            style={{ height: `${height}%` }}
                                        />
                                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-gray-800 text-xs px-2 py-1 rounded transition-opacity whitespace-nowrap pointer-events-none z-20">
                                            {day.date}: {day.daily_xp} XP
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-200">
                            <Target className="text-gray-400" size={20} /> Skill Distribution
                        </h2>
                        <div className="space-y-4">
                            {category_distribution && Object.entries(category_distribution).sort((a,b) => b[1] - a[1]).map(([cat, val], idx) => {
                                const width = Math.max((val / maxCategory) * 100, 0);
                                return (
                                    <div key={idx}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-300 font-medium">{cat}</span>
                                            <span className="text-gray-500">{val} XP</span>
                                        </div>
                                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${width}%` }}
                                                transition={{ duration: 1, delay: idx * 0.1 }}
                                                className="h-full bg-gradient-to-r from-teal-500 to-emerald-400"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, title, value, subtitle, color }) {
    return (
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md hover:bg-white/10 transition-colors relative overflow-hidden group">
            <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${color} opacity-20 rounded-full blur-[30px] group-hover:opacity-40 transition-opacity`}></div>
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg`}>
                    {icon}
                </div>
                <div>
                    <p className="text-gray-400 text-sm font-medium">{title}</p>
                    <h3 className="text-3xl font-extrabold text-white mt-1">{value}</h3>
                    <p className="text-gray-500 text-xs mt-1">{subtitle}</p>
                </div>
            </div>
        </div>
    );
}
