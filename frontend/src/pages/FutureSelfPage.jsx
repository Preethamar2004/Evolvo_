import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, Trophy, Target, AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react';
import * as api from '../services/apiServices';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function FutureSelfPage() {
    const queryClient = useQueryClient();
    const [selectedPath, setSelectedPath] = useState(null);

    const { data: simulationData, isLoading } = useQuery({
        queryKey: ['futureSelf'],
        queryFn: api.getFutureSelfSimulation,
        retry: false
    });

    const simulateMutation = useMutation({
        mutationFn: api.runFutureSelfSimulation,
        onSuccess: () => {
            queryClient.invalidateQueries(['futureSelf']);
            toast.success("Timeline successfully generated!");
            setSelectedPath(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.detail || "Failed to run simulation");
        }
    });

    const handleSimulate = () => {
        simulateMutation.mutate();
    };

    const simulations = simulationData?.simulations || [];

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-6 pb-20 md:pb-6 relative overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                <header className="mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-500 mb-4 flex items-center gap-3">
                            <Sparkles className="text-cyan-400" size={40} /> Future Self Simulator
                        </h1>
                        <p className="text-gray-400 text-lg max-w-2xl">
                            Peer into the quantum timeline. Based on your current XP, skills, and interests, our AI projects multiple possible future outcomes.
                        </p>
                    </div>
                    <button 
                        onClick={handleSimulate}
                        disabled={simulateMutation.isPending}
                        className="bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={simulateMutation.isPending ? "animate-spin" : ""} />
                        {simulateMutation.isPending ? "Calculating..." : "Run New Simulation"}
                    </button>
                </header>

                {isLoading && !simulations.length ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
                        <p className="text-cyan-400 animate-pulse">Analyzing timelines...</p>
                    </div>
                ) : !simulations.length ? (
                    <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md">
                        <Sparkles size={64} className="mx-auto text-gray-500 mb-6" />
                        <h2 className="text-2xl font-bold mb-4">No Timelines Generated</h2>
                        <p className="text-gray-400 mb-8 max-w-md mx-auto">Run a simulation to see where your current habits and skills will lead you in the next 1 to 5 years.</p>
                        <button onClick={handleSimulate} className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-cyan-500/25 transition-all">
                            Initialize Simulation
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-5 space-y-4">
                            <h3 className="text-xl font-bold text-gray-300 mb-6">Possible Outcomes</h3>
                            {simulations.map((sim, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    onClick={() => setSelectedPath(sim)}
                                    className={`p-6 rounded-2xl cursor-pointer border transition-all ${
                                        selectedPath?.title === sim.title 
                                        ? 'bg-gradient-to-r from-cyan-900/40 to-indigo-900/40 border-cyan-500/50 shadow-lg shadow-cyan-500/20' 
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    }`}
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-xl font-bold">{sim.title}</h4>
                                        <span className="text-sm font-mono text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded">
                                            {sim.probability}% Prob
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-400 line-clamp-2">
                                        Path requires: {sim.improvement_suggestions[0]}
                                    </p>
                                </motion.div>
                            ))}
                        </div>

                        <div className="lg:col-span-7">
                            <AnimatePresence mode="wait">
                                {selectedPath ? (
                                    <motion.div
                                        key={selectedPath.title}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md h-full"
                                    >
                                        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/10">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                                                <Target size={32} />
                                            </div>
                                            <div>
                                                <h2 className="text-3xl font-extrabold">{selectedPath.title}</h2>
                                                <p className="text-cyan-400">Projected Timeline</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                            <div>
                                                <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-gray-300">
                                                    <Trophy className="text-yellow-400" size={20} /> Predicted Achievements
                                                </h3>
                                                <ul className="space-y-3">
                                                    {selectedPath.predicted_achievements.map((ach, i) => (
                                                        <li key={i} className="flex items-start gap-2 text-gray-400 bg-white/5 p-3 rounded-lg">
                                                            <ChevronRight size={18} className="text-cyan-500 shrink-0 mt-0.5" />
                                                            {ach}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-gray-300">
                                                    <AlertTriangle className="text-orange-400" size={20} /> Missing Skills
                                                </h3>
                                                <ul className="space-y-3">
                                                    {selectedPath.missing_skills.map((skill, i) => (
                                                        <li key={i} className="flex items-center justify-between text-gray-400 bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg">
                                                            {skill}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-bold flex items-center gap-2 mb-6 text-gray-300">
                                                <TrendingUp className="text-green-400" size={20} /> Action Plan
                                            </h3>
                                            <div className="relative border-l-2 border-indigo-500/30 ml-3 space-y-6">
                                                {selectedPath.improvement_suggestions.map((sug, i) => (
                                                    <div key={i} className="relative pl-6">
                                                        <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-[#0a0a0f]"></div>
                                                        <p className="text-gray-300 font-medium">{sug}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/10 rounded-3xl p-10">
                                        <Target size={64} className="mb-4 opacity-50" />
                                        <p className="text-xl">Select a path to view detailed projections</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
