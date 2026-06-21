'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Camera, Loader2, Save, MapPin, Briefcase, CheckCircle, Clock, Navigation } from 'lucide-react';
import TrackingMap from '@/components/TrackingMap';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters long.' }).nullable().or(z.string().length(0)),
  email: z.string().email({ message: 'Invalid email address format.' }).nullable().or(z.string().length(0)),
  additionalPhone: z.string().nullable().or(z.string().length(0)),
  houseAddress: z.string().nullable().or(z.string().length(0)),
});

type ProfileInputs = z.infer<typeof profileSchema>;

export default function SeekerProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalAccepted: 0, completed: 0, ongoing: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // GPS Tracking States
  const [isTracking, setIsTracking] = useState(false);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  
  const gpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileInputs>({
    resolver: zodResolver(profileSchema),
  });

  // Load Profile details on mount
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) throw new Error('Failed to load profile.');
        const result = await res.json();
        
        const user = result.user;
        setValue('name', user.name || '');
        setValue('email', user.email || '');
        setValue('additionalPhone', user.additionalPhone || '');
        setValue('houseAddress', user.houseAddress || '');
        setProfilePic(user.profilePicUrl || null);
        
        if (result.stats) {
          setStats(result.stats);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error fetching profile data.');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [setValue]);

  // Clean up GPS handlers when component unmounts
  useEffect(() => {
    return () => {
      stopGpsTracking();
    };
  }, []);

  // --- GPS TRACKING TOGGLE HANDLERS ---
  const handleGpsToggle = () => {
    if (isTracking) {
      stopGpsTracking();
    } else {
      startGpsTracking();
    }
  };

  const startGpsTracking = () => {
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    // 1. Get initial position and send to server
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ latitude, longitude });
        postGpsLocation(latitude, longitude);
      },
      (error) => {
        setGpsError(`GPS Access Denied: ${error.message}`);
        setIsTracking(false);
      },
      { enableHighAccuracy: true }
    );

    // 2. Set interval to POST coordinates every 30 seconds
    gpsIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ latitude, longitude });
          postGpsLocation(latitude, longitude);
        },
        (error) => {
          console.error('GPS interval error:', error);
        },
        { enableHighAccuracy: true }
      );
    }, 30000);

    // 3. Watch position in real-time to update UI mini-map dynamically
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ latitude, longitude });
      },
      (error) => {
        console.error('GPS watch error:', error);
      },
      { enableHighAccuracy: true }
    );

    setIsTracking(true);
  };

  const stopGpsTracking = () => {
    // Clear interval posting
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
    // Clear watch position
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setCoordinates(null);
    setIsTracking(false);
  };

  const postGpsLocation = async (lat: number, lng: number) => {
    try {
      await fetch('/api/gps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
      console.log(`[GPS TELEMETRY] Logged coordinates: Lat: ${lat}, Lng: ${lng}`);
    } catch (err) {
      console.error('Failed to log location coordinates:', err);
    }
  };

  // --- PROFILE PICTURE UPLOAD HANDLERS ---
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg('Image file size is too large. Maximum size is 4MB.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      try {
        const uploadRes = await fetch('/api/profile/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Data }),
        });

        const uploadResult = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadResult.error || 'Upload failed.');

        setProfilePic(uploadResult.imageUrl);
        setSuccessMsg('Profile picture uploaded successfully!');
        router.refresh();
      } catch (err: any) {
        setErrorMsg(err.message || 'Image upload failed.');
      } finally {
        setUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: ProfileInputs) => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formattedData = {
      name: data.name || null,
      email: data.email || null,
      additionalPhone: data.additionalPhone || null,
      houseAddress: data.houseAddress || null,
    };

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to update profile settings.');

      setSuccessMsg('Profile settings updated successfully!');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[500px]">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-primary flex items-center gap-2">
          <User size={28} /> Seeker Profile
        </h1>
        <p className="text-slate-500 mt-1">Configure your personal information, address, and live GPS sharing settings</p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-700 font-medium">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-700 font-medium">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar & Job Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Avatar Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              {profilePic ? (
                <img
                  src={profilePic}
                  alt="Profile Avatar"
                  className="w-32 h-32 rounded-full object-cover border-4 border-slate-50 shadow-sm"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border-4 border-slate-50">
                  <User size={48} />
                </div>
              )}
              
              <label className="absolute bottom-1 right-1 p-2 bg-accent text-primary rounded-full hover:bg-accent-hover transition-colors shadow-md cursor-pointer">
                {uploading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Camera size={16} />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
            
            <div>
              <h3 className="font-bold text-lg text-primary">Seeker Account</h3>
              <p className="text-xs text-slate-400 mt-0.5">Avatar image max 4MB</p>
            </div>
          </div>

          {/* Stats Summary Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="font-bold text-sm text-primary uppercase tracking-wider">Job History Summary</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-500 flex items-center gap-1.5"><Briefcase size={16} /> Total Accepted</span>
                <span className="font-bold text-primary">{stats.totalAccepted}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-500 flex items-center gap-1.5"><CheckCircle size={16} className="text-emerald-500" /> Completed</span>
                <span className="font-bold text-primary">{stats.completed}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 flex items-center gap-1.5"><Clock size={16} className="text-blue-500" /> Ongoing Gigs</span>
                <span className="font-bold text-primary">{stats.ongoing}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Settings and GPS tracking map */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Profile Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <h3 className="font-bold text-base text-primary border-b border-slate-100 pb-2">Personal Settings</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="e.g. Adnan Rahman"
                  {...register('name')}
                  className="block w-full px-4 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="text"
                  placeholder="e.g. adnan@domain.com"
                  {...register('email')}
                  className="block w-full px-4 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Additional Phone */}
              <div>
                <label htmlFor="additionalPhone" className="block text-sm font-semibold text-slate-700 mb-1">
                  Secondary Phone Number
                </label>
                <input
                  id="additionalPhone"
                  type="text"
                  placeholder="e.g. 01XXXXXXXXX"
                  {...register('additionalPhone')}
                  className="block w-full px-4 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                />
                {errors.additionalPhone && (
                  <p className="mt-1 text-xs text-red-500">{errors.additionalPhone.message}</p>
                )}
              </div>

              {/* House Address */}
              <div>
                <label htmlFor="houseAddress" className="block text-sm font-semibold text-slate-700 mb-1">
                  Home Address
                </label>
                <input
                  id="houseAddress"
                  type="text"
                  placeholder="e.g. Flat 4B, House 12, Road 4, Dhanmondi"
                  {...register('houseAddress')}
                  className="block w-full px-4 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                />
                {errors.houseAddress && (
                  <p className="mt-1 text-xs text-red-500">{errors.houseAddress.message}</p>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 py-3 px-6 border border-transparent text-sm font-bold rounded-xl text-primary bg-accent hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {saving ? 'Saving changes...' : 'Save Settings'}
              </button>
            </div>
          </form>

          {/* GPS Tracking Panel */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-base text-primary flex items-center gap-2">
                  <Navigation size={18} className="text-accent" /> GPS Location Tracker
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Share your live position with posters to coordinate work delivery</p>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={handleGpsToggle}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isTracking ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isTracking ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {gpsError && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-lg text-xs font-semibold text-red-700">
                {gpsError}
              </div>
            )}

            {isTracking ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-xl text-xs flex items-center gap-1.5 font-medium animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  GPS Sharing Active. Posting coordinates every 30 seconds.
                </div>

                {coordinates ? (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 flex justify-between font-medium">
                      <span>Live Mini-map Position:</span>
                      <span className="text-slate-600 font-bold">Lat: {coordinates.latitude.toFixed(6)}, Lng: {coordinates.longitude.toFixed(6)}</span>
                    </div>
                    <div className="h-[250px] relative overflow-hidden rounded-xl border border-slate-100">
                      <TrackingMap
                        latitude={coordinates.latitude}
                        longitude={coordinates.longitude}
                        seekerName="My Position"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-8 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-xs gap-2">
                    <Loader2 className="animate-spin text-accent" size={16} />
                    Calculating GPS position...
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                <MapPin size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">Location sharing is inactive</p>
                <p className="mt-1">Toggle the GPS switch to start broadcasting your location and center the mini-map.</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
