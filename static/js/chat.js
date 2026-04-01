// State
let services = [];
let selectedService = null;
let selectedDate = null;
let selectedTime = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let chatHistory = [];
let bookingMode = false;
let bookingStep = null;
let chatOpened = false;

const chatWidget = document.getElementById("chatWidget");
const chatBubble = document.getElementById("chatBubble");
const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const bubbleBadge = document.getElementById("bubbleBadge");
const bubbleIcon = document.getElementById("bubbleIcon");

const monthNames = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
];

// Toggle chat open/close
function toggleChat() {
    const isOpen = chatWidget.classList.contains("open");

    if (isOpen) {
        chatWidget.classList.remove("open");
        chatBubble.style.display = "";
    } else {
        chatWidget.classList.add("open");
        chatBubble.style.display = "none";
        bubbleBadge.classList.add("hidden");

        if (!chatOpened) {
            chatOpened = true;
            setTimeout(() => {
                addBotMessage("Willkommen bei der Zahnarztpraxis Dr. Max Mustermann! 😊");
                setTimeout(() => {
                    addBotMessage("Ich bin Ihr KI-Assistent. Sie können mir Fragen stellen oder einen Termin buchen.\n\nWie kann ich Ihnen helfen?");
                }, 600);
            }, 400);
        }

        userInput.focus();
    }
}

// Enter key
userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendUserInput();
});

// Load services
async function loadServices() {
    try {
        const res = await fetch("/api/services");
        services = await res.json();
        showServiceSelection();
    } catch (err) {
        addBotMessage("Entschuldigung, Fehler beim Laden der Behandlungen.");
    }
}

// Send message to AI or handle booking
async function sendUserInput() {
    const value = userInput.value.trim();
    if (!value) return;

    addUserMessage(value);
    userInput.value = "";

    if (bookingMode) {
        handleBookingInput(value);
        return;
    }

    showTyping();
    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: value, history: chatHistory }),
        });
        const data = await res.json();
        removeTyping();

        chatHistory.push({ role: "user", content: value });
        chatHistory.push({ role: "assistant", content: data.reply });

        addBotMessage(data.reply);

        if (data.direct_service) {
            // AI recognized a specific service — book directly
            startDirectBooking(data.direct_service);
        } else if (data.show_booking) {
            showBookingButton();
        }
    } catch (err) {
        removeTyping();
        addBotMessage("Entschuldigung, Verbindungsfehler. Bitte versuchen Sie es erneut.");
    }
}

// Booking trigger button
function showBookingButton() {
    const container = document.createElement("div");
    container.className = "message bot-message";

    const btn = document.createElement("button");
    btn.className = "booking-trigger-btn";
    btn.innerHTML = '<i class="fas fa-calendar-plus"></i> Termin buchen';
    btn.onclick = () => startBooking();

    container.appendChild(btn);
    chatMessages.appendChild(container);
    scrollToBottom();
}

// Start booking flow (with dropdown)
function startBooking() {
    bookingMode = true;
    bookingStep = "select_service";

    document.querySelectorAll(".booking-trigger-btn").forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = "0.5";
    });

    addBotMessage("Bitte wählen Sie eine Behandlung:");
    loadServices();
}

// Direct booking — AI already identified the service
async function startDirectBooking(serviceName) {
    bookingMode = true;

    // Load services if not loaded yet
    if (services.length === 0) {
        try {
            const res = await fetch("/api/services");
            services = await res.json();
        } catch (err) {
            addBotMessage("Fehler beim Laden der Behandlungen.");
            return;
        }
    }

    // Find matching service
    const match = services.find(s =>
        s.name.toLowerCase() === serviceName.toLowerCase()
    );

    if (match) {
        selectedService = match;
        bookingStep = "confirm_booking";
        addUserMessage(match.name);
        setTimeout(() => {
            addBotMessage(`"${match.name}" gewählt. Möchten Sie jetzt einen Termin buchen? (Ja/Nein)`);
        }, 400);
    } else {
        // No exact match — fall back to dropdown
        addBotMessage("Bitte wählen Sie eine Behandlung:");
        loadServices();
    }
}

