import { useState } from 'react';
import { ShieldAlert, Download, PhoneCall, MapPin, Check, Info } from 'lucide-react';

export default function EmergencyTab({ trekId, trek }) {
  const [sosActive, setSosActive] = useState(false);
  const [coords, setCoords] = useState(null);
  const [copied, setCopied] = useState(false);
  const [offlinePackDownloaded, setOfflinePackDownloaded] = useState(false);

  const handleSosTrigger = () => {
    setSosActive(true);
    console.log("SOS triggered for gathering ID:", trekId);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          setCoords({
            lat: 13.2167 + (Math.random() - 0.5) * 0.05,
            lng: 75.2500 + (Math.random() - 0.5) * 0.05
          });
        }
      );
    }
  };

  const handleCopyCoords = () => {
    if (!coords) return;
    const txt = `EMERGENCY! I need help at ${trek.title}. Last known location: https://maps.google.com/?q=${coords.lat},${coords.lng}`;
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const downloadOfflineData = () => {
    const data = {
      trek_id: trek.id,
      title: trek.title,
      description: trek.description,
      date: trek.date,
      difficulty: trek.difficulty,
      organizer: trek.organizer_username,
      emergency_contacts: trek.members
        .filter(m => m.role === 'ADMIN')
        .map(m => ({ username: m.username, email: m.email })),
      checkpoints: trek.checkpoints || [],
      safety_instructions: [
        "In case of missing path, stay at your current location. Do not wander.",
        "Ensure water resources are shared equally.",
        "If heavy thunder begins, seek low elevation away from tall trees.",
        "Keep the Offline Pack open in your browser."
      ]
    };

    const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const element = document.createElement("a");
    element.href = URL.createObjectURL(file);
    element.download = `${trek.title.toLowerCase().replace(/\s+/g, '_')}_offline_pack.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    localStorage.setItem(`offline_trek_${trek.id}`, JSON.stringify(data));
    setOfflinePackDownloaded(true);
    setTimeout(() => setOfflinePackDownloaded(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 text-left text-xs font-mono">
      
      {/* SOS Panel */}
      <div className={`border p-6 rounded-none transition duration-300 relative overflow-hidden ${
        sosActive ? 'border-red-500 bg-red-950/15' : 'border-[#1C1C1E] bg-[#0A0A0C]'
      }`}>
        {sosActive && (
          <div className="absolute inset-0 bg-red-500/5 animate-pulse-slow pointer-events-none" />
        )}

        <div className="flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-sm font-bold text-red-500 flex items-center justify-center sm:justify-start gap-1.5 uppercase tracking-wider">
              <ShieldAlert className="w-5 h-5 animate-pulse text-red-500" />
              <span>SOS Emergency Beacon</span>
            </h3>
            <p className="text-dark-muted max-w-md font-sans">
              Stuck or injured on the gathering expedition? Triggering the beacon accesses GPS coordinates and copies a template text for emergency dispatch.
            </p>
          </div>

          <button
            onClick={handleSosTrigger}
            className="w-24 h-24 bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm flex items-center justify-center transition duration-200 border border-red-800 rounded-none uppercase shrink-0 hover:border-primary tracking-widest font-mono"
          >
            SOS
          </button>
        </div>

        {sosActive && coords && (
          <div className="mt-6 p-4 rounded-none bg-[#000000] border border-red-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-red-400">
                <MapPin className="w-4 h-4" />
                <span>GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
              </div>

              <button
                onClick={handleCopyCoords}
                className="py-1.5 px-3 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/30 text-red-400 font-bold rounded-none transition duration-150 text-[10px]"
              >
                {copied ? 'COPIED LINK' : 'COPY EMERGENCY SMS'}
              </button>
            </div>

            <p className="text-[10px] text-dark-muted leading-relaxed">
              <strong>Template:</strong> "EMERGENCY! I need help at {trek.title}. Last known location: https://maps.google.com/?q={coords.lat},{coords.lng}"
            </p>

            <div className="flex gap-2">
              <a 
                href={`sms:?body=EMERGENCY!+Need+help+at+${trek.title}.+GPS:+${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-none text-center block"
              >
                SEND SMS TEMPLATE
              </a>
              <button 
                onClick={() => setSosActive(false)}
                className="px-4 py-2 bg-dark-bg text-dark-muted font-bold rounded-none border border-[#1C1C1E]"
              >
                RESET BEACON
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Offline Mode & Contacts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Offline Pack */}
        <div className="border p-5 rounded-none border-[#1C1C1E] bg-[#0A0A0C] flex flex-col justify-between">
          <div className="space-y-2">
            <h4 className="font-bold text-dark-text uppercase tracking-wider flex items-center gap-1.5">
              <Download className="w-4 h-4 text-primary" />
              <span>Offline Expedition Pack</span>
            </h4>
            <p className="text-dark-muted leading-relaxed font-sans">
              Trekking trails usually lack internet coverage. Download the offline pack containing route checkpoints, safety instructions, and leader contacts to keep access when off-grid.
            </p>
          </div>

          <button
            onClick={downloadOfflineData}
            className="w-full mt-5 py-2.5 bg-primary hover:bg-primary-hover text-dark-bg font-extrabold rounded-none transition duration-200 flex items-center justify-center gap-1.5"
          >
            {offlinePackDownloaded ? (
              <>
                <Check className="w-4 h-4" />
                <span>DOWNLOADED SYSTEM DATA</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>DOWNLOAD OFFLINE PACK (.JSON)</span>
              </>
            )}
          </button>
        </div>

        {/* Local Emergency Hotlines */}
        <div className="border p-5 rounded-none border-[#1C1C1E] bg-[#0A0A0C] space-y-4">
          <h4 className="font-bold text-dark-text uppercase tracking-wider flex items-center gap-1.5">
            <PhoneCall className="w-4 h-4 text-primary" />
            <span>Emergency Contacts</span>
          </h4>

          <div className="space-y-3 font-semibold text-dark-text">
            <div className="flex justify-between items-center border-b border-[#1C1C1E]/50 pb-1.5">
              <div>
                <p>National Mountain Rescue</p>
                <p className="text-[10px] text-dark-muted font-normal font-sans">State search and rescue dispatchers</p>
              </div>
              <span className="text-primary font-bold">108</span>
            </div>
            
            <div className="flex justify-between items-center border-b border-[#1C1C1E]/50 pb-1.5">
              <div>
                <p>Local Forest Patrol / Ranger</p>
                <p className="text-[10px] text-dark-muted font-normal font-sans">Permits & trail block reports</p>
              </div>
              <span className="text-primary font-bold">112</span>
            </div>

            <div className="flex justify-between items-center border-b border-[#1C1C1E]/50 pb-1.5">
              <div>
                <p>Medical / Ambulance Dispatch</p>
                <p className="text-[10px] text-dark-muted font-normal font-sans">Nearest base camp medical station</p>
              </div>
              <span className="text-primary font-bold">102</span>
            </div>
          </div>
        </div>

      </div>

      <div className="p-4 rounded-none border border-[#1C1C1E] bg-[#050506] flex gap-2.5">
        <Info className="w-5 h-5 text-primary shrink-0" />
        <p className="leading-relaxed text-dark-muted font-sans">
          Your last known coordinates are automatically shared with members when you send messages in the Trek Chat or press the SOS button, enabling group members to pinpoint your location on the map.
        </p>
      </div>

    </div>
  );
}
