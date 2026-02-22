import google.generativeai as genai
import PIL.Image
import json
import os
from dotenv import load_dotenv

# Load API Key
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def analyze_crop_image(image_path):
    if not GEMINI_API_KEY:
        return {"disease": "Error: Missing Gemini API Key in .env", "confidence": 0}

    try:
        # Load the image using Pillow
        img = PIL.Image.open(image_path)
        
        # Use Gemini 1.5 Flash (Fast & Supports Images)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = """
        You are an expert Indian agricultural scientist. Look at this crop/leaf image.
        1. Identify the crop (e.g., Tomato, Paddy, Wheat).
        2. Identify the disease or pest. If it is healthy, say "Healthy".
        
        Respond ONLY with a valid JSON format exacty like this:
        {"disease": "CropName - DiseaseName", "confidence": 95}
        """
        
        response = model.generate_content([prompt, img])
        
        # Clean the response to safely read the JSON
        response_text = response.text.replace('```json', '').replace('```', '').strip()
        data = json.loads(response_text)
        
        return {
            "disease": data.get("disease", "Unknown Issue"),
            "confidence": float(data.get("confidence", 85.0))
        }

    except Exception as e:
        print(f"Vision API Error: {e}")
        return {"disease": "Failed to analyze image with AI", "confidence": 0}

def get_farming_advice(disease_key, lang="en"):
    # If Gemini couldn't analyze it, return an error message
    if "Error" in disease_key or "Failed" in disease_key:
        return {"disease_name": disease_key, "solution": "Check API key and internet connection."}
    
    # We will let the chatbot handle detailed advice, this is a quick summary for the UI
    solution = "Use the 'Ask Expert' Chatbot below to ask exactly how to treat this specific disease!"
    
    if lang == "hi":
        solution = "इस विशिष्ट बीमारी के इलाज के तरीके के बारे में पूछने के लिए नीचे 'विशेषज्ञ से पूछें' चैटबॉट का उपयोग करें!"
    elif lang == "te":
        solution = "ఈ వ్యాధికి ఎలా చికిత్స చేయాలో అడగడానికి దిగువన ఉన్న 'నిపుణుడిని అడగండి' చాట్‌బాట్‌ను ఉపయోగించండి!"

    return {
        "disease_name": disease_key,
        "solution": solution
    }