import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Film, Gamepad2, Trophy, Compass, Play, Plus, Star } from 'lucide-react';
import * as api from '../services/apiServices';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function EntertainmentPage() {
    const [activeTab, setActiveTab] = useState('recommendations');

    const { data: recs, isLoading: recsLoading } = useQuery({
        queryKey: ['entertainmentRecommendations'],
        queryFn: api.getEntertainmentRecommendations
    });

    const { data: movies, isLoading: moviesLoading } = useQuery({
        queryKey: ['movies'],
        queryFn: api.getMovies
    });

    const { data: gaming, isLoading: gamingLoading } = useQuery({
        queryKey: ['gaming'],
        queryFn: api.getGamingTournaments
    });

    const { data: quests, isLoading: questsLoading } = useQuery({
        queryKey: ['quests'],
        queryFn: api.getFunQuests
    });

    const handleStartActivity = (title) => {
        toast.success(`Started activity: ${title}! Good luck!`, {
            style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
            },
        });
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white p-6 pb-20 md:pb-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-600/20 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10">
                <header className="mb-10 text-center md:text-left">
                    <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-4">
                        Entertainment Hub
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl">
                        Unwind, compete, and explore. Evolvo isn't just about grinding—it's about enjoying the journey.
                    </p>
                </header>

                <div className="flex gap-4 overflow-x-auto pb-4 mb-8 custom-scrollbar">
                    {['recommendations', 'movies', 'gaming', 'quests'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 rounded-full font-medium transition-all duration-300 capitalize flex-shrink-0 ${
                                activeTab === tab 
                                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30' 
                                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="mt-8">
                    {activeTab === 'recommendations' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-8"
                        >
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Star className="text-yellow-400" /> AI Recommendations
                            </h2>
                            {recsLoading ? (
                                <div className="h-40 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div></div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {recs?.movies?.map((item, idx) => (
                                        <RecCard key={`movie-${idx}`} item={item} icon={<Film />} type="Movie" onClick={() => handleStartActivity(item.title)} />
                                    ))}
                                    {recs?.games?.map((item, idx) => (
                                        <RecCard key={`game-${idx}`} item={item} icon={<Gamepad2 />} type="Game" onClick={() => handleStartActivity(item.title)} />
                                    ))}
                                    {recs?.sports?.map((item, idx) => (
                                        <RecCard key={`sport-${idx}`} item={item} icon={<Trophy />} type="Sport" onClick={() => handleStartActivity(item.title)} />
                                    ))}
                                    {recs?.quests?.map((item, idx) => (
                                        <RecCard key={`quest-${idx}`} item={item} icon={<Compass />} type="Quest" onClick={() => handleStartActivity(item.title)} />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'movies' && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <h2 className="text-2xl font-bold mb-6">Movie Challenges</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {moviesLoading ? <p>Loading...</p> : movies?.map(movie => (
                                    <div key={movie.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:border-purple-500/50 transition-all group backdrop-blur-sm">
                                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                                            <Film size={24} />
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">{movie.title}</h3>
                                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{movie.description || 'Watch and review this masterpiece to earn XP.'}</p>
                                        <div className="flex justify-between items-center mt-auto">
                                            <span className="text-purple-400 font-bold">+{movie.xp_reward} XP</span>
                                            <button onClick={() => handleStartActivity(movie.title)} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors">
                                                <Play size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'gaming' && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <h2 className="text-2xl font-bold mb-6">Gaming Tournaments</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {gamingLoading ? <p>Loading...</p> : gaming?.map(tourney => (
                                    <div key={tourney.id} className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 p-6 rounded-2xl hover:shadow-lg hover:shadow-indigo-500/20 transition-all backdrop-blur-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                                {tourney.status}
                                            </div>
                                            <span className="text-gray-400 text-sm">{new Date(tourney.starts_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-2xl font-bold mb-1">{tourney.title}</h3>
                                        <p className="text-indigo-400 font-medium mb-4">{tourney.game_name}</p>
                                        <div className="flex justify-between items-center border-t border-white/10 pt-4">
                                            <span className="text-yellow-400 font-bold">Prize: {tourney.xp_reward} XP</span>
                                            <button onClick={() => handleStartActivity(tourney.title)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                                Register
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'quests' && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <h2 className="text-2xl font-bold mb-6">Fun Quests</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {questsLoading ? <p>Loading...</p> : quests?.map(quest => (
                                    <div key={quest.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-colors backdrop-blur-sm">
                                        <h3 className="text-lg font-bold mb-2">{quest.title}</h3>
                                        <p className="text-gray-400 text-sm mb-4">{quest.description}</p>
                                        <div className="flex justify-between items-center">
                                            <span className="bg-pink-500/20 text-pink-400 px-3 py-1 rounded-full text-xs font-bold capitalize">
                                                {quest.difficulty}
                                            </span>
                                            <span className="text-green-400 font-bold">+{quest.xp_reward} XP</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}

function RecCard({ item, icon, type, onClick }) {
    return (
        <div 
            onClick={onClick}
            className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-purple-500/50 transition-all cursor-pointer overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform"></div>
            <div className="flex items-center gap-3 mb-4 text-purple-400">
                {icon}
                <span className="font-semibold text-sm tracking-wider uppercase">{type}</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
            <p className="text-gray-400 text-sm line-clamp-3">{item.reason}</p>
            <div className="mt-4 flex items-center text-purple-400 text-sm font-semibold opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                Accept Challenge <Play size={14} className="ml-1" />
            </div>
        </div>
    );
}
