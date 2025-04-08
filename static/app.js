// Merged and corrected content for static/app.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('Merged App.js loaded and running');

    // --- DOM Elements ---
    const body = document.body;
    const themeSwitch = document.getElementById('themeSwitch');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle'); // Mobile toggle
    const desktopSidebarToggle = document.getElementById('desktopSidebarToggle'); // Desktop toggle
    const expandSidebarBtn = document.getElementById('expandSidebarBtn'); // Expand button
    const appContainer = document.querySelector('.app-container'); // Main container

    // Panels & Buttons
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsBtn = document.getElementById('settingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');

    const dataPanel = document.getElementById('dataPanel');
    const dataPanelBtn = document.getElementById('dataPanelBtn');
    const closeDataPanelBtn = document.getElementById('closeDataPanelBtn');
    const dataPanelContent = document.getElementById('dataPanelContent');

    const browserPanel = document.getElementById('browserPanel');
    const browserPanelBtn = document.getElementById('browserPanelBtn');
    const closeBrowserPanelBtn = document.getElementById('closeBrowserPanelBtn');
    const screenshotImage = document.getElementById('screenshotImage');

    const emailForm = document.getElementById('emailForm');
    const closeEmailFormBtn = document.getElementById('closeEmailFormBtn');
    const sendEmailBtn = document.getElementById('sendEmailBtn');
    const cancelEmailBtn = document.getElementById('cancelEmailBtn');

    // Chat Elements
    const chatContainer = document.getElementById('chatContainer');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const fileInput = document.getElementById('fileInput');
    const attachBtn = document.getElementById('attachBtn');
    const newChatBtn = document.getElementById('newChatBtn');
    const chatHistory = document.getElementById('chatHistory');
    const chatArea = document.getElementById('chatArea'); // Wrapper for chat + browser panel
    const chatTitleHeader = document.querySelector('.chat-title'); // Chat title in header

    // Other UI Elements
    const statusMessage = document.getElementById('statusMessage');
    const proSearchToggle = document.getElementById('proSearchToggle');

    // Modals
    const sourcesModalOverlay = document.getElementById('sourcesModalOverlay');
    const sourcesModalBody = document.getElementById('sourcesModalBody');
    const closeSourcesModalBtn = document.getElementById('closeSourcesModalBtn');
    const singleSourceModalOverlay = document.getElementById('singleSourceModalOverlay');
    const singleSourceModalContent = document.querySelector('.single-source-modal-content'); // For click outside check
    const closeSingleSourceModalBtn = document.getElementById('closeSingleSourceModalBtn');
    const singleSourceModalFavicon = document.getElementById('singleSourceModalFavicon');
    const singleSourceModalTitle = document.getElementById('singleSourceModalContentTitle');
    const singleSourceModalLink = document.getElementById('singleSourceModalLink');
    const singleSourceModalSnippet = document.getElementById('singleSourceModalSnippet');

    // Constants
    const MAX_SOURCES_DISPLAY_IN_CHAT = 3;
    const MAX_MORE_ICONS = 3;

    // --- State Variables ---
    let currentChatId = null; // Initialize as null, will be set by loadChats
    let chats = {}; // <<<< DECLARED HERE, before loadChats() call

    // --- Initialization ---
    loadSettings(); // Load API keys etc. first
    loadChats(); // Now load chats, which depends on the 'chats' variable
    applySavedTheme(); // Apply theme after elements are loaded

    // --- Theme Handling ---
    function applyTheme(theme) {
        if (!body || !themeSwitch) return;
        body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeSwitch.checked = (theme === 'dark');
    }

    function applySavedTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark'; // Default to dark
        applyTheme(savedTheme);
    }

    if (themeSwitch) {
        themeSwitch.addEventListener('change', function() {
            applyTheme(this.checked ? 'dark' : 'light');
        });
    }

    // --- Panel Management ---
    function closeAllPanels() {
        if (settingsPanel) settingsPanel.classList.remove('open');
        if (dataPanel) dataPanel.classList.remove('open');
        if (emailForm) emailForm.classList.remove('open');
        if (browserPanel) browserPanel.classList.remove('open');
        if (chatArea) chatArea.classList.remove('browser-open'); // Reset chat area layout
    }

    // Settings Panel
    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener('click', () => {
            closeAllPanels();
            settingsPanel.classList.toggle('open');
        });
    }
    if (closeSettingsBtn && settingsPanel) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsPanel.classList.remove('open');
        });
    }

    // Data Panel
    if (dataPanelBtn && dataPanel) {
        dataPanelBtn.addEventListener('click', () => {
            closeAllPanels();
            dataPanel.classList.toggle('open');
            // Ensure sidebar is collapsed when data panel opens (optional, depends on desired UX)
            // if (appContainer && !appContainer.classList.contains('sidebar-collapsed')) {
            //     appContainer.classList.add('sidebar-collapsed');
            // }
        });
    }
    if (closeDataPanelBtn && dataPanel) {
        closeDataPanelBtn.addEventListener('click', () => {
            dataPanel.classList.remove('open');
        });
    }

    // Browser Panel
    if (browserPanelBtn && browserPanel && chatArea) {
        browserPanelBtn.addEventListener('click', () => {
            closeAllPanels();
            const isOpening = !browserPanel.classList.contains('open');
            browserPanel.classList.toggle('open');
            chatArea.classList.toggle('browser-open', isOpening); // Toggle class based on opening state

            if (isOpening) {
                updateScreenshot(); // Load screenshot when opening
                // Collapse sidebar when browser panel opens
                if (appContainer && !appContainer.classList.contains('sidebar-collapsed')) {
                    appContainer.classList.add('sidebar-collapsed');
                }
            }
        });
    }
    if (closeBrowserPanelBtn && browserPanel && chatArea) {
        closeBrowserPanelBtn.addEventListener('click', () => {
            browserPanel.classList.remove('open');
            chatArea.classList.remove('browser-open'); // Remove class when closing
        });
    }

    // Email Form
    if (closeEmailFormBtn && emailForm) {
        closeEmailFormBtn.addEventListener('click', () => {
            emailForm.classList.remove('open');
        });
    }
    if (cancelEmailBtn && emailForm) {
        cancelEmailBtn.addEventListener('click', () => {
            emailForm.classList.remove('open');
        });
    }

    // --- Sidebar Management ---
    // Mobile Toggle
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Desktop Toggle & Expand
    if (desktopSidebarToggle && appContainer) {
        desktopSidebarToggle.addEventListener('click', () => {
            appContainer.classList.toggle('sidebar-collapsed');
        });
    }
    if (expandSidebarBtn && appContainer) {
        expandSidebarBtn.addEventListener('click', () => {
            appContainer.classList.remove('sidebar-collapsed');
        });
    }

    // --- Screenshot Handling ---
    function updateScreenshot() {
        if (!screenshotImage) return;
        fetch('/screenshots')
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const randomIndex = Math.floor(Math.random() * data.length);
                    const randomImage = data[randomIndex];
                    // Add timestamp to prevent caching
                    screenshotImage.src = '/static/screenshots/' + randomImage + '?t=' + new Date().getTime();
                } else {
                    screenshotImage.src = ''; // Clear if no images
                    screenshotImage.alt = 'No screenshot available';
                }
            })
            .catch(error => {
                console.error('Error fetching screenshots:', error);
                screenshotImage.src = '';
                screenshotImage.alt = 'Error loading screenshot';
            });
    }
    // Optional: Set interval for updating screenshot if needed
    // setInterval(updateScreenshot, 5000); // Update every 5 seconds

    // --- Settings Management ---
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            localStorage.setItem('geminiApiKey', document.getElementById('geminiApiKey')?.value || '');
            localStorage.setItem('googleApiKey', document.getElementById('googleApiKey')?.value || '');
            localStorage.setItem('searchEngineId', document.getElementById('searchEngineId')?.value || '');
            localStorage.setItem('senderEmail', document.getElementById('senderEmail')?.value || '');
            localStorage.setItem('senderPassword', document.getElementById('senderPassword')?.value || '');
            localStorage.setItem('proSearchEnabled', proSearchToggle?.checked || false);

            showStatus('Settings saved successfully!', 'success');
            setTimeout(() => {
                if (settingsPanel) settingsPanel.classList.remove('open');
            }, 1000);
        });
    }

    function loadSettings() {
        const geminiInput = document.getElementById('geminiApiKey');
        const googleApiInput = document.getElementById('googleApiKey');
        const searchEngineInput = document.getElementById('searchEngineId');
        const senderEmailInput = document.getElementById('senderEmail');
        const senderPasswordInput = document.getElementById('senderPassword');

        if (geminiInput) geminiInput.value = localStorage.getItem('geminiApiKey') || '';
        if (googleApiInput) googleApiInput.value = localStorage.getItem('googleApiKey') || '';
        if (searchEngineInput) searchEngineInput.value = localStorage.getItem('searchEngineId') || '';
        if (senderEmailInput) senderEmailInput.value = localStorage.getItem('senderEmail') || '';
        if (senderPasswordInput) senderPasswordInput.value = localStorage.getItem('senderPassword') || '';
        if (proSearchToggle) proSearchToggle.checked = localStorage.getItem('proSearchEnabled') === 'true';
    }

    if (proSearchToggle) {
        proSearchToggle.addEventListener('change', function() {
            localStorage.setItem('proSearchEnabled', this.checked);
        });
    }

    // --- Chat History Management ---

    // Load chats from localStorage
    function loadChats() {
        console.log('Loading chats...');
        const savedChats = localStorage.getItem('chats');
        let setActiveChat = false;
        if (savedChats) {
            try {
                chats = JSON.parse(savedChats);
                // Validate loaded chats structure if necessary
                if (typeof chats !== 'object' || chats === null) {
                    console.warn("Invalid chat data in localStorage, resetting.");
                    chats = {};
                }
            } catch (e) {
                console.error("Failed to parse chats from localStorage:", e);
                chats = {}; // Reset if parsing fails
            }
        }

        // Ensure there's at least one chat
        if (Object.keys(chats).length === 0) {
            console.log("No chats found or loaded, creating default chat.");
            const defaultChatId = `chat${Date.now()}`;
            chats[defaultChatId] = {
                title: 'Chat 1',
                messages: [{
                    role: 'assistant',
                    content: "Hello! I'm your AI assistant. How can I help you today? You can:\n- Ask me questions\n- Upload files for analysis\n- Request email drafts\n- Get research assistance\n\nWhat would you like to do?"
                }]
            };
            currentChatId = defaultChatId;
            setActiveChat = true; // Mark that we need to set the active chat UI
            saveChats();
        } else {
            // If chats were loaded, set the currentChatId to the first one if not already set
            // Or load the last active chat ID if you save that separately
            currentChatId = Object.keys(chats)[0]; // Default to the first chat
            setActiveChat = true;
        }

        renderChats(); // Render the chat list in the sidebar

        if (setActiveChat && currentChatId) {
            console.log(`Setting active chat to: ${currentChatId}`);
            loadChatMessages(currentChatId); // Load messages for the active chat
            updateChatTitleHeader(chats[currentChatId]?.title || 'Chat'); // Update header
        } else {
            console.log("No active chat to load messages for initially.");
            if (chatContainer) chatContainer.innerHTML = ''; // Clear chat container if no active chat
            updateChatTitleHeader('New Chat'); // Set default header
        }
    }

    // Save chats to localStorage
    function saveChats() {
        try {
            localStorage.setItem('chats', JSON.stringify(chats));
        } catch (e) {
            console.error("Failed to save chats to localStorage:", e);
            showStatus("Error saving chat history.", "error");
        }
    }

    // Render all chats in the sidebar
    function renderChats() {
        if (!chatHistory) return;
        chatHistory.innerHTML = ''; // Clear existing items

        Object.keys(chats).forEach(chatId => {
            const chat = chats[chatId];
            if (!chat || typeof chat.title !== 'string') {
                console.warn(`Skipping invalid chat data for ID: ${chatId}`);
                return; // Skip malformed chat entries
            }
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.dataset.chatId = chatId;
            if (chatId === currentChatId) {
                chatItem.classList.add('active'); // Mark active chat
            }

            chatItem.innerHTML = `
                <span class="chat-item-title">${escapeHtml(chat.title)}</span>
                <div class="chat-item-actions">
                    <button class="chat-action-btn rename-chat" title="Rename">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="chat-action-btn delete-chat" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            `;
            chatHistory.appendChild(chatItem);
        });

        addChatItemEventListeners(); // Re-attach listeners after rendering
    }

    // Add event listeners to chat items and buttons
    function addChatItemEventListeners() {
        document.querySelectorAll('.chat-item').forEach(item => {
            // Click on chat item itself (not buttons inside)
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.chat-action-btn')) {
                    const chatId = item.dataset.chatId;
                    if (chatId !== currentChatId) {
                        switchChat(chatId);
                    }
                }
            });
        });

        // Rename button click
        document.querySelectorAll('.rename-chat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent chat item click
                const chatItem = btn.closest('.chat-item');
                const chatId = chatItem.dataset.chatId;
                handleRenameChat(chatId, chatItem);
            });
        });

        // Delete button click
        document.querySelectorAll('.delete-chat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent chat item click
                const chatItem = btn.closest('.chat-item');
                const chatId = chatItem.dataset.chatId;
                handleDeleteChat(chatId);
            });
        });
    }

    function switchChat(chatId) {
        if (!chats[chatId]) {
            console.error(`Chat with ID ${chatId} not found.`);
            return;
        }
        currentChatId = chatId;
        console.log(`Switched to chat: ${currentChatId}`);

        // Update active class in sidebar
        document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
        const activeItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
        if (activeItem) activeItem.classList.add('active');

        updateChatTitleHeader(chats[currentChatId].title);
        loadChatMessages(currentChatId);
    }

    function updateChatTitleHeader(title) {
        if (chatTitleHeader) {
            chatTitleHeader.textContent = title || 'Chat';
        }
    }

    function handleRenameChat(chatId, chatItemElement) {
        const titleSpan = chatItemElement.querySelector('.chat-item-title');
        const currentTitle = chats[chatId]?.title || '';

        // Simple prompt for renaming (replace with modal if preferred)
        const newTitle = prompt("Enter new chat title:", currentTitle);

        if (newTitle !== null && newTitle.trim() !== '') {
            const finalTitle = newTitle.trim();
            titleSpan.textContent = finalTitle;
            chats[chatId].title = finalTitle;
            saveChats();
            if (chatId === currentChatId) {
                updateChatTitleHeader(finalTitle);
            }
            showStatus(`Chat renamed to "${finalTitle}"`, 'success');
        } else if (newTitle !== null) {
            showStatus("Rename cancelled or empty title.", "warning");
        }
    }

    function handleDeleteChat(chatId) {
        if (Object.keys(chats).length <= 1) {
            showStatus('Cannot delete the only chat.', 'warning');
            return;
        }

        if (confirm(`Are you sure you want to delete "${chats[chatId]?.title || 'this chat'}"?`)) {
            delete chats[chatId];
            saveChats();

            // If the deleted chat was the active one, switch to the first remaining chat
            if (currentChatId === chatId) {
                currentChatId = Object.keys(chats)[0];
                if (currentChatId) {
                    switchChat(currentChatId); // Switch and load messages
                } else {
                    // This case should ideally not happen due to the check above, but handle defensively
                    createNewChat(); // Create a new default chat if somehow all were deleted
                }
            }
            renderChats(); // Re-render the sidebar
            showStatus('Chat deleted.', 'success');
        }
    }

    // Load chat messages for a specific chat
    function loadChatMessages(chatId) {
        if (!chats[chatId] || !chatContainer) return;
        console.log(`Loading messages for chat: ${chatId}`);
        chatContainer.innerHTML = ''; // Clear current messages

        chats[chatId].messages.forEach(msg => {
            // Pass sources if they exist on the message object
            addMessageElement(msg.content, msg.role === 'user' ? 'user' : 'bot', msg.sources, msg.allowHtml);
        });
        // Scroll to bottom after loading
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Create a new chat
    function createNewChat() {
        console.log('Creating new chat');
        const timestamp = Date.now();
        const newChatId = `chat${timestamp}`;

        let highestNum = 0;
        Object.values(chats).forEach(chat => {
            const match = chat.title.match(/Chat (\d+)/);
            if (match && parseInt(match[1]) > highestNum) {
                highestNum = parseInt(match[1]);
            }
        });

        chats[newChatId] = {
            title: `Chat ${highestNum + 1}`,
            messages: [{
                role: 'assistant',
                content: "Hello! I'm your AI assistant. What would you like to discuss today?"
                // Add initial sources or other properties if needed
            }]
        };

        saveChats();
        currentChatId = newChatId; // Set the new chat as active
        renderChats(); // Update sidebar
        switchChat(newChatId); // Load messages and update header for the new chat

        console.log('New chat created:', newChatId, chats[newChatId].title);
    }

    // New chat button click
    if (newChatBtn) {
        newChatBtn.addEventListener('click', function(e) {
            e.preventDefault();
            createNewChat();
        });
    }

    // --- Message Handling ---
    if (messageInput) {
        messageInput.addEventListener('input', function() {
            // Auto-resize textarea
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });

        messageInput.addEventListener('keydown', function(e) {
            // Send on Enter (but not Shift+Enter)
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', handleSendMessage);
    }

    // File attachment handling
    if (attachBtn && fileInput) {
        attachBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                showStatus(`File "${this.files[0].name}" attached`, 'success');
                // Optionally display file name near input
            } else {
                // Optionally clear file name display
            }
        });
    }

    // Main function to handle sending a message
    async function handleSendMessage() {
        const messageText = messageInput.value.trim();
        const file = fileInput.files[0];

        if (!messageText && !file) return; // Need text or file

        // --- Add User Message to UI and History ---
        let userMessageContent = messageText;
        if (file) {
            // Optionally add file info to the displayed message
            userMessageContent += `\n[File attached: ${file.name}]`;
        }
        addMessageToHistory(userMessageContent, 'user'); // Adds to UI and saves

        // Clear input fields
        messageInput.value = '';
        messageInput.style.height = 'auto';
        fileInput.value = ''; // Clear file input

        // --- Show Loading Indicator ---
        const loadingIndicator = addMessageElement('', 'bot', [], false, true); // Add loading state

        // --- Prepare Data for Backend ---
        const currentChatHistory = chats[currentChatId]?.messages.slice(0, -1) || []; // Get history *before* the new user message

        // --- Determine Tool ---
        const geminiApiKey = localStorage.getItem('geminiApiKey');
        if (!geminiApiKey) {
            addMessageToHistory("Please set your Gemini API key in Settings.", 'bot');
            loadingIndicator.remove();
            return;
        }

        let tool = 'None'; // Default tool
        try {
            const toolResponse = await determineTool(messageText, geminiApiKey, currentChatHistory);
            if (toolResponse.success) {
                tool = toolResponse.tool;
                console.log(`Tool determined: ${tool} (Reason: ${toolResponse.reason})`);
            } else {
                console.error("Tool determination failed:", toolResponse.error);
                addMessageToHistory(`Error determining action: ${toolResponse.error}`, 'bot');
                loadingIndicator.remove();
                return;
            }
        } catch (error) {
            console.error("Exception during tool determination:", error);
            addMessageToHistory(`Error determining action: ${error.message}`, 'bot');
            loadingIndicator.remove();
            return;
        }

        // --- Execute Action Based on Tool ---
        let responseData = null;
        try {
            switch (tool) {
                case 'Email':
                    responseData = await handleEmailIntent(messageText, geminiApiKey, currentChatHistory);
                    break;
                case 'BrowserUse':
                    // Open panel immediately for browser tasks
                    if (browserPanel && chatArea) {
                        closeAllPanels();
                        browserPanel.classList.add('open');
                        chatArea.classList.add('browser-open');
                        updateScreenshot();
                        if (appContainer && !appContainer.classList.contains('sidebar-collapsed')) {
                            appContainer.classList.add('sidebar-collapsed');
                        }
                    }
                    responseData = await handleBrowserIntent(messageText, geminiApiKey, currentChatHistory);
                    break;
                case 'DataAnalysis':
                    if (!file) {
                        responseData = { content: "Please attach a data file (CSV, Excel) for analysis.", sources: [], showDataPanel: false, dataContent: null, allowHtml: false };
                    } else {
                        responseData = await handleDataAnalysisIntent(messageText, file, currentChatHistory);
                    }
                    break;
                case 'CSV': // Kept separate CSV placeholder if needed later
                    // await handleCsvIntent(message); // Assuming a handleCsvIntent exists or will be added
                    responseData = { content: "CSV tool handling not yet fully implemented in frontend.", sources: [] }; // Placeholder
                    break;
                case 'Manus': // Added Manus case
                    responseData = await handleManusIntent(messageText); // Pass only message for now
                    break;
                case 'None':
                default:
                    responseData = await handleChatIntent(messageText, file, geminiApiKey, currentChatHistory); // Default to chat
                    break;
            }
        } catch (error) {
            console.error(`Error handling intent for tool ${tool}:`, error);
            responseData = { content: `Sorry, an error occurred while processing your request for ${tool}. ${error.message}`, sources: [], showDataPanel: false, dataContent: null, allowHtml: false };
        }

        // --- Process and Display Response ---
        loadingIndicator.remove(); // Remove loading indicator

        if (responseData && typeof responseData.content !== 'undefined') {
            addMessageToHistory(responseData.content, 'bot', responseData.sources, responseData.allowHtml);

            // Handle panel display based on response
            if (responseData.showDataPanel && dataPanel && dataPanelContent) {
                dataPanelContent.innerHTML = responseData.dataContent || '<p>No data to display.</p>';
                if (!dataPanel.classList.contains('open')) { // Avoid closing other panels if already open
                    closeAllPanels();
                    dataPanel.classList.add('open');
                }
            }
            // Browser panel is handled immediately above or by handleBrowserIntent response
            if (responseData.showEmailForm && emailForm) {
                 if (!emailForm.classList.contains('open')) {
                    closeAllPanels();
                    emailForm.classList.add('open');
                 }
            }

        } else {
            // Fallback error message if response is malformed
            addMessageToHistory("Sorry, I received an unexpected response. Please try again.", 'bot');
        }
    }

    // Adds a message element to the chat container UI
    function addMessageElement(content, sender, sources = [], allowHtml = false, isLoading = false) {
        if (!chatContainer) return null;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const avatar = sender === 'user' ? 'U' : 'AI';
        const role = sender === 'user' ? 'You' : 'AI Assistant';

        let messageTextHtml;
        if (isLoading) {
            messageTextHtml = `<div class="loading-indicator"><div class="spinner"></div></div>`;
        } else if (allowHtml) {
            // Use content directly if HTML is allowed (e.g., for plots)
            // Basic sanitization might still be needed depending on the source
            messageTextHtml = content;
        } else {
            // Escape and format plain text content
            messageTextHtml = escapeHtml(content)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
                .replace(/\*(.*?)\*/g, '<em>$1</em>')     // Italic
                .replace(/`(.*?)`/g, '<code>$1</code>') // Code
                .replace(/\n/g, '<br>');                // Newlines
        }

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-role">${role}</div>
                <div class="message-bubble">
                    <div class="message-text">${messageTextHtml}</div>
                </div>
            </div>
        `;

        // Add sources if available and not loading
        if (!isLoading && sources && sources.length > 0) {
            const sourcesDiv = document.createElement('div');
            sourcesDiv.className = 'search-container';
            displaySearchResults(sources, sourcesDiv, false); // Display limited sources initially

            const messageBubble = messageDiv.querySelector('.message-bubble');
            const messageText = messageBubble.querySelector('.message-text');
            if (messageBubble && messageText) {
                // Insert sources *before* the main text content within the bubble
                messageBubble.insertBefore(sourcesDiv, messageText);
            }

            // Add "+ More Sources" button if needed
            if (sources.length > MAX_SOURCES_DISPLAY_IN_CHAT) {
                const remainingCount = sources.length - MAX_SOURCES_DISPLAY_IN_CHAT;
                const moreSourcesBtn = document.createElement('button');
                moreSourcesBtn.className = 'more-sources-btn action-btn';
                moreSourcesBtn.innerHTML = `<i class="bi bi-plus-lg"></i> ${remainingCount} More Sources`;
                moreSourcesBtn.title = 'View all sources';
                // Store all sources data on the button/container for the modal
                moreSourcesBtn.dataset.sources = JSON.stringify(sources);
                sourcesDiv.appendChild(moreSourcesBtn); // Append button after the displayed sources
            }
        }

        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return messageDiv; // Return the element for potential removal (like loading indicator)
    }

    // Adds a message to the persistent chat history (chats object) and updates UI
    function addMessageToHistory(content, sender, sources = [], allowHtml = false) {
        // 1. Add element to UI
        addMessageElement(content, sender, sources, allowHtml);

        // 2. Save to the chats object
        if (chats[currentChatId]) {
            const messageData = {
                role: sender === 'user' ? 'user' : 'assistant',
                content: content // Store the raw content
            };
            if (sources && sources.length > 0) {
                messageData.sources = sources; // Store sources if provided
            }
            if (allowHtml) {
                messageData.allowHtml = true; // Mark if HTML was allowed
            }
            chats[currentChatId].messages.push(messageData);

            // Auto-rename chat based on the first user message using API
            if (sender === 'user' && chats[currentChatId].messages.length === 2) { // 1st assistant + 1st user
                // Get the first two messages for context
                const messagesForTitle = chats[currentChatId].messages.slice(0, 2);
                // Call API asynchronously, but don't wait here to avoid blocking UI updates
                generateTitleViaAPI(currentChatId, messagesForTitle)
                    .then(apiTitle => {
                        if (apiTitle && chats[currentChatId]) { // Check if chat still exists
                            console.log(`Generated title for ${currentChatId}: ${apiTitle}`);
                            chats[currentChatId].title = apiTitle;
                            updateChatTitleHeader(apiTitle); // Update header
                            // Update sidebar item title
                            const chatItemTitle = document.querySelector(`.chat-item[data-chat-id="${currentChatId}"] .chat-item-title`);
                            if (chatItemTitle) chatItemTitle.textContent = escapeHtml(apiTitle);
                            saveChats(); // Save chats *after* title is updated
                        } else {
                            console.log("API title generation failed or chat was deleted, keeping default title.");
                            // Optionally save chats here if you want to persist the default title
                            // saveChats();
                        }
                    })
                    .catch(error => {
                        console.error("Error during API title generation:", error);
                        // Keep default title on error
                    });
                // Note: saveChats() is called *inside* the .then() now to ensure title is saved
            } else {
                 // Save chats immediately if not generating title
                 saveChats();
            }

        } else {
            console.error("Cannot save message, currentChatId is invalid:", currentChatId);
        }
    }

    // --- Backend Interaction ---

    // New function to generate title via backend API
    async function generateTitleViaAPI(chatId, messages) {
        const geminiApiKey = localStorage.getItem('geminiApiKey');
        if (!geminiApiKey) {
            console.warn("Cannot generate title: Gemini API key not set.");
            return null; // Indicate failure
        }

        if (!messages || messages.length === 0) {
            console.warn("Cannot generate title: No messages provided.");
            return null;
        }

        try {
            const response = await fetch('/generate_title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages,
                    gemini_api_key: geminiApiKey
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
                // If backend provides a fallback title on error, use it
                if (errorData && errorData.title) {
                    console.warn(`API title generation failed (${errorData.error || response.status}), using fallback: ${errorData.title}`);
                    return errorData.title;
                }
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success && data.title) {
                return data.title;
            } else {
                // Use fallback title from response if provided, even on success=false
                if (data.title) {
                     console.warn(`API title generation failed (${data.error || 'Unknown reason'}), using fallback: ${data.title}`);
                     return data.title;
                }
                throw new Error(data.error || "API returned success=false but no title.");
            }
        } catch (error) {
            console.error("Error fetching title from API:", error);
            // Fallback to simple title generation if API fails completely
            const firstUserMessage = messages.find(m => m.role === 'user');
            if (firstUserMessage && firstUserMessage.content) {
                let text = firstUserMessage.content.trim().replace(/\[File attached:.*?\]/g, '').trim();
                if (text) {
                    const words = text.split(/\s+/);
                    let title = words.slice(0, 5).join(' ');
                    if (words.length > 5) title += '...';
                    return title.charAt(0).toUpperCase() + title.slice(1);
                }
            }
            return "Chat"; // Absolute fallback
        }
    }

    async function determineTool(message, geminiApiKey, chatHistory) {
        console.log("Determining tool for message:", message);
        try {
            const response = await fetch('/determine_tool', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    gemini_api_key: geminiApiKey,
                    chat_history: chatHistory || [] // Ensure history is an array
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            // Basic validation on the returned tool
            const validTools = ["Email", "BrowserUse", "DataAnalysis", "Manus", "CSV", "None"]; // Added Manus & CSV
            if (!validTools.includes(data.tool)) {
                console.warn(`Invalid tool '${data.tool}' received from backend. Defaulting to 'None'.`);
                data.tool = 'None';
                data.reason += " (Invalid tool received, defaulted to None)";
            }
            return { success: true, tool: data.tool, reason: data.reason };

        } catch (error) {
            console.error("Error determining tool:", error);
            return { success: false, error: error.message };
        }
    }

    async function handleBrowserIntent(message, geminiApiKey, chatHistory) {
        console.log("Handling Browser intent...");
        try {
            const response = await fetch('/browser_action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task: message,
                    gemini_api_key: geminiApiKey,
                    chat_history: chatHistory || []
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                updateScreenshot(); // Update screenshot after action
                return {
                    content: data.result || "Browser action completed.",
                    sources: [], // Browser actions typically don't have sources unless added by backend
                    showBrowserPanel: true // Keep panel open
                };
            } else {
                throw new Error(data.error || "Unknown browser tool error");
            }
        } catch (error) {
            console.error("Error in handleBrowserIntent:", error);
            // Keep browser panel open even on error? Maybe.
            return { content: `Browser action failed: ${error.message}`, showBrowserPanel: true };
        }
    }

    // --- New Manus Intent Handler ---
    async function handleManusIntent(message) {
        console.log("Handling Manus intent...");
        // No API key needed directly here, assuming backend handles auth if necessary
        try {
            const response = await fetch('/api/run_manus', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: message }) // Send prompt in body
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                // Display success message, potentially enhance later if Manus returns more info
                return {
                    content: "Manus Agent Result:\n" + (data.message || "Task completed successfully."),
                    sources: [] // Manus likely won't return web sources
                };
            } else {
                throw new Error(data.error || "Unknown Manus agent error");
            }

        } catch (error) {
            console.error("Error in handleManusIntent:", error);
            return { content: `Manus agent failed: ${error.message}` };
        }
    }

    async function handleDataAnalysisIntent(message, file, chatHistory) {
        console.log("Handling Data Analysis intent...");
        if (!file) return { content: "Error: No file provided for analysis." };

        const formData = new FormData();
        formData.append('file', file);
        formData.append('message', message);
        formData.append('chat_history', JSON.stringify(chatHistory || []));

        try {
            // Assuming data analysis server runs on 5001
            const response = await fetch('http://localhost:5001/data_analysis_action', {
                method: 'POST',
                body: formData,
                mode: 'cors' // Important for cross-origin request if frontend/backend are on different ports
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                let responseContent = '';
                let showDataPanel = false;
                let dataContentHtml = null;
                let allowHtmlResponse = false;

                if (data.type === 'text') {
                    responseContent = data.content;
                } else if (data.type === 'dataframe') {
                    responseContent = `Analysis results for ${escapeHtml(file.name)} are ready in the Data panel.`;
                    dataContentHtml = createTableFromData(data.content, file.name);
                    showDataPanel = true;
                } else if (data.type === 'plot') {
                    // Assuming backend returns a relative path like /static/plots/image.png
                    const plotUrl = data.content; // Use the path directly if served by main Flask app
                    // Or construct full URL if served by data analysis server:
                    // const plotUrl = "http://localhost:5001" + data.content;
                    const plotId = `plot-${Date.now()}`;
                    responseContent = `
                        <div class="plot-container">
                            <p>Generated plot for ${escapeHtml(file.name)}:</p>
                            <img src="${plotUrl}?t=${Date.now()}" alt="Generated Plot" class="plot-image" id="${plotId}">
                        </div>`;
                    allowHtmlResponse = true; // Signal that content is HTML
                } else {
                    responseContent = "Received unexpected analysis result type.";
                }
                return { content: responseContent, showDataPanel: showDataPanel, dataContent: dataContentHtml, allowHtml: allowHtmlResponse };
            } else {
                throw new Error(data.error || "Unknown data analysis error");
            }
        } catch (error) {
            console.error("Error in handleDataAnalysisIntent:", error);
            return { content: `Data analysis failed: ${error.message}` };
        }
    }

    async function handleEmailIntent(message, geminiApiKey, chatHistory) {
        console.log("Handling Email intent...");
        const googleApiKey = localStorage.getItem('googleApiKey');
        const searchEngineId = localStorage.getItem('searchEngineId');
        const useSearch = localStorage.getItem('proSearchEnabled') === 'true' && googleApiKey && searchEngineId;

        try {
            const response = await fetch('/generate_email', { // Corrected endpoint for email generation
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: message, // Corrected key from 'query' to 'prompt'
                    gemini_api_key: geminiApiKey,
                    google_api_key: googleApiKey,
                    search_engine_id: searchEngineId,
                    useSearch: useSearch,
                    isEmail: true, // Indicate email generation request
                    chat_history: chatHistory || []
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
                throw new Error(errorData.error || `API Error: ${response.statusText}`);
            }

            const emailContent = await response.json();

            if (emailContent && emailContent.success) {
                // Populate and show the email form
                const receiverInput = document.getElementById('receiverEmail');
                const subjectInput = document.getElementById('emailSubject');
                const bodyInput = document.getElementById('emailBody');

                // Try to extract receiver from original message
                const extractedReceiver = extractEmail(message);
                if (receiverInput) receiverInput.value = extractedReceiver || '';
                if (subjectInput) subjectInput.value = emailContent.subject || '';
                if (bodyInput) bodyInput.value = emailContent.body || '';

                return {
                    content: "I've prepared an email draft. Please review it in the Email panel.",
                    showEmailForm: true // Signal to show the form
                };
            } else {
                throw new Error(emailContent?.error || 'Failed to generate email content.');
            }
        } catch (error) {
            console.error("Error handling email intent:", error);
            return { content: `Couldn't generate email: ${error.message}` };
        }
    }

    async function handleChatIntent(message, file, geminiApiKey, chatHistory) {
        console.log("Handling Chat intent...");
        const googleApiKey = localStorage.getItem('googleApiKey');
        const searchEngineId = localStorage.getItem('searchEngineId');
        const useSearch = localStorage.getItem('proSearchEnabled') === 'true' && googleApiKey && searchEngineId;

        const formData = new FormData();
        formData.append('query', message);
        if (file) {
            formData.append('image', file); // Assuming backend handles 'image' key for file uploads
        }
        formData.append('gemini_api_key', geminiApiKey);
        formData.append('google_api_key', googleApiKey || ''); // Send empty if not available
        formData.append('search_engine_id', searchEngineId || ''); // Send empty if not available
        formData.append('useSearch', useSearch);
        formData.append('chat_history', JSON.stringify(chatHistory || []));

        try {
            const response = await fetch('/ai_search', { // General chat/search endpoint
                method: 'POST',
                body: formData
                // No 'Content-Type' header needed for FormData, browser sets it
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}` }));
                throw new Error(errorData.error || `API Error: ${response.statusText}`);
            }

            const aiResponseData = await response.json();

            if (aiResponseData && typeof aiResponseData.ai_response !== 'undefined') {
                return {
                    content: aiResponseData.ai_response,
                    sources: aiResponseData.search_results || []
                };
            } else {
                // Handle cases where the response might be missing the expected field
                console.warn("Received unexpected response format from /ai_search:", aiResponseData);
                throw new Error("Invalid response format from AI.");
            }
        } catch (error) {
            console.error("Error handling chat intent:", error);
            return { content: `Sorry, couldn't get a response: ${error.message}` };
        }
    }

    // --- Email Sending ---
    if (sendEmailBtn) {
        sendEmailBtn.addEventListener('click', handleSendEmail);
    }

    async function handleSendEmail() {
        const senderEmail = document.getElementById('senderEmail')?.value;
        const senderPassword = document.getElementById('senderPassword')?.value;
        const receiverEmail = document.getElementById('receiverEmail')?.value;
        const subject = document.getElementById('emailSubject')?.value;
        const body = document.getElementById('emailBody')?.value;

        if (!senderEmail || !senderPassword || !receiverEmail || !subject || !body) {
            showStatus('Please fill all email fields and ensure sender credentials are set in Settings.', 'warning');
            return;
        }

        showStatus('Sending email...', 'success'); // Indicate sending start

        try {
            const response = await fetch('/send_email', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    sender_email: senderEmail,
                    sender_password: senderPassword,
                    receiver_email: receiverEmail,
                    subject: subject,
                    body: body
                })
            });

            const data = await response.json();
            if (response.ok && data.success) {
                addMessageToHistory(`Email successfully sent to ${receiverEmail}.`, 'bot');
                showStatus(data.message || 'Email sent!', 'success');
                // Clear form and close panel
                if (document.getElementById('receiverEmail')) document.getElementById('receiverEmail').value = '';
                if (document.getElementById('emailSubject')) document.getElementById('emailSubject').value = '';
                if (document.getElementById('emailBody')) document.getElementById('emailBody').value = '';
                if (emailForm) emailForm.classList.remove('open');
            } else {
                throw new Error(data.message || `Failed to send email (status: ${response.status})`);
            }
        } catch (error) {
            console.error("Error sending email:", error);
            addMessageToHistory(`Failed to send email: ${error.message}`, 'bot'); // Add error to chat
            showStatus(`Email Error: ${error.message}`, 'error');
        }
    }

    // --- Source Display & Modals ---

    function displaySearchResults(results, containerElement, fullView = false) {
        containerElement.innerHTML = ''; // Clear previous
        if (!results || results.length === 0) return;

        const numToDisplay = fullView ? results.length : Math.min(results.length, MAX_SOURCES_DISPLAY_IN_CHAT);

        for (let i = 0; i < numToDisplay; i++) {
            const result = results[i];
            if (!result || !result.link || !result.title) continue; // Skip invalid results

            const itemLink = document.createElement('a');
            itemLink.className = 'search-result-item';
            itemLink.href = result.link;
            itemLink.target = '_blank';
            itemLink.rel = 'noopener noreferrer';
            itemLink.title = `${result.title}\n${result.snippet || ''}`;

            // Store data for the modal
            itemLink.dataset.link = result.link;
            itemLink.dataset.title = result.title;
            itemLink.dataset.snippet = result.snippet || '';

            const favicon = document.createElement('img');
            favicon.className = 'favicon';
            let faviconSrc = 'https://www.google.com/favicon.ico'; // Default
            try {
                faviconSrc = `https://www.google.com/s2/favicons?domain=${new URL(result.link).hostname}&sz=16`;
            } catch { /* Use default */ }
            favicon.src = faviconSrc;
            itemLink.dataset.favicon = faviconSrc; // Store for modal

            const titleSpan = document.createElement('span');
            titleSpan.className = 'title';
            titleSpan.textContent = result.title;

            itemLink.appendChild(favicon);
            itemLink.appendChild(titleSpan);

            // Add "+ Details" button
            const sourceDetailsBtn = document.createElement('button');
            sourceDetailsBtn.className = 'show-source-details-btn';
            sourceDetailsBtn.innerHTML = '<i class="bi bi-plus-circle"></i>';
            sourceDetailsBtn.title = 'Show source details';
            sourceDetailsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openSingleSourceModal(
                    itemLink.dataset.favicon,
                    itemLink.dataset.title,
                    itemLink.dataset.link,
                    itemLink.dataset.snippet
                );
            });
            itemLink.appendChild(sourceDetailsBtn);

            containerElement.appendChild(itemLink);
        }
    }

    // Event listener for "+ More Sources" button (delegated)
    if (chatContainer) {
        chatContainer.addEventListener('click', (event) => {
            const moreSourcesButton = event.target.closest('.more-sources-btn');
            if (moreSourcesButton && moreSourcesButton.dataset.sources) {
                try {
                    const allSources = JSON.parse(moreSourcesButton.dataset.sources);
                    openSourcesModal(allSources);
                } catch (e) {
                    console.error("Failed to parse sources data for modal:", e);
                    showStatus("Error opening sources.", "error");
                }
            }
        });
    }

    function openSourcesModal(allSources) {
        if (!sourcesModalOverlay || !sourcesModalBody) return;
        sourcesModalBody.innerHTML = ''; // Clear previous

        allSources.forEach((source, index) => {
            if (!source || !source.link || !source.title) return; // Skip invalid

            const itemDiv = document.createElement('div');
            itemDiv.className = 'modal-source-item';

            let faviconSrc = 'https://www.google.com/favicon.ico';
            let domain = 'N/A';
            try {
                const url = new URL(source.link);
                domain = url.hostname;
                faviconSrc = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
            } catch { /* Use defaults */ }

            itemDiv.innerHTML = `
                <div class="modal-source-number">${index + 1}</div>
                <div class="modal-source-content">
                    <div class="modal-source-header">
                        <img src="${faviconSrc}" alt="" class="modal-source-favicon">
                        <span class="modal-source-domain">${escapeHtml(domain)}</span>
                        <a href="${escapeHtml(source.link)}" target="_blank" rel="noopener noreferrer" class="modal-source-link" title="${escapeHtml(source.link)}">
                            ${escapeHtml(source.link.length > 50 ? source.link.substring(0, 50) + '...' : source.link)}
                        </a>
                    </div>
                    <a href="${escapeHtml(source.link)}" target="_blank" rel="noopener noreferrer" class="modal-source-title">${escapeHtml(source.title)}</a>
                    <div class="modal-source-snippet">${escapeHtml(source.snippet || '')}</div>
                </div>
            `;
            sourcesModalBody.appendChild(itemDiv);
        });

        sourcesModalOverlay.classList.add('visible');
    }

    if (closeSourcesModalBtn && sourcesModalOverlay) {
        closeSourcesModalBtn.addEventListener('click', () => {
            sourcesModalOverlay.classList.remove('visible');
        });
        sourcesModalOverlay.addEventListener('click', (event) => {
            if (event.target === sourcesModalOverlay) { // Click on overlay background
                sourcesModalOverlay.classList.remove('visible');
            }
        });
    }

    function openSingleSourceModal(faviconSrc, title, link, snippet) {
        if (!singleSourceModalOverlay || !singleSourceModalFavicon || !singleSourceModalTitle || !singleSourceModalLink || !singleSourceModalSnippet) return;

        singleSourceModalFavicon.src = faviconSrc || 'https://www.google.com/favicon.ico';
        singleSourceModalFavicon.alt = title ? `Favicon for ${title.split(' ')[0]}` : 'Favicon';

        // Update title in modal body
        singleSourceModalTitle.textContent = title || 'No Title';
        // Optionally update title in header span as well
        const modalHeaderTitleSpan = singleSourceModalOverlay.querySelector('.single-source-modal-title span');
        if (modalHeaderTitleSpan) modalHeaderTitleSpan.textContent = title || 'Source Details';

        singleSourceModalLink.href = link || '#';
        singleSourceModalLink.textContent = link || 'No Link Available';
        singleSourceModalSnippet.textContent = snippet || 'No snippet available.';

        singleSourceModalOverlay.classList.add('visible');
    }

    if (closeSingleSourceModalBtn && singleSourceModalOverlay) {
        closeSingleSourceModalBtn.addEventListener('click', () => {
            singleSourceModalOverlay.classList.remove('visible');
        });
        singleSourceModalOverlay.addEventListener('click', (event) => {
            // Close if clicking overlay, but not the content area
            if (event.target === singleSourceModalOverlay) {
                singleSourceModalOverlay.classList.remove('visible');
            }
        });
    }

    // --- Utility Functions ---
    function generateChatTitle(message) {
        // Simple title generation: first few words
        let text = message.trim().replace(/\[File attached:.*?\]/g, '').trim(); // Remove file attachment text
        if (!text) return "Chat"; // Handle empty message after removing file info

        const words = text.split(/\s+/);
        let title = words.slice(0, 5).join(' ');
        if (words.length > 5) {
            title += '...';
        }
        // Capitalize first letter
        return title.charAt(0).toUpperCase() + title.slice(1);
    }

    function extractEmail(text) {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const match = text.match(emailRegex);
        return match ? match[0] : null;
    }

    function escapeHtml(unsafe) {
        if (unsafe === null || typeof unsafe === 'undefined') return '';
        return String(unsafe)
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    function showStatus(message, type = 'success') {
        if (!statusMessage) return;
        statusMessage.className = 'status-message visible ' + type;
        const iconClass = type === 'success' ? 'bi-check-circle' :
                          type === 'error' ? 'bi-exclamation-circle' :
                          'bi-info-circle';
        statusMessage.innerHTML = `<i class="bi ${iconClass}"></i> <span>${escapeHtml(message)}</span>`;

        // Clear after a delay
        setTimeout(() => {
            statusMessage.classList.remove('visible');
        }, 3000);
    }

    // --- Responsive Adjustments ---
    function handleResize() {
        // Close mobile sidebar overlay if window becomes large
        if (window.innerWidth > 768 && sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
    }
    window.addEventListener('resize', handleResize);

    // --- Table Sorting (if needed for data panel) ---
    window.sortTable = function(header) {
        // Implementation from script.js can be placed here if tables are generated
        const table = header.closest('table');
        if (!table) return;
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const headerIndex = Array.from(header.parentNode.children).indexOf(header);
        const isAscending = !header.classList.contains('asc');

        // Reset other headers
        table.querySelectorAll('th').forEach(th => {
            th.classList.remove('asc', 'desc');
            const icon = th.querySelector('.sort-icon i');
            if (icon) icon.className = 'bi bi-arrow-down-up';
        });

        // Set current header state
        header.classList.toggle('asc', isAscending);
        header.classList.toggle('desc', !isAscending);
        const icon = header.querySelector('.sort-icon i');
        if (icon) icon.className = isAscending ? 'bi bi-arrow-down' : 'bi bi-arrow-up';

        // Sort rows
        rows.sort((a, b) => {
            const aText = a.children[headerIndex]?.textContent || '';
            const bText = b.children[headerIndex]?.textContent || '';

            // Attempt numeric sort first
            const aNum = parseFloat(aText.replace(/,/g, ''));
            const bNum = parseFloat(bText.replace(/,/g, ''));

            if (!isNaN(aNum) && !isNaN(bNum)) {
                return isAscending ? aNum - bNum : bNum - aNum;
            }

            // Fallback to locale string comparison
            return isAscending
                ? aText.localeCompare(bText, undefined, {numeric: true, sensitivity: 'base'})
                : bText.localeCompare(aText, undefined, {numeric: true, sensitivity: 'base'});
        });

        // Re-append sorted rows
        rows.forEach(row => tbody.appendChild(row));
    };

    function createTableFromData(data, filename = "Data") {
        if (!data || !Array.isArray(data) || data.length === 0) {
            return "<p>No data to display or data is in an invalid format.</p>";
        }

        const headers = Object.keys(data[0]);
        let tableHtml = `
            <div class="dataframe-container">
                <h4>${escapeHtml(filename)}</h4>
                <div class="table-responsive">
                    <table class="table data-table"> <!-- Added class for specific styling -->
                        <thead>
                            <tr>`;

        headers.forEach(header => {
            tableHtml += `<th onclick="sortTable(this)">${escapeHtml(header)}
                            <span class="sort-icon"><i class="bi bi-arrow-down-up"></i></span>
                        </th>`;
        });

        tableHtml += `</tr></thead><tbody>`;

        // Display only a subset of rows for performance if data is large
        const maxRowsToShow = 100;
        const dataToShow = data.slice(0, maxRowsToShow);

        dataToShow.forEach(row => {
            tableHtml += `<tr>`;
            headers.forEach(header => {
                let value = row[header];
                // Basic formatting for numbers
                if (typeof value === 'number') {
                    value = Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
                }
                // Handle null/undefined/NaN
                if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
                    value = '-';
                }
                tableHtml += `<td>${escapeHtml(value)}</td>`;
            });
            tableHtml += `</tr>`;
        });

        tableHtml += `</tbody></table>
                </div>
                <div class="table-footer">
                    <small>Showing ${dataToShow.length} of ${data.length} rows.</small>
                    ${data.length > maxRowsToShow ? '<small> (Preview limited to first 100 rows)</small>' : ''}
                </div>
            </div>`;

        return tableHtml;
    }

    console.log("App.js initialization complete.");
}); // End DOMContentLoaded
