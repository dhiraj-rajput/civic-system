import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, Trash2, Lightbulb, Droplets, MapPin, 
  Map, MoreHorizontal, Check, RefreshCw, Upload
} from 'lucide-react';
import { api } from '@/api/client';
import Button from '@/components/ui/Button';
import AISuggestion from '@/components/ai/AISuggestion';
import { useToast } from '@/components/ui/Toast';
import { PriorityBadge } from '@/components/Badges';
import ComplaintMap from '@/components/ComplaintMap';
import MediaUpload from '@/components/MediaUpload';
import MediaGallery from '@/components/MediaGallery';

const CATEGORIES = [
  { id: 'pothole', icon: AlertTriangle, label: 'Pothole', desc: 'Road damage, deep holes or asphalt trenches' },
  { id: 'garbage', icon: Trash2, label: 'Garbage', desc: 'Uncollected waste, overflowing bins or dumping' },
  { id: 'streetlight', icon: Lightbulb, label: 'Streetlight', desc: 'Dark streets, broken poles or flickering lamps' },
  { id: 'water_supply', icon: Droplets, label: 'Water Supply', desc: 'Pipe leaks, low pressure or dirty tap water' },
  { id: 'other', icon: MoreHorizontal, label: 'Other', desc: 'Any other civic or infrastructure issue' },
];

