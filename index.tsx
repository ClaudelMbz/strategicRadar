import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";
import {
  Globe,
  Zap,
  Landmark,
  Cpu,
  ExternalLink,
  Download,
  RefreshCw,
  Search,
  Filter,
  Loader2,
  Moon,
  Sun,
  History,
  Trash2,
  Clock,
  ChevronRight,
  Database,
  AlertTriangle,
  Archive,
  Siren,
  Lightbulb,
  ArrowRightCircle
} from "lucide-react";

// --- Types ---

type CriticalityLevel = "HIGH" | "MEDIUM" | "LOW";
type CategoryType = "FRANCE_ADMIN" | "WORLD_MACRO" | "TECH_INNOVATION";

interface NewsItem {
  headline: string;
  date: string; // Date of the news/scan
  category: CategoryType;
  criticality: CriticalityLevel;
  impact_analysis: string; // The "So What?" for the user
  suggested_action: string; // What to do
  source: string;
  url: string;
  read?: boolean; // Track if user processed it
}

interface ScanSession {
  id: number;
  dateStr: string;
  items: NewsItem[];
}

// --- Helpers ---

const getCriticalityColor = (level: CriticalityLevel, darkMode: boolean) => {
  switch (level) {
    case "HIGH":
      return darkMode 
        ? "bg-red-900/30 text-red-300 border-red-800" 
        : "bg-red-50 text-red-700 border-red-200";
    case "MEDIUM":
      return darkMode 
        ? "bg-orange-900/30 text-orange-300 border-orange-800" 
        : "bg-orange-50 text-orange-700 border-orange-200";
    case "LOW":
      return darkMode 
        ? "bg-blue-900/30 text-blue-300 border-blue-800" 
        : "bg-slate-50 text-slate-600 border-slate-200";
  }
};

const getCategoryIcon = (cat: CategoryType) => {
  switch (cat) {
    case "FRANCE_ADMIN": return <Landmark className="w-4 h-4" />;
    case "WORLD_MACRO": return <Globe className="w-4 h-4" />;
    case "TECH_INNOVATION": return <Cpu className="w-4 h-4" />;
    default: return <Zap className="w-4 h-4" />;
  }
};

const getCategoryLabel = (cat: CategoryType) => {
  switch (cat) {
    case "FRANCE_ADMIN": return "France & Études";
    case "WORLD_MACRO": return "Monde & Géopo";
    case "TECH_INNOVATION": return "Tech & Apps";
    default: return "Autre";
  }
};

/**
 * Unique signature based on headline to deduplicate news.
 */
const getNewsSignature = (item: NewsItem): string => {
  return item.headline.toLowerCase().replace(/[^a-z0-9]/g, "");
};

// --- Sub Component: Radar Card ---

