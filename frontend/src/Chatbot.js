import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Added currentDisease as a prop
export default function Chatbot({ language, currentDisease }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Your browser does not support voice input.");

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      setInput(event.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: "user", text: input };
    const currentHistory = [...messages]; // Capture history BEFORE adding the new message
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await axios.post('/api/chat', {
        question: userMsg.text,
        language: language,
        history: currentHistory,         // <-- Sending previous messages!
        disease_context: currentDisease  // <-- Sending the detected disease!
      });
      
      const botMsg = { sender: "bot", text: response.data.reply };
      setMessages((prev) => [...prev, botMsg]);

      // Read aloud
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(botMsg.text);
      utterance.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-IN';
      synth.speak(utterance);

    } catch (error) {
      setMessages((prev) => [...prev, { sender: "bot", text: "Error connecting to expert." }]);
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="bg-green-600 text-white rounded-full p-4 shadow-2xl text-3xl">
          💬
        </button>
      )}

      {isOpen && (
        <div className="bg-white w-80 md:w-96 h-[500px] rounded-2xl shadow-2xl flex flex-col border border-gray-200">
          <div className="bg-green-700 text-white p-4 flex justify-between items-center">
            <h3 className="font-bold text-lg">👨‍🌾 Ask Expert</h3>
            <button onClick={() => setIsOpen(false)} className="text-xl font-bold">×</button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-green-50 space-y-3">
            {messages.length === 0 && (
              <p className="text-gray-500 text-center mt-4 text-sm">Ask me about crops, weather, or fertilizers!</p>
            )}
            {/* Show contextual badge if disease was detected */}
            {currentDisease && messages.length === 0 && (
              <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs p-2 rounded text-center mb-2">
                Scanner detected: <b>{currentDisease}</b>. Feel free to ask about it!
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-2xl max-w-[85%] text-sm shadow-sm ${msg.sender === 'user' ? 'bg-green-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-green-200 rounded-bl-none'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && <div className="text-gray-400 text-sm">Expert is typing...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-white border-t flex items-center gap-2">
            <button onClick={startListening} className={`p-3 rounded-full ${isListening ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              🎤
            </button>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type or speak..."
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 outline-none text-sm"
            />
            <button onClick={sendMessage} className="bg-green-600 text-white p-3 rounded-full">➤</button>
          </div>
        </div>
      )}
    </div>
  );
}