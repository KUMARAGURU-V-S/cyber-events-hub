"use client";

import { useEffect, useState } from "react";
import { ExternalLink, CalendarDays, Shield, LayoutGrid, ListFilter } from "lucide-react";
import { CyberEvent } from "./api/events/route";

export default function Home() {
  const [events, setEvents] = useState<CyberEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [sourceFilter, setSourceFilter] = useState<string>("All");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        setEvents(data);
      } catch (error) {
        console.error("Failed to fetch events", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const eventTypes = ["All", "CTF", "Hackathon", "Conference", "Meetup"];
  const eventSources = ["All", "CTFtime", "Unstop", "Devpost", "FOSS Chennai", "Developers.events"];
  
  const filteredEvents = events.filter(e => {
    if (typeFilter !== "All" && e.type !== typeFilter) return false;
    if (sourceFilter !== "All" && e.source !== sourceFilter) return false;
    return true;
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return "TBA";
    // Check if it's a simple string like "Apr 15 2026"
    if (dateString.match(/^[a-zA-Z]{3} \d{1,2} \d{4}$/)) return dateString;
    
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', month: 'short', day: 'numeric'
    };
    try {
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch {
      return dateString;
    }
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  return (
    <div className="layout-wrapper">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2><Shield size={24} className="icon-gradient" /> Cyber Hub</h2>
        </div>
        
        <div className="filter-section">
          <h3><ListFilter size={16} /> Event Type</h3>
          <div className="filter-options">
            {eventTypes.map(t => (
              <label key={t} className="filter-label">
                <input 
                  type="radio" 
                  name="type" 
                  checked={typeFilter === t} 
                  onChange={() => setTypeFilter(t)} 
                />
                <span className="custom-radio"></span>
                {t}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <h3><LayoutGrid size={16} /> Data Source</h3>
          <div className="filter-options">
            {eventSources.map(s => (
              <label key={s} className="filter-label">
                <input 
                  type="radio" 
                  name="source" 
                  checked={sourceFilter === s} 
                  onChange={() => setSourceFilter(s)} 
                />
                <span className="custom-radio"></span>
                {s}
              </label>
            ))}
          </div>
        </div>
        
        <div className="sidebar-footer">
          <p>Real-time data cached for 1 hour to prevent IP blocks.</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="main-header">
          <h1>
            <span className="title-gradient">Cybersecurity</span> Events
          </h1>
          <p className="subtitle">Discover the latest CTFs and Hackathons from across the web</p>
        </header>

        {loading ? (
          <div className="loader-container">
            <div className="spinner"></div>
            <p>Scanning the matrix for events...</p>
          </div>
        ) : (
          <div className="events-grid">
            {filteredEvents.length === 0 ? (
              <div className="empty-state">
                <Shield size={48} />
                <h3>No events found</h3>
                <p>Try adjusting your filters on the left.</p>
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div key={event.id} className="event-card">
                  <div className="card-header">
                    <div className={`event-type ${event.type.toLowerCase()}`}>
                      <Shield size={14} />
                      {event.type}
                    </div>
                    <span className="tag source-tag">{event.source}</span>
                  </div>
                  
                  <h3 className="event-title" title={event.title}>{event.title}</h3>
                  
                  <div className="event-dates">
                    <CalendarDays size={14} />
                    <span>{formatDate(event.startDate)} {event.endDate && event.endDate !== event.startDate ? `- ${formatDate(event.endDate)}` : ''}</span>
                  </div>
                  
                  <p className="event-desc">{stripHtml(event.description) || "No description provided."}</p>
                  
                  <div className="tags-container">
                    {event.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                  
                  <a href={event.url} target="_blank" rel="noopener noreferrer" className="action-btn">
                    View Details
                    <ExternalLink size={16} />
                  </a>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
