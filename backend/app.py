import os
import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import google.generativeai as genai
from ai_engine import analyze_crop_image, get_farming_advice

# Load environment variables (API Key)
load_dotenv()

# Initialize Flask App
app = Flask(__name__)
CORS(app)

# Setup Uploads Folder
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Database Setup
def init_db():
    try:
        conn = sqlite3.connect('farm_data.db')
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS history 
                     (id INTEGER PRIMARY KEY, disease TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)''')
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB Warning] Could not init database: {e}")

init_db()

@app.route('/')
def home():
    return "Smart Farming API is Running!"

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image part"}), 400
        
        file = request.files['image']
        lang = request.form.get('language', 'en')

        if file:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            # Send to Gemini Vision API (in ai_engine.py)
            analysis_result = analyze_crop_image(filepath)
            advice = get_farming_advice(analysis_result['disease'], lang)

            return jsonify({
                "disease": advice['disease_name'],
                "confidence": analysis_result['confidence'],
                "solution": advice['solution']
            })
    except Exception as e:
        print(f"[ERROR] Prediction failed: {str(e)}")
        return jsonify({"disease": "Error", "confidence": 0, "solution": "Failed to process image."}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('question', '')
    lang = data.get('language', 'en')
    history = data.get('history', [])            
    disease_context = data.get('disease_context') 
    
    if not GEMINI_API_KEY:
        return jsonify({"reply": "System Error: Missing Gemini API Key in backend/.env file!"})

    prompt = f"System: You are an expert Indian agricultural scientist.\n"
    prompt += f"IMPORTANT: Reply ONLY in this language code: '{lang}'.\n"
    
    if disease_context:
        prompt += f"\n[Context]: The farmer's image scanner just detected: '{disease_context}'. Keep this in mind.\n\n"
    
    prompt += "--- Conversation History ---\n"
    for msg in history:
        sender = "Farmer" if msg['sender'] == 'user' else "Expert"
        prompt += f"{sender}: {msg['text']}\n"
    
    prompt += f"Farmer: {user_message}\nExpert:"
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        return jsonify({"reply": response.text})
    except Exception as e:
        error_message = str(e)
        print(f"Chatbot Error: {error_message}")
        return jsonify({"reply": f"API Error: {error_message}"})

if __name__ == '__main__':
    app.run(debug=True, port=5000, threaded=False)