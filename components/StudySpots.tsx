import React, { useState, useEffect } from 'react';
import { findStudySpots } from '../services/geminiService';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

const StudySpots: React.FC = () => {
    const [spots, setSpots] = useState<any[]>([]);
    const [introText, setIntroText] = useState('');
    const [loading, setLoading] = useState(false);
    const [locationError, setLocationError] = useState('');

    const handleFindSpots = () => {
        setLoading(true);
        setLocationError('');
        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by your browser.");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const result = await findStudySpots(latitude, longitude);
                setIntroText(result.text);
                setSpots(result.places);
            } catch (err) {
                setLocationError("Failed to fetch study spots from Gemini.");
            } finally {
                setLoading(false);
            }
        }, (err) => {
            setLocationError("Unable to retrieve your location.");
            setLoading(false);
        });
    };

    return (
        <div className="h-full p-6 overflow-y-auto">
            <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <MapPin className="mr-2 text-indigo-600" /> Find Quiet Study Spots
                </h2>
                <p className="text-gray-600 mb-6">
                    Use Gemini Maps integration to find the best libraries and cafes near you.
                </p>

                {spots.length === 0 && !loading && (
                    <button 
                        onClick={handleFindSpots}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 flex items-center"
                    >
                        <Navigation size={18} className="mr-2" /> Locate Nearby Spots
                    </button>
                )}

                {loading && (
                    <div className="flex items-center text-indigo-600">
                        <Loader2 className="animate-spin mr-2" /> Searching map data...
                    </div>
                )}

                {locationError && (
                    <div className="text-red-500 mt-4 p-3 bg-red-50 rounded-lg">{locationError}</div>
                )}

                {spots.length > 0 && (
                    <div className="space-y-6 mt-6">
                         <div className="prose prose-sm text-gray-600 mb-4">
                             {introText}
                         </div>
                         <div className="grid gap-4 sm:grid-cols-2">
                             {spots.map((spot, idx) => (
                                 <div key={idx} className="border border-gray-200 p-4 rounded-lg hover:shadow-md transition-shadow">
                                     <h3 className="font-bold text-lg">{spot.title}</h3>
                                     <div className="mt-2 text-sm text-gray-500">
                                         {spot.rating && <span className="text-yellow-600 mr-2">★ {spot.rating}</span>}
                                         <span>{spot.userRatingCount} reviews</span>
                                     </div>
                                     <a 
                                        href={spot.googleMapsUri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-block text-indigo-600 font-medium hover:underline text-sm"
                                     >
                                         View on Maps
                                     </a>
                                 </div>
                             ))}
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudySpots;
