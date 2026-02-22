import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import google.generativeai as genai
from ai_engine import analyze_crop_image

load_dotenv()
app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        file = request.files.get('image')
        lang = request.form.get('language', 'en')
        
        if file:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            # Get structured JSON from our Hybrid Engine
            result = analyze_crop_image(filepath, lang)
            return jsonify(result)
            
    except Exception as e:
        print(f"[ERROR] Prediction failed: {str(e)}")
        return jsonify({"disease": "Error", "observation": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('question', '')
    lang = data.get('language', 'en')
    history = data.get('history', [])
    
    if not GEMINI_API_KEY:
        return jsonify({"reply": "API Key Missing!"})

    # NEW PROMPT: Strictly forbid Markdown/Stars
    prompt = f"You are an expert Indian agricultural scientist.\n"
    prompt += f"Language: '{lang}'.\n"
    prompt += "CRITICAL RULE: DO NOT use markdown, asterisks (*), or bold text. Use plain text only. Keep answers under 3 sentences.\n\n"
    
    for msg in history[-3:]: # Only keep last 3 messages for speed
        sender = "Farmer" if msg['sender'] == 'user' else "Expert"
        prompt += f"{sender}: {msg['text']}\n"
    
    prompt += f"Farmer: {user_message}\nExpert:"
    
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(prompt)
        # Extra safety: remove any stars that sneak through
        clean_reply = response.text.replace('*', '') 
        return jsonify({"reply": clean_reply.strip()})
    except Exception as e:
        return jsonify({"reply": f"Error: {str(e)}"})

if __name__ == '__main__':
    app.run(debug=True, port=5000, threaded=False)