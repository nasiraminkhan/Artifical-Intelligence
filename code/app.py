from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
import json
import os

app = Flask(__name__)
CORS(app)

client = Groq(api_key=)

HISTORY_FILE = "chat_history.json"
@app.route("/")
def index():
 return {}
def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r") as f:
            return json.load(f)
    return {}

def save_history(data):
    with open(HISTORY_FILE, "w") as f:
        json.dump(data, f)

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    user_message = data.get("message", "")
    chat_id = data.get("chat_id", "default")

    if not user_message:
        return jsonify({"reply": "Please send a message."})

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": """You are a Medical AI Assistant. Your name is MedBot.
You ONLY answer questions related to medicine and health:
- Diseases and their symptoms
- Treatments and medications
- Human body and anatomy
- Health tips and prevention
- Common illnesses like fever, cold, diabetes, blood pressure
- First aid and emergency advice

If anyone asks anything outside of medical topics, respond with:
'I am a Medical AI Assistant. I can only help with health and medical questions. Please ask me about symptoms, diseases, treatments, or medications.'

Always remind users: 'For serious conditions, please consult a doctor. For emergencies in Pakistan, call 1122.'

IMPORTANT: Always respond in the same language the user writes in.
- If user writes in English reply in English
- If user writes in Roman Urdu reply in Roman Urdu
- If user writes in Urdu script reply in Urdu script
- Never mix languages unless the user does"""
                },
                {"role": "user", "content": user_message}
            ]
        )

        reply = response.choices[0].message.content

        history = load_history()

        if chat_id not in history:
            history[chat_id] = {"title": user_message[:30], "messages": []}
        elif history[chat_id]["title"] == "New Chat":
            history[chat_id]["title"] = user_message[:30]

        history[chat_id]["messages"].append({"text": user_message, "isUser": True})
        history[chat_id]["messages"].append({"text": reply, "isUser": False})

        save_history(history)

        return jsonify({"reply": reply})

    except Exception as e:
        return jsonify({"reply": f"Error: {str(e)}"})

@app.route("/history", methods=["GET"])
def get_history():
    return jsonify(load_history())

@app.route("/new_chat", methods=["POST"])
def new_chat():
    data = request.json
    chat_id = data.get("chat_id")
    history = load_history()
    history[chat_id] = {"title": "New Chat", "messages": []}
    save_history(history)
    return jsonify({"success": True})

@app.route("/delete_chat", methods=["POST"])
def delete_chat():
    data = request.json
    chat_id = data.get("chat_id")
    history = load_history()
    if chat_id in history:
        del history[chat_id]
        save_history(history)
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
