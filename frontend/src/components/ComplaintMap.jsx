import React, { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, ZoomIn, ZoomOut } from "lucide-react";

const LEAFLET_CSS_ID = "leaflet-css-cdn";
const LEAFLET_JS_ID = "leaflet-js-cdn";

function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    if (!document.getElementById(LEAFLET_CSS_ID)) {
      const link = document.createElement("link");
      link.id = LEAFLET_CSS_ID;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (!document.getElementById(LEAFLET_JS_ID)) {
      const script = document.createElement("script");
      script.id = LEAFLET_JS_ID;
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => resolve(window.L);
      document.body.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.L) {
          clearInterval(interval);
          resolve(window.L);
        }
      }, 50);
    }
  });
}

export default function ComplaintMap({
  mode = "single", // "picker" | "single" | "multi"
  lat = 40.7128,
  lng = -74.0060,
  zoom = 14,
  onLocationChange = null,
  complaints = [],
  onPinClick = null,
  className = "",
  style = { height: "350px", width: "100%" },
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const markersGroupRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    loadLeaflet().then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        // Initialize Leaflet map with OpenStreetMap tiles
        const map = L.map(mapContainerRef.current, {
          center: [lat || 40.7128, lng || -74.0060],
          zoom: zoom || 14,
          zoomControl: false,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: "bottomright" }).addTo(map);

        mapInstanceRef.current = map;
        markersGroupRef.current = L.layerGroup().addTo(map);
      }

      const map = mapInstanceRef.current;
      const markersGroup = markersGroupRef.current;
      markersGroup.clearLayers();

      // Helper to generate pin icon
      const createIcon = (color = "#2563eb", pulse = false) => {
        return L.divIcon({
          className: "custom-div-icon",
          html: `
            <div style="position: relative; transform: translate(-50%, -100%);">
              <svg width="32" height="42" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C5.37258 0 0 5.37258 0 12C0 20.5 12 32 12 32C12 32 24 20.5 24 12C24 5.37258 18.6274 0 12 0Z" fill="${color}"/>
                <circle cx="12" cy="12" r="5" fill="#ffffff"/>
              </svg>
              ${
                pulse
                  ? `<span style="position: absolute; bottom: 0; left: 50%; transform: translate(-50%, 50%); width: 14px; height: 14px; background-color: ${color}; border-radius: 50%; opacity: 0.6; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>`
                  : ""
              }
            </div>
          `,
          iconSize: [32, 42],
          iconAnchor: [16, 42],
        });
      };

      if (mode === "picker") {
        const marker = L.marker([lat || 40.7128, lng || -74.0060], {
          draggable: true,
          icon: createIcon("#2563eb", true),
        }).addTo(markersGroup);

        markerRef.current = marker;

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          if (onLocationChange) {
            onLocationChange({ lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) });
          }
        });

        map.on("click", (e) => {
          marker.setLatLng(e.latlng);
          if (onLocationChange) {
            onLocationChange({ lat: Number(e.latlng.lat.toFixed(6)), lng: Number(e.latlng.lng.toFixed(6)) });
          }
        });
      } else if (mode === "single") {
        L.marker([lat, lng], {
          icon: createIcon("#ef4444", true),
        })
          .addTo(markersGroup)
          .bindPopup(`<div class="text-xs font-sans"><strong>Complaint Location</strong><br/>${lat.toFixed(4)}, ${lng.toFixed(4)}</div>`);
        map.setView([lat, lng], zoom);
      } else if (mode === "multi" && complaints.length > 0) {
        const bounds = [];
        complaints.forEach((c) => {
          const cLat = c.location?.lat ?? c.lat;
          const cLng = c.location?.lng ?? c.lng;
          if (cLat && cLng) {
            bounds.push([cLat, cLng]);
            const priorityColor =
              c.priority_label === "Critical"
                ? "#ef4444"
                : c.priority_label === "High"
                ? "#f97316"
                : c.priority_label === "Medium"
                ? "#f59e0b"
                : "#64748b";

            const marker = L.marker([cLat, cLng], {
              icon: createIcon(priorityColor, c.priority_label === "Critical"),
            }).addTo(markersGroup);

            const popupContent = `
              <div style="font-family: sans-serif; min-width: 160px; padding: 2px;">
                <div style="font-size: 11px; font-weight: bold; color: ${priorityColor}; text-transform: uppercase;">
                  ${c.priority_label || "Low"} Priority
                </div>
                <div style="font-size: 13px; font-weight: 600; margin: 2px 0;">
                  ${c.complaint_id || "Complaint"}
                </div>
                <div style="font-size: 12px; color: #4b5563; text-transform: capitalize;">
                  ${c.category || "Issue"} · ${c.status || "Open"}
                </div>
                ${
                  c.address_text
                    ? `<div style="font-size: 11px; color: #6b7280; margin-top: 4px;">📍 ${c.address_text}</div>`
                    : ""
                }
              </div>
            `;

            marker.bindPopup(popupContent);
            if (onPinClick) {
              marker.on("click", () => onPinClick(c));
            }
          }
        });

        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
        }
      }

      setIsReady(true);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mode, complaints]);

  // Update marker position when lat/lng props change in picker mode
  useEffect(() => {
    if (mode === "picker" && markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng, mode]);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-border bg-card shadow-sm ${className}`}>
      <div ref={mapContainerRef} style={style} className="z-0 w-full" />
      
      {/* Helper pill overlay */}
      {mode === "picker" && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-md bg-card/90 px-3 py-1 text-xs font-medium text-ink shadow-md backdrop-blur-md border border-border">
          <MapPin size={13} className="text-brand" />
          <span>Click anywhere or drag pin to choose location</span>
        </div>
      )}
    </div>
  );
}