export default function SubmitComplaint() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState('40.7128');
  const [lng, setLng] = useState('-74.0060');
  const [address, setAddress] = useState('');
  const [mediaUrls, setMediaUrls] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  
  // AI Suggestion State
  const [aiResult, setAiResult] = useState(null);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeText = async (text) => {
    if (text.length < 15) {
      setAiResult(null);
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const result = await api.post('/ai/analyze', { description: text });
      setAiResult(result);
    } catch (err) {
      console.error('AI Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDescriptionChange = (e) => {
    const text = e.target.value;
    setDescription(text);
    
    if (typingTimeout) clearTimeout(typingTimeout);
    
    const newTimeout = setTimeout(() => {
      analyzeText(text);
    }, 1500);
    setTypingTimeout(newTimeout);
  };

  useEffect(() => {
    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [typingTimeout]);

  const NYC_BOROUGHS = [
    { name: 'Manhattan', lat: '40.7831', lng: '-73.9712', address: 'Broadway & 42nd St, Manhattan, NY 10036' },
    { name: 'Brooklyn', lat: '40.6782', lng: '-73.9442', address: 'Cadman Plaza, Brooklyn, NY 11201' },
    { name: 'Queens', lat: '40.7282', lng: '-73.7949', address: 'Queens Blvd, Queens, NY 11435' },
    { name: 'Bronx', lat: '40.8448', lng: '-73.8648', address: 'Grand Concourse, Bronx, NY 10451' },
    { name: 'Staten Island', lat: '40.5795', lng: '-74.1502', address: 'Hyatt St, Staten Island, NY 10301' },
  ];

  const reverseGeocode = async (latitude, longitude) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          setAddress(data.display_name);
        }
      }
    } catch (e) {
      // fallback without blocking
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.info('Browser geolocation unavailable. Click any borough chip below.');
      return;
    }
    
    toast.info('Detecting coordinates...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude.toFixed(6);
        const newLng = position.coords.longitude.toFixed(6);
        setLat(newLat);
        setLng(newLng);
        toast.success('Location updated from device GPS');
        reverseGeocode(newLat, newLng);
      },
      (error) => {
        // Fallback gracefully without a harsh error
        const fallback = NYC_BOROUGHS[0];
        setLat(fallback.lat);
        setLng(fallback.lng);
        if (!address) setAddress(fallback.address);
        toast.info('GPS permission prompt was dismissed or unavailable. Set to Manhattan (use borough chips or click map).');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  };

  const handleBoroughSelect = (b) => {
    setLat(b.lat);
    setLng(b.lng);
    setAddress(b.address);
    toast.info(`Location set to ${b.name}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCategory || !description || !address) {
      toast.error('Please fill in all required fields (category, description, address)');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        category: selectedCategory,
        description,
        address_text: address,
        media_urls: mediaUrls,
        location: {
          lat: lat ? parseFloat(lat) : 40.7128,
          lng: lng ? parseFloat(lng) : -74.0060,
        },
      };
      
      const response = await api.post('/complaints', payload);
      setSubmittedData(response);
      toast.success('Complaint submitted successfully');
    } catch (err) {
      toast.error(err.detail || 'Failed to submit complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmittedData(null);
    setSelectedCategory('');
    setDescription('');
    setLat('40.7128');
    setLng('-74.0060');
    setAddress('');
    setMediaUrls([]);
    setAiResult(null);
  };

  if (submittedData) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mb-6">
          <Check size={40} className="text-success animate-[bounce_1s_ease-in-out]" />
        </div>
        
        <h1 className="font-serif text-3xl font-bold text-ink mb-2">Complaint Submitted</h1>
        <p className="text-ink-secondary mb-8 text-center max-w-md text-sm">
          Your issue has been successfully routed to the municipal management pipeline.
        </p>

        <div className="bg-card border border-border rounded-xl shadow-sm w-full p-6 mb-8 space-y-6">
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div className="text-ink-secondary">Complaint ID</div>
            <div className="font-mono font-medium text-ink text-right">#{submittedData.complaint_id || submittedData.id}</div>
            
            <div className="text-ink-secondary">Category</div>
            <div className="font-medium text-ink text-right capitalize">{submittedData.category}</div>
            
            <div className="text-ink-secondary">Priority Score</div>
            <div className="text-right flex items-center justify-end gap-2">
              <span className="font-mono font-bold text-ink">{submittedData.priority_score} pts</span>
              <PriorityBadge priority={submittedData.priority_label} />
            </div>
          </div>
          
          {submittedData.media_urls && submittedData.media_urls.length > 0 && (
            <MediaGallery mediaUrls={submittedData.media_urls} title="Attached Evidence" />
          )}

          {submittedData.ai_analysis?.summary && (
            <div className="bg-brand/5 border border-brand/20 p-4 rounded-lg">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand mb-1">AI Extracted Summary</h3>
              <p className="text-xs text-ink-secondary leading-relaxed">{submittedData.ai_analysis.summary}</p>
            </div>
          )}
          
          {submittedData.is_duplicate && (
            <div className="bg-warning/10 border border-warning/30 p-4 rounded-lg flex gap-3 text-warning-dark text-xs">
              <AlertTriangle size={18} className="shrink-0 text-warning" />
              <div>
                <strong>Duplicate Cluster Match:</strong> This complaint shares keywords and location with an existing issue and has been linked to master case <code>{submittedData.duplicate_group_id}</code>.
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 w-full">
          <Button as={Link} to="/citizen/complaints" variant="outline" className="flex-1">
            View My Complaints
          </Button>
          <Button onClick={resetForm} variant="primary" className="flex-1">
            Submit Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-ink">Report a Civic Issue</h1>
        <p className="text-xs text-ink-muted mt-1">Submit reports with GPS pins, photo/video evidence, and smart priority assignment.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-8 bg-card border border-border p-6 sm:p-8 rounded-xl shadow-sm">
        
        {/* Category Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-ink">
            What type of issue is this? <span className="text-danger">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all duration-200 ${
                    isSelected 
                      ? 'border-brand bg-brand/5 shadow-[0_0_0_1px_var(--color-brand)]' 
                      : 'border-border bg-card hover:bg-surface-hover hover:border-border-strong'
                  }`}
                >
                  <div className={`mt-0.5 ${isSelected ? 'text-brand' : 'text-ink-muted'}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className={`font-medium text-sm ${isSelected ? 'text-brand' : 'text-ink'}`}>
                      {cat.label}
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5">{cat.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-ink">
              Description <span className="text-danger">*</span>
            </label>
            <div className="flex items-center gap-2">
              {isAnalyzing && <RefreshCw size={14} className="animate-spin text-ink-muted" />}
              <span className="text-xs text-ink-muted">{description.length}/1000</span>
            </div>
          </div>
          
          <div className="relative">
            <textarea
              value={description}
              onChange={handleDescriptionChange}
              rows={4}
              maxLength={1000}
              placeholder="Describe the issue in detail (e.g. Deep crater pothole outside metro exit damaging car wheels)..."
              className="w-full rounded-md border border-border bg-surface-input px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand resize-y min-h-[100px]"
            />
          </div>
          
          <AISuggestion 
            suggestion={aiResult} 
            onAccept={() => {
              setSelectedCategory(aiResult.category);
              toast.success(`Category updated to ${aiResult.category}`);
              setAiResult(null);
            }} 
            onDismiss={() => setAiResult(null)} 
          />
        </div>

        {/* Media Upload (Images & Videos) */}
        <div className="pt-4 border-t border-border">
          <MediaUpload
            mediaUrls={mediaUrls}
            onChange={setMediaUrls}
            maxFiles={4}
            label="Attach Media Evidence"
            helperText="Upload photos or videos of the problem (JPEG, PNG, WebP, MP4, WebM)"
          />
        </div>

        {/* Location & Map Section */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="block text-sm font-medium text-ink">
                Location Details & Interactive Pin <span className="text-danger">*</span>
              </label>
              <p className="text-xs text-ink-muted">Drag or click on the map to place the incident pin, or select a NYC borough.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleGetLocation} className="shrink-0 flex items-center gap-1.5">
              <MapPin size={14} className="text-brand" /> My GPS
            </Button>
          </div>

          {/* Quick Borough Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-muted font-medium">Quick Borough:</span>
            {NYC_BOROUGHS.map((b) => (
              <button
                key={b.name}
                type="button"
                onClick={() => handleBoroughSelect(b)}
                className="text-xs px-2.5 py-1 rounded-full border border-border bg-surface-muted hover:border-brand/40 hover:text-brand transition-colors text-ink-secondary font-medium"
              >
                {b.name}
              </button>
            ))}
          </div>

          {/* Interactive Map Picker */}
          <ComplaintMap
            mode="picker"
            lat={parseFloat(lat) || 40.7128}
            lng={parseFloat(lng) || -74.0060}
            onLocationChange={({ lat: newLat, lng: newLng }) => {
              const sLat = Number(newLat).toFixed(6);
              const sLng = Number(newLng).toFixed(6);
              setLat(sLat);
              setLng(sLng);
              reverseGeocode(sLat, sLng);
            }}
            style={{ height: "300px", width: "100%" }}
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Latitude</label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="e.g. 40.7128"
                className="w-full rounded-md border border-border bg-surface-input px-3 py-2 text-xs text-ink font-mono focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Longitude</label>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="e.g. -74.0060"
                className="w-full rounded-md border border-border bg-surface-input px-3 py-2 text-xs text-ink font-mono focus:border-brand focus:outline-none"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">Street Address or Landmark <span className="text-danger">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
                <Map size={16} />
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 85 Broad Street, Financial District, Manhattan"
                className="w-full rounded-md border border-border bg-surface-input pl-10 pr-4 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border flex justify-end">
          <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className="w-full sm:w-auto">
            Submit Complaint
          </Button>
        </div>
        
      </form>
    </div>
  );
}
