import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";
import {
  Calendar,
  MapPin,
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
  Check,
  CalendarPlus,
  AlertCircle,
  Settings,
  Copy,
  Table,
  Archive
} from "lucide-react";

// --- Types ---

interface EventItem {
  title: string;
  date: string;
  location: string;
  price: string;
  description: string;
  url: string;
  tags: string[];
  addedToCalendar?: boolean; // New field to track status
}

interface ScanSession {
  id: number;
  dateStr: string;
  events: EventItem[];
}

// --- Helpers ---

/**
 * Advanced date parsing to extract Day, Month, and Time Range (Start - End).
 * Handles formats like "Jeudi 24 Oct, 9h-18h", "24/10 09:00 - 21:00", etc.
 */
const parseEventDateInfo = (dateStr: string): { start: Date, end: Date } => {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Defaults
  let day = -1;
  let month = now.getMonth();
  let year = currentYear;
  
  let startHour = 9;
  let startMin = 0;
  let endHour = -1;
  let endMin = 0;

  const cleanStr = dateStr.toLowerCase();

  // 1. Detect Month
  const months: { [key: string]: number } = {
    'jan': 0, 'fév': 1, 'fev': 1, 'mar': 2, 'avr': 3, 'mai': 4, 'juin': 5,
    'juil': 6, 'aoû': 7, 'aout': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'déc': 11, 'dec': 11
  };
  
  for (const [mName, mIdx] of Object.entries(months)) {
    if (cleanStr.includes(mName)) {
      month = mIdx;
      break;
    }
  }

  // 2. Detect Day (First number 1-31 that is NOT part of a time pattern)
  // We temporarily mask time patterns to find the day safely.
  const strWithoutTimes = cleanStr.replace(/(\d{1,2})\s*(?:h|:)\s*(\d{0,2})/gi, "TIME");
  const dayMatches = strWithoutTimes.match(/\b([1-3][0-9]|[1-9])\b/);
  
  if (dayMatches && dayMatches[0]) {
    day = parseInt(dayMatches[0]);
  } else {
    // Fallback: if no day found, assume tomorrow
    day = now.getDate() + 1;
  }

  // Handle Year rollover (e.g. searching in Dec for an Jan event)
  if (month < now.getMonth() && year === currentYear) {
    year = currentYear + 1;
  }

  // 3. Detect Times (Start and optional End)
  // Regex looks for "9h", "9h30", "09:00", "21h"
  const timeRegex = /(\d{1,2})\s*(?:h|:)\s*(\d{0,2})/gi;
  const timeMatches = [...cleanStr.matchAll(timeRegex)];
  
  if (timeMatches.length > 0) {
    // First match is Start
    startHour = parseInt(timeMatches[0][1]);
    const minStr = timeMatches[0][2];
    startMin = minStr ? parseInt(minStr) : 0;
    
    if (timeMatches.length > 1) {
      // Second match is End
      endHour = parseInt(timeMatches[1][1]);
      const endMinStr = timeMatches[1][2];
      endMin = endMinStr ? parseInt(endMinStr) : 0;
    }
  }

  // Construct Start Date
  const startDate = new Date(year, month, day, startHour, startMin, 0);

  // Construct End Date
  const endDate = new Date(year, month, day);
  if (endHour !== -1) {
    endDate.setHours(endHour, endMin, 0);
    // If end time is smaller than start time (e.g. 22h - 02h), it ends the next day
    if (endDate < startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
  } else {
    // Default duration: 2 hours if no end time specified
    endDate.setHours(startDate.getHours() + 2, startDate.getMinutes(), 0);
  }

  return { start: startDate, end: endDate };
};

/**
 * Generate a unique signature for an event to detect duplicates.
 * Based on sanitized Title + Date.
 */
const getEventSignature = (event: EventItem): string => {
  const cleanTitle = event.title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanDate = event.date.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${cleanTitle}_${cleanDate}`;
};

// --- Google Calendar Magic Link Logic ---

const openGoogleCalendar = (event: EventItem): boolean => {
  try {
    const { start, end } = parseEventDateInfo(event.date);

    // Helper to format date as YYYYMMDDTHHmmss (Local Time)
    // We do NOT use UTC (Z) because we want to force the event to be in Paris Time
    // regardless of where the user's computer thinks it is.
    const formatLocal = (d: Date) => {
      const pad = (n: number) => n < 10 ? '0' + n : n;
      return '' + d.getFullYear() + 
             pad(d.getMonth() + 1) + 
             pad(d.getDate()) + 'T' + 
             pad(d.getHours()) + 
             pad(d.getMinutes()) + '00';
    };

    const datesParam = `${formatLocal(start)}/${formatLocal(end)}`;

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `[Event Clock] ${event.title}`,
      details: `${event.description}\n\nLien original: ${event.url}\n\nPrix: ${event.price}`,
      location: event.location,
      dates: datesParam,
      ctz: 'Europe/Paris' // Force Paris Timezone
    });

    const url = `https://calendar.google.com/calendar/render?${params.toString()}`;
    window.open(url, '_blank');
    return true;
  } catch (e) {
    console.error("Error generating link", e);
    return false;
  }
};


