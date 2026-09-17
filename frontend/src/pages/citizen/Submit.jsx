import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, Trash2, Lightbulb, Droplets, MapPin, 
  Map, MoreHorizontal, Check, RefreshCw
} from 'lucide-react';
import { api } from '../../api/client.js';
import Button from '../../components/ui/Button.jsx';
import AISuggestion from '../../components/ai/AISuggestion.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { PriorityBadge } from '../../components/Badges.jsx';

const CATEGORIES = [
  { id: 'pothole', icon: AlertTriangle, label: 'Pothole', desc: 'Road damage or deep holes' },
  { id: 'garbage', icon: Trash2, label: 'Garbage', desc: 'Uncollected waste or dumping' },
  { id: 'streetlight', icon: Lightbulb, label: 'Streetlight', desc: 'Broken or flickering lights' },
  { id: 'water_supply', icon: Droplets, label: 'Water Supply', desc: 'Leaks or pressure issues' },
  { id: 'other', icon: MoreHorizontal, label: 'Other', desc: 'Any other civic issue' },
];

export default function SubmitComplaint() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [address, setAddress] = useState('');
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

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    toast.info('Getting your location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
        toast.success('Location updated');
      },
      (error) => {
        toast.error('Unable to retrieve your location');
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCategory || !description || !address) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        category: selectedCategory,
        description,
        address_text: address,
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
    setLat('');
    setLng('');
    setAddress('');
    setAiResult(null);
  };

  if (submittedData) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center mb-6">
          <Check size={48} className="text-success animate-[bounce_1s_ease-in-out]" />
        </div>
        
        <h1 className="text-3xl font-bold text-ink mb-2">Complaint Submitted</h1>
        <p className="text-ink-secondary mb-8 text-center max-w-md">
          Your issue has been successfully reported to the authorities.
        </p>

        <div className="bg-card border border-border rounded-xl shadow-sm w-full p-6 mb-8">
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm mb-6">
            <div className="text-ink-secondary">Complaint ID</div>
            <div className="font-mono font-medium text-ink text-right">#{submittedData.id}</div>
            
            <div className="text-ink-secondary">Category</div>
            <div className="font-medium text-ink text-right">{submittedData.category}</div>
            
            <div className="text-ink-secondary">Priority</div>
            <div className="text-right">
              <PriorityBadge priority={submittedData.priority_label} />
            </div>
          </div>
          
          {submittedData.ai_analysis?.summary && (
            <div className="bg-brand/5 border border-brand/20 p-4 rounded-lg">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand mb-1">AI Summary</h3>
              <p className="text-sm text-ink-secondary">{submittedData.ai_analysis.summary}</p>
            </div>
          )}
          
          {submittedData.is_duplicate && (
            <div className="mt-4 bg-warning/10 border border-warning/30 p-4 rounded-lg flex gap-3 text-warning-dark text-sm">
              <AlertTriangle size={18} className="shrink-0 text-warning" />
              <div>
                <strong>Potential Duplicate:</strong> A similar issue has already been reported in this area. It has been linked.
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
      <h1 className="text-2xl font-bold text-ink mb-6">Report a Civic Issue</h1>
      
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
              placeholder="Please provide details about the issue..."
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

        {/* Location Section */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-ink">
              Location details <span className="text-danger">*</span>
            </label>
            <Button type="button" variant="outline" size="sm" onClick={handleGetLocation}>
              <MapPin size={14} /> Use my location
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Latitude</label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="e.g. 19.0760"
                className="w-full rounded-md border border-border bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-secondary mb-1">Longitude</label>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="e.g. 72.8777"
                className="w-full rounded-md border border-border bg-surface-input px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-ink-secondary mb-1">Street Address <span className="text-danger">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
                <Map size={16} />
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter exact address or landmark"
                className="w-full rounded-md border border-border bg-surface-input pl-10 pr-4 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
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
