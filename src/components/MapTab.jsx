import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Compass, Plus, Trash2, MapPin, Droplet, Tent, Flag, Navigation } from 'lucide-react';
import { treksAPI } from '../api';

// Custom colored indicators that solve Vite Leaflet asset path resolution bugs
const getCheckpointIcon = (type) => {
  let color = '#10B981'; // Emerald (Standard Checkpoint)
  if (type === 'START') color = '#3B82F6'; // Blue (Start)
  if (type === 'END') color = '#EF4444'; // Red (End)
  if (type === 'WATER') color = '#06B6D4'; // Cyan (Water source)
  if (type === 'CAMP') color = '#F59E0B'; // Amber (Campsite)

  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 2px 5px rgba(0,0,0,0.5);"></div>`,
    className: 'custom-div-icon',
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

function MapClickEvents({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapTab({ trekId, checkpoints = [], isOrganizer }) {
  const queryClient = useQueryClient();
  const [selectedLocation, setSelectedLocation] = useState(null); // {lat, lng} for new checkpoint draft
  const [checkpointName, setCheckpointName] = useState('');
  const [checkpointType, setCheckpointType] = useState('CHECKPOINT');
  const [formError, setFormError] = useState(null);

  // Default coordinate center (Bengaluru, India area coordinates for Kudremukh region)
  const defaultCenter = [13.2167, 75.2500];
  const center = checkpoints.length > 0 
    ? [parseFloat(checkpoints[0].latitude), parseFloat(checkpoints[0].longitude)]
    : defaultCenter;

  // Sorting checkpoints by sequence order
  const sortedCheckpoints = [...checkpoints].sort((a, b) => a.sequence_order - b.sequence_order);
  const routePolyline = sortedCheckpoints.map(cp => [parseFloat(cp.latitude), parseFloat(cp.longitude)]);

  // Mutations
  const addCheckpointMutation = useMutation({
    mutationFn: treksAPI.addCheckpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trek', trekId] });
      setSelectedLocation(null);
      setCheckpointName('');
      setCheckpointType('CHECKPOINT');
      setFormError(null);
    },
    onError: (err) => {
      setFormError(err.response?.data?.detail || 'Failed to save checkpoint.');
    }
  });

  const deleteCheckpointMutation = useMutation({
    mutationFn: treksAPI.deleteCheckpoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trek', trekId] });
    },
    onError: () => {
      alert('Delete failed.');
    }
  });

  const handleMapClick = (lat, lng) => {
    if (!isOrganizer) return;
    setSelectedLocation({ lat, lng });
  };

  const handleAddCheckpoint = (e) => {
    e.preventDefault();
    if (!checkpointName) return;

    // Sequence order: append to end of list
    const nextOrder = checkpoints.length > 0 
      ? Math.max(...checkpoints.map(cp => cp.sequence_order)) + 1
      : 0;

    addCheckpointMutation.mutate({
      group: parseInt(trekId),
      name: checkpointName,
      type: checkpointType,
      latitude: parseFloat(selectedLocation.lat.toFixed(6)),
      longitude: parseFloat(selectedLocation.lng.toFixed(6)),
      sequence_order: nextOrder
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* Map display */}
      <div className="lg:col-span-3 h-[50vh] rounded-xl overflow-hidden border border-dark-border/40 relative">
        <MapContainer 
          center={center} 
          zoom={12} 
          scrollWheelZoom={true} 
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {isOrganizer && (
            <MapClickEvents onMapClick={handleMapClick} />
          )}

          {/* Draw Polyline connect checkpoints */}
          {routePolyline.length > 1 && (
            <Polyline 
              positions={routePolyline} 
              color="#10B981" 
              weight={4} 
              opacity={0.8} 
              dashArray="8, 8"
            />
          )}

          {/* Checkpoint Markers */}
          {sortedCheckpoints.map((cp) => (
            <Marker 
              key={cp.id} 
              position={[parseFloat(cp.latitude), parseFloat(cp.longitude)]}
              icon={getCheckpointIcon(cp.type)}
            >
              <Popup>
                <div className="space-y-1.5 text-xs text-left">
                  <p className="font-extrabold text-dark-text">{cp.name}</p>
                  <p className="text-[10px] text-dark-muted font-bold tracking-wider uppercase">{cp.type}</p>
                  <p className="text-[9px] text-dark-muted font-mono">{parseFloat(cp.latitude).toFixed(4)}, {parseFloat(cp.longitude).toFixed(4)}</p>
                  {isOrganizer && (
                    <button
                      onClick={() => deleteCheckpointMutation.mutate(cp.id)}
                      className="w-full mt-2 py-1 px-2 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/30 text-red-400 font-bold rounded flex items-center justify-center gap-1 transition duration-150 text-[10px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Draft marker for new checkpoint */}
          {selectedLocation && (
            <Marker 
              position={[selectedLocation.lat, selectedLocation.lng]}
              icon={getCheckpointIcon('CHECKPOINT')}
            >
              <Popup>
                <span className="text-xs text-dark-text">Adding new checkpoint here</span>
              </Popup>
            </Marker>
          )}
        </MapContainer>
        
        {isOrganizer && (
          <div className="absolute bottom-4 left-4 z-[400] bg-dark-card/90 backdrop-blur-md px-3.5 py-2 rounded-lg border border-dark-border/40 text-[10px] text-dark-muted pointer-events-none flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-primary" />
            <span>Click anywhere on the map to plot route checkpoints.</span>
          </div>
        )}
      </div>

      {/* Editor drawer / sidebar */}
      <div className="lg:col-span-1 space-y-5 text-left">
        {isOrganizer && selectedLocation ? (
          <form onSubmit={handleAddCheckpoint} className="glass-panel p-5 rounded-xl border border-primary/20 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-dark-text flex items-center gap-1">
              <Plus className="w-4 h-4 text-primary" />
              <span>Plot Checkpoint</span>
            </h3>

            {formError && (
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-red-300">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-dark-muted mb-1">Checkpoint Name</label>
              <input
                type="text"
                required
                value={checkpointName}
                onChange={(e) => setCheckpointName(e.target.value)}
                placeholder="Campsite A, Water Source 1..."
                className="w-full p-2 rounded bg-dark-bg border border-dark-border text-dark-text outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-dark-muted mb-1">Point Category</label>
              <select
                value={checkpointType}
                onChange={(e) => setCheckpointType(e.target.value)}
                className="w-full p-2 rounded bg-dark-bg border border-dark-border text-dark-text outline-none"
              >
                <option value="START">Start Point 🏁</option>
                <option value="CHECKPOINT">Milestone Checkpoint 📍</option>
                <option value="WATER">Water Point 💧</option>
                <option value="CAMP">Campsite 🏕️</option>
                <option value="END">End Point 🏁</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-dark-muted pt-1">
              <div>Lat: {selectedLocation.lat.toFixed(4)}</div>
              <div>Lng: {selectedLocation.lng.toFixed(4)}</div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addCheckpointMutation.isPending}
                className="flex-1 py-2 bg-primary hover:bg-primary-hover text-dark-bg font-extrabold rounded transition duration-150"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setSelectedLocation(null)}
                className="py-2 px-3 bg-dark-border text-dark-muted font-bold rounded border border-dark-border/80 transition duration-150"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="glass-panel p-5 rounded-xl border border-dark-border/30 space-y-4">
            <h3 className="text-sm font-bold text-dark-muted uppercase tracking-widest">Route Checklist</h3>
            
            {sortedCheckpoints.length === 0 ? (
              <p className="text-xs text-dark-muted leading-relaxed">
                No checkpoints have been mapped yet. {isOrganizer ? "Click on the map to mark water coordinates, campsites, and starting points." : "Wait for the organizer to plan the route."}
              </p>
            ) : (
              <div className="space-y-3">
                {sortedCheckpoints.map((cp, idx) => {
                  let Icon = MapPin;
                  if (cp.type === 'START' || cp.type === 'END') Icon = Flag;
                  if (cp.type === 'WATER') Icon = Droplet;
                  if (cp.type === 'CAMP') Icon = Tent;

                  return (
                    <div key={cp.id} className="flex items-center gap-3 text-xs">
                      <div className="w-6 h-6 rounded-full bg-dark-bg border border-dark-border flex items-center justify-center text-dark-muted font-bold text-[10px] shrink-0">
                        {idx + 1}
                      </div>
                      
                      <div className="flex items-center gap-2 text-dark-text truncate">
                        <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-semibold truncate">{cp.name}</span>
                        <span className="text-[9px] text-dark-muted uppercase font-bold">({cp.type})</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