const RadarCard: React.FC<{ item: NewsItem; onToggleRead: (read: boolean) => void }> = ({ item, onToggleRead }) => {
  const [isRead, setIsRead] = useState(item.read || false);

  useEffect(() => {
    setIsRead(item.read || false);
  }, [item.read]);

  const handleToggle = () => {
    const newState = !isRead;
    setIsRead(newState);
    onToggleRead(newState);
  };

  const isHighCrit = item.criticality === "HIGH";

  return (
    <div className={`
      relative bg-white dark:bg-slate-900 rounded-xl border shadow-sm transition-all flex flex-col h-full overflow-hidden group
      ${isHighCrit ? "border-l-4 border-l-red-500" : "border-l-4 border-l-transparent"}
      ${isRead ? "opacity-60 grayscale-[0.5]" : "opacity-100"}
      border-y border-r border-slate-200 dark:border-slate-800 hover:shadow-md
    `}>
      <div className="p-5 flex-1 flex flex-col gap-4">
        
        {/* Header: Category & Criticality */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {getCategoryIcon(item.category)}
            <span>{getCategoryLabel(item.category)}</span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getCriticalityColor(item.criticality, false)} dark:${getCriticalityColor(item.criticality, true)}`}>
            {item.criticality === "HIGH" ? "CRITIQUE" : item.criticality === "MEDIUM" ? "IMPORTANT" : "INFO"}
          </span>
        </div>

        {/* Headline */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {item.headline}
        </h3>

        {/* The Analysis Block (The Value Add) */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700/50 flex-1">
          <div className="mb-2">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mb-1">
              <Zap className="w-3 h-3" /> IMPACT / CAPACITÉS
            </span>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {item.impact_analysis}
            </p>
          </div>
          
          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-1">
              <Lightbulb className="w-3 h-3" /> ACTION
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 italic">
              {item.suggested_action}
            </p>
          </div>
        </div>

        {/* Source info */}
        <div className="text-xs text-slate-400 flex items-center justify-between mt-1">
           <span className="truncate max-w-[200px]">Source: {item.source}</span>
           <span>{item.date}</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between gap-3">
        <a 
          href={item.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-all"
        >
          Lire la source
          <ExternalLink className="w-3 h-3" />
        </a>

        <button
          onClick={handleToggle}
          className={`
            relative flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer select-none text-xs font-bold
            ${isRead 
              ? "bg-slate-200 dark:bg-slate-800 text-slate-500 border-transparent" 
              : "bg-white dark:bg-slate-800 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            }
          `}
        >
           {isRead ? "LU" : "MARQUER LU"}
        </button>
      </div>
    </div>
  );
};

// --- App Component ---

const App = () => {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'scanner' | 'history' | 'master'>('scanner');

  // Scanner State
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // History State
  const [history, setHistory] = useState<ScanSession[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);

  // UI State
  const [darkMode, setDarkMode] = useState(false);
  const [onlyHighPriority, setOnlyHighPriority] = useState(false);

  // --- Effects ---

  // Load history (Note: Changed key to 'techWatchHistory' to avoid conflict with old Event data)
  useEffect(() => {
    const savedHistory = localStorage.getItem('techWatchHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
        if (parsed.length > 0) {
          setSelectedHistoryId(parsed[0].id);
        }
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // --- Handlers ---

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const saveScanToHistory = (newItems: NewsItem[]) => {
    const now = new Date();
    const newSession: ScanSession = {
      id: now.getTime(),
      dateStr: now.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }),
      items: newItems
    };

    const updatedHistory = [newSession, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('techWatchHistory', JSON.stringify(updatedHistory));
  };

  const updateItemInHistory = (index: number, read: boolean, isCurrentScan: boolean) => {
    if (isCurrentScan) {
      const updated = [...newsItems];
      updated[index] = { ...updated[index], read };
      setNewsItems(updated);
    }

    let targetHistoryId = isCurrentScan && history.length > 0 ? history[0].id : selectedHistoryId;
    
    if (targetHistoryId) {
      const updatedHistory = history.map(session => {
        if (session.id === targetHistoryId) {
          const newItems = [...session.items];
          if (newItems[index]) {
             newItems[index] = { ...newItems[index], read };
          }
          return { ...session, items: newItems };
        }
        return session;
      });
      setHistory(updatedHistory);
      localStorage.setItem('techWatchHistory', JSON.stringify(updatedHistory));
    }
  };

  const updateItemGlobal = (item: NewsItem, read: boolean) => {
    const signature = getNewsSignature(item);
    const updatedHistory = history.map(session => {
      const hasMatch = session.items.some(e => getNewsSignature(e) === signature);
      if (!hasMatch) return session;

      const newItems = session.items.map(e => {
        if (getNewsSignature(e) === signature) {
          return { ...e, read };
        }
        return e;
      });
      return { ...session, items: newItems };
    });
    setHistory(updatedHistory);
    localStorage.setItem('techWatchHistory', JSON.stringify(updatedHistory));
  };

  const deleteHistoryItem = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('techWatchHistory', JSON.stringify(updatedHistory));
    if (selectedHistoryId === id) setSelectedHistoryId(updatedHistory.length > 0 ? updatedHistory[0].id : null);
  };

  const clearHistory = () => {
    if (window.confirm("Tout effacer ?")) {
      setHistory([]);
      setSelectedHistoryId(null);
      localStorage.removeItem('techWatchHistory');
    }
  };

  const scanRadar = async () => {
    setLoading(true);
    setError(null);
    setStatus("Initialisation du Radar Stratégique...");
    setNewsItems([]);

    try {
      const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_API_KEY
});

      setStatus("Scan : France (Études), Monde (Géopo), Tech (Apps & Disruptions)...");

      const prompt = `
        Agis comme un Analyste Stratégique pour un profil "Étudiant - Ingénieur - Entrepreneur".
        
        Ta mission : Identifier les actualités RÉCENTES (derniers 7 jours).
        
        Tu dois scanner 3 domaines précis avec des cibles ajustées :

        1. FRANCE (Focus ÉTUDIANT) : Cible prioritaire = Vie étudiante.
           - Réformes de l'enseignement supérieur et des examens.
           - Aides financières (Bourses, CROUS, APL), logement étudiant.
           - Législation sur les stages et l'alternance.
           - Changements administratifs impactant les étudiants.

        2. MONDE (Géopolitique/Macro) :
           - Tensions internationales et supply chain.
           - Régulations économiques majeures.
           - Événements mondiaux impactant l'économie de la connaissance.

        3. TECH (Innovation, Modèles & APPS) :
           - Nouveaux Modèles IA (LLMs, Diffusion) MAIS SURTOUT les Applications concrètes qui viennent de sortir.
           - Outils génératifs disruptifs (Image, Vidéo, Code, Productivité) - ex: concurrents chinois, outils spécialisés.
           - Applications récentes qui bouleversent le marché (Concurrence, Nouveaux usages).
           - Qu'est-ce qu'ils sont capables de faire ? (Capabilities).
           - Percées Hardware et Frameworks majeurs.

        Pour chaque news, adapte l'ANALYSE D'IMPACT ("So What?") :
        - Pour la France : Impact sur la vie d'étudiant ou le budget.
        - Pour Monde : Impact sur la vision d'ingénieur/entrepreneur.
        - Pour la Tech : Décris les CAPACITÉS concrètes (ce qu'on peut faire avec) et l'opportunité.

        Structure de réponse JSON OBLIGATOIRE :
        [
          {
            "headline": "Titre percutant de la news",
            "date": "Date de l'info",
            "category": "FRANCE_ADMIN" ou "WORLD_MACRO" ou "TECH_INNOVATION",
            "criticality": "HIGH" (Urgent/Critique) ou "MEDIUM" (Important) ou "LOW" (Info),
            "impact_analysis": "Analyse courte : En quoi cela impacte le profil ciblé. Pour la Tech : Les capacités.",
            "suggested_action": "Action concrète (ex: Faire demande APL, Tester le modèle X).",
            "source": "Nom de la source",
            "url": "Lien vers l'article"
          }
        ]

        Trouve 12 à 15 news pertinentes (environ 4 à 5 par catégorie).
        Sois synthétique et stratégique.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      setStatus("Analyse d'impact et calcul de criticité...");

      const textResponse = response.text || "";
      let jsonString = textResponse;
      const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || textResponse.match(/```([\s\S]*?)```/);
      if (jsonMatch) jsonString = jsonMatch[1];

      let parsedItems: NewsItem[] = [];
      try {
        parsedItems = JSON.parse(jsonString);
      } catch (e) {
        // Fallback simple parsing
        const arrayStart = textResponse.indexOf("[");
        const arrayEnd = textResponse.lastIndexOf("]");
        if (arrayStart !== -1 && arrayEnd !== -1) {
             parsedItems = JSON.parse(textResponse.substring(arrayStart, arrayEnd + 1));
        } else {
            throw new Error("Format de réponse invalide.");
        }
      }

      if (parsedItems.length > 0) {
        setNewsItems(parsedItems);
        saveScanToHistory(parsedItems);
        setStatus(`Terminé ! ${parsedItems.length} signaux identifiés.`);
      } else {
        throw new Error("Aucun signal pertinent trouvé.");
      }
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors du scan.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (itemsToExport: NewsItem[], filenamePrefix: string = "radar_export") => {
    if (!itemsToExport?.length) return;
    const separator = ";";
    const escape = (str: string) => `"${(str || "").replace(/"/g, '""')}"`;
    const headers = ["Date", "Catégorie", "Criticité", "Titre", "Impact (So What?)", "Action Suggérée", "Source", "URL"];
    
    const rows = itemsToExport.map((e) =>
      [
        escape(e.date),
        escape(e.category),
        escape(e.criticality),
        escape(e.headline),
        escape(e.impact_analysis),
        escape(e.suggested_action),
        escape(e.source),
        escape(e.url),
      ].join(separator)
    );

    const csvContent = "\uFEFF" + [headers.join(separator), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Logic: Master View Deduplication ---

  const masterItems = useMemo(() => {
    const sortedHistory = [...history].sort((a, b) => b.id - a.id); // Newest first for Radar
    const uniqueMap = new Map<string, NewsItem>();

    // Iterate newly scanned first to keep freshest analysis
    sortedHistory.forEach(session => {
      session.items.forEach(item => {
        const sig = getNewsSignature(item);
        if (!uniqueMap.has(sig)) {
          uniqueMap.set(sig, item);
        } else {
          // Keep the existing (newer) item but check if old one was read
          const existing = uniqueMap.get(sig)!;
          if (item.read && !existing.read) {
             uniqueMap.set(sig, { ...existing, read: true });
          }
        }
      });
    });

    let allItems = Array.from(uniqueMap.values());
    
    // Filter by priority
    if (onlyHighPriority) {
      allItems = allItems.filter(i => i.criticality === "HIGH");
    }

    return allItems;
  }, [history, onlyHighPriority]);

  // --- Views ---

  const ScannerView = () => (
    <>
      <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-8 transition-colors duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Siren className="w-5 h-5 text-indigo-500" />
              Radar Stratégique
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl">
              Scan des opportunités et menaces.
              <br/>Cibles : <span className="font-semibold text-indigo-600 dark:text-indigo-400">France (Vie étudiante)</span>, <span className="font-semibold text-indigo-600 dark:text-indigo-400">Géopo Monde</span>, <span className="font-semibold text-indigo-600 dark:text-indigo-400">Tech (Apps & Disruptions)</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={scanRadar}
              disabled={loading}
              className={`
                relative overflow-hidden group flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
                ${loading 
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed" 
                  : "bg-indigo-600 dark:bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                }
              `}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  Lancer le Scan
                </>
              )}
            </button>
          </div>
        </div>

        {(status || error) && (
          <div className={`mt-6 p-4 rounded-lg text-sm font-medium flex items-center gap-3 border ${
            error 
              ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800/50" 
              : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800/50"
            }`}>
              {error ? (
                <span>{error}</span>
              ) : (
                <>
                  <Loader2 className={`w-4 h-4 ${loading ? "animate-spin" : "hidden"}`} />
                  {status}
                </>
              )}
          </div>
        )}
      </section>

      {newsItems.length > 0 && (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-slate-400" />
              Signaux Détectés ({newsItems.length})
            </h3>
            <button
              onClick={() => downloadCSV(newsItems)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-sm shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {newsItems.map((item, idx) => (
              <RadarCard 
                key={idx} 
                item={item} 
                onToggleRead={(read) => updateItemInHistory(idx, read, true)}
              />
            ))}
          </div>
        </section>
      )}
      
      {!loading && newsItems.length === 0 && !error && (
        <div className="text-center py-20 px-4">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Globe className="w-10 h-10 text-slate-300 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-2">En attente de mission</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Lancez l'intelligence artificielle pour scanner l'actualité politique (Focus Étudiant), géopolitique et technologique (Focus Apps & Disruptions).
          </p>
        </div>
      )}
    </>
  );

  const HistoryView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <div className="lg:col-span-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Archives</h2>
          <button onClick={clearHistory} className="text-xs text-red-500 hover:underline">Tout effacer</button>
        </div>
        <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
          {history.map((session) => (
            <div 
              key={session.id}
              onClick={() => setSelectedHistoryId(session.id)}
              className={`p-3 rounded-lg border cursor-pointer ${selectedHistoryId === session.id ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}
            >
              <div className="text-sm font-medium dark:text-slate-200">{session.dateStr.split(' à ')[0]}</div>
              <div className="text-xs text-slate-500">{session.items.length} signaux</div>
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-3">
        {selectedHistoryId && history.find(h => h.id === selectedHistoryId) ? (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {history.find(h => h.id === selectedHistoryId)!.items.map((item, idx) => (
               <RadarCard key={idx} item={item} onToggleRead={(read) => updateItemInHistory(idx, read, false)} />
             ))}
           </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 border-2 border-dashed rounded-xl border-slate-200 dark:border-slate-800">
             Sélectionnez une archive
          </div>
        )}
      </div>
    </div>
  );

  const MasterView = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex justify-between items-center">
        <div>
           <h2 className="text-xl font-bold dark:text-white flex items-center gap-2"><Archive className="w-6 h-6 text-indigo-500"/> Intelligence Base</h2>
           <p className="text-sm text-slate-500">Base de connaissance consolidée ({masterItems.length} items)</p>
        </div>
        <div className="flex gap-3">
           <label className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg cursor-pointer">
              <input type="checkbox" checked={onlyHighPriority} onChange={e => setOnlyHighPriority(e.target.checked)} className="text-indigo-600 rounded" />
              Priorité HAUTE uniquement
           </label>
           <button onClick={() => downloadCSV(masterItems, "MASTER_RADAR")} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm flex gap-2 items-center"><Download className="w-4 h-4"/> Exporter</button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
             <tr>
               <th className="px-4 py-3 w-[15%]">Catégorie</th>
               <th className="px-4 py-3 w-[45%]">Info & Impact</th>
               <th className="px-4 py-3 w-[25%]">Action Suggérée</th>
               <th className="px-4 py-3 text-right">Etat</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
             {masterItems.map((item, idx) => (
               <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                 <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2 font-bold text-xs uppercase text-slate-500 mb-2">
                       {getCategoryIcon(item.category)} {getCategoryLabel(item.category)}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getCriticalityColor(item.criticality, false)} dark:${getCriticalityColor(item.criticality, true)}`}>
                      {item.criticality}
                    </span>
                 </td>
                 <td className="px-4 py-3 align-top">
                    <div className="font-bold text-slate-900 dark:text-slate-100 mb-1">{item.headline}</div>
                    <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mb-1">IMPACT: {item.impact_analysis}</div>
                    <div className="text-xs text-slate-400">{item.date} - {item.source}</div>
                 </td>
                 <td className="px-4 py-3 align-top text-slate-600 dark:text-slate-400 text-xs italic">
                    {item.suggested_action}
                 </td>
                 <td className="px-4 py-3 align-top text-right">
                    <button onClick={() => updateItemGlobal(item, !item.read)} className={`text-xs font-bold px-2 py-1 rounded border ${item.read ? "bg-slate-100 text-slate-500" : "bg-indigo-50 text-indigo-600 border-indigo-200"}`}>{item.read ? "LU" : "A TRAITER"}</button>
                 </td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 flex flex-col">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 transition-colors duration-300">
          <div className="max-w-[95%] mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
                <Siren className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white hidden sm:block">
                Strategic Radar <span className="text-indigo-600 dark:text-indigo-400">AI</span>
              </h1>
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
               <button onClick={() => setActiveTab('scanner')} className={`px-3 py-1.5 rounded text-sm font-medium flex gap-2 items-center ${activeTab === 'scanner' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500'}`}><Zap className="w-4 h-4"/> Radar</button>
               <button onClick={() => setActiveTab('history')} className={`px-3 py-1.5 rounded text-sm font-medium flex gap-2 items-center ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500'}`}><History className="w-4 h-4"/> Archives</button>
               <button onClick={() => setActiveTab('master')} className={`px-3 py-1.5 rounded text-sm font-medium flex gap-2 items-center ${activeTab === 'master' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500'}`}><Database className="w-4 h-4"/> Base</button>
            </div>
            <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">{darkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}</button>
          </div>
        </header>

        <main className="max-w-[95%] mx-auto px-4 py-8 flex-1 w-full">
          {activeTab === 'scanner' && <ScannerView />}
          {activeTab === 'history' && <HistoryView />}
          {activeTab === 'master' && <MasterView />}
        </main>
      </div>
    </div>
  );
};

const rootElement = document.getElementById("app");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}

export default App;