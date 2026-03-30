from flask import Flask, render_template, jsonify, request, session
from datetime import datetime
import anthropic
import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)
app.secret_key = os.urandom(24)


import json as json_lib
import urllib.request
import urllib.error


def call_claude(system_prompt, messages):
    """Call Claude API using urllib (works on Vercel serverless)."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
    }
    payload = json_lib.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 400,
        "system": system_prompt,
        "messages": messages,
    }).encode("utf-8")

    import time
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json_lib.loads(resp.read().decode("utf-8"))
                return data["content"][0]["text"]
        except urllib.error.HTTPError as e:
            if e.code == 529 and attempt < 4:
                time.sleep(2 * (attempt + 1))
                continue
            raise

# Practice knowledge for the AI
SYSTEM_PROMPT = """Du bist der freundliche KI-Assistent der Zahnarztpraxis Dr. Max Mustermann in Wien.
Du hilfst Patienten bei Fragen und bei der Terminbuchung.

PRAXIS-INFORMATIONEN:
- Arzt: Dr. Max Mustermann
- Adresse: Wallnerstraße 4/6/2/39, 1010 Wien
- Telefon: +43 1 533 221 9
- Email: office@zahn-wien.at
- Website: www.zahn-wien.at

ÖFFNUNGSZEITEN:
- Montag bis Mittwoch: 07:00–13:00 & 14:00–18:00
- Donnerstag: 07:00–12:00
- Freitag: 07:00–11:00
- Samstag & Sonntag: geschlossen

WICHTIG: Seit 1. Januar 2026 arbeitet die Praxis als Wahlzahnarzt-Ordination (nicht mehr Kassenvertragszahnarzt).
Patienten zahlen zunächst selbst, die Praxis reicht Refundierungsanträge direkt bei den Krankenkassen ein.

BEHANDLUNGEN:
1. Beratung (Untersuchung und Besprechung) - ca. 30 Min.
2. Extraktion inkl. Anästhesie - ca. 45 Min.
3. Einflächenfüllung im Seitzahnbereich - ca. 45 Min.
4. Drei- oder Mehrflächenfüllung im Seitzahnbereich - ca. 60 Min.
5. Eckaufbau/Schneidekante - ca. 45 Min.
6. Wurzelbehandlung (3-kanalig) - ca. 90 Min.
7. Behandlung empfindlicher Zahnhälse - ca. 30 Min.
8. Zahnsteinentfernung - ca. 30 Min.
9. Zahnröntgen - ca. 15 Min.
10. Panoramaröntgen - ca. 20 Min.
11. Stomatitisbehandlung - ca. 30 Min.
12. Operative Zahnentfernung - ca. 60 Min.
13. Keramik-Inlay mehrflächig - ca. 60 Min.
14. Vollkeramik Krone - ca. 90 Min.
15. Mundhygiene - ca. 60 Min.

PREISE UND SELBSTBEHALTE (Wahlzahnarzt - Patient zahlt zunächst selbst, Praxis reicht Refundierung bei der Kasse ein):

1. Beratung (Untersuchung und Besprechung):
   - Patientenanteil: 17,00 €
   - ÖGK: Rückerstattung 13,60 €, Selbstbehalt 3,40 €
   - SVS: Rückerstattung 13,60 €, Selbstbehalt 3,40 €
   - BVA: Rückerstattung 15,30 €, Selbstbehalt 1,70 €
   - KFA: Rückerstattung 17,00 €, kein Selbstbehalt

2. Extraktion inkl. Anästhesie:
   - Patientenanteil: 24,70 €
   - ÖGK: Rückerstattung 19,76 €, Selbstbehalt 4,94 €
   - SVS: Rückerstattung 19,76 €, Selbstbehalt 4,94 €
   - BVA: Rückerstattung 22,23 €, Selbstbehalt 2,47 €
   - KFA: Rückerstattung 24,70 €, kein Selbstbehalt

3. Einflächenfüllung im Seitenzahnbereich:
   - Patientenanteil (ÖGK/SVS/BVA): 24,90 €
   - Patientenanteil (KFA): 48,60 €
   - ÖGK: Rückerstattung 19,92 €, Selbstbehalt 4,98 €
   - SVS: Rückerstattung 19,92 €, Selbstbehalt 4,98 €
   - BVA: Rückerstattung 22,41 €, Selbstbehalt 2,49 €
   - KFA: Rückerstattung 48,60 €, kein Selbstbehalt

4. Dreiflächenfüllung im Seitenzahnbereich:
   - Patientenanteil (ÖGK/SVS/BVA): 57,90 €
   - Patientenanteil (KFA): 82,50 €
   - ÖGK: Rückerstattung 46,32 €, Selbstbehalt 11,58 €
   - SVS: Rückerstattung 46,32 €, Selbstbehalt 11,58 €
   - BVA: Rückerstattung 52,11 €, Selbstbehalt 5,79 €
   - KFA: Rückerstattung 82,50 €, kein Selbstbehalt

5. Eckaufbau / Aufbau einer Schneidekante:
   - Patientenanteil: 131,60 €
   - ÖGK: Rückerstattung 105,28 €, Selbstbehalt 26,32 €
   - SVS: Rückerstattung 105,28 €, Selbstbehalt 26,32 €
   - BVA: Rückerstattung 118,44 €, Selbstbehalt 13,16 €
   - KFA: Rückerstattung 131,60 €, kein Selbstbehalt

6. Wurzelbehandlung (3-kanalig):
   - Patientenanteil: 215,10 €
   - ÖGK: Rückerstattung 172,08 €, Selbstbehalt 43,02 €
   - SVS: Rückerstattung 172,08 €, Selbstbehalt 43,02 €
   - BVA: Rückerstattung 193,59 €, Selbstbehalt 21,51 €
   - KFA: Rückerstattung 215,10 €, kein Selbstbehalt

7. Behandlung empfindlicher Zahnhälse:
   - Patientenanteil: 5,50 €
   - ÖGK: Rückerstattung 4,40 €, Selbstbehalt 1,10 €
   - SVS: Rückerstattung 4,40 €, Selbstbehalt 1,10 €
   - BVA: Rückerstattung 4,95 €, Selbstbehalt 0,55 €
   - KFA: Rückerstattung 5,50 €, kein Selbstbehalt

8. Zahnsteinentfernung:
   - Patientenanteil: 14,30 €
   - ÖGK: Rückerstattung 11,44 €, Selbstbehalt 2,86 €
   - SVS: Rückerstattung 11,44 €, Selbstbehalt 2,86 €
   - BVA: Rückerstattung 12,87 €, Selbstbehalt 1,43 €
   - KFA: Rückerstattung 14,30 €, kein Selbstbehalt

9. Zahnröntgen:
   - Patientenanteil: 8,40 €
   - ÖGK: Rückerstattung 6,72 €, Selbstbehalt 1,68 €
   - SVS: Rückerstattung 6,72 €, Selbstbehalt 1,68 €
   - BVA: Rückerstattung 7,56 €, Selbstbehalt 0,84 €
   - KFA: Rückerstattung 8,40 €, kein Selbstbehalt

10. Panoramaröntgen:
   - Patientenanteil: ÖGK 39,20 €, SVS 40,40 €, BVA 39,20 €, KFA 41,70 €
   - ÖGK: Rückerstattung 31,36 €, Selbstbehalt 7,84 €
   - SVS: Rückerstattung 32,32 €, Selbstbehalt 8,08 €
   - BVA: Rückerstattung 35,28 €, Selbstbehalt 3,92 €
   - KFA: Rückerstattung 41,70 €, kein Selbstbehalt

11. Stomatitisbehandlung:
   - Patientenanteil: 7,80 €
   - ÖGK: Rückerstattung 6,24 €, Selbstbehalt 1,56 €
   - SVS: Rückerstattung 6,24 €, Selbstbehalt 1,56 €
   - BVA: Rückerstattung 7,02 €, Selbstbehalt 0,78 €
   - KFA: Rückerstattung 7,80 €, kein Selbstbehalt

12. Operative Zahnentfernung:
   - Patientenanteil: 83,00 €
   - ÖGK: Rückerstattung 66,40 €, Selbstbehalt 16,60 €
   - SVS: Rückerstattung 66,40 €, Selbstbehalt 16,60 €
   - BVA: Rückerstattung 74,70 €, Selbstbehalt 8,30 €
   - KFA: Rückerstattung 83,00 €, kein Selbstbehalt

13. Keramik-Inlay mehrflächig:
   - Empfohlener Richttarif: 902,00 € (genaue Eigenpreise auf Anfrage)
   - ÖGK: Kassenbeitrag 46,32 €, Selbstbehalt ca. 703,68 €
   - SVS: Kassenbeitrag 46,32 €, Selbstbehalt ca. 703,68 €
   - BVA: Kassenbeitrag 52,11 €, Selbstbehalt ca. 697,89 €
   - KFA: Kassenbeitrag 82,50 €, Selbstbehalt ca. 667,50 €

14. Vollkeramik Krone:
   - Empfohlener Richttarif: 1.331,00 € (genaue Eigenpreise auf Anfrage)
   - ÖGK: keine Erstattung, Selbstbehalt ca. 990,00 €
   - SVS: Kassenbeitrag 100,00 €, Selbstbehalt ca. 890,00 €
   - BVA: Kassenbeitrag 200,00 €, Selbstbehalt ca. 790,00 €
   - KFA: Kassenbeitrag 69,77 €, Selbstbehalt ca. 920,23 €

