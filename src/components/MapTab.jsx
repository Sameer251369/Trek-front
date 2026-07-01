import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Plus, Trash2, MapPin, Droplet, Tent, Flag, Navigation } from 'lucide-react';
import { treksAPI } from '../api';

const getCheckpointIcon = (type) => {
  const colors = {
    START:      '#E8FF00',
    END:        '#FF3333',
    WATER:      '#06B6D4',
    CAMP:       '#F59E0B',
    CHECKPOINT: '#888888',
  };
  const color = colors[type] || colors.CHECKPOINT;
  return L.divIcon({
    html: `<div style="background-color:${color};width:12px;height:12px;border:2px solid #000;box-shadow:0 0 0 1.5px ${color};"></div>`,
    className: 'custom-div-icon',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

function MapClickEvents({ onMapClick }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

const TYPE_CONFIG = {
  START:      { icon: Flag,      label: 'Start Point',           color: 'text-primary'   },
  END:        { icon: Flag,      label: 'End Point',             color: 'text-red-400'   },
  WATER:      { icon: Droplet,   label: 'Water Source',          color: 'text-cyan-400'  },
  CAMP:       { icon: Tent,      label: 'Campsite',              color: 'text-yellow-400'},
  CHECKPOINT: { icon: MapPin,    label: 'Milestone Checkpoint',  color: 'text-dark-muted'},
};

export default function MapTab({ trekId, checkpoints = [], isOrganizer }) {
  const queryClient = useQueryClient();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [checkpointName, setCheckpointName] = useState('');
  const [checkpointType, setCheckpointType] = useState('CHECKPOINT');
  const [formError, setFormError] = useState(null);

  const defaultCenter = [13.2167, 75.2500];
  const center = checkpoints.length > 0
    ? [parseFloat(checkpoints[0].latitude), parseFloat(checkpoints[0].longitude)]
    : defaultCenter;

  const sortedCheckpoints = [...checkpoints].sort((a, b) => a.sequence_order - b.sequence_order);
  const routePolyline = sortedCheckpoints.map(cp => [parseFloat(cp.latitude), parseFloat(cp.longitude)]);

  const addCheckpointMutation = useMutation({
    mutationFn: treksAPI.addCheckpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trek', trekId] });
      setSelectedLocation(null);
      setCheckpointName('');
      setCheckpointType('CHECKPOINT');
      setFormError(null);
    },
    onError: (err) => { setFormError(err.response?.data?.detail || 'Failed to save checkpoint.'); },
  });

  const deleteCheckpointMutation = useMutation({
    mutationFn: treksAPI.deleteCheckpoint,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trek', trekId] }); },
    onError: () => { alert('Delete failed.'); },
  });

  const handleMapClick = (lat, lng) => {
    if (!isOrganizer) return;
    setSelectedLocation({ lat, lng });
  };

  const handleAddCheckpoint = (e) => {
    e.preventDefault();
    if (!checkpointName) return;
    const nextOrder = checkpoints.length > 0
      ? Math.max(...checkpoints.map(cp => cp.sequence_order)) + 1
      : 0;
    addCheckpointMutation.mutate({
      group: parseInt(trekId),
      name: checkpointName,
      type: checkpointType,
      latitude: parseFloat(selectedLocation.lat.toFixed(6)),
      longitude: parseFloat(selectedLocation.lng.toFixed(6)),
      sequence_order: nextOrder,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start font-mono text-xs">

      {/* ── Map ── */}
      <div className="lg:col-span-3 relative border border-[#1C1C1E] overflow-hidden" style={{ height: '50vh' }}>
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary z-[500]" />

        <MapContainer center={center} zoom={12} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {isOrganizer && <MapClickEvents onMapClick={handleMapClick} />}

          {routePolyline.length > 1 && (
            <Polyline
              positions={routePolyline}
              color="#E8FF00"
              weight={2}
              opacity={0.7}
              dashArray="6, 6"
            />
          )}

          {sortedCheckpoints.map((cp) => (
            <Marker
              key={cp.id}
              position={[parseFloat(cp.latitude), parseFloat(cp.longitude)]}
              icon={getCheckpointIcon(cp.type)}
            >
              <Popup>
                <div className="space-y-1.5 text-xs text-left min-w-[120px] font-mono">
                  <p className="font-bold text-dark-text uppercase tracking-wide font-sans">{cp.name}</p>
                  <p className="text-[9px] text-dark-muted font-bold tracking-widest uppercase">{cp.type}</p>
                  <p className="text-[9px] text-dark-muted font-mono">
                    {parseFloat(cp.latitude).toFixed(4)}, {parseFloat(cp.longitude).toFixed(4)}
                  </p>
                  {isOrganizer && (
                    <button
                      onClick={() => deleteCheckpointMutation.mutate(cp.id)}
                      className="w-full mt-2 py-1.5 px-2 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/30 text-red-400 font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors duration-150 rounded-none"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {selectedLocation && (
            <Marker
              position={[selectedLocation.lat, selectedLocation.lng]}
              icon={getCheckpointIcon('CHECKPOINT')}
            >
              <Popup>
                <span className="text-xs font-bold uppercase tracking-wide text-primary font-mono">
                  New checkpoint here
                </span>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* HUD overlay */}
        {isOrganizer && (
          <div className="absolute bottom-0 left-0 right-0 z-[400] flex items-center gap-2 px-4 py-2.5 bg-[#0A0A0C]/90 border-t border-[#1C1C1E] pointer-events-none">
            <div className="w-1.5 h-1.5 bg-primary animate-pulse shrink-0 rounded-none" />
            <Navigation className="w-3 h-3 text-primary shrink-0" />
            <span className="text-[9px] text-dark-muted tracking-[0.12em] uppercase">
              SYS // Click map to plot checkpoints
            </span>
          </div>
        )}
      </div>

      {/* ── Sidebar ── */}
      <div className="lg:col-span-1 space-y-4 text-left">
        {isOrganizer && selectedLocation ? (
          /* Add checkpoint form */
          <form onSubmit={handleAddCheckpoint} className="bg-[#0A0A0C] border border-primary/30 rounded-none">
            <div className="h-[2px] bg-primary" />
            <div className="p-4 space-y-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-4 bg-primary shrink-0" />
                <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-[10px] font-bold text-dark-text tracking-[0.15em] uppercase">
                  Plot Checkpoint
                </span>
              </div>

              {formError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] tracking-wide rounded-none">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-[0.15em] text-dark-muted mb-1.5">
                  [01] Checkpoint Name
                </label>
                <input
                  type="text"
                  required
                  value={checkpointName}
                  onChange={(e) => setCheckpointName(e.target.value)}
                  placeholder="Campsite A, Water Source 1..."
                  className="w-full p-2.5 bg-[#000000] border border-[#1C1C1E] text-dark-text text-xs focus:outline-none focus:border-primary transition-colors rounded-none font-sans"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase tracking-[0.15em] text-dark-muted mb-1.5">
                  [02] Point Category
                </label>
                <div className="space-y-1">
                  {Object.entries(TYPE_CONFIG).map(([val, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCheckpointType(val)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.1em] border transition-colors duration-100 focus:outline-none rounded-none ${
                          checkpointType === val
                            ? 'bg-primary border-primary text-dark-bg'
                            : 'bg-transparent border-[#1C1C1E] text-dark-muted hover:text-dark-text hover:border-[#333]'
                        }`}
                      >
                        <Icon className="w-3 h-3 shrink-0" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 font-mono text-[9px] text-dark-muted/60 px-1">
                <span>LAT: {selectedLocation.lat.toFixed(5)}</span>
                <span>·</span>
                <span>LNG: {selectedLocation.lng.toFixed(5)}</span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={addCheckpointMutation.isPending}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-dark-bg font-bold text-[10px] uppercase tracking-[0.15em] transition-colors duration-150 focus:outline-none disabled:opacity-50 rounded-none"
                >
                  {addCheckpointMutation.isPending ? 'SAVING...' : 'SAVE POINT'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLocation(null)}
                  className="py-2.5 px-3 bg-transparent border border-[#333] text-dark-muted hover:text-dark-text text-[10px] uppercase tracking-[0.1em] transition-colors duration-150 focus:outline-none rounded-none"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Route checklist */
          <div className="bg-[#0A0A0C] border border-[#1C1C1E] rounded-none">
            <div className="h-[2px] bg-primary w-8" />
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-4 bg-primary shrink-0" />
                <span className="text-[9px] font-bold text-dark-muted tracking-[0.2em] uppercase">
                  Route Checklist
                </span>
                {sortedCheckpoints.length > 0 && (
                  <span className="ml-auto text-[9px] font-bold text-dark-bg bg-primary px-1.5 py-0.5">
                    {sortedCheckpoints.length}
                  </span>
                )}
              </div>

              {sortedCheckpoints.length === 0 ? (
                <p className="text-[10px] text-dark-muted leading-relaxed tracking-wide font-sans">
                  {isOrganizer
                    ? 'Click on the map to mark water sources, campsites, and route points.'
                    : 'No checkpoints mapped yet. Wait for the organizer to plan the route.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {sortedCheckpoints.map((cp, idx) => {
                    const cfg = TYPE_CONFIG[cp.type] || TYPE_CONFIG.CHECKPOINT;
                    const Icon = cfg.icon;
                    return (
                      <div key={cp.id} className="flex items-center gap-2.5 text-xs border-b border-[#1C1C1E]/55 pb-2 last:border-0 last:pb-0">
                        <span className="text-[9px] font-bold text-dark-muted font-mono w-4 shrink-0 text-right">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="w-px h-5 bg-[#1C1C1E] shrink-0" />
                        <Icon className={`w-3 h-3 shrink-0 ${cfg.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-dark-text text-[10px] uppercase tracking-wide truncate font-sans">
                            {cp.name}
                          </p>
                          <p className="text-[8px] text-dark-muted/60 tracking-[0.12em] uppercase font-mono">{cp.type}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Checkpoint type legend */}
        <div className="bg-[#0A0A0C] border border-[#1C1C1E] rounded-none">
          <div className="p-3 space-y-1.5">
            <span className="text-[9px] font-bold text-dark-muted tracking-[0.2em] uppercase block mb-2 border-b border-[#1C1C1E] pb-1.5">Legend</span>
            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
              const Icon = cfg.icon;
              const dotColors = {
                START: '#E8FF00', END: '#FF3333', WATER: '#06B6D4',
                CAMP: '#F59E0B', CHECKPOINT: '#888888',
              };
              return (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 shrink-0 rounded-none"
                    style={{ backgroundColor: dotColors[type], border: '1px solid #000', boxShadow: `0 0 0 1px ${dotColors[type]}` }}
                  />
                  <Icon className={`w-3 h-3 shrink-0 ${cfg.color}`} />
                  <span className="text-[9px] text-dark-muted tracking-[0.08em] uppercase">{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}