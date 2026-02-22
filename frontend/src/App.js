import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { translations } from './i18n';
import Chatbot from './Chatbot'; // Importing the Chatbot component

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [lang, setLang] = useState('en');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor Offline/Online Status
  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  // Handle Image Selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult(null); // Clear previous results when a new image is selected
    }
  };

  // Submit Image to Backend API
  const handleSubmit = async () => {
    if (!file) return alert("Please select an image first.");
    
    if (!isOnline) {
      alert(translations[lang].offline);
      // PWA logic: here you would save to IndexedDB if offline
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('language', lang); // Send the selected language to the backend

    try {
      // Axios automatically routes to http://127.0.0.1:5000 because of the proxy in package.json
      const response = await axios.post('/api/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(response.data);
    } catch (error) {
      console.error("Error uploading:", error);
      alert("Error processing image. Ensure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  // Helper for translated text
  const t = translations[lang];

  return (
    <div className="min-h-screen bg-green-50 p-4 md:p-8 flex flex-col items-center relative">
      
      {/* Header & Language Selector */}
      <div className="w-full max-w-md flex justify-between items-center mb-8 bg-green-700 text-white p-4 rounded-xl shadow-lg">
        <h1 className="font-bold text-lg">{t.title}</h1>
        <select 
          value={lang} 
          onChange={(e) => setLang(e.target.value)}
          className="text-black rounded px-2 py-1 outline-none font-medium cursor-pointer"
        >
          <option value="en">English</option>
          <option value="hi">हिंदी (Hindi)</option>
          <option value="te">తెలుగు (Telugu)</option>
        </select>
      </div>

      {/* Main Scanner Card */}
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
        
        {/* Offline Warning Banner */}
        {!isOnline && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-center text-sm font-bold">
            📡 Offline Mode - Please connect to the internet to analyze.
          </div>
        )}

        {/* Image Capture / Preview Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg h-64 flex items-center justify-center mb-4 bg-gray-50 overflow-hidden relative hover:bg-gray-100 transition cursor-pointer">
          {preview ? (
            <img src={preview} alt="Crop Preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-gray-400">
               <span className="text-5xl mb-2">🌾</span>
               <span className="text-sm font-medium">Tap to take or upload photo</span>
            </div>
          )}
          
          {/* Hidden File Input covering the entire box */}
          <input 
            type="file" 
            accept="image/*"
            capture="environment" /* Opens back camera directly on mobile */
            onChange={handleFileChange} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg shadow pointer-events-none opacity-90">
            {t.upload}
          </button>
          
          <button 
            onClick={handleSubmit} 
            disabled={loading || !file}
            className={`w-full py-3 font-bold rounded-lg shadow transition-colors flex justify-center items-center gap-2 ${
              loading || !file 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white active:scale-95'
            }`}
          >
            {loading ? (
              <>{t.analyzing} <span className="animate-spin text-xl">↻</span></>
            ) : (
              t.analyze
            )}
          </button>
        </div>

        {/* Disease Results Section */}
        {result && (
          <div className="mt-6 border-t pt-4 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-800 mb-3">{t.result}</h2>
            
            {/* Disease Name Box */}
            <div className="bg-red-50 p-3 rounded-lg border border-red-200 mb-3">
              <span className="block text-sm text-red-600 font-bold uppercase">Detected Disease</span>
              <span className="text-lg font-bold text-red-800">{result.disease}</span>
              <div className="text-xs text-gray-500 mt-1">AI Confidence: {result.confidence}%</div>
            </div>

            {/* Cure / Solution Box */}
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <span className="block text-sm text-green-700 font-bold uppercase">{t.solution}</span>
              <p className="text-green-900 mt-1 whitespace-pre-line leading-relaxed">
                {result.solution}
              </p>
            </div>
          </div>
        )}

      </div>

      {/* 🤖 Floating Voice AI Chatbot Component */}
      {/* We pass the currently selected language down to the chatbot so it replies and listens in the right language */}
      <Chatbot language={lang} 
      currentDisease={result ? result.disease : null}/>

    </div>
  );
}

export default App;