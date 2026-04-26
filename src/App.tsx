import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGame } from './hooks/useGame';
import TreeCanvas from './components/TreeCanvas';
import { LeafStatus, Position } from './types';
import { 
  Sprout, 
  Trash2, 
  User as UserIcon, 
  Share2, 
  Plus, 
  LogOut, 
  Wind,
  Tractor,
  Camera
} from 'lucide-react';
import confetti from 'canvas-confetti';
 
import UserListModal from './components/UserListModal';
 
export default function App() {
  const { 
    currentUser, 
    targetUser, 
    setTargetUser,
    allUsers,
    leaves, 
    login, 
    addLeaf, 
    rakeLeaf, 
    nurtureTree,
    loading 
  } = useGame();
 
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [showUpload, setShowUpload] = useState<{ pos: Position, branchIndex: number } | null>(null);
  const [showExplore, setShowExplore] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
 
  const isMyTree = currentUser && targetUser && currentUser.userId === targetUser.userId;
 
  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
 
  const handleNurture = () => {
    nurtureTree();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4ADE80', '#22C55E', '#166534']
    });
  };
 
  const handleAddLeaf = () => {
    if (showUpload && imageUrl) {
      addLeaf(imageUrl, showUpload.pos, showUpload.branchIndex);
      setShowUpload(null);
      setImageUrl('');
    }
  };
 
  // Read a chosen file as a data URL and set it as the image source.
  // Data URLs work directly as <img src> / Konva Image, no server needed —
  // good for demos.
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };
 
  // Quick sample images for one-tap demo (Unsplash, public, hot-link friendly).
  const SAMPLE_PHOTOS = [
    'https://images.unsplash.com/photo-1552053831-71594a27632d?w=200&h=200&fit=crop', // dog
    'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=200&h=200&fit=crop', // beach
    'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=200&h=200&fit=crop', // ocean
    'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=200&h=200&fit=crop', // forest
  ];
 
  const openMemoryModal = () => {
    if (!isMyTree) return;
    // Pick a random branch slot if possible, or just index 0
    setShowUpload({ pos: { x: dimensions.width / 2, y: dimensions.height / 2 }, branchIndex: 0 });
  };
 
  if (loading) {
    return (
      <div className="h-screen w-screen bg-sky-100 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        >
          <Sprout className="w-12 h-12 text-green-500" />
        </motion.div>
      </div>
    );
  }
 
  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-b from-brand-blue to-brand-light relative font-sans text-slate-800">
      {/* Background Animated Clouds */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <motion.div 
          animate={{ x: [0, 50, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-32 left-20 w-32 h-12 bg-white rounded-full blur-xl"
        />
        <motion.div 
          animate={{ x: [0, -70, 0] }}
          transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-24 right-40 w-48 h-16 bg-white rounded-full blur-2xl"
        />
        <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-green-50 to-transparent opacity-60" />
      </div>
 
      {/* Wind Lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: -200, y: 150 + i * 200, opacity: 0 }}
            animate={{ 
              x: dimensions.width + 200, 
              y: 150 + i * 200 + Math.sin(i) * 30,
              opacity: [0, 0.4, 0] 
            }}
            transition={{ 
              duration: 8 + i * 3, 
              repeat: Infinity, 
              delay: i * 5,
              ease: "linear" 
            }}
            className="h-[1px] w-24 bg-white/60"
          />
        ))}
      </div>
 
      {!currentUser ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-brand-blue/10 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] text-center max-w-sm mx-4 border border-white/50"
          >
            <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-200">
              <div className="w-6 h-6 bg-white rounded-full" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 mb-4 tracking-tight">Leaflet</h1>
            <p className="text-slate-500 mb-10 leading-relaxed">Grow your shared memories into a digital forest. Watch your tree flourish.</p>
            <button 
              onClick={login}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3"
            >
              Sign in with Google
            </button>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Main Tree Canvas */}
          <TreeCanvas 
            width={dimensions.width}
            height={dimensions.height}
            treeLevel={targetUser?.treeLevel || 1}
            leaves={leaves}
            onRakeLeaf={rakeLeaf}
            onSharePicture={(pos, branchIndex) => setShowUpload({ pos, branchIndex })}
          />
 
          {/* Header HUD */}
          <header className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-20 pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto cursor-pointer" onClick={() => setTargetUser(currentUser)}>
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                <div className="w-5 h-5 bg-green-500 rounded-full"></div>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Leaflet</h1>
            </div>
 
            <div className="flex items-center gap-6 bg-white/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/50 pointer-events-auto">
              {isMyTree && (
                <>
                  <div className="flex flex-col items-center min-w-[70px]">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Fertilizer</span>
                    <span className="text-lg font-mono font-bold text-slate-800 leading-none">{currentUser.fertilizer}g</span>
                  </div>
                  <div className="h-6 w-px bg-slate-300"></div>
                </>
              )}
              <div className="flex flex-col items-center min-w-[70px]">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Memories</span>
                <span className="text-lg font-mono font-bold text-slate-800 leading-none">{leaves.length}</span>
              </div>
            </div>
 
            <div className="flex items-center gap-3 pointer-events-auto">
              <div className="flex -space-x-3 mr-2">
                {allUsers.slice(0, 3).map((u, i) => (
                  <img 
                    key={u.userId} 
                    src={u.photoURL || ''} 
                    className="w-8 h-8 rounded-full border-2 border-white bg-slate-200"
                    alt={u.displayName || ''} 
                    referrerPolicy="no-referrer"
                  />
                ))}
                {allUsers.length > 3 && (
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-green-400 flex items-center justify-center text-[10px] font-bold text-white">
                    +{allUsers.length - 3}
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowExplore(true)}
                className="bg-white px-4 py-2 rounded-lg shadow-sm font-semibold text-sm text-slate-700 border border-slate-100 hover:bg-slate-50 transition-colors"
              >
                Connections
              </button>
            </div>
          </header>
 
          {/* Visiting Indicator */}
          {!isMyTree && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
              <div className="bg-white/60 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/80 flex items-center gap-3">
                <img src={targetUser?.photoURL || ''} className="w-6 h-6 rounded-full" alt="User" referrerPolicy="no-referrer" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-widest">Visiting {targetUser?.displayName}'s Forest</span>
                <button 
                  onClick={() => setTargetUser(currentUser)}
                  className="ml-2 text-sky-600 hover:text-sky-700"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
 
          {/* Bottom Controls */}
          <nav className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-2xl border border-slate-100 z-30">
            <button 
              onClick={openMemoryModal}
              disabled={!isMyTree}
              className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl transition-all ${
                isMyTree ? 'bg-slate-50 text-slate-500 hover:bg-slate-100' : 'bg-slate-50/50 text-slate-300 cursor-not-allowed'
              }`}
            >
              <div className="w-6 h-6 border-2 border-current rounded-md mb-2 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Memory</span>
            </button>
            
            <button 
              onClick={isMyTree ? handleNurture : undefined}
              disabled={isMyTree && currentUser.fertilizer < 5}
              className={`flex flex-col items-center justify-center w-24 h-24 rounded-2xl transition-all shadow-xl ${
                isMyTree && currentUser.fertilizer >= 5
                  ? 'bg-green-500 text-white shadow-green-200'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-1">
                 <Sprout className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Nurture</span>
            </button>
 
            <button 
              onClick={() => setShowStats(true)}
              className="flex flex-col items-center justify-center w-20 h-20 bg-slate-50 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-1 bg-current rounded-full mb-1"></div>
              <div className="w-6 h-1 bg-current rounded-full mb-2"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Stats</span>
            </button>
          </nav>
 
          <AnimatePresence>
            {showExplore && (
              <UserListModal 
                users={allUsers} 
                onSelect={setTargetUser} 
                onClose={() => setShowExplore(false)} 
              />
            )}
          </AnimatePresence>
 
          <AnimatePresence>
            {showStats && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[200] flex items-center justify-center p-6">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl border border-white/50"
                >
                  <h3 className="text-2xl font-bold text-slate-800 mb-6">Forest Stats</h3>
                  <div className="space-y-6 mb-10">
                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                      <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Total Memories</span>
                      <span className="text-xl font-mono font-bold">{leaves.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-green-50 rounded-2xl border border-green-100">
                      <span className="text-green-600 font-bold uppercase text-[10px] tracking-widest">Tree Level</span>
                      <span className="text-xl font-mono font-bold text-green-700">{targetUser?.treeLevel}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-blue-50 rounded-2xl">
                      <span className="text-blue-500 font-bold uppercase text-[10px] tracking-widest">Connections</span>
                      <span className="text-xl font-mono font-bold">{allUsers.length}</span>
                    </div>
                    {isMyTree && (
                      <div className="flex justify-between items-center p-4 bg-orange-50 rounded-2xl">
                        <span className="text-orange-500 font-bold uppercase text-[10px] tracking-widest">Fertilizer</span>
                        <span className="text-xl font-mono font-bold">{currentUser?.fertilizer}g</span>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setShowStats(false)}
                    className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-lg"
                  >
                    Close
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
 
          {/* Upload Modal Overlay */}
          <AnimatePresence>
            {showUpload && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-6"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white rounded-[2rem] p-10 w-full max-w-md shadow-2xl border border-white/50"
                >
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">New Memory</h3>
                      <p className="text-sm text-slate-400">Pick a photo for your tree.</p>
                    </div>
                  </div>
 
                  <div className="space-y-5 mb-8">
                    {/* Option 1: Choose a file from device */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1 mb-2">
                        Upload from device
                      </label>
                      <label className="block w-full bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-200 rounded-2xl p-4 cursor-pointer text-center text-sm text-slate-500 font-medium transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFilePick}
                        />
                        Choose a photo…
                      </label>
                    </div>
 
                    {/* Option 2: Sample photos for one-tap demo */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1 mb-2">
                        Or pick a sample
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {SAMPLE_PHOTOS.map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setImageUrl(url)}
                            className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                              imageUrl === url
                                ? 'border-brand-blue ring-2 ring-brand-blue/40'
                                : 'border-slate-100 hover:border-slate-300'
                            }`}
                          >
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
 
                    {/* Option 3: paste a URL (existing) */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1 mb-2">
                        Or paste an image URL
                      </label>
                      <input
                        type="text"
                        value={imageUrl.startsWith('data:') ? '' : imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl p-3 focus:border-brand-blue focus:bg-white outline-none transition-all placeholder:text-slate-300 text-sm"
                      />
                    </div>
 
                    {/* Preview the chosen image */}
                    {imageUrl && (
                      <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3">
                        <img src={imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                        <span className="text-xs text-slate-500 font-medium">Photo selected</span>
                      </div>
                    )}
                  </div>
 
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setShowUpload(null)}
                      className="flex-1 py-4 rounded-2xl bg-slate-50 text-slate-500 font-bold hover:bg-slate-100 transition-colors"
                    >
                      Wait
                    </button>
                    <button 
                      onClick={handleAddLeaf}
                      disabled={!imageUrl}
                      className="flex-1 py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:opacity-30 transition-all shadow-xl"
                    >
                      Plant
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
 
          {/* Context UI: Active Connection Label */}
          <div className="absolute top-40 right-12 w-48 pointer-events-none">
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-white/80 shadow-sm"
            >
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-2 italic">Current Canopy</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                   <img src={targetUser?.photoURL || ''} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 truncate max-w-[100px]">{targetUser?.displayName}</p>
                  <p className="text-[10px] text-slate-500">Lvl {targetUser?.treeLevel} Tree</p>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
