import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { X, Search } from 'lucide-react';

interface UserListModalProps {
  users: User[];
  onSelect: (user: User) => void;
  onClose: () => void;
}

const UserListModal: React.FC<UserListModalProps> = ({ users, onSelect, onClose }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-[0_30px_60px_rgba(0,0,0,0.12)] flex flex-col max-h-[85vh] border border-white/50"
      >
        <div className="flex items-center justify-between mb-8 px-2">
          <div>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Explore Forest</h3>
            <p className="text-xs text-slate-400 font-medium">Connect with other digital gardeners</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="relative mb-8 px-2">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search players..." 
            className="w-full bg-slate-50 border-2 border-transparent focus:border-brand-blue focus:bg-white rounded-2xl py-4 pl-12 pr-6 outline-none transition-all placeholder:text-slate-300 text-sm font-medium"
          />
        </div>

        <div className="overflow-y-auto space-y-4 pr-3 custom-scrollbar flex-1 pb-4">
          {users.map((user) => (
            <button 
              key={user.userId}
              onClick={() => {
                onSelect(user);
                onClose();
              }}
              className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 rounded-[1.5rem] transition-all border border-transparent hover:border-slate-100 group relative"
            >
              <div className="relative">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-14 h-14 rounded-2xl border-2 border-white shadow-sm object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold text-xl">
                    {user.displayName?.[0] || '?'}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-lg border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                  {user.treeLevel}
                </div>
              </div>
              <div className="text-left flex-1 min-w-0">
                <h4 className="font-bold text-slate-800 group-hover:text-slate-900 transition-colors truncate text-base tracking-tight">{user.displayName || 'Anonymous'}</h4>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-widest">{user.leafCount} Memories</span>
                  <div className="w-1 h-1 bg-slate-200 rounded-full" />
                  <span className="text-[10px] uppercase font-extrabold text-green-500 tracking-widest">Active now</span>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-100">
                   <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UserListModal;
