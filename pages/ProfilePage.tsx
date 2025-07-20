

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/Card';
import Button from '../components/Button';
import { supaclient } from '../services/supabase';
import { UserAnswerHistoryItem, Wallet } from '../types';
import { Award, HelpCircle, Calendar, MessageSquare, Star, Wallet as WalletIcon, Trash2, ShieldCheck, CheckCircle } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  
  const [history, setHistory] = useState<UserAnswerHistoryItem[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [isSubmittingWallet, setIsSubmittingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const fetchProfileData = async () => {
        setIsLoadingData(true);
        try {
          const [historyData, walletsData] = await Promise.all([
            supaclient.getUserAnswerHistory(user.id),
            supaclient.getWallets(user.id)
          ]);
          setHistory(historyData);
          setWallets(walletsData);
        } catch (error) {
          console.error("Failed to load profile data", error);
        } finally {
          setIsLoadingData(false);
        }
      };
      
      fetchProfileData();
    }
  }, [user]);
  
  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || wallets.length >= 2 || !newWalletAddress.trim()) return;

    if (!/^0x[a-fA-F0-9]{40}$/.test(newWalletAddress.trim())) {
        setWalletError("Please enter a valid EVM wallet address (0x...).");
        return;
    }
    setWalletError(null);
    setIsSubmittingWallet(true);

    try {
        const newWallet = await supaclient.addWallet(user.id, newWalletAddress.trim());
        setWallets([...wallets, newWallet]);
        setNewWalletAddress('');
    } catch (error: any) {
        console.error("Failed to add wallet:", error);
        setWalletError(error.message || "An error occurred while adding the wallet.");
    } finally {
        setIsSubmittingWallet(false);
    }
  };

  const handleDeleteWallet = async (walletId: string) => {
    const originalWallets = wallets;
    setWallets(wallets.filter(w => w.id !== walletId));
    
    try {
        await supaclient.deleteWallet(walletId);
    } catch (error) {
        console.error("Failed to delete wallet:", error);
        alert("Failed to delete wallet. Reverting changes.");
        setWallets(originalWallets);
    }
  };


  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: string | number }> = ({ icon, label, value }) => (
    <div className="bg-slate-800/50 p-4 rounded-lg flex items-center gap-4">
        <div className="text-purple-400">{icon}</div>
        <div>
            <p className="text-sm text-slate-400">{label}</p>
            <p className="text-xl font-bold text-white">{value}</p>
        </div>
    </div>
  );

  const cardBannerStyle = user.banner_url ? { 
    backgroundImage: `linear-gradient(rgba(30, 41, 59, 0.7), rgba(30, 41, 59, 0.9)), url(${user.banner_url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, staggerChildren: 0.1 }}
      className="space-y-8"
    >
      <Card className="!p-0 overflow-hidden">
         <div className="p-6" style={cardBannerStyle}>
            <div className="flex flex-col md:flex-row items-center gap-6">
                <motion.img
                src={user.avatar_url}
                alt={user.username}
                className="w-32 h-32 rounded-full border-4 border-purple-500 shadow-lg bg-slate-800"
                whileHover={{ scale: 1.1, rotate: 5 }}
                />
                <div className="flex-grow text-center md:text-left">
                  <h1 className="text-4xl font-bold text-white drop-shadow-lg">{user.nickname || user.username}</h1>
                  <p className="text-slate-300 drop-shadow-md">@{user.username}</p>
                  <div className="flex items-center justify-center md:justify-start gap-3 mt-2">
                    {isAdmin && <span className="flex items-center gap-1.5 bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full text-xs font-semibold"><Star size={12} /> Admin</span>}
                    {user.discord_role && <span className="flex items-center gap-1.5 bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs font-semibold"><ShieldCheck size={12} /> {user.discord_role}</span>}
                  </div>
                </div>
            </div>
         </div>
         <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard icon={<Award size={24} />} label="Total Score" value={user.total_score} />
            <StatCard icon={<HelpCircle size={24} />} label="Answers Submitted" value={isLoadingData ? '...' : history.length} />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
            <h2 className="text-3xl font-bold text-white mb-6">My Wallets</h2>
            {isLoadingData ? (
               <div className="flex justify-center p-8">
                   <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
               </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {wallets.map(wallet => (
                    <motion.div
                      key={wallet.id}
                      layout
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -30, transition: {duration: 0.2} }}
                      className="flex items-center justify-between bg-slate-800/60 p-4 rounded-lg"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <WalletIcon size={20} className="text-green-400 flex-shrink-0" />
                        <p className="font-mono text-sm sm:text-base text-slate-300 truncate">{wallet.address}</p>
                      </div>
                      <Button variant="danger" onClick={() => handleDeleteWallet(wallet.id)} className="px-3 py-2 text-xs flex-shrink-0">
                        <Trash2 size={16} />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {wallets.length < 2 && (
                  <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }}>
                    <form onSubmit={handleAddWallet} className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-slate-700">
                      <input
                        type="text"
                        value={newWalletAddress}
                        onChange={(e) => {
                          setNewWalletAddress(e.target.value);
                          setWalletError(null);
                        }}
                        placeholder="Add new EVM wallet address (0x...)"
                        className="flex-grow bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:ring-purple-500 focus:border-purple-500"
                        disabled={isSubmittingWallet}
                      />
                      <Button type="submit" variant="secondary" disabled={!newWalletAddress.trim() || isSubmittingWallet}>
                        {isSubmittingWallet ? 'Adding...' : 'Add Wallet'}
                      </Button>
                    </form>
                    {walletError && (
                       <p className="text-red-400 text-sm mt-2">{walletError}</p>
                    )}
                  </motion.div>
                )}

                {wallets.length === 0 && wallets.length < 2 && (
                  <p className="text-slate-400 text-center py-4">No wallets added yet.</p>
                )}
              </div>
            )}
        </Card>

        <Card>
            <h2 className="text-3xl font-bold text-white mb-6">Permissions</h2>
             {isLoadingData ? (
                <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </div>
             ) : (
                <ul className="space-y-3">
                  <li className={`flex items-center gap-3 p-3 rounded-md ${isAdmin ? 'bg-yellow-800/60' : 'bg-slate-800/60'}`}>
                      <Star size={18} className={`${isAdmin ? 'text-yellow-400' : 'text-slate-500'}`} />
                      <span className={`font-semibold ${isAdmin ? 'text-yellow-300' : 'text-slate-400'}`}>Admin Access</span>
                  </li>
                   <li className={`flex items-center gap-3 p-3 rounded-md ${user.can_vote ? 'bg-green-800/60' : 'bg-slate-800/60'}`}>
                      <CheckCircle size={18} className={`${user.can_vote ? 'text-green-400' : 'text-slate-500'}`} />
                      <span className={`font-semibold ${user.can_vote ? 'text-green-300' : 'text-slate-400'}`}>Can Participate</span>
                  </li>
                </ul>
             )}
        </Card>
      </div>
      
      <Card>
        <h2 className="text-3xl font-bold text-white mb-6">Answer History</h2>
        {isLoadingData ? (
            <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        ) : history.length > 0 ? (
          <motion.ul 
            className="space-y-4"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            initial="hidden"
            animate="visible"
          >
            {history.map((item, index) => (
              <motion.li 
                key={index} 
                className="bg-slate-800/60 p-4 rounded-lg border-l-4 border-slate-700"
                variants={{
                    hidden: { y: 20, opacity: 0 },
                    visible: { y: 0, opacity: 1 },
                }}
                >
                <p className="text-sm text-slate-400 mb-2">{item.questions?.question_text || "Question not found"}</p>
                <div className="flex items-start gap-3">
                    <MessageSquare size={20} className="text-blue-400 mt-1 flex-shrink-0" />
                    <div>
                        <p className="text-lg text-slate-100 font-medium">"{item.answer_text}"</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                            <Calendar size={12} />
                            Answered on {new Date(item.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        ) : (
          <p className="text-slate-400 text-center py-4">You haven't answered any questions yet.</p>
        )}
      </Card>
    </motion.div>
  );
};

export default ProfilePage;