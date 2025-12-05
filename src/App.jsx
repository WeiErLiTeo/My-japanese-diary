import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, BookOpen, Sun, Moon, Coffee, Feather, Info, Calendar, X, PenTool, Save, Instagram, Volume2, Lock, User, LogIn, CheckCircle, Image as ImageIcon, Loader2, Trash2, Maximize2 } from 'lucide-react';

// =============================================================================
// 🔥 重要：等后端搭建好后，记得回来把这个地址换成你自己的 Worker 地址！
// 目前先留空，网站能打开，但无法保存日记
// =============================================================================
const WORKER_API_URL = "https://YOUR_WORKER_URL_HERE"; 

// -----------------------------------------------------------------------------
// UI 组件 (纯展示)
// -----------------------------------------------------------------------------
const TwitterBlueBird = ({ size = 20, className = "" }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>);
const RubyText = ({ textData, className = "" }) => (<h1 className={`leading-relaxed tracking-wide ${className}`}>{textData.map((item, index) => (<span key={index} className="inline-block mx-[1px]">{item.furigana ? (<ruby className="group">{item.kanji}<rt className="text-[0.4em] font-normal opacity-60 group-hover:opacity-100 transition-opacity mb-1 select-none text-current">{item.furigana}</rt></ruby>) : (<span>{item.kanji}</span>)}</span>))}</h1>);
const AudioPlayer = ({ textToRead }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef(null);
  const handlePlay = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
      if (isPlaying) { synthRef.current.cancel(); setIsPlaying(false); } else {
        const u = new SpeechSynthesisUtterance(textToRead);
        u.lang = 'ja-JP'; u.rate = 0.8;
        u.onend = () => setIsPlaying(false);
        synthRef.current.speak(u); setIsPlaying(true);
      }
    }
  };
  return (<div className="bg-stone-800 dark:bg-stone-900 text-[#F7F4EF] p-5 rounded-2xl shadow-lg flex flex-col justify-between h-full relative overflow-hidden group"><div className="flex justify-between items-start z-10"><div><span className="text-xs uppercase tracking-[0.2em] text-stone-400">AI Voice</span><h3 className="text-sm mt-1 font-serif text-stone-200">読み上げ</h3></div><Volume2 size={16} className={`text-stone-300 transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-30'}`} /></div><div className="flex items-center gap-4 mt-6 z-10"><button onClick={handlePlay} className="w-12 h-12 rounded-full bg-[#F7F4EF] text-stone-900 flex items-center justify-center hover:scale-105 transition-transform shadow-md shrink-0">{isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1"/>}</button><div className="flex-1 w-full overflow-hidden"><div className="flex items-center gap-[2px] h-8 opacity-80">{[...Array(15)].map((_, i) => (<div key={i} className={`w-1 bg-stone-400 rounded-full transition-all duration-300 ${isPlaying ? 'animate-music-bar' : 'h-1'}`} style={{ height: isPlaying ? `${Math.max(20, Math.random() * 100)}%` : '4px', animationDelay: `${i * 0.05}s` }}></div>))}</div></div></div></div>);
};

// =============================================================================
// 逻辑组件
// =============================================================================

const DiarySection = ({ isAdmin, password, allData, onDataUpdate }) => {
  const [diaryText, setDiaryText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewingEntry, setViewingEntry] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!diaryText.trim() && !selectedImage) return;
    if (WORKER_API_URL.includes("YOUR_WORKER_URL")) {
      alert("请先配置后端 Worker 地址！(目前仅为演示)");
      return;
    }
    setIsUploading(true);
    try {
      let finalImageUrl = null;
      if (selectedImage) {
        const res = await fetch(selectedImage);
        const blob = await res.blob();
        const uploadRes = await fetch(`${WORKER_API_URL}/api/upload`, {
          method: 'PUT', headers: { 'X-Auth-Pass': password }, body: blob
        });
        if (!uploadRes.ok) throw new Error("Image Upload Failed");
        const data = await uploadRes.json();
        finalImageUrl = data.url;
      }
      const newEntry = {
        id: Date.now().toString(),
        text: diaryText,
        imageUrl: finalImageUrl,
        date: new Date().toLocaleDateString('ja-JP', {month: 'numeric', day: 'numeric'}),
        timestamp: Date.now()
      };
      const updatedEntries = [newEntry, ...(allData.entries || [])];
      const newData = { ...allData, entries: updatedEntries };
      const saveRes = await fetch(`${WORKER_API_URL}/api/data`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Pass': password }, body: JSON.stringify(newData)
      });
      if (!saveRes.ok) throw new Error("GitHub Save Failed");
      onDataUpdate(newData); setDiaryText(""); setSelectedImage(null);
    } catch (e) { alert("保存失败：" + e.message); } finally { setIsUploading(false); }
  };

  const handleDelete = async (entryId) => {
    if (!confirm("确认删除？")) return;
    if (WORKER_API_URL.includes("YOUR_WORKER_URL")) return;
    try {
      const updatedEntries = allData.entries.filter(e => e.id !== entryId);
      const newData = { ...allData, entries: updatedEntries };
      await fetch(`${WORKER_API_URL}/api/data`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Pass': password }, body: JSON.stringify(newData)
      });
      onDataUpdate(newData); setViewingEntry(null);
    } catch (e) { alert("删除失败"); }
  };

  if (!isAdmin) {
    return (<div className="h-full bg-white dark:bg-stone-800 rounded-2xl p-5 shadow-sm border border-stone-100 dark:border-stone-700 flex flex-col items-center justify-center text-center opacity-70"><Lock size={32} className="text-stone-300 mb-2" /><p className="text-sm text-stone-500">访客模式不可见</p></div>);
  }
  const entries = allData.entries || [];
  return (
    <>
      <div className="h-full bg-white dark:bg-stone-800 rounded-2xl p-5 shadow-sm border border-stone-100 dark:border-stone-700 flex flex-col group relative overflow-hidden transition-colors">
        <div className="flex items-center justify-between mb-3 text-[#7D3C3C] dark:text-[#A85A5A]"><div className="flex items-center gap-2"><PenTool size={16} /><h3 className="text-sm font-bold tracking-wider">ひとこと日記</h3></div><span className="text-[10px] text-stone-400 font-mono">{entries.length} entries</span></div>
        <div className={`relative flex-1 bg-[#F7F4EF] dark:bg-stone-900 rounded-xl p-3 transition-all duration-300 border flex flex-col ${isFocused ? 'border-[#7D3C3C]/30 shadow-inner' : 'border-transparent'}`}>
           <textarea className="w-full flex-1 bg-transparent resize-none outline-none text-stone-700 dark:text-stone-300 text-sm leading-relaxed font-serif placeholder:text-stone-400/60" placeholder="今日の学びを記録しましょう..." value={diaryText} onChange={(e) => setDiaryText(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)}/>
           {selectedImage && (<div className="relative mt-2 w-16 h-16 group/img"><img src={selectedImage} alt="Preview" className="w-full h-full object-cover rounded-md border border-stone-300 dark:border-stone-700" /><button onClick={() => setSelectedImage(null)} className="absolute -top-1 -right-1 bg-stone-500 text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"><X size={10} /></button></div>)}
           <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-stone-200 dark:border-stone-800"><div className="flex gap-2"><input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect}/><button onClick={() => fileInputRef.current?.click()} className="text-stone-400 hover:text-[#7D3C3C] transition-colors"><ImageIcon size={16} /></button></div><button onClick={handleSave} disabled={(!diaryText.trim() && !selectedImage) || isUploading} className={`p-1.5 rounded-full transition-all duration-300 flex items-center justify-center ${diaryText.trim() || selectedImage ? 'bg-[#7D3C3C] text-white shadow-md hover:scale-110' : 'bg-stone-200 dark:bg-stone-700 text-stone-400 cursor-not-allowed'}`}>{isUploading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}</button></div>
        </div>
        {entries.length > 0 && (<div className="mt-3 pt-3 border-t border-dashed border-stone-200 dark:border-stone-700 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-700/50 rounded-lg p-1 transition-colors group/entry" onClick={() => setViewingEntry(entries[0])}><div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400"><div className="flex items-center gap-2 truncate max-w-[80%]"><span className="font-mono text-[#7D3C3C] dark:text-[#A85A5A] shrink-0">{entries[0].date}</span><span className="truncate">{entries[0].text || "(Photo Entry)"}</span></div><Maximize2 size={12} className="text-stone-300 opacity-0 group-hover/entry:opacity-100 transition-opacity" /></div></div>)}
      </div>
      {viewingEntry && (<div className="fixed inset-0 z-[80] flex items-center justify-center p-4"><div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={() => setViewingEntry(null)}></div><div className="relative bg-[#F7F4EF] dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-in-up border border-stone-200 dark:border-stone-700"><div className="p-6"><div className="flex justify-between items-start mb-4"><div className="flex flex-col"><span className="text-[#7D3C3C] dark:text-[#A85A5A] font-bold text-lg font-serif">{viewingEntry.date}</span><span className="text-xs text-stone-400 uppercase tracking-widest">Diary Entry</span></div><button onClick={() => setViewingEntry(null)} className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-full transition-colors"><X size={20} className="text-stone-500" /></button></div>{viewingEntry.imageUrl && (<div className="mb-4 rounded-xl overflow-hidden shadow-sm border border-stone-100 dark:border-stone-700"><img src={viewingEntry.imageUrl} alt="Diary" className="w-full h-auto max-h-[60vh] object-contain bg-stone-100 dark:bg-stone-900" /></div>)}<p className="text-stone-700 dark:text-stone-300 font-serif leading-loose whitespace-pre-wrap text-base">{viewingEntry.text}</p></div><div className="bg-stone-100/50 dark:bg-stone-900/50 px-6 py-4 flex justify-between items-center border-t border-stone-200 dark:border-stone-700"><span className="text-xs text-stone-400 font-mono">ID: {viewingEntry.id.slice(-6)}</span><button onClick={() => handleDelete(viewingEntry.id)} className="text-red-400 hover:text-red-600 dark:hover:text-red-400 text-xs flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={14} /> 削除</button></div></div></div>)}
    </>
  );
};

const ZenMountainHeatmap = ({ isAdmin, password, allData, onDataUpdate }) => {
  const checkins = allData.checkins || [];
  const hasCheckedIn = checkins.some(ts => new Date(ts).setHours(0,0,0,0) === new Date().setHours(0,0,0,0));
  const handleCheckIn = async () => {
    if (hasCheckedIn) return;
    if (WORKER_API_URL.includes("YOUR_WORKER_URL")) { alert("请先配置后端！"); return; }
    try {
      const newCheckins = [...checkins, Date.now()];
      const newData = { ...allData, checkins: newCheckins };
      await fetch(`${WORKER_API_URL}/api/data`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Auth-Pass': password }, body: JSON.stringify(newData)
      });
      onDataUpdate(newData);
    } catch (e) { alert("打卡失败"); }
  };
  const mountainPath = useMemo(() => {
    const points = []; const width = 300; const height = 80; const steps = 14; const stepWidth = width / steps; points.push(`0,${height}`);
    for (let i = 0; i <= steps; i++) {
      const isActive = isAdmin ? checkins.length > i : Math.random() > 0.6; 
      const x = i * stepWidth; const peakHeight = isActive ? Math.random() * 40 + 10 : Math.random() * 10 + 70;
      points.push(`${x},${peakHeight}`);
    }
    points.push(`${width},${height}`); return points.join(" ");
  }, [checkins, isAdmin]);
  return (<div className="bg-white dark:bg-stone-800 p-5 rounded-xl border border-stone-100 dark:border-stone-700 h-full flex flex-col justify-between transition-colors overflow-hidden relative group"><div className="flex items-center justify-between mb-2 text-stone-500 dark:text-stone-400 z-10"><div className="flex items-center gap-2"><Calendar size={14} /><span className="text-xs font-bold uppercase tracking-widest">Consistency Flow</span></div>{isAdmin && (<button onClick={handleCheckIn} disabled={hasCheckedIn} className={`text-[10px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${hasCheckedIn ? 'bg-green-100 text-green-700 border-green-200' : 'bg-stone-50 border-stone-300 hover:bg-[#7D3C3C] hover:text-white'}`}>{hasCheckedIn ? <CheckCircle size={10} /> : null} {hasCheckedIn ? "完了" : "打卡"}</button>)}</div><div className="relative w-full h-24 flex items-end justify-center"><svg viewBox="0 0 300 80" className="w-full h-full" preserveAspectRatio="none"><defs><linearGradient id="mountainGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7D3C3C" stopOpacity="0.8"/><stop offset="100%" stopColor="#7D3C3C" stopOpacity="0.1"/></linearGradient></defs><polygon points={mountainPath} fill="url(#mountainGrad)" opacity="0.3" className="transform scale-y-75 origin-bottom translate-x-4 transition-all duration-1000 ease-in-out" /><polygon points={mountainPath} fill="url(#mountainGrad)" className="transition-all duration-1000 ease-in-out hover:opacity-90" /></svg>{!isAdmin && <p className="absolute bottom-2 text-[10px] text-stone-400">访客预览模式</p>}</div></div>);
};

// =============================================================================
// 主程序
// =============================================================================

export default function App() {
  const [theme, setTheme] = useState('light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [passwordInput, setPasswordInput] = useState("");
  const [allData, setAllData] = useState({ entries: [], checkins: [] });

  const DAILY_DATA = { date: { year: "2023", month: "10", day: "24", weekday: "火曜日", rokuyo: "大安" }, quote: { japanese: "世の中にたえて桜のなかりせば 春の心はのどけからまし", reading: [{kanji:"世",furigana:"よ"},{kanji:"の",furigana:""},{kanji:"中",furigana:"なか"},{kanji:"に",furigana:""},{kanji:"た",furigana:""},{kanji:"え",furigana:""},{kanji:"て",furigana:""},{kanji:"桜",furigana:"さくら"},{kanji:"の",furigana:""},{kanji:"な",furigana:""},{kanji:"か",furigana:""},{kanji:"り",furigana:""},{kanji:"せ",furigana:""},{kanji:"ば",furigana:""},{kanji:" ",furigana:""},{kanji:"春",furigana:"はる"},{kanji:"の",furigana:""},{kanji:"心",furigana:"こころ"},{kanji:"は",furigana:""},{kanji:"の",furigana:""},{kanji:"ど",furigana:""},{kanji:"け",furigana:""},{kanji:"か",furigana:""},{kanji:"ら",furigana:""},{kanji:"ま",furigana:""},{kanji:"し",furigana:""}], author: "在原业平", source: "《古今和歌集》", translation: "倘若世间无樱花，春心或许得安宁。", note: "这首和歌表达了对樱花之美的极致赞叹。" }, words: [{ word: "木漏れ日", furigana: "こもれび", meaning: "树叶缝隙间漏下的阳光", sentence: "木漏れ日が優しい午後。" }, { word: "泡沫", furigana: "うたかた", meaning: "短暂虚幻的事物 / 气泡", sentence: "泡沫の夢を見る。" }, { word: "積読", furigana: "つんどく", meaning: "买了书却堆着不读", sentence: "机の上に積読が増えていく。" }], grammar: { point: "～つつある", meaning: "正在不断……；逐渐…… (表示变化的持续)", example_jp: "秋が深まりつつある。", example_cn: "秋意渐浓。", note: "书面语，接动词masu形去masu，强调变化进行中。" }, culture: { title: "为何要在夏天吃鳗鱼？", content: "在日本，“土用丑日（土用の丑の日）”有吃鳗鱼的习俗。据说源于江户时代，平贺源内为了帮助鳗鱼店在夏天（淡季）促销，宣传“丑之日吃带‘う(U)’字的食物能防苦夏”。", tag: "日本の食文化" } };

  // 初始化获取 GitHub 数据
  useEffect(() => {
    if (!WORKER_API_URL.includes("YOUR_WORKER_URL")) {
      fetch(`${WORKER_API_URL}/api/data`)
        .then(res => res.json())
        .then(data => { if (data.entries) setAllData(data); })
        .catch(err => console.log("Init fetch error (maybe empty):", err));
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark', 'sepia');
    if (theme === 'dark') root.classList.add('dark'); if (theme === 'sepia') root.classList.add('sepia');
  }, [theme]);

  const handleLogin = (e) => { e.preventDefault(); setIsAdmin(true); setShowLoginModal(false); };
  const handleGuest = () => { setIsAdmin(false); setShowLoginModal(false); };

  return (
    <div className={`min-h-screen transition-colors duration-500 ease-in-out ${theme === 'dark' ? 'bg-[#1c1917] text-stone-300' : theme === 'sepia' ? 'bg-[#e8d5b5] text-[#433422]' : 'bg-[#F7F4EF] text-[#2B2B2B]'}`}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@400;700;900&family=Zen+Kurenaido&family=Noto+Sans+JP:wght@300;400;500&display=swap');body { font-family: 'Zen Old Mincho', serif; }.font-handwriting { font-family: 'Zen Kurenaido', sans-serif; }.vertical-text { writing-mode: vertical-rl; text-orientation: upright; }.sepia .bg-white { background-color: #f3e5cf !important; border-color: #dcc8a8 !important; }.sepia .text-stone-500 { color: #8c7b66 !important; }.animate-slide-in { animation: slideIn 0.3s ease-out forwards; }.animate-slide-in-up { animation: slideInUp 0.3s ease-out forwards; }@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }@keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }@keyframes music-bar { 0%, 100% { height: 20%; } 50% { height: 100%; } }.animate-music-bar { animation: music-bar 0.4s ease-in-out infinite; }`}</style>
      {showLoginModal && (<div className="fixed inset-0 z-[100] bg-stone-900/40 backdrop-blur-md flex items-center justify-center p-4"><div className="bg-[#F7F4EF] dark:bg-stone-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center border border-stone-200 dark:border-stone-700"><div className="w-12 h-12 bg-[#7D3C3C] rounded-full flex items-center justify-center text-[#F7F4EF] font-bold text-xl mx-auto mb-4 shadow-md">言</div><h2 className="text-xl font-bold text-stone-800 dark:text-stone-200 tracking-widest mb-1">言の葉の記録</h2><p className="text-xs text-stone-500 mb-8 font-mono">KOTONOHA NO KIROKU</p><form onSubmit={handleLogin} className="space-y-4"><input type="password" placeholder="Access Code" className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-600 rounded-lg px-4 py-3 text-center tracking-widest outline-none focus:border-[#7D3C3C]" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} /><button type="submit" className="w-full bg-[#7D3C3C] text-white py-3 rounded-lg hover:bg-[#632f2f] transition-colors font-bold shadow-sm flex items-center justify-center gap-2"><Lock size={16} /><span>入室する</span></button></form><div className="mt-6 pt-6 border-t border-stone-200 dark:border-stone-700"><button onClick={handleGuest} className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 transition-colors flex items-center justify-center gap-1 mx-auto"><User size={12} /><span>访客模式 (仅浏览)</span></button></div></div></div>)}
      <header className={`fixed top-0 left-0 w-full z-50 h-16 flex items-center justify-between px-6 lg:px-12 transition-all duration-300 ${theme === 'dark' ? 'bg-[#1c1917]/90' : 'bg-[#F7F4EF]/90'} backdrop-blur-md border-b border-stone-200/50 dark:border-stone-800`}><div className="flex items-center gap-3"><div className="w-8 h-8 bg-[#7D3C3C] rounded-full flex items-center justify-center text-[#F7F4EF] font-bold text-lg shadow-sm">言</div><span className="text-lg font-bold tracking-widest">言の葉の記録</span></div><div className="flex items-center gap-4"><div className="hidden md:flex bg-stone-200/50 dark:bg-stone-800 p-1 rounded-full"><button onClick={() => setTheme('light')} className={`p-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-white shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}><Sun size={14}/></button><button onClick={() => setTheme('sepia')} className={`p-1.5 rounded-full transition-all ${theme === 'sepia' ? 'bg-[#e8d5b5] shadow-sm text-[#433422]' : 'text-stone-400 hover:text-stone-600'}`}><Coffee size={14}/></button><button onClick={() => setTheme('dark')} className={`p-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-stone-700 shadow-sm text-stone-200' : 'text-stone-400 hover:text-stone-600'}`}><Moon size={14}/></button></div><button className="p-2 hover:bg-stone-200 dark:hover:bg-stone-800 rounded-full transition-colors group relative" onClick={() => setIsMenuOpen(true)}><div className="w-5 h-5 flex flex-col justify-center gap-[5px] group-hover:gap-[6px]"><span className={`w-full h-px ${theme === 'dark' ? 'bg-stone-300' : 'bg-stone-800'}`}></span><span className={`w-3/4 h-px ${theme === 'dark' ? 'bg-stone-300' : 'bg-stone-800'} self-end group-hover:w-full transition-all`}></span><span className={`w-full h-px ${theme === 'dark' ? 'bg-stone-300' : 'bg-stone-800'}`}></span></div></button></div></header>
      {isMenuOpen && (<div className="fixed inset-0 z-[60]"><div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div><div className={`absolute right-0 top-0 h-full w-72 shadow-2xl p-8 flex flex-col border-l border-stone-200 dark:border-stone-800 animate-slide-in ${theme === 'dark' ? 'bg-[#1c1917]' : 'bg-[#F7F4EF]'}`}><div className="flex justify-between items-center mb-8"><span className="text-xs font-mono text-stone-400">MENU</span><button onClick={() => setIsMenuOpen(false)}><X size={24} className="text-stone-500" /></button></div><div className="md:hidden mb-8"><h4 className="text-xs uppercase tracking-[0.2em] text-stone-400 mb-3">Appearance</h4><div className="flex gap-2"><button onClick={() => setTheme('light')} className={`flex-1 py-2 rounded border text-xs ${theme === 'light' ? 'border-[#7D3C3C] text-[#7D3C3C]' : 'border-stone-300 text-stone-400'}`}>Light</button><button onClick={() => setTheme('sepia')} className={`flex-1 py-2 rounded border text-xs ${theme === 'sepia' ? 'border-[#7D3C3C] text-[#7D3C3C]' : 'border-stone-300 text-stone-400'}`}>Sepia</button><button onClick={() => setTheme('dark')} className={`flex-1 py-2 rounded border text-xs ${theme === 'dark' ? 'border-[#7D3C3C] text-[#7D3C3C]' : 'border-stone-300 text-stone-400'}`}>Dark</button></div></div><h4 className="text-xs uppercase tracking-[0.2em] text-stone-400 mb-4 border-b border-stone-300 dark:border-stone-800 pb-2">Profile</h4><div className="flex flex-col gap-4"><a href="#" className="flex items-center gap-4 group p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-all"><div className="w-10 h-10 rounded-full bg-white dark:bg-stone-700 shadow-sm flex items-center justify-center text-stone-800 dark:text-stone-200"><TwitterBlueBird size={20} /></div><div><span className="block text-sm font-bold">Twitter</span><span className="text-xs text-stone-400">@kotoba_diary</span></div></a><a href="#" className="flex items-center gap-4 group p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-all"><div className="w-10 h-10 rounded-full bg-white dark:bg-stone-700 shadow-sm flex items-center justify-center text-stone-800 dark:text-stone-200"><Instagram size={20} className="hover:text-[#E1306C]" /></div><div><span className="block text-sm font-bold">Instagram</span><span className="text-xs text-stone-400">@kotoba_gram</span></div></a></div><div className="mt-auto"><button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 text-xs text-stone-400 hover:text-[#7D3C3C] transition-colors"><LogIn size={14} /> <span>Switch User Mode</span></button></div></div></div>)}
      <main className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-min"><div className="hidden lg:flex flex-col items-center justify-start pt-4 gap-4 row-span-2"><div className="border-l border-stone-300 dark:border-stone-700 h-20"></div><div className="vertical-text text-xl font-bold tracking-[0.3em] h-48 leading-loose select-none">{DAILY_DATA.date.year}年<span className="my-4 block text-[#7D3C3C]">{DAILY_DATA.date.month}月{DAILY_DATA.date.day}日</span>{DAILY_DATA.date.weekday}</div><div className="w-8 h-8 rounded border border-[#7D3C3C] text-[#7D3C3C] text-xs flex items-center justify-center p-1 font-serif writing-mode-vertical-rl">{DAILY_DATA.date.rokuyo}</div><div className="border-l border-stone-300 dark:border-stone-700 h-full flex-1 min-h-[100px]"></div></div><div className="lg:hidden col-span-1 md:col-span-2 flex justify-between items-end border-b border-stone-300 dark:border-stone-700 pb-4 mb-2"><div><p className="text-3xl font-serif">{DAILY_DATA.date.month}<span className="text-sm mx-1">/</span>{DAILY_DATA.date.day}</p><p className="text-xs text-stone-500 mt-1 uppercase tracking-widest">{DAILY_DATA.date.weekday} | {DAILY_DATA.date.year}</p></div><div className="px-3 py-1 border border-[#7D3C3C] text-[#7D3C3C] text-xs rounded-full">{DAILY_DATA.date.rokuyo}</div></div><div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-auto bg-white dark:bg-stone-800 p-8 md:p-12 rounded-2xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all"><span className="absolute -top-6 -left-6 text-9xl font-serif opacity-[0.03] select-none pointer-events-none text-stone-900 dark:text-stone-100">“</span><div className="relative z-10 flex flex-col h-full justify-center"><div className="mb-6 flex justify-center md:justify-start"><span className="bg-[#5F6F5E] text-white text-[10px] px-2 py-1 tracking-widest uppercase rounded-sm">Today's Quote</span></div><div className="text-center md:text-left mb-8"><RubyText textData={DAILY_DATA.quote.reading} className="text-2xl md:text-3xl lg:text-4xl font-medium" /></div><div className="space-y-4 md:border-l-2 md:border-stone-100 dark:md:border-stone-700 md:pl-6"><p className="text-stone-600 dark:text-stone-300 font-serif leading-loose text-lg">{DAILY_DATA.quote.translation}</p><div className="text-right md:text-left mt-4"><p className="text-sm font-bold">— {DAILY_DATA.quote.author}</p><p className="text-xs text-stone-400 mt-1 italic">{DAILY_DATA.quote.source}</p></div></div><div className="mt-8 pt-6 border-t border-dashed border-stone-200 dark:border-stone-700 text-xs text-stone-500 leading-relaxed flex gap-3"><Info size={14} className="shrink-0 mt-0.5 text-stone-300" />{DAILY_DATA.quote.note}</div></div></div><div className="col-span-1 md:col-span-1 lg:col-span-1 flex flex-col gap-6"><div className="h-48"><AudioPlayer textToRead={DAILY_DATA.quote.japanese} /></div><div className="flex-1 min-h-[240px]"><DiarySection isAdmin={isAdmin} password={passwordInput} allData={allData} onDataUpdate={setAllData} /></div></div>{DAILY_DATA.words.map((word, index) => (<div key={index} className="col-span-1 bg-white/60 dark:bg-stone-800/60 backdrop-blur-sm p-5 rounded-xl border border-stone-100 dark:border-stone-700 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"><span className="absolute top-3 right-3 text-xs font-serif text-stone-300 z-10">0{index + 1}</span><div className="relative z-10"><h3 className="text-xl font-bold mb-1 font-serif">{word.word}</h3><p className="text-xs text-stone-500 mb-3 font-mono">{word.furigana}</p><div className="h-px w-8 bg-[#7D3C3C]/30 mb-3"></div><p className="text-sm font-bold text-stone-600 dark:text-stone-400 mb-2">{word.meaning}</p><div className="bg-[#F7F4EF] dark:bg-stone-900 p-2 rounded text-xs text-stone-500 leading-relaxed italic border-l-2 border-stone-300 dark:border-stone-600">{word.sentence}</div></div></div>))}<div className="col-span-1 md:col-span-2 bg-[#fffdf5] dark:bg-stone-900 p-6 rounded-2xl shadow-sm border border-yellow-50/50 dark:border-stone-700 relative overflow-hidden transform rotate-[0.5deg] hover:rotate-0 transition-transform duration-300"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-yellow-200/40 dark:bg-yellow-900/20 rotate-[-2deg] backdrop-blur-sm shadow-sm"></div><div className="font-handwriting text-stone-700 dark:text-stone-300 mt-2"><div className="flex items-center gap-2 mb-4 text-[#7D3C3C]"><Feather size={18} /><h3 className="text-xl font-bold">文法ノート</h3></div><div className="flex flex-col md:flex-row gap-6"><div className="flex-1"><span className="text-3xl block mb-2 border-b-2 border-stone-800/10 dark:border-stone-200/10 inline-block pb-1">{DAILY_DATA.grammar.point}</span><p className="text-lg mb-4">{DAILY_DATA.grammar.meaning}</p></div><div className="flex-1 bg-white/50 dark:bg-stone-800/50 p-4 rounded-xl border border-stone-200/50 dark:border-stone-700 border-dashed"><p className="text-xl mb-1">{DAILY_DATA.grammar.example_jp}</p><p className="text-sm text-stone-500">{DAILY_DATA.grammar.example_cn}</p></div></div></div></div><div className="col-span-1 md:col-span-1 lg:row-span-1 bg-stone-800 text-[#F7F4EF] rounded-2xl overflow-hidden shadow-lg flex flex-col relative group"><div className="h-32 bg-stone-700 relative overflow-hidden"><svg className="absolute inset-0 w-full h-full opacity-30" width="100%" height="100%"><pattern id="pattern-circles" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1.5" fill="#F7F4EF" /></pattern><rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-circles)" /></svg><div className="absolute inset-0 flex items-center justify-center"><span className="text-5xl select-none opacity-20 transform group-hover:scale-110 transition-transform duration-500">鰻</span></div><div className="absolute bottom-3 left-4 bg-[#7D3C3C] text-[10px] px-2 py-0.5 rounded text-white">{DAILY_DATA.culture.tag}</div></div><div className="p-5 flex-1 flex flex-col justify-between"><div><h3 className="text-md font-bold font-serif mb-2 leading-snug">{DAILY_DATA.culture.title}</h3><p className="text-xs text-stone-400 leading-relaxed line-clamp-3">{DAILY_DATA.culture.content}</p></div></div></div><div className="col-span-1"><ZenMountainHeatmap isAdmin={isAdmin} password={passwordInput} allData={allData} onDataUpdate={setAllData} /></div></div><footer className="mt-16 border-t border-stone-300 dark:border-stone-700 py-10 flex flex-col items-center"><div className="flex items-center justify-center gap-4 mb-4 opacity-60 hover:opacity-100 transition-opacity"><BookOpen size={20} className="text-stone-600 dark:text-stone-400"/><span className="w-1 h-1 bg-stone-400 rounded-full"></span><Sun size={20} className="text-stone-600 dark:text-stone-400"/></div><p className="text-xs text-stone-500 tracking-widest font-serif">言の葉の記録 © 2023 | 言葉は、心をつなぐ架け橋。</p></footer></main>
    </div>
  );
}