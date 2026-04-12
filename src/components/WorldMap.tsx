import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Museum } from "@/lib/api";

type WorldMapProps = {
  museums: Museum[];
  clickedPos: [number, number] | null;
  onMapClick: (lat: number, lng: number) => void;
  onMuseumSelect: (museum: Museum) => void;
};

const museumIcon = L.divIcon({
  className: "museum-marker",
  html: '<div class="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-base shadow-lg">🏛️</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const clickIcon = L.divIcon({
  className: "click-marker",
  html: '<div class="h-5 w-5 rounded-full border-2 border-primary bg-primary/30 shadow-[0_0_0_8px_hsl(var(--primary)/0.15)] animate-ping"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function WorldMap({ museums, clickedPos, onMapClick, onMuseumSelect }: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      worldCopyJump: true,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>',
}).addTo(map);

    overlayLayerRef.current = L.layerGroup().addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      onMapClick(event.latlng.lat, event.latlng.lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      overlayLayerRef.current = null;
    };
  }, [onMapClick]);

  const museumsKey = useMemo(
    () => museums.map((museum) => `${museum.name}:${museum.lat}:${museum.lng}`).join("|"),
    [museums],
  );

  useEffect(() => {
    const map = mapRef.current;
    const overlayLayer = overlayLayerRef.current;
    if (!map || !overlayLayer) return;

    overlayLayer.clearLayers();

    museums.forEach((museum) => {
      const marker = L.marker([museum.lat, museum.lng], { icon: museumIcon }).addTo(overlayLayer);
      marker.bindPopup(`
        <div style="text-align:center; min-width: 160px; color: #f3ead1;">
          <strong>${museum.emoji} ${museum.name}</strong><br />
          <span style="font-size:12px; opacity:0.8;">${museum.city}, ${museum.country}</span><br />
          <button data-museum-name="${museum.name}" style="margin-top:8px; padding:6px 10px; border-radius:8px; border:none; background:#c89b3c; color:#1a1308; font-weight:700; cursor:pointer;">Search artifacts</button>
        </div>
      `);
      marker.on("popupopen", () => {
        const button = document.querySelector(`[data-museum-name="${CSS.escape(museum.name)}"]`);
        button?.addEventListener("click", () => onMuseumSelect(museum), { once: true });
      });
    });

    if (clickedPos) {
      L.marker(clickedPos, { icon: clickIcon }).addTo(overlayLayer);
    }
  }, [clickedPos, museums, museumsKey, onMuseumSelect]);

  return <div ref={containerRef} className="h-full w-full" aria-label="Interactive world map" />;
}
