const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const chatList = document.getElementById("chatList");
const toggleBtn = document.getElementById("toggleBtn");
const openSidebarBtn = document.getElementById("openSidebarBtn");
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchInput");
const sidebar = document.getElementById("sidebar");

let currentChatId = null;
let chats = {};

toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
});

openSidebarBtn.addEventListener("click", () => {
    sidebar.classList.remove("collapsed");
});

searchBtn.addEventListener("click", () => {
    searchInput.classList.toggle("visible");
    if (searchInput.classList.contains("visible")) searchInput.focus();
});

searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    document.querySelectorAll(".chat-item").forEach(item => {
        const title = item.querySelector(".chat-title").textContent.toLowerCase();
        item.style.display = title.includes(query) ? "flex" : "none";
    });
});

async function loadHistory() {
    try {
        const res = await fetch("http://localhost:5000/history");
        chats = await res.json();
        renderChatList();
        const ids = Object.keys(chats);
        if (ids.length === 0) {
            await createNewChat();
        } else {
            loadChat(ids[ids.length - 1]);
        }
    } catch (e) {
        await createNewChat();
    }
}

function generateId() { return "chat_" + Date.now(); }

async function createNewChat() {
    const id = generateId();
    await fetch("http://localhost:5000/new_chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: id })
    });
    chats[id] = { title: "New Chat", messages: [] };
    currentChatId = id;
    renderChatList();
    loadChat(id);
}

function renderChatList() {
    chatList.innerHTML = "";
    const ids = Object.keys(chats).reverse();
    ids.forEach(id => {
        const item = document.createElement("div");
        item.classList.add("chat-item");
        if (id === currentChatId) item.classList.add("active");

        const title = document.createElement("span");
        title.classList.add("chat-title");
        title.textContent = chats[id].title;

        const deleteBtn = document.createElement("button");
        deleteBtn.classList.add("delete-btn");
        deleteBtn.textContent = "🗑";
        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            await fetch("http://localhost:5000/delete_chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: id })
            });
            delete chats[id];
            if (currentChatId === id) {
                const remaining = Object.keys(chats);
                if (remaining.length > 0) loadChat(remaining[remaining.length - 1]);
                else await createNewChat();
            }
            renderChatList();
        };

        item.appendChild(title);
        item.appendChild(deleteBtn);
        item.onclick = () => loadChat(id);
        chatList.appendChild(item);
    });
}

function loadChat(id) {
    currentChatId = id;
    chatMessages.innerHTML = "";
    if (!chats[id] || chats[id].messages.length === 0) {
        addBotMessage("Hello! I am Numair AND Nasir AI Assistant. Ask me anything!");
    } else {
        chats[id].messages.forEach(msg => {
            if (msg.isUser) addUserMessage(msg.text);
            else addBotMessage(msg.text);
        });
    }
    renderChatList();
}

function addUserMessage(text) {
    const div = document.createElement("div");
    div.classList.add("message", "user-message");
    const bubble = document.createElement("div");
    bubble.classList.add("message-bubble");
    bubble.innerText = text;
    div.appendChild(bubble);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addBotMessage(text) {
    const div = document.createElement("div");
    div.classList.add("message", "bot-message");

    const bubble = document.createElement("div");
    bubble.classList.add("message-bubble");
    bubble.innerText = text;

    const actions = document.createElement("div");
    actions.classList.add("message-actions");
    actions.innerHTML = `
        <button class="action-btn" title="Copy" onclick="navigator.clipboard.writeText(this.closest('.message').querySelector('.message-bubble').innerText)">📋</button>
        <button class="action-btn" title="Like">👍</button>
        <button class="action-btn" title="Dislike">👎</button>
        <button class="action-btn" title="Regenerate">🔄</button>
    `;

    div.appendChild(bubble);
    div.appendChild(actions);
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
    const div = document.createElement("div");
    div.classList.add("message", "bot-message");
    div.id = "typingIndicator";
    div.innerHTML = `<div class="message-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTyping() {
    const t = document.getElementById("typingIndicator");
    if (t) t.remove();
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    addUserMessage(message);
    userInput.value = "";
    sendBtn.disabled = true;
    showTyping();
    try {
        const response = await fetch("http://localhost:5000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, chat_id: currentChatId })
        });
        const data = await response.json();
        removeTyping();
        addBotMessage(data.reply);
        if (!chats[currentChatId]) chats[currentChatId] = { title: message.substring(0, 30), messages: [] };
        chats[currentChatId].messages.push({ text: message, isUser: true });
        chats[currentChatId].messages.push({ text: data.reply, isUser: false });
        if (chats[currentChatId].title === "New Chat") {
            chats[currentChatId].title = message.substring(0, 28);
        }
        renderChatList();
    } catch (error) {
        removeTyping();
        addBotMessage("Error: " + error.message);
    }
    sendBtn.disabled = false;
}

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", e => { if (e.key === "Enter") sendMessage(); });
newChatBtn.addEventListener("click", createNewChat);

loadHistory();