// --- Sub Component: Event Card ---

const EventCard: React.FC<{ event: EventItem; onToggleCalendar: (added: boolean) => void }> = ({ event, onToggleCalendar }) => {
  const isFree = event.price?.toLowerCase().includes("gratuit") || event.price?.toLowerCase().includes("free");
  
  // Local visual state for the toggle, synced with props
  const [isAdded, setIsAdded] = useState(event.addedToCalendar || false);

  useEffect(() => {
    setIsAdded(event.addedToCalendar || false);
  }, [event.addedToCalendar]);

  const handleToggle = () => {
    if (isAdded) {
      // User wants to reset status (Switch to OFF)
      setIsAdded(false);
      onToggleCalendar(false);
      return;
    }

    // User wants to add (Switch to ON)
    // Strategy: Open Magic Link -> Assume success -> Turn ON
    openGoogleCalendar(event);
    setIsAdded(true);
    onToggleCalendar(true);
  };

  return (
    <div className={`
      relative bg-white dark:bg-slate-900 rounded-xl border shadow-sm transition-all flex flex-col h-full overflow-hidden group
      ${isAdded ? "border-indigo-500 dark:border-indigo-500 ring-1 ring-indigo-500" : "border-slate-200 dark:border-slate-800 hover:shadow-md"}
    `}>
      <div className="p-5 flex-1 flex flex-col">
        {/* Header: Date & Price */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-sm font-semibold bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-md">
            <Calendar className="w-3.5 h-3.5" />
            {event.date}
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
            isFree 
              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800" 
              : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-700"
          }`}>
            {event.price || "N/A"}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {event.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-sm mb-4">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {event.tags?.map((tag, i) => (
            <span key={i} className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>

        {/* Description */}
        <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-3 mb-4 flex-1">
          {event.description}
        </p>
      </div>

      {/* Footer / Action */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between gap-3">
        
        {/* Compact View Button */}
        <a 
          href={event.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-indigo-300 hover:text-indigo-600 transition-all"
        >
          Voir le lien
          <ExternalLink className="w-3 h-3" />
        </a>

        {/* The Toggle Switch for Calendar */}
        <button
          onClick={handleToggle}
          className={`
            relative flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer select-none
            ${isAdded 
              ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-200 dark:shadow-none" 
              : "bg-slate-200 dark:bg-slate-700 border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600"
            }
          `}
          title={isAdded ? "Ajouté à l'agenda" : "Ajouter à l'agenda Google (ouvre un onglet)"}
        >
          <div className="flex flex-col text-[9px] font-bold leading-none tracking-widest uppercase">
            <span>{isAdded ? "ON" : "OFF"}</span>
          </div>
          
          <div className={`
            w-5 h-5 rounded-full flex items-center justify-center shadow-sm transition-all transform
            ${isAdded 
              ? "bg-white text-indigo-600 translate-x-0" 
              : "bg-white text-slate-400 -translate-x-0"
            }
          `}>
             {isAdded ? (
               <Check className="w-3 h-3" />
             ) : (
               <CalendarPlus className="w-3 h-3" />
             )}
          </div>
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
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // History State
  const [history, setHistory] = useState<ScanSession[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);

  // UI State
  const [darkMode, setDarkMode] = useState(false);
  const [hidePastEvents, setHidePastEvents] = useState(false);

  // --- Effects ---

  // Load history
  useEffect(() => {
    const savedHistory = localStorage.getItem('eventClockHistory');
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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const saveScanToHistory = (newEvents: EventItem[]) => {
    const now = new Date();
    const newSession: ScanSession = {
      id: now.getTime(),
      dateStr: now.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }),
      events: newEvents
    };

    const updatedHistory = [newSession, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('eventClockHistory', JSON.stringify(updatedHistory));
  };

  const updateEventInHistory = (eventIndex: number, added: boolean, isCurrentScan: boolean) => {
    // Logic for updating specific items...
    
    // 1. Update in Current Scan view if needed
    if (isCurrentScan) {
      const updatedEvents = [...events];
      updatedEvents[eventIndex] = { ...updatedEvents[eventIndex], addedToCalendar: added };
      setEvents(updatedEvents);
    }

    // 2. Update in History Storage (Complexity here is finding the right item in history)
    // To keep it robust, we should find the event in the history structure by signature if possible,
    // or just rely on the session ID context.
    
    // For simplicity in this demo, if we modify from 'Scanner', we assume it's the latest session.
    // If we modify from 'History', we use selectedHistoryId.
    // If we modify from 'Master', we need a more complex update (find session containing this event).
    // Given the request, we'll keep the simple logic for Scanner/History views for now.
    
    let targetHistoryId = isCurrentScan && history.length > 0 ? history[0].id : selectedHistoryId;
    
    if (targetHistoryId) {
      const updatedHistory = history.map(session => {
        if (session.id === targetHistoryId) {
          const newEvents = [...session.events];
          if (newEvents[eventIndex]) {
             newEvents[eventIndex] = { ...newEvents[eventIndex], addedToCalendar: added };
          }
          return { ...session, events: newEvents };
        }
        return session;
      });
      
      setHistory(updatedHistory);
      localStorage.setItem('eventClockHistory', JSON.stringify(updatedHistory));
    }
  };

  // Special updater for Master View
  const updateEventGlobal = (event: EventItem, added: boolean) => {
    const signature = getEventSignature(event);
    
    // We need to iterate through ALL history sessions and update any matching event
    const updatedHistory = history.map(session => {
      const hasMatch = session.events.some(e => getEventSignature(e) === signature);
      if (!hasMatch) return session;

      const newEvents = session.events.map(e => {
        if (getEventSignature(e) === signature) {
          return { ...e, addedToCalendar: added };
        }
        return e;
      });
      return { ...session, events: newEvents };
    });

    setHistory(updatedHistory);
    localStorage.setItem('eventClockHistory', JSON.stringify(updatedHistory));
  };

  const deleteHistoryItem = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('eventClockHistory', JSON.stringify(updatedHistory));
    
    if (selectedHistoryId === id) {
      setSelectedHistoryId(updatedHistory.length > 0 ? updatedHistory[0].id : null);
    }
  };

  const clearHistory = () => {
    if (window.confirm("Voulez-vous vraiment effacer tout l'historique ?")) {
      setHistory([]);
      setSelectedHistoryId(null);
      localStorage.removeItem('eventClockHistory');
    }
  };

  const scanEvents = async () => {
    setLoading(true);
    setError(null);
    setStatus("Initialisation de l'agent IA...");
    setEvents([]);

    try {
      const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_API_KEY
});


      setStatus("Exploration du web en cours (Île-de-France)...");

      const prompt = `
        Agis comme un chasseur d'événements professionnel pour un profil "Étudiant - Ingénieur - Entrepreneur".
        
        Ta mission : Trouver des événements pertinents à venir prochainement (cette semaine ou mois prochain) en Île-de-France.
        
        Cibles de recherche :
        1. Événements Tech & Ingénierie (Conférences, Hackathons, AWS, Google Cloud, Salons industriels).
        2. Événements Entrepreneuriat (Station F, Pitch nights, Networking, Afterworks).
        3. Événements Étudiants (Salons, Job dating, Rencontres inter-écoles).
        4. Événements Généralistes intéressants pour le networking (Science, Culture, Innovation).

        Utilise Google Search pour trouver des informations RÉELLES et ACTUALISÉES.
        
        IMPORTANT : Tu dois me répondre UNIQUEMENT avec un tableau JSON valide.
        Ne mets pas de texte avant ou après le JSON.
        
        Structure du JSON attendu pour chaque événement :
        [
          {
            "title": "Nom de l'événement",
            "date": "Date et Heure (ex: Jeudi 24 Oct, 09h00 - 18h00)",
            "location": "Lieu précis ou Ville (ex: Station F, Paris 13)",
            "price": "Gratuit, Payant (prix si dispo), ou Inconnu",
            "description": "Très courte description (1 phrase)",
            "url": "L'URL la plus pertinente trouvée pour l'inscription",
            "tags": ["Tech", "Networking"] (choisis parmi: Tech, Ingénierie, Business, Étudiant, Autre)
          }
        ]

        Trouve au moins 8 à 12 événements variés.
        ESSAIE DE TROUVER LES HEURES DE DÉBUT ET DE FIN si possible (ex: 18h30 - 20h30).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      setStatus("Traitement et structuration des données...");

      const textResponse = response.text || "";
      
      let jsonString = textResponse;
      const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || textResponse.match(/```([\s\S]*?)```/);
      
      if (jsonMatch) {
        jsonString = jsonMatch[1];
      }

      let parsedEvents: EventItem[] = [];
      try {
        parsedEvents = JSON.parse(jsonString);
      } catch (e) {
        console.error("Failed to parse JSON", e);
        const arrayStart = textResponse.indexOf("[");
        const arrayEnd = textResponse.lastIndexOf("]");
        if (arrayStart !== -1 && arrayEnd !== -1) {
             const subStr = textResponse.substring(arrayStart, arrayEnd + 1);
             parsedEvents = JSON.parse(subStr);
        } else {
            throw new Error("L'IA n'a pas renvoyé un format valide. Réessayez.");
        }
      }

      if (parsedEvents.length > 0) {
        setEvents(parsedEvents);
        saveScanToHistory(parsedEvents);
        setStatus(`Terminé ! ${parsedEvents.length} événements trouvés et archivés.`);
      } else {
        throw new Error("Aucun événement trouvé.");
      }
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue lors de la recherche.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (eventsToExport: EventItem[], filenamePrefix: string = "event_clock_export") => {
    if (!eventsToExport || eventsToExport.length === 0) return;

    // Use semicolon for Excel France compatibility
    const separator = ";";
    const headers = ["Date", "Titre", "Lieu", "Prix", "Catégorie", "Description", "URL"];
    
    // Helper to safely quote strings and handle existing quotes
    const escape = (str: string) => `"${(str || "").replace(/"/g, '""')}"`;

    const rows = eventsToExport.map((e) =>
      [
        escape(e.date),
        escape(e.title),
        escape(e.location),
        escape(e.price),
        escape((e.tags || []).join(" - ")),
        escape(e.description),
        escape(e.url),
      ].join(separator)
    );

    // Add Byte Order Mark (BOM) \uFEFF so Excel recognizes it as UTF-8 (fixes black diamonds)
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

  const masterEvents = useMemo(() => {
    // 1. Sort sessions: Oldest to Newest
    // This ensures that when we merge, the newest data overwrites the old data
    const sortedHistory = [...history].sort((a, b) => a.id - b.id);
    
    const uniqueMap = new Map<string, EventItem>();

    sortedHistory.forEach(session => {
      session.events.forEach(evt => {
        const sig = getEventSignature(evt);
        const existing = uniqueMap.get(sig);

        if (existing) {
          // Merge strategy:
          // - Take mostly new fields (evt) because they are fresher
          // - But KEEP 'addedToCalendar' if it was ever true
          uniqueMap.set(sig, {
            ...evt,
            addedToCalendar: existing.addedToCalendar || evt.addedToCalendar
          });
        } else {
          uniqueMap.set(sig, evt);
        }
      });
    });

    // Convert map to array and sort by Date
    let allEvents = Array.from(uniqueMap.values());

    // Sort by real date
    allEvents.sort((a, b) => {
      const dateA = parseEventDateInfo(a.date).start;
      const dateB = parseEventDateInfo(b.date).start;
      return dateA.getTime() - dateB.getTime();
    });

    // Filter passed events if requested
    if (hidePastEvents) {
      const now = new Date();
      // Remove events older than yesterday (allow some buffer)
      now.setHours(0,0,0,0);
      now.setDate(now.getDate() - 1);
      
      allEvents = allEvents.filter(e => {
        const { start } = parseEventDateInfo(e.date);
        return start >= now;
      });
    }

    return allEvents;
  }, [history, hidePastEvents]);


  // --- Views ---

  const ScannerView = () => (
    <>
      <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mb-8 transition-colors duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              Scanner le Web
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              L'IA recherche les événements Tech, Ingé & Entrepreneur du moment en Île-de-France.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={scanEvents}
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
                  Recherche en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  Lancer le Scan Quotidien
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
                <span>Erreur: {error}</span>
              ) : (
                <>
                  <Loader2 className={`w-4 h-4 ${loading ? "animate-spin" : "hidden"}`} />
                  {status}
                </>
              )}
          </div>
        )}
      </section>

      {events.length > 0 && (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              Résultats du jour ({events.length})
            </h3>
            <button
              onClick={() => downloadCSV(events)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors font-medium text-sm shadow-sm"
            >
              <Download className="w-4 h-4" />
              Exporter en CSV
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((evt, idx) => (
              <EventCard 
                key={idx} 
                event={evt} 
                onToggleCalendar={(added) => updateEventInHistory(idx, added, true)}
              />
            ))}
          </div>
        </section>
      )}
      
      {!loading && events.length === 0 && !error && (
        <div className="text-center py-20 px-4">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors duration-300">
            <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-2">Prêt à scanner</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Lancez le scan pour demander à l'IA de parcourir Meetup, Eventbrite et les sites tech pour vous.
          </p>
        </div>
      )}
    </>
  );

  const HistoryView = () => {
    const selectedSession = history.find(h => h.id === selectedHistoryId);

    if (history.length === 0) {
      return (
        <div className="text-center py-20 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <History className="w-10 h-10 text-slate-300 dark:text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-2">Aucun historique</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Les résultats de vos futurs scans apparaîtront ici automatiquement.
          </p>
          <button 
            onClick={() => setActiveTab('scanner')}
            className="mt-6 text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Lancer un premier scan
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500" />
              Scans passés
            </h2>
            <button 
              onClick={clearHistory}
              className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline"
            >
              Tout effacer
            </button>
          </div>
          
          <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            {history.map((session) => (
              <div 
                key={session.id}
                onClick={() => setSelectedHistoryId(session.id)}
                className={`
                  group p-3 rounded-lg border cursor-pointer transition-all relative
                  ${selectedHistoryId === session.id 
                    ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-200 dark:ring-indigo-800" 
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700"
                  }
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900`}>
                    {session.events.length} events
                  </span>
                  <button 
                    onClick={(e) => deleteHistoryItem(session.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                    title="Supprimer ce scan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  {session.dateStr.split(' à ')[0]} 
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {session.dateStr.split(' à ')[1]}
                </div>

                {selectedHistoryId === session.id && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-indigo-500 rotate-45 hidden lg:block"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {selectedSession ? (
            <div className="animate-in fade-in duration-300">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                 <div>
                   <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                     Résultats du {selectedSession.dateStr}
                   </h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400">
                     {selectedSession.events.length} événements archivés ce jour-là.
                   </p>
                 </div>
                 <button
                    onClick={() => downloadCSV(selectedSession.events, `event_clock_history_${selectedSession.id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    Ré-exporter CSV
                  </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedSession.events.map((evt, idx) => (
                    <EventCard 
                      key={idx} 
                      event={evt} 
                      onToggleCalendar={(added) => updateEventInHistory(idx, added, false)}
                    />
                  ))}
               </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <ChevronRight className="w-8 h-8 mb-2" />
              <p>Sélectionnez un scan dans la liste pour voir les détails.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const MasterView = () => {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
             <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Archive className="w-6 h-6 text-indigo-500" />
                Répertoire Global
             </h2>
             <p className="text-slate-500 dark:text-slate-400 text-sm">
                Vue consolidée et dédoublonnée de tous vos scans ({masterEvents.length} événements uniques).
             </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={hidePastEvents} 
                  onChange={(e) => setHidePastEvents(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Masquer les passés
             </label>

             <button
              onClick={() => downloadCSV(masterEvents, "event_clock_MASTER")}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
            >
              <Download className="w-4 h-4" />
              Tout Exporter
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 w-[45%]">Titre & Lieu</th>
                  <th className="px-4 py-3 w-[25%]">Date</th>
                  <th className="px-4 py-3 w-[10%] hidden md:table-cell">Prix</th>
                  <th className="px-4 py-3 w-[10%] hidden lg:table-cell">Tags</th>
                  <th className="px-4 py-3 w-[10%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {masterEvents.map((evt, idx) => {
                  const isFree = evt.price?.toLowerCase().includes("gratuit") || evt.price?.toLowerCase().includes("free");
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-slate-900 dark:text-slate-200 mb-1">{evt.title}</div>
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
                          <MapPin className="w-3 h-3" />
                          {evt.location}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-indigo-600 dark:text-indigo-400 align-top">
                        {evt.date}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell align-top">
                        <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border ${
                          isFree 
                            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800" 
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-100 dark:border-slate-700"
                        }`}>
                          {evt.price}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell align-top">
                        <div className="flex flex-wrap gap-1">
                          {evt.tags.slice(0, 2).map((tag, tIdx) => (
                             <span key={tIdx} className="text-[10px] uppercase text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded">
                               {tag}
                             </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <div className="flex justify-end gap-2">
                          <a 
                            href={evt.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Voir le lien"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          
                          <button
                            onClick={() => {
                               const newState = !evt.addedToCalendar;
                               if(newState) openGoogleCalendar(evt);
                               updateEventGlobal(evt, newState);
                            }}
                            className={`
                              p-1.5 rounded-md transition-all flex items-center gap-1 text-xs font-bold border
                              ${evt.addedToCalendar 
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300" 
                                : "bg-white border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700 hover:border-slate-300"
                              }
                            `}
                          >
                             {evt.addedToCalendar ? "ON" : "OFF"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {masterEvents.length === 0 && (
              <div className="p-10 text-center text-slate-400">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Aucun événement trouvé dans l'historique.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900 selection:text-indigo-900 dark:selection:text-indigo-100 transition-colors duration-300 flex flex-col">
        
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 transition-colors duration-300">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white hidden sm:block">
                Event Clock <span className="text-indigo-600 dark:text-indigo-400">AI</span>
              </h1>
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('scanner')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'scanner' 
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Scanner</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'history' 
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Historique</span>
              </button>
              <button
                onClick={() => setActiveTab('master')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'master' 
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <Archive className="w-4 h-4" />
                <span className="hidden sm:inline">Répertoire</span>
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleDarkMode}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                title={darkMode ? "Passer en mode clair" : "Passer en mode sombre"}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
          {activeTab === 'scanner' && <ScannerView />}
          {activeTab === 'history' && <HistoryView />}
          {activeTab === 'master' && <MasterView />}
        </main>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("app")!);
root.render(<App />);