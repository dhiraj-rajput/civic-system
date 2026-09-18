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
        const allCoords = [];
        const mainClusterCoords = [];

        // Check if there is an explicit center requested (e.g. borough chosen)
        const hasCustomCenter = lat && lng && (lat !== 40.7128 || lng !== -74.0060);

        complaints.forEach((c) => {
          const cLat = Number(c.location?.lat ?? c.lat);
          const cLng = Number(c.location?.lng ?? c.lng);
          if (!isNaN(cLat) && !isNaN(cLng) && (cLat !== 0 || cLng !== 0)) {
            allCoords.push([cLat, cLng]);

            // Track main cluster region (NYC metro area ~ 40.4 to 41.2 N, -74.4 to -73.5 W)
            if (cLat >= 40.4 && cLat <= 41.2 && cLng >= -74.4 && cLng <= -73.5) {
              mainClusterCoords.push([cLat, cLng]);
            }

            const priority = c.priority_label || "Low";
            const priorityColor =
              priority === "Critical"
                ? "#ef4444"
                : priority === "High"
                ? "#f97316"
                : priority === "Medium"
                ? "#f59e0b"
                : "#3b82f6";

            const radius = priority === "Critical" ? 9 : priority === "High" ? 7.5 : priority === "Medium" ? 6 : 5;

            // Render high-performance Leaflet circleMarker
            const marker = L.circleMarker([cLat, cLng], {
              radius: radius,
              fillColor: priorityColor,
              color: "#ffffff",
              weight: 1.5,
              opacity: 0.95,
              fillOpacity: 0.75,
              className: "hotspot-marker",
            }).addTo(markersGroup);

            const popupContent = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 170px; padding: 4px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-size: 10px; font-weight: 700; color: ${priorityColor}; text-transform: uppercase; letter-spacing: 0.05em;">
                    ${priority} Priority
                  </span>
                  <span style="font-size: 10px; color: #64748b; font-family: monospace;">
                    ${c.complaint_id || ""}
                  </span>
                </div>
                <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin: 2px 0; text-transform: capitalize;">
                  ${(c.category || "Issue").replace(/_/g, " ")}
                </div>
                <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
                  Status: <strong>${c.status || "New"}</strong>
                </div>
                ${
                  c.address_text
                    ? `<div style="font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px;">📍 ${c.address_text}</div>`
                    : ""
                }
              </div>
            `;

            marker.bindPopup(popupContent);

            // Hover interactions
            marker.on("mouseover", function () {
              this.setRadius(radius + 3);
              this.setStyle({ fillOpacity: 0.95, weight: 2.5 });
            });
            marker.on("mouseout", function () {
              this.setRadius(radius);
              this.setStyle({ fillOpacity: 0.75, weight: 1.5 });
            });

            if (onPinClick) {
              marker.on("click", () => onPinClick(c));
            }
          }
        });

        // Smart Bounds: avoid zooming to entire globe if an outlier (e.g. Pune vs NYC) exists
        if (hasCustomCenter) {
          map.setView([lat, lng], zoom || 13);
        } else if (mainClusterCoords.length > 0 && mainClusterCoords.length >= allCoords.length * 0.7) {
          map.fitBounds(mainClusterCoords, { padding: [35, 35], maxZoom: 13 });
        } else if (allCoords.length > 0) {
          map.fitBounds(allCoords, { padding: [35, 35], maxZoom: 13 });
        } else if (lat && lng) {
          map.setView([lat, lng], zoom || 12);
        }
      }

      setIsReady(true);
    });

    let resizeObserver = null;
    if (mapContainerRef.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      isMounted = false;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mode, complaints]);

  // Update marker position or map view when lat/lng/zoom props change
  useEffect(() => {
    if (mapInstanceRef.current && lat != null && lng != null) {
      if (mode === "picker" && markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        mapInstanceRef.current.setView([lat, lng], zoom || 14);
      } else if (mode === "single") {
        mapInstanceRef.current.setView([lat, lng], zoom || 14);
      }
    }
  }, [lat, lng, zoom, mode]);

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
