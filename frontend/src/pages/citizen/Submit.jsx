import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, Trash2, Lightbulb, Droplets, MapPin, 
  Map, MoreHorizontal, Check, RefreshCw, Upload,
  ArrowRight, ArrowLeft, ShieldCheck, Sparkles, CheckCircle2,
  FileText, Image as ImageIcon
} from 'lucide-react';
import { api } from '@/api/client';
import Button from '@/components/ui/Button';
import AISuggestion from '@/components/ai/AISuggestion';
import { useToast } from '@/components/ui/Toast';
import { PriorityBadge } from '@/components/Badges';
import ComplaintMap from '@/components/ComplaintMap';
import MediaUpload from '@/components/MediaUpload';
import MediaGallery from '@/components/MediaGallery';

const DEFAULT_CATEGORIES = [
  { id: 'pothole', icon: AlertTriangle, label: 'Pothole', desc: 'Road damage, deep holes or asphalt trenches' },
  { id: 'garbage', icon: Trash2, label: 'Garbage', desc: 'Uncollected waste, overflowing bins or dumping' },
  { id: 'streetlight', icon: Lightbulb, label: 'Streetlight', desc: 'Dark streets, broken poles or flickering lamps' },
  { id: 'water_supply', icon: Droplets, label: 'Water Supply', desc: 'Pipe leaks, low pressure or dirty tap water' },
  { id: 'other', icon: MoreHorizontal, label: 'Other', desc: 'Any other civic or infrastructure issue' },
];

const CATEGORY_ICON_MAP = {
  pothole: AlertTriangle,
  garbage: Trash2,
  streetlight: Lightbulb,
  water_supply: Droplets,
  other: MoreHorizontal,
};

const NYC_BOROUGHS = [
  { name: 'Manhattan', lat: '40.7831', lng: '-73.9712', address: 'Broadway & 42nd St, Manhattan, NY 10036' },
  { name: 'Brooklyn', lat: '40.6782', lng: '-73.9442', address: 'Cadman Plaza, Brooklyn, NY 11201' },
  { name: 'Queens', lat: '40.7282', lng: '-73.7949', address: 'Queens Blvd, Queens, NY 11435' },
  { name: 'Bronx', lat: '40.8448', lng: '-73.8648', address: 'Grand Concourse, Bronx, NY 10451' },
  { name: 'Staten Island', lat: '40.5795', lng: '-74.1502', address: 'Hyatt St, Staten Island, NY 10301' },
];

