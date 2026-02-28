import { useState, useEffect, useRef } from 'react';
import { 
  Search, MapPin, Filter, MessageSquare, X, Navigation, 
  Clock, Info, Star, ChevronRight, Map as MapIcon, List,
  User, LogIn, Send, Loader2, Phone, Accessibility, Calendar
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import L from 'leaflet';

// Fix Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Temple {
  id: number;
  name: string;
  type: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  opening_hours: string;
  ritual_timings: string;
  festivals: string;
  accessibility: string;
  contact: string;
  description: string;
  image_url: string;
  distance?: number;
}

interface Review {
  id: number;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

// --- Components ---

const MapUpdater = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
};

export default function App() {
  const [temples, setTemples] = useState<Temple[]>([]);
  const [selectedTemple, setSelectedTemple] = useState<Temple | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.5204, 73.8567]); // Pune default
  const [isLoading, setIsLoading] = useState(false);

  const templeTypes = ['Hindu', 'Buddhist', 'Jain', 'Sikh', 'Other'];

  useEffect(() => {
    fetchTemples();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc);
          setMapCenter(loc);
          fetchTemples(loc);
        },
        () => console.log("Location access denied")
      );
    }
  }, []);

  const fetchTemples = async (loc?: [number, number]) => {
    setIsLoading(true);
    try {
      let url = `/api/temples?city=${searchQuery}`;
      if (selectedTypes.length > 0) url += `&type=${selectedTypes.join(',')}`;
      if (loc || userLocation) {
        const [lat, lng] = loc || userLocation!;
        url += `&lat=${lat}&lng=${lng}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setTemples(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTemples();
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  useEffect(() => {
    fetchTemples();
  }, [selectedTypes]);

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#1A1A1A]/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#FF6321] rounded-full flex items-center justify-center text-white">
            <MapPin size={24} />
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-tight">TempleFinder AI</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#1A1A1A]/20 hover:bg-[#1A1A1A]/5 transition-colors"
          >
            {viewMode === 'list' ? <MapIcon size={18} /> : <List size={18} />}
            <span className="text-sm font-medium uppercase tracking-wider">
              {viewMode === 'list' ? 'Map View' : 'List View'}
            </span>
          </button>
          <button className="w-10 h-10 rounded-full border border-[#1A1A1A]/20 flex items-center justify-center hover:bg-[#1A1A1A]/5">
            <User size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar / Filters */}
        <aside className="lg:col-span-3 space-y-8">
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/50">Search</h2>
            <form onSubmit={handleSearch} className="relative">
              <input 
                type="text" 
                placeholder="City or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-[#1A1A1A]/20 rounded-xl px-4 py-3 pl-11 focus:outline-none focus:ring-2 focus:ring-[#FF6321]/20 transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40" size={18} />
            </form>
          </section>

          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/50">Temple Type</h2>
            <div className="flex flex-wrap gap-2">
              {templeTypes.map(type => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium border transition-all",
                    selectedTypes.includes(type) 
                      ? "bg-[#FF6321] border-[#FF6321] text-white shadow-lg shadow-[#FF6321]/20" 
                      : "bg-white border-[#1A1A1A]/10 text-[#1A1A1A]/60 hover:border-[#1A1A1A]/30"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </section>

          {selectedTemple && (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 shadow-xl shadow-black/5 border border-[#1A1A1A]/5 space-y-6"
            >
              <div className="relative aspect-video rounded-2xl overflow-hidden">
                <img src={selectedTemple.image_url} alt={selectedTemple.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button 
                  onClick={() => setSelectedTemple(null)}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/70"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF6321]">{selectedTemple.type}</span>
                <h3 className="text-xl font-serif font-bold leading-tight">{selectedTemple.name}</h3>
                <p className="text-sm text-[#1A1A1A]/60 flex items-start gap-2">
                  <MapPin size={14} className="mt-1 shrink-0" />
                  {selectedTemple.address}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#1A1A1A]/5">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/40">Hours</span>
                  <p className="text-xs font-medium">{selectedTemple.opening_hours}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/40">Distance</span>
                  <p className="text-xs font-medium">{selectedTemple.distance ? `${selectedTemple.distance.toFixed(1)} km` : 'N/A'}</p>
                </div>
              </div>

              <button className="w-full bg-[#1A1A1A] text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#333] transition-colors">
                <Navigation size={16} />
                Get Directions
              </button>
            </motion.section>
          )}
        </aside>

        {/* Main Content Area */}
        <div className="lg:col-span-9">
          {viewMode === 'list' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isLoading ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-[#1A1A1A]/40">
                  <Loader2 className="animate-spin mb-4" size={48} />
                  <p className="font-medium">Finding spiritual spaces...</p>
                </div>
              ) : temples.length > 0 ? (
                temples.map(temple => (
                  <motion.div
                    layoutId={`temple-${temple.id}`}
                    key={temple.id}
                    onClick={() => {
                      setSelectedTemple(temple);
                      setMapCenter([temple.lat, temple.lng]);
                    }}
                    className={cn(
                      "group bg-white rounded-3xl p-4 border border-[#1A1A1A]/5 cursor-pointer hover:shadow-2xl hover:shadow-black/5 transition-all",
                      selectedTemple?.id === temple.id && "ring-2 ring-[#FF6321]"
                    )}
                  >
                    <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-4">
                      <img src={temple.image_url} alt={temple.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                      <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {temple.type}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-serif font-bold text-lg leading-tight group-hover:text-[#FF6321] transition-colors">{temple.name}</h3>
                        {temple.distance && (
                          <span className="text-xs font-bold text-[#1A1A1A]/40">{temple.distance.toFixed(1)}km</span>
                        )}
                      </div>
                      <p className="text-sm text-[#1A1A1A]/50 line-clamp-1">{temple.address}</p>
                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex items-center gap-1 text-xs font-medium text-[#1A1A1A]/60">
                          <Clock size={14} />
                          {temple.opening_hours.split('-')[0]}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-medium text-[#1A1A1A]/60">
                          <Accessibility size={14} />
                          Access
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto text-[#1A1A1A]/20">
                    <Search size={40} />
                  </div>
                  <p className="text-[#1A1A1A]/50 font-medium">No temples found matching your criteria.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-[calc(100vh-12rem)] rounded-3xl overflow-hidden border border-[#1A1A1A]/10 shadow-inner">
              <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapUpdater center={mapCenter} />
                {temples.map(temple => (
                  <Marker 
                    key={temple.id} 
                    position={[temple.lat, temple.lng]}
                    eventHandlers={{
                      click: () => setSelectedTemple(temple),
                    }}
                  >
                    <Popup>
                      <div className="p-1">
                        <h4 className="font-bold font-serif">{temple.name}</h4>
                        <p className="text-xs text-gray-500">{temple.type}</p>
                        <button 
                          onClick={() => setSelectedTemple(temple)}
                          className="mt-2 text-[10px] font-bold uppercase text-[#FF6321]"
                        >
                          View Details
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
        </div>
      </main>

      {/* Chatbot Toggle */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-[#FF6321] text-white rounded-full shadow-2xl shadow-[#FF6321]/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50"
      >
        <MessageSquare size={28} />
      </button>

      {/* Chatbot Drawer */}
      <AnimatePresence>
        {isChatOpen && (
          <ChatDrawer 
            onClose={() => setIsChatOpen(false)} 
            location={userLocation}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ChatDrawer({ onClose, location }: { onClose: () => void, location: [number, number] | null }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: 'Namaste! I am your Temple Finder Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg, 
          location: location ? { lat: location[0], lng: location[1] } : null 
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.text }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I am having trouble connecting right now.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[60] flex flex-col"
    >
      <div className="p-6 border-b border-[#1A1A1A]/10 flex items-center justify-between bg-[#FF6321] text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="font-bold">Temple Assistant</h3>
            <p className="text-[10px] uppercase tracking-widest opacity-70">Always Online</p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 hover:bg-white/10 rounded-full flex items-center justify-center">
          <X size={20} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F5F2ED]/30">
        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "flex flex-col max-w-[85%]",
            msg.role === 'user' ? "ml-auto items-end" : "items-start"
          )}>
            <div className={cn(
              "p-4 rounded-2xl text-sm leading-relaxed",
              msg.role === 'user' 
                ? "bg-[#FF6321] text-white rounded-tr-none" 
                : "bg-white text-[#1A1A1A] border border-[#1A1A1A]/5 rounded-tl-none shadow-sm"
            )}>
              {msg.text}
            </div>
            <span className="text-[10px] uppercase tracking-widest text-[#1A1A1A]/30 mt-2">
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </span>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 text-[#1A1A1A]/40">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs font-medium italic">Assistant is thinking...</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-6 border-t border-[#1A1A1A]/10 bg-white">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about temples..."
            className="w-full bg-[#F5F2ED] border-none rounded-2xl px-6 py-4 pr-14 focus:ring-2 focus:ring-[#FF6321]/20 transition-all outline-none"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#FF6321] text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