// Service selection with buttons
function showServiceSelection() {
    const container = document.createElement("div");
    container.className = "message bot-message";

    const wrapper = document.createElement("div");
    wrapper.className = "service-buttons-wrapper";

    services.forEach(service => {
        const btn = document.createElement("button");
        btn.className = "service-btn";
        btn.innerHTML = `<span class="service-btn-name">${service.name}</span><span class="service-btn-desc">${service.desc} (ca. ${service.duration} Min.)</span>`;
        btn.onclick = () => {
            // Disable all service buttons after selection
            wrapper.querySelectorAll(".service-btn").forEach(b => {
                b.disabled = true;
                b.style.opacity = "0.5";
            });
            btn.style.opacity = "1";
            btn.classList.add("selected");
            selectService(service);
        };
        wrapper.appendChild(btn);
    });

    container.appendChild(wrapper);
    chatMessages.appendChild(container);
    scrollToBottom();
}

function selectService(service) {
    selectedService = service;
    bookingStep = "confirm_booking";
    addUserMessage(service.name);

    setTimeout(() => {
        addBotMessage(`"${service.name}" gewählt. Möchten Sie jetzt einen Termin buchen? (Ja/Nein)`);
    }, 400);
}

// Calendar
function openCalendar() {
    bookingStep = "select_date";
    const modal = document.getElementById("calendarModal");
    document.getElementById("modalTitle").textContent = `Termin: ${selectedService.name}`;
    modal.classList.add("active");
    renderCalendar();
}

function closeCalendar() {
    document.getElementById("calendarModal").classList.remove("active");
}

function changeMonth(dir) {
    currentMonth += dir;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    selectedDate = null;
    document.getElementById("timeSlotsContainer").style.display = "none";
    renderCalendar();
}

function renderCalendar() {
    const container = document.getElementById("calendarDays");
    container.innerHTML = "";

    document.getElementById("calendarMonthYear").textContent =
        `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDay = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < startDay; i++) {
        const empty = document.createElement("div");
        empty.className = "calendar-day empty";
        container.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const btn = document.createElement("button");
        btn.className = "calendar-day";
        btn.textContent = day;

        const isPast = date < today;
        const isSunday = date.getDay() === 0;
        const isSaturday = date.getDay() === 6;

        if (isPast || isSunday || isSaturday) {
            btn.classList.add("disabled");
        } else {
            if (date.toDateString() === today.toDateString()) btn.classList.add("today");
            if (selectedDate && date.toDateString() === selectedDate.toDateString()) btn.classList.add("selected");
            btn.onclick = () => selectDate(date);
        }

        container.appendChild(btn);
    }
}

function selectDate(date) {
    selectedDate = date;
    renderCalendar();
    showTimeSlots();
}

function showTimeSlots() {
    const container = document.getElementById("timeSlotsContainer");
    const slotsDiv = document.getElementById("timeSlots");
    slotsDiv.innerHTML = "";

    const dayOfWeek = selectedDate.getDay();
    let slots;

    if (dayOfWeek === 4) {
        slots = ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
    } else if (dayOfWeek === 5) {
        slots = ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30"];
    } else {
        slots = ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
                 "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"];
    }

    slots.forEach(time => {
        const btn = document.createElement("button");
        btn.className = "time-slot";
        btn.textContent = time;
        if (selectedTime === time) btn.classList.add("selected");
        btn.onclick = () => selectTime(time);
        slotsDiv.appendChild(btn);
    });

    container.style.display = "block";
}

function selectTime(time) {
    selectedTime = time;

    document.querySelectorAll(".time-slot").forEach(btn => {
        btn.classList.toggle("selected", btn.textContent === time);
    });

    if (!selectedDate) return;

    setTimeout(() => {
        closeCalendar();
        const dateStr = formatDate(selectedDate);
        addUserMessage(`${dateStr} um ${time} Uhr`);

        setTimeout(() => {
            addBotMessage("Bitte geben Sie Ihren Namen ein:");
            bookingStep = "enter_name";
            userInput.placeholder = "Ihr Name...";
            userInput.focus();
        }, 400);
    }, 300);
}

// Detect if input is a question instead of expected data
function isLikelyQuestion(text) {
    const lower = text.toLowerCase().trim();
    if (lower.includes("?")) return true;
    const starts = [
        "was ", "wie ", "wo ", "wann ", "warum ", "welch", "wieviel", "wieso ",
        "können ", "kann ich", "kann man", "gibt es", "ist das", "ist die", "ist der",
        "haben sie", "hat die", "muss ich", "soll ich", "brauche ich", "kostet",
        "how ", "what ", "when ", "where ", "why ", "which ", "can ", "do ", "does ", "is "
    ];
    return starts.some(q => lower.startsWith(q));
}

function isConfirmation(text) {
    const lower = text.toLowerCase().trim().replace(/[!.,]+$/, "");
    const words = ["ja", "yes", "ok", "okay", "jo", "klar", "sicher", "gerne",
        "ja bitte", "ja gerne", "jawohl", "genau", "passt", "machen wir",
        "bitte", "jap", "yep", "yeah", "sure", "auf jeden fall"];
    return words.some(w => lower === w || lower.startsWith(w + " "));
}

function isDenial(text) {
    const lower = text.toLowerCase().trim().replace(/[!.,]+$/, "");
    const words = ["nein", "no", "nee", "nö", "lieber nicht", "doch nicht",
        "abbrechen", "cancel", "stop", "nicht"];
    return words.some(w => lower === w || lower.startsWith(w + " "));
}

function getReAskMessage() {
    if (bookingStep === "confirm_booking") return `Möchten Sie den Termin für "${selectedService.name}" buchen? (Ja/Nein)`;
    if (bookingStep === "enter_name") return "Bitte geben Sie Ihren Namen ein:";
    if (bookingStep === "enter_phone") return "Ihre Telefonnummer bitte:";
    if (bookingStep === "enter_versicherung") return "Ihre Versicherungsnummer bitte:";
    return "Wie kann ich Ihnen helfen?";
}

async function answerQuestionDuringBooking(question) {
    showTyping();
    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: question, history: chatHistory }),
        });
        const data = await res.json();
        removeTyping();

        chatHistory.push({ role: "user", content: question });
        chatHistory.push({ role: "assistant", content: data.reply });

        addBotMessage(data.reply);
    } catch (err) {
        removeTyping();
        addBotMessage("Entschuldigung, Verbindungsfehler.");
    }

    // Re-ask the booking question
    const reAsk = getReAskMessage();
    setTimeout(() => addBotMessage(reAsk), 600);
}

// Booking input with validation
async function handleBookingInput(value) {
    // Confirmation step — user must say Ja/Nein before calendar opens
    if (bookingStep === "confirm_booking") {
        if (isConfirmation(value)) {
            setTimeout(() => openCalendar(), 400);
        } else if (isDenial(value)) {
            bookingMode = false;
            bookingStep = null;
            selectedService = null;
            userInput.placeholder = "Schreiben Sie Ihre Nachricht...";
            setTimeout(() => addBotMessage("Kein Problem! Kann ich Ihnen bei etwas anderem helfen?"), 400);
        } else {
            await answerQuestionDuringBooking(value);
        }
        return;
    }

    // Detect questions during data entry
    if (isLikelyQuestion(value)) {
        await answerQuestionDuringBooking(value);
        return;
    }

    if (bookingStep === "enter_name") {
        window.patientName = value;
        setTimeout(() => {
            addBotMessage("Ihre Telefonnummer bitte:");
            bookingStep = "enter_phone";
            userInput.placeholder = "Ihre Telefonnummer...";
            userInput.focus();
        }, 400);
    } else if (bookingStep === "enter_phone") {
        // If no digits at all, probably not a phone number
        if (!/\d/.test(value)) {
            await answerQuestionDuringBooking(value);
            return;
        }
        window.patientPhone = value;
        setTimeout(() => {
            addBotMessage("Ihre Versicherungsnummer bitte:");
            bookingStep = "enter_versicherung";
            userInput.placeholder = "Ihre Versicherungsnummer...";
            userInput.focus();
        }, 400);
    } else if (bookingStep === "enter_versicherung") {
        window.patientVersicherung = value;
        userInput.placeholder = "Schreiben Sie Ihre Nachricht...";
        setTimeout(() => bookAppointment(), 400);
    }
}

// Book appointment
async function bookAppointment() {
    showTyping();

    const dateStr = formatDate(selectedDate);
    const data = {
        service_id: selectedService.id,
        service_name: selectedService.name,
        date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`,
        time: selectedTime,
        patient_name: window.patientName,
        phone: window.patientPhone,
        versicherungsnummer: window.patientVersicherung,
    };

    try {
        const res = await fetch("/api/book", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        const result = await res.json();
        removeTyping();

        if (result.success) {
            addBotMessage("Ihr Termin wurde erfolgreich gebucht! ✅");

            const card = document.createElement("div");
            card.className = "message bot-message";
            card.innerHTML = `
                <div class="confirmation-card">
                    <h3><i class="fas fa-check-circle"></i> Terminbestätigung</h3>
                    <p><strong>Behandlung:</strong> ${selectedService.name}</p>
                    <p><strong>Datum:</strong> ${dateStr}</p>
                    <p><strong>Uhrzeit:</strong> ${selectedTime} Uhr</p>
                    <p><strong>Dauer:</strong> ca. ${selectedService.duration} Min.</p>
                    <p><strong>Name:</strong> ${window.patientName}</p>
                    <p><strong>Telefon:</strong> ${window.patientPhone}</p>
                    <p><strong>Versicherungsnr.:</strong> ${window.patientVersicherung}</p>
                </div>
            `;
            chatMessages.appendChild(card);
            scrollToBottom();

            bookingMode = false;
            bookingStep = null;
            selectedService = null;
            selectedDate = null;
            selectedTime = null;

            setTimeout(() => {
                addBotMessage("Vielen Dank! Wir freuen uns auf Ihren Besuch. Kann ich Ihnen noch bei etwas helfen?");
            }, 800);
        }
    } catch (err) {
        removeTyping();
        addBotMessage("Entschuldigung, Fehler bei der Buchung. Bitte versuchen Sie es erneut.");
        bookingMode = false;
        bookingStep = null;
    }
}

// Reset chat
function resetChat() {
    services = [];
    selectedService = null;
    selectedDate = null;
    selectedTime = null;
    currentMonth = new Date().getMonth();
    currentYear = new Date().getFullYear();
    chatHistory = [];
    bookingMode = false;
    bookingStep = null;
    window.patientName = "";
    window.patientPhone = "";
    window.patientVersicherung = "";

    chatMessages.innerHTML = "";
    userInput.value = "";
    userInput.placeholder = "Schreiben Sie Ihre Nachricht...";

    setTimeout(() => {
        addBotMessage("Willkommen bei der Zahnarztpraxis Dr. Max Mustermann! 😊");
        setTimeout(() => {
            addBotMessage("Ich bin Ihr KI-Assistent. Sie können mir Fragen stellen oder einen Termin buchen.\n\nWie kann ich Ihnen helfen?");
        }, 600);
    }, 300);
}

// Helpers
function addBotMessage(text) {
    const msg = document.createElement("div");
    msg.className = "message bot-message";
    msg.innerHTML = text.replace(/\n/g, "<br>");
    chatMessages.appendChild(msg);
    scrollToBottom();
}

function addUserMessage(text) {
    const msg = document.createElement("div");
    msg.className = "message user-message";
    msg.textContent = text;
    chatMessages.appendChild(msg);
    scrollToBottom();
}

function showTyping() {
    const typing = document.createElement("div");
    typing.className = "typing-indicator";
    typing.id = "typingIndicator";
    typing.innerHTML = "<span></span><span></span><span></span>";
    chatMessages.appendChild(typing);
    scrollToBottom();
}

function removeTyping() {
    const typing = document.getElementById("typingIndicator");
    if (typing) typing.remove();
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}