export default function SubmitComplaint() {
  const { toast } = useToast();
  
  // Wizard Step (1: Details, 2: Location & Media, 3: Review & Submit)
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  useEffect(() => {
    async function loadDynamicCategories() {
      try {
        const data = await api.get('/departments/categories');
        if (Array.isArray(data) && data.length > 0) {
          const merged = data.map(item => {
            const val = item.value;
            const existing = DEFAULT_CATEGORIES.find(d => d.id === val);
            return {
              id: val,
              icon: CATEGORY_ICON_MAP[val] || MoreHorizontal,
              label: item.label || val.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              desc: existing ? existing.desc : `Municipal service for ${item.label || val.replace(/_/g, ' ')}`,
            };
          });
          setCategories(merged);
        }
      } catch (e) {
        // use default categories gracefully
      }
    }
    loadDynamicCategories();
  }, []);

  // Form State
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
    }, 1200);
    setTypingTimeout(newTimeout);
  };

  useEffect(() => {
    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [typingTimeout]);

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
        const fallback = NYC_BOROUGHS[0];
        setLat(fallback.lat);
        setLng(fallback.lng);
        if (!address) setAddress(fallback.address);
        toast.info('GPS unavailable. Defaulted to Manhattan (use borough chips or click map).');
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

  const validateStep1 = () => {
    if (!selectedCategory) {
      toast.error('Please select an issue category');
      return false;
    }
    if (!description.trim() || description.trim().length < 10) {
      toast.error('Please describe the problem in at least 10 characters');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!address.trim()) {
      toast.error('Please specify a street address, intersection, or select a borough');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateStep1() || !validateStep2()) return;

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
      toast.success('Complaint submitted successfully!');
    } catch (err) {
      toast.error(err.detail || 'Failed to submit complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmittedData(null);
    setCurrentStep(1);
    setSelectedCategory('');
    setDescription('');
    setLat('40.7128');
    setLng('-74.0060');
    setAddress('');
    setMediaUrls([]);
    setAiResult(null);
  };

  // Submitted Success Dossier
  if (submittedData) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12 flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-success/20 flex items-center justify-center mb-6">
          <Check size={36} className="text-success animate-[bounce_1s_ease-in-out]" />
        </div>
        
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink mb-2 text-center">
          Complaint Filed Successfully
        </h1>
        <p className="text-ink-secondary mb-8 text-center max-w-md text-xs sm:text-sm">
          Your issue has been logged into the municipal intake dispatch system with automated priority scoring.
        </p>

        <div className="bg-card border border-border rounded-2xl shadow-sm w-full p-5 sm:p-6 mb-8 space-y-6">
          <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs sm:text-sm">
            <div className="text-ink-secondary">Complaint ID</div>
            <div className="font-mono font-bold text-ink text-right">
              #{submittedData.complaint_id || submittedData.id}
            </div>
            
            <div className="text-ink-secondary">Category</div>
            <div className="font-medium text-ink text-right capitalize">
              {submittedData.category}
            </div>
            
            <div className="text-ink-secondary">Priority Rating</div>
            <div className="text-right flex items-center justify-end gap-2">
              <span className="font-mono font-bold text-ink">{submittedData.priority_score} pts</span>
              <PriorityBadge priority={submittedData.priority_label} />
            </div>
          </div>
          
          {submittedData.media_urls && submittedData.media_urls.length > 0 && (
            <MediaGallery mediaUrls={submittedData.media_urls} title="Attached Photo Evidence" />
          )}

          {submittedData.ai_analysis?.summary && (
            <div className="bg-brand/5 border border-brand/20 p-4 rounded-xl">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand mb-1 flex items-center gap-1.5">
                <Sparkles size={13} /> AI Extracted Summary
              </h3>
              <p className="text-xs text-ink-secondary leading-relaxed">{submittedData.ai_analysis.summary}</p>
            </div>
          )}
          
          {submittedData.is_duplicate && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex gap-3 text-amber-600 dark:text-amber-400 text-xs">
              <AlertTriangle size={18} className="shrink-0" />
              <div>
                <strong>Duplicate Cluster Linked:</strong> This complaint shares keywords and location with an existing cluster and has been linked to master case <code>{submittedData.duplicate_group_id}</code>.
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button onClick={resetForm} variant="outline" className="w-full sm:w-auto">
            Report Another Issue
          </Button>
          <Link to={`/track/${encodeURIComponent(submittedData.complaint_id || submittedData.id)}`}>
            <Button variant="primary" className="w-full sm:w-auto flex items-center justify-center gap-2">
              Track Status Real-Time <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const selectedCatObj = categories.find(c => c.id === selectedCategory);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-border pb-4 space-y-1">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Report a Civic Issue
        </h1>
        <p className="text-xs sm:text-sm text-ink-muted">
          Submit municipal work orders with automated priority dispatch and AI triage.
        </p>
      </div>

      {/* 3-Step Wizard Navigation Progress Bar */}
      <div className="bg-card border border-border rounded-xl p-3 sm:p-4 shadow-sm">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Details', icon: FileText },
            { num: 2, label: 'Location & Media', icon: MapPin },
            { num: 3, label: 'Review & Submit', icon: CheckCircle2 },
          ].map((s, idx) => {
            const isCurrent = currentStep === s.num;
            const isCompleted = currentStep > s.num;
            const Icon = s.icon;
            return (
              <React.Fragment key={s.num}>
                <button
                  type="button"
                  onClick={() => {
                    if (s.num === 1) setCurrentStep(1);
                    if (s.num === 2 && validateStep1()) setCurrentStep(2);
                    if (s.num === 3 && validateStep1() && validateStep2()) setCurrentStep(3);
                  }}
                  className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors text-left ${
                    isCurrent 
                      ? 'text-brand font-bold' 
                      : isCompleted 
                        ? 'text-ink font-medium' 
                        : 'text-ink-muted opacity-60'
                  }`}
                >
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted 
                      ? 'bg-brand text-white' 
                      : isCurrent 
                        ? 'bg-brand/15 text-brand ring-2 ring-brand' 
                        : 'bg-surface border border-border text-ink-muted'
                  }`}>
                    {isCompleted ? <Check size={14} /> : s.num}
                  </div>
                  <div className="hidden sm:block">
                    <span className="text-xs block leading-tight">{s.label}</span>
                    <span className="text-[10px] text-ink-muted block">Step {s.num}</span>
                  </div>
                </button>
                {idx < 2 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded transition-colors ${
                    currentStep > idx + 1 ? 'bg-brand' : 'bg-border'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: ISSUE DETAILS */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <h2 className="font-semibold text-sm sm:text-base text-ink flex items-center gap-2">
              <FileText size={18} className="text-brand" /> 1. Select Issue Category
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-brand bg-brand/10 text-ink ring-2 ring-brand/30 shadow-sm'
                        : 'border-border bg-surface hover:bg-surface-hover text-ink-secondary hover:border-brand/40'
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${
                      isSelected ? 'bg-brand text-white' : 'bg-surface-muted text-ink-muted'
                    }`}>
                      <Icon size={20} />
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-semibold text-xs sm:text-sm text-ink">{cat.label}</div>
                      <div className="text-[11px] text-ink-muted leading-snug">{cat.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                Detailed Description <span className="text-danger">*</span>
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Describe the issue in detail (e.g. 2-foot wide pothole causing traffic slowdown near the crosswalk)..."
                className="w-full rounded-xl border border-border bg-surface-input p-3.5 text-xs sm:text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <div className="flex items-center justify-between text-[11px] text-ink-muted">
                <span>Minimum 10 characters</span>
                <span>{description.length} characters</span>
              </div>
            </div>

            {/* AI Real-time Classifier Suggestion */}
            {aiResult && (
              <AISuggestion 
                suggestion={aiResult} 
                onApplyCategory={(cat) => {
                  setSelectedCategory(cat);
                  toast.success(`Category updated to ${cat}`);
                }}
              />
            )}
          </div>

          <div className="flex justify-end">
            <Button 
              type="button" 
              variant="primary" 
              size="lg" 
              onClick={handleNext}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              Continue to Location & Media <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: LOCATION & MEDIA */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <h2 className="font-semibold text-sm sm:text-base text-ink flex items-center gap-2">
                <MapPin size={18} className="text-brand" /> 2. Location & Photo Evidence
              </h2>
              <button
                type="button"
                onClick={handleGetLocation}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 min-h-[40px] rounded-lg border border-brand/40 bg-brand/10 text-brand hover:bg-brand/20 transition-colors w-full sm:w-auto self-start sm:self-auto"
              >
                <MapPin size={14} /> Use My Current Location
              </button>
            </div>

            {/* Borough Quick Select */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Quick Borough Select
              </label>
              <div className="flex flex-wrap gap-2">
                {NYC_BOROUGHS.map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => handleBoroughSelect(b)}
                    className={`px-3 py-1.5 min-h-[36px] rounded-full text-xs font-medium border transition-colors ${
                      address.includes(b.name)
                        ? 'border-brand bg-brand text-white'
                        : 'border-border bg-surface hover:bg-surface-hover text-ink'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Map */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span>Click map to adjust pin coordinates</span>
                <span className="font-mono text-[11px]">{lat}, {lng}</span>
              </div>
              <div className="h-64 rounded-xl overflow-hidden border border-border">
                <ComplaintMap
                  lat={lat ? parseFloat(lat) : 40.7128}
                  lng={lng ? parseFloat(lng) : -74.0060}
                  onLocationSelect={(newLat, newLng) => {
                    const sLat = newLat.toFixed(6);
                    const sLng = newLng.toFixed(6);
                    setLat(sLat);
                    setLng(sLng);
                    reverseGeocode(sLat, sLng);
                  }}
                  isInteractive={true}
                />
              </div>
            </div>

            {/* Address input */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-ink-secondary">
                Street Address or Cross Street <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Map size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Broadway & 42nd St, Manhattan, NY 10036"
                  className="w-full rounded-xl border border-border bg-surface-input pl-10 pr-4 py-2.5 text-xs sm:text-sm text-ink focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            {/* Media Upload */}
            <div className="pt-2 border-t border-border">
              <MediaUpload 
                mediaUrls={mediaUrls} 
                onChange={setMediaUrls}
                label="Attach Photos or Videos (Optional)"
                helperText="Upload multiple pictures or videos showing the civic problem"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button 
              type="button" 
              variant="outline" 
              size="lg" 
              onClick={handlePrev}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} /> Back to Details
            </Button>
            <Button 
              type="button" 
              variant="primary" 
              size="lg" 
              onClick={handleNext}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              Review Complaint <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & SUBMIT */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <CheckCircle2 size={18} className="text-brand" />
              <h2 className="font-semibold text-sm sm:text-base text-ink">
                3. Final Review & Submission
              </h2>
            </div>

            {/* Review Dossier Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
                <span className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                  Category
                </span>
                <p className="font-semibold text-sm text-ink capitalize flex items-center gap-1.5">
                  {selectedCatObj && <selectedCatObj.icon size={16} className="text-brand" />}
                  {selectedCatObj?.label || selectedCategory}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface border border-border space-y-1">
                <span className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                  Location
                </span>
                <p className="font-semibold text-xs text-ink truncate" title={address}>
                  {address || "Not specified"}
                </p>
                <p className="text-[10px] text-ink-muted font-mono">{lat}, {lng}</p>
              </div>
            </div>

            {/* Description Review */}
            <div className="p-4 rounded-xl bg-surface border border-border space-y-1 text-xs">
              <span className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                Problem Description
              </span>
              <p className="text-ink leading-relaxed whitespace-pre-wrap">{description}</p>
            </div>

            {/* Media Evidence Review */}
            {mediaUrls.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-semibold text-ink-muted tracking-wider">
                  Attached Media ({mediaUrls.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {mediaUrls.map((url, i) => (
                    <img 
                      key={i} 
                      src={url} 
                      alt={`Evidence ${i + 1}`} 
                      className="w-16 h-16 rounded-lg object-cover border border-border shadow-sm" 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* AI Summary Review if available */}
            {aiResult?.summary && (
              <div className="bg-brand/5 border border-brand/20 p-4 rounded-xl">
                <span className="text-[10px] uppercase font-semibold text-brand tracking-wider flex items-center gap-1 mb-1">
                  <Sparkles size={12} /> AI Analyzed Urgency: {aiResult.urgency_level}
                </span>
                <p className="text-xs text-ink-secondary">{aiResult.summary}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button 
              type="button" 
              variant="outline" 
              size="lg" 
              onClick={handlePrev}
              disabled={isSubmitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} /> Back to Location
            </Button>
            <Button 
              type="button" 
              variant="primary" 
              size="lg" 
              isLoading={isSubmitting}
              onClick={handleSubmit}
              className="w-full sm:w-auto flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} /> Submit Official Report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
