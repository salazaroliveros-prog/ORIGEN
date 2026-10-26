'use client';

import { formatGTQ, formatUSD } from '@/lib/data';
import { Project } from '@/lib/types';
import {
  CheckCircle2,
  CloudRain,
  CloudSun,
  ExternalLink,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldAlert,
  Thermometer,
  Wind,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface GoogleMapsSafetyViewProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  currency: 'GTQ' | 'USD';
}

interface WeatherAlertItem {
  id: string;
  region: string;
  temperature: string;
  condition: string;
  rainProbability: string;
  windSpeed: string;
  insivumehLevel: 'Verde' | 'Amarillo' | 'Naranja' | 'Rojo';
  safetyDirectives: string[];
  lastUpdated: string;
  source: string;
}

export function GoogleMapsSafetyView({
  projects,
  activeProjectId,
  onSelectProject,
  currency,
}: GoogleMapsSafetyViewProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<string>(activeProjectId);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [alerts, setAlerts] = useState<WeatherAlertItem[]>([]);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Actualizado hace 2 min');
  const [weatherSource, setWeatherSource] = useState<string>('INSIVUMEH & Red Meteorológica');
  const [activeTabFilter, setActiveTabFilter] = useState<'all' | 'critical'>('all');

  const activeProject = projects.find((p) => p.id === selectedSiteId) || projects[0];

  const fetchWeatherAlerts = async () => {
    setIsLoadingWeather(true);
    try {
      const res = await fetch('/api/weather/safety-alerts');
      const data = await res.json();
      if (data && data.alerts) {
        setAlerts(data.alerts);
        if (data.source) setWeatherSource(data.source);
        setLastRefreshed(
          `Actualizado a las ${new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}`
        );
      }
    } catch (err) {
      console.error('Error fetching weather alerts:', err);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  useEffect(() => {
    fetchWeatherAlerts();
  }, []);

  const formatMoney = (amount: number) => {
    return currency === 'GTQ' ? formatGTQ(amount) : formatUSD(amount);
  };

  // Google Maps embed URL with query coordinates
  const mapEmbedUrl = `https://maps.google.com/maps?q=${activeProject.lat},${activeProject.lng}&t=${mapType === 'satellite' ? 'k' : 'm'}&z=16&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-white shadow-md md:flex-row md:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-lg border border-blue-500/30 bg-blue-500/20 p-1.5 text-blue-400">
              <MapPin className="h-4 w-4" />
            </span>
            <h3 className="text-base font-bold text-white">
              Centro de Monitoreo Geográfico de Obras & Alertas Meteorológicas
            </h3>
          </div>
          <p className="max-w-2xl text-xs text-slate-400">
            Integración de Google Maps con geolocalización de obras activas en Guatemala y alertas
            meteorológicas en tiempo real (INSIVUMEH / Google Search) para prevención de riesgos y
            seguridad ocupacional.
          </p>
        </div>

        <button
          onClick={fetchWeatherAlerts}
          disabled={isLoadingWeather}
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingWeather ? 'animate-spin' : ''}`} />
          {isLoadingWeather ? 'Consultando Alertas...' : 'Actualizar Alertas (Google Search)'}
        </button>
      </div>

      {/* Main Grid: Map + Project Selector */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Interactive Map View */}
        <div className="space-y-4 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            {/* Map Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
                <span className="truncate text-xs font-bold text-slate-800">
                  {activeProject.name} — {activeProject.location}
                </span>
                <span className="rounded bg-slate-200 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                  {activeProject.lat.toFixed(4)}°N, {activeProject.lng.toFixed(4)}°W
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Map Type Toggle */}
                <div className="flex items-center rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
                  <button
                    onClick={() => setMapType('roadmap')}
                    className={`rounded px-2.5 py-1 font-medium transition ${
                      mapType === 'roadmap'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Plano
                  </button>
                  <button
                    onClick={() => setMapType('satellite')}
                    className={`rounded px-2.5 py-1 font-medium transition ${
                      mapType === 'satellite'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Satelital
                  </button>
                </div>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${activeProject.lat},${activeProject.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir en Google Maps
                </a>
              </div>
            </div>

            {/* Google Maps Iframe Container */}
            <div className="relative h-[380px] w-full bg-slate-100">
              <iframe
                title="Google Maps Obra de Construcción"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={mapEmbedUrl}
                className="h-full w-full contrast-[1.02] filter"
              />

              {/* Overlay Marker Card */}
              <div className="absolute right-3 bottom-3 left-3 space-y-2 rounded-xl border border-slate-200/90 bg-white/95 p-3.5 text-xs shadow-lg backdrop-blur-md sm:right-auto sm:max-w-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-blue-600 uppercase">
                      {activeProject.code}
                    </span>
                    <h4 className="mt-1 text-xs font-bold text-slate-900">{activeProject.name}</h4>
                  </div>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {activeProject.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Avance Físico:</span>
                    <span className="font-bold text-slate-800">
                      {activeProject.progressPercent}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-1.5 rounded-full bg-blue-600"
                      style={{ width: `${activeProject.progressPercent}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1 text-[11px] text-slate-600">
                  <span>Presupuesto:</span>
                  <span className="font-bold text-slate-900">
                    {formatMoney(activeProject.budgetTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Construction Safety Protocol Box */}
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="space-y-1 text-xs text-amber-900">
              <p className="text-sm font-bold">
                Protocolo Oficial de Seguridad en Terreno (CONRED / INSIVUMEH)
              </p>
              <p className="leading-relaxed">
                Todas las cuadrillas deben acatar la suspensión de trabajos en alturas cuando las
                ráfagas superen los 30 km/h o ante tormentas eléctricas. En colados de concreto con
                más del 30% de probabilidad de lluvia, es obligatorio mantener lonas listas y
                acelerante de fraguado disponible.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Construction Sites Pin Selector */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <Navigation className="h-4 w-4 text-blue-600" />
                Obras Georreferenciadas ({projects.length})
              </h4>
              <span className="text-[10px] font-medium text-slate-500">Guatemala</span>
            </div>

            <div className="max-h-[440px] space-y-2.5 overflow-y-auto pr-1">
              {projects.map((proj) => {
                const isSelected = proj.id === selectedSiteId;
                return (
                  <div
                    key={proj.id}
                    onClick={() => {
                      setSelectedSiteId(proj.id);
                      onSelectProject(proj.id);
                    }}
                    className={`cursor-pointer rounded-xl border p-3 text-xs transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isSelected ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-slate-400'
                            }`}
                          />
                          <span className="font-bold text-slate-900">{proj.name}</span>
                        </div>
                        <p className="flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin className="h-3 w-3 shrink-0 text-rose-500" />
                          <span className="truncate">{proj.location}</span>
                        </p>
                      </div>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                        {proj.code}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-600">
                      <span>
                        Avance: <strong className="text-slate-900">{proj.progressPercent}%</strong>
                      </span>
                      <span className="font-mono text-[10px] text-blue-700">
                        {proj.lat.toFixed(3)}°, {proj.lng.toFixed(3)}°
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Weather Alerts & Safety Monitoring Section */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <CloudSun className="h-5 w-5 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900">
                Alertas Meteorológicas en Tiempo Real & Monitoreo de Seguridad
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Datos verificados vía {weatherSource} • {lastRefreshed}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Monitoreo Activo INSIVUMEH
            </span>
          </div>
        </div>

        {/* Alerts Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {alerts.map((alert) => {
            const isYellow = alert.insivumehLevel === 'Amarillo';
            const isOrange = alert.insivumehLevel === 'Naranja';
            const isGreen = alert.insivumehLevel === 'Verde';

            return (
              <div
                key={alert.id}
                className="flex flex-col justify-between space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">{alert.region}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                        isYellow
                          ? 'bg-amber-100 text-amber-800'
                          : isOrange
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      Nivel {alert.insivumehLevel}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200/80 bg-white p-2.5 text-center">
                    <div>
                      <span className="block text-[10px] text-slate-400">Temp</span>
                      <span className="flex items-center justify-center gap-0.5 text-xs font-bold text-slate-800">
                        <Thermometer className="h-3 w-3 text-rose-500" />
                        {alert.temperature}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Lluvia</span>
                      <span className="flex items-center justify-center gap-0.5 text-xs font-bold text-blue-600">
                        <CloudRain className="h-3 w-3 text-blue-500" />
                        {alert.rainProbability}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Viento</span>
                      <span className="flex items-center justify-center gap-0.5 text-xs font-bold text-slate-700">
                        <Wind className="h-3 w-3 text-slate-400" />
                        {alert.windSpeed}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs font-medium text-slate-600 italic">
                    &quot;{alert.condition}&quot;
                  </p>

                  <div className="space-y-1.5 border-t border-slate-200/80 pt-2">
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      Directivas de Seguridad para Obra:
                    </span>
                    <ul className="space-y-1">
                      {alert.safetyDirectives.map((dir, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-700"
                        >
                          <span className="mt-0.5 shrink-0 font-bold text-blue-600">•</span>
                          <span>{dir}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 text-[10px] text-slate-400">
                  <span>Fuente: {alert.source}</span>
                  <span>{alert.lastUpdated}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