15. Mundhygiene (ca. 60 Min.):
   - Umfasst: gründliche Zahnreinigung, Pulverstrahl-Polierung, Zahnstein- und Belagentfernung, Pflegeempfehlungen
   - Empfohlener Richttarif (30 Min.): 122,00 € — die Praxis bietet einen attraktiveren 60-Min.-Tarif (auf Anfrage)
   - Enthaltene Kassenleistungen: Zahnsteinentfernung (14,30 €), Stomatitisbehandlung (8,00 €), Behandlung empf. Zahnhälse (5,50 €)
   - ÖGK: Rückerstattung 22,24 € (80% der Kassenleistungen), Selbstbehalt ca. 110,56 €
   - SVS (1x/Jahr): zusätzlich 40,00 € Rückerstattung, Selbstbehalt ca. 65,00 €
   - BVA (2x/Jahr): zusätzlich 42,60 € Rückerstattung, Selbstbehalt ca. 62,40 €
   - KFA (1x/Jahr): zusätzlich 92,00 € Rückerstattung, Selbstbehalt nur ca. 23,00 €

Genaue Eigenpreise für Keramik-Inlay, Vollkeramik Krone und Mundhygiene auf telefonische Anfrage: +43 1 533 221 9 oder office@zahn-wien.at.

REGELN:
- Antworte immer auf Deutsch
- Sei freundlich, professionell und hilfsbereit
- Halte die Antworten kurz und klar (max 2-3 Sätze, bei Preisfragen darf es mehr sein)
- Wenn der Patient einen Termin buchen möchte, frage nach der gewünschten Behandlung und sage ihm, er soll auf den Button "Termin buchen" klicken
- Wenn nach Preisen gefragt wird, nenne die oben angegebenen Preise und Selbstbehalte. Frage ggf. nach der Krankenkasse des Patienten, um den genauen Selbstbehalt nennen zu können
- Wenn du etwas nicht weißt, sage ehrlich dass du es nicht weißt und empfehle den Kontakt zur Praxis
- Erfinde KEINE Preise oder Informationen die nicht oben stehen
- Wenn der Patient einen Termin buchen möchte, antworte mit dem speziellen Tag: [TERMIN_BUCHEN] am Ende deiner Nachricht
"""

# Services list
SERVICES = [
    {"id": 1, "name": "Erste Kontrolle", "desc": "Erstuntersuchung und Beratung", "duration": 30},
    {"id": 2, "name": "Zahnentfernung", "desc": "Extraktion inkl. Anästhesie", "duration": 45},
    {"id": 3, "name": "Wurzelbehandlung", "desc": "Wurzelbehandlung (3-kanalig)", "duration": 90},
    {"id": 4, "name": "Füllung", "desc": "Zahnfüllung", "duration": 45},
    {"id": 5, "name": "Mundhygiene", "desc": "Professionelle Zahnreinigung", "duration": 60},
]

appointments = []


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/services")
def get_services():
    return jsonify(SERVICES)


@app.route("/api/debug")
def debug():
    key = os.getenv("ANTHROPIC_API_KEY", "NOT SET")
    masked = key[:12] + "..." if len(key) > 12 else key
    try:
        reply = call_claude("Antworte kurz auf Deutsch.", [{"role": "user", "content": "Hi"}])
        return jsonify({"key": masked, "status": "OK", "reply": reply})
    except Exception as e:
        return jsonify({"key": masked, "status": "ERROR", "error": str(e), "type": type(e).__name__})


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json
    user_message = data.get("message", "")
    history = data.get("history", [])

    # Build messages for Claude
    messages = []
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})

    try:
        reply = call_claude(SYSTEM_PROMPT, messages)

        # Check if bot suggests booking
        show_booking = "[TERMIN_BUCHEN]" in reply
        clean_reply = reply.replace("[TERMIN_BUCHEN]", "").strip()

        return jsonify({
            "reply": clean_reply,
            "show_booking": show_booking,
        })
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        if e.code == 401:
            return jsonify({
                "reply": "API-Key ist nicht konfiguriert oder ungültig.",
                "show_booking": False,
            })
        return jsonify({
            "reply": f"API Fehler ({e.code}): {body}",
            "show_booking": False,
        })
    except Exception as e:
        return jsonify({
            "reply": f"Fehler: {str(e)}",
            "show_booking": False,
        })


@app.route("/api/book", methods=["POST"])
def book_appointment():
    data = request.json
    appointment = {
        "id": len(appointments) + 1,
        "service_id": data["service_id"],
        "service_name": data["service_name"],
        "date": data["date"],
        "time": data["time"],
        "patient_name": data["patient_name"],
        "phone": data.get("phone", ""),
        "versicherungsnummer": data.get("versicherungsnummer", ""),
        "booked_at": datetime.now().isoformat(),
    }
    appointments.append(appointment)
    return jsonify({"success": True, "appointment": appointment})


@app.route("/api/appointments")
def get_appointments():
    return jsonify(appointments)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
