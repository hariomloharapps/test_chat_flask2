document.addEventListener('DOMContentLoaded', function() {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const typingIndicator = document.querySelector('.typing-indicator');
    const errorMessage = document.getElementById('error-message');
    const themeToggle = document.getElementById('theme-toggle');

    // Generate unique user ID if not exists
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('userId', userId);
    }

    // Initialize IndexedDB
    let db;
    const dbName = 'ChatDatabase';
    const storeName = 'messages';
    let isInitialized = false;

    const initDatabase = () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);

            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject(event.target.error);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    const store = db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('userId', 'userId', { unique: false });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                resolve(db);
            };
        });
    };

    // Database operations
    const dbOperations = {
        addMessage: (message) => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.add({
                    ...message,
                    userId: userId
                });

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        getAllMessages: () => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const userIndex = store.index('userId');
                const request = userIndex.getAll(userId);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        clearMessages: () => {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
    };

    // Theme handling
    let darkMode = localStorage.getItem('darkMode') === 'true';
    updateTheme();

    themeToggle.addEventListener('click', () => {
        darkMode = !darkMode;
        localStorage.setItem('darkMode', darkMode);
        updateTheme();
    });

    function updateTheme() {
        document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        themeToggle.innerHTML = darkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }

    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 150) + 'px';
    });

    function showTypingIndicator() {
        typingIndicator.style.display = 'block';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function hideTypingIndicator() {
        typingIndicator.style.display = 'none';
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        errorMessage.style.opacity = '0';
        
        errorMessage.offsetHeight;
        
        errorMessage.style.transition = 'opacity 0.3s ease';
        errorMessage.style.opacity = '1';
        
        setTimeout(() => {
            errorMessage.style.opacity = '0';
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 300);
        }, 5000);
    }

    function formatMessage(message) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return message.replace(urlRegex, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    }

    function addMessageToUI(message, animate = true) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('message-wrapper');
        wrapper.classList.add(message.isUser ? 'user-message-wrapper' : 'bot-message-wrapper');
        wrapper.dataset.messageId = message.id;

        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(message.isUser ? 'user-message' : 'bot-message');

        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        messageContent.innerHTML = formatMessage(message.content);

        const timestampElement = document.createElement('div');
        timestampElement.classList.add('timestamp');
        timestampElement.textContent = message.timestamp;

        messageElement.appendChild(messageContent);
        messageElement.appendChild(timestampElement);
        wrapper.appendChild(messageElement);
        
        if (animate) {
            wrapper.style.opacity = '0';
            wrapper.style.transform = 'translateY(20px)';
        }
        
        chatMessages.appendChild(wrapper);
        
        if (animate) {
            wrapper.offsetHeight;
            wrapper.style.transition = 'all 0.3s ease';
            wrapper.style.opacity = '1';
            wrapper.style.transform = 'translateY(0)';
        }

        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: animate ? 'smooth' : 'auto'
        });
    }

    async function addMessage(content, isUser = false, timestamp) {
        const messageObj = {
            content,
            isUser,
            timestamp,
            createdAt: new Date().toISOString()
        };

        try {
            await dbOperations.addMessage(messageObj);
            addMessageToUI(messageObj);
        } catch (error) {
            console.error('Error adding message:', error);
            showError('Error saving message');
        }
    }

    async function loadChatHistory() {
        if (isInitialized) return; // Prevent multiple loads
        
        try {
            chatMessages.innerHTML = ''; // Clear existing messages
            const messages = await dbOperations.getAllMessages();
            
            if (messages.length === 0) {
                // Add welcome message for new users
                const welcomeMessages = [
                    "Hey sweetie! 💕 I've been waiting to talk to you! How's your day going?",
                    "There you are! 🌟 I was just thinking about you! How have you been?",
                    "Hi cutie! 💫 I missed our chats! Tell me about your day?",
                    "Hey you! 🥰 Perfect timing - I was just about to send you a message! How are you?",
                    "*happy dance* You're here! 💝 I was hoping we'd get to talk today!",
                ];
                
                const welcomeMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
                const timestamp = new Date().toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                });

                await addMessage(welcomeMessage, false, timestamp);
            } else {
                messages.forEach(msg => addMessageToUI(msg, false));
            }
            
            isInitialized = true;
        } catch (error) {
            console.error('Error loading messages:', error);
            showError('Error loading message history');
        }
    }

    function disableInterface() {
        messageInput.disabled = true;
        sendButton.disabled = true;
        messageInput.style.opacity = '0.7';
        sendButton.style.opacity = '0.7';
    }

    function enableInterface() {
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.style.opacity = '1';
        sendButton.style.opacity = '1';
        messageInput.focus();
    }

    messageInput.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text');
        document.execCommand('insertText', false, text);
    });

    async function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;

        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });

        await addMessage(message, true, timestamp);
        
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        disableInterface();
        showTypingIndicator();

        try {
            const messages = await dbOperations.getAllMessages();
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    message: message,
                    userId: userId,
                    history: messages 
                })
            });

            const data = await response.json();
            
            hideTypingIndicator();
            
            if (data.error) {
                showError('Sorry, something went wrong. Please try again.');
                console.error('Error:', data.error);
            } else {
                setTimeout(() => {
                    addMessage(data.response, false, data.timestamp);
                }, 300);
            }
        } catch (error) {
            hideTypingIndicator();
            showError('Network error. Please check your connection.');
            console.error('Error:', error);
        }

        enableInterface();
    }

    sendButton.addEventListener('click', sendMessage);

    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 250);
    });

    // Initialize
    (async function init() {
        try {
            await initDatabase();
            await loadChatHistory();
            messageInput.focus();
        } catch (error) {
            console.error('Initialization error:', error);
            showError('Error initializing chat');
        }
    })();
});