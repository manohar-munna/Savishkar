import React, { useState } from 'react';
import axios from 'axios';
import { translations } from './i18n';
import Chatbot from './Chatbot';

function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [lang, setLang] = useState('en');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) return alert("Please select an image first.");
    setLoading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('language', lang);

    try {
      const response = await axios.post('/api/predict', formData);
      setResult(response.data);
    } catch (error) {
      alert("Error processing image.");
    } finally {
      setLoading(false);
    }
  };

  // --- TEXT TO SPEECH LOGIC ---
  const speakText = (text) => {
    window.speechSynthesis.cancel(); // Stop current audio
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN';
    window.speechSynthesis.speak(utterance);
  };

  const t = translations[lang];

  return (
    <div className="min-h-screen bg-green-50 p-4 md:p-8 flex flex-col items-center pb-24">
      
      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-6 bg-green-700 text-white p-4 rounded-xl shadow-lg">
        <h1 className="font-bold text-lg">{t.title}</h1>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="text-black rounded px-2 py-1 outline-none font-medium">
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="te">తెలుగు</option>
        </select>
      </div>

      {/* Scanner Card */}
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-6 mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg h-64 flex items-center justify-center mb-4 bg-gray-50 relative overflow-hidden">
          {preview ? <img src={preview} alt="Crop" className="h-full w-full object-cover" /> : <span className="text-5xl">🌾</span>}
          <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
        
        <button onClick={handleSubmit} disabled={loading || !file} className={`w-full py-3 font-bold rounded-lg shadow text-white ${loading || !file ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
          {loading ? "⏳ " + t.analyzing : "🔍 " + t.analyze}
        </button>
      </div>

      {/* Structured Results */}
      {result && (
        <div className="w-full max-w-md space-y-4 animate-fade-in">
          
          {/* Disease ID */}
          <div className="bg-red-50 p-4 rounded-xl shadow border border-red-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-red-700 uppercase">{t.disease}</span>
              <button onClick={() => speakText(result.disease)} className="bg-white p-2 rounded-full shadow hover:bg-gray-100">🔊</button>
            </div>
            <h2 className="text-2xl font-bold text-red-900">{result.disease}</h2>
          </div>

          {/* Observation */}
          <div className="bg-blue-50 p-4 rounded-xl shadow border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-blue-700 uppercase">{t.observation}</span>
              <button onClick={() => speakText(result.observation)} className="bg-white p-2 rounded-full shadow hover:bg-gray-100">🔊</button>
            </div>
            <p className="text-blue-900">{result.observation}</p>
          </div>

          {/* Suggestions */}
          <div className="bg-yellow-50 p-4 rounded-xl shadow border border-yellow-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-yellow-700 uppercase">{t.suggestions}</span>
              <button onClick={() => speakText(result.suggestions)} className="bg-white p-2 rounded-full shadow hover:bg-gray-100">🔊</button>
            </div>
            <p className="text-yellow-900">{result.suggestions}</p>
          </div>

          {/* Fertilizers & Price */}
          <div className="bg-green-100 p-4 rounded-xl shadow border border-green-300">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold text-green-800 uppercase">{t.fertilizers}</span>
              <button onClick={() => {
                const textToRead = result.fertilizers.map(f => `${f.name} costs ${f.price}`).join('. ');
                speakText(textToRead);
              }} className="bg-white p-2 rounded-full shadow hover:bg-gray-100">🔊</button>
            </div>
            <div className="space-y-2">
              {result.fertilizers && result.fertilizers.length > 0 ? result.fertilizers.map((fert, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg flex justify-between items-center shadow-sm">
                  <span className="font-semibold text-gray-800">{fert.name}</span>
                  <span className="bg-green-200 text-green-900 px-3 py-1 rounded-full text-sm font-bold">{fert.price}</span>
                </div>
              )) : <p className="text-gray-600">No specific fertilizers needed.</p>}
            </div>
          </div>

        </div>
      )}

      <Chatbot language={lang} currentDisease={result?.disease} />
    </div>
  );
}

export default App;