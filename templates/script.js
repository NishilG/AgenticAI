document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Elements ---
    const body = document.body;
    const themeSwitch = document.getElementById('themeSwitch');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsBtn = document.getElementById('settingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const dataPanel = document.getElementById('dataPanel');
    const dataPanelBtn = document.getElementById('dataPanelBtn');
    const closeDataPanelBtn = document.getElementById('closeDataPanelBtn');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const fileInput = document.getElementById('fileInput');
    const attachBtn = document.getElementById('attachBtn');
    const chatContainer = document.getElementById('chatContainer');
    const statusMessage = document.getElementById('statusMessage');
    const newChatBtn = document.getElementById('newChatBtn');
    const chatItems = document.querySelectorAll('.chat-item');
    const proSearchToggle = document.getElementById('proSearchToggle');
    const emailForm = document.getElementById('emailForm');
    const closeEmailFormBtn = document.getElementById('closeEmailFormBtn');
    const sendEmailBtn = document.getElementById('sendEmailBtn');
    const cancelEmailBtn = document.getElementById('cancelEmailBtn');
    const browserPanel = document.getElementById('browserPanel');
    const browserPanelBtn = document.getElementById('browserPanelBtn');
    const closeBrowserPanelBtn = document.getElementById('closeBrowserPanelBtn');
    const screenshotImage = document.getElementById('screenshotImage');
    const dataPanelContent = document.getElementById('dataPanelContent');
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

    const MAX_SOURCES_DISPLAY_IN_CHAT = 3;
    const MAX_MORE_ICONS = 3;

    // --- Theme Handling ---
    // --- Theme Handling ---
    function applyTheme(theme) {
        body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        themeSwitch.checked = (theme === 'dark');
    }

    themeSwitch.addEventListener('change', function() {
        applyTheme(this.checked ? 'dark' : 'light');
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    // --- Panel Management ---
    function closeAllPanels() {
        settingsPanel.classList.remove('open');
        dataPanel.classList.remove('open');
        emailForm.classList.remove('open');
        browserPanel.classList.remove('open');
    }

    // Settings Panel
    settingsBtn.addEventListener('click', () => {
        closeAllPanels();
        settingsPanel.classList.add('open');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsPanel.classList.remove('open');
    });

    // Data Panel
    dataPanelBtn.addEventListener('click', () => {
        closeAllPanels();
        dataPanel.classList.add('open');
        sidebar.classList.remove('open'); // Ensure sidebar is closed
    });

    closeDataPanelBtn.addEventListener('click', () => {
        dataPanel.classList.remove('open');
    });

    // Email Form
    closeEmailFormBtn.addEventListener('click', () => {
        emailForm.classList.remove('open');
    });

    cancelEmailBtn.addEventListener('click', () => {
        emailForm.classList.remove('open');
    });

    // Browser Panel
    browserPanelBtn.addEventListener('click', () => {
        closeAllPanels();
        browserPanel.classList.add('open');
        sidebar.classList.remove('open'); // Close sidebar
        updateScreenshot();
    });

    closeBrowserPanelBtn.addEventListener('click', () => {
        browserPanel.classList.remove('open');
    });

    // Sidebar Toggle (Mobile)
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Update browser screenshot
    function updateScreenshot() {
        fetch('/screenshots')
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const randomIndex = Math.floor(Math.random() * data.length);
                    const randomImage = data[randomIndex];
                    screenshotImage.src = '/static/screenshots/' + randomImage + '?t=' + new Date().getTime();
                }
            })
            .catch(error => console.error('Error fetching screenshots:', error));
    }

    // Set interval for updating screenshot
    setInterval(updateScreenshot, 2000);

    // --- Settings Management ---
    saveSettingsBtn.addEventListener('click', () => {
        localStorage.setItem('geminiApiKey', document.getElementById('geminiApiKey').value);
        localStorage.setItem('googleApiKey', document.getElementById('googleApiKey').value);
        localStorage.setItem('searchEngineId', document.getElementById('searchEngineId').value);
        localStorage.setItem('senderEmail', document.getElementById('senderEmail').value);
        localStorage.setItem('senderPassword', document.getElementById('senderPassword').value);
        localStorage.setItem('proSearchEnabled', proSearchToggle.checked);
        
        showStatus('Settings saved successfully!', 'success');
        setTimeout(() => {
            settingsPanel.classList.remove('open');
        }, 1000);
    });

    function loadSettings() {
        document.getElementById('geminiApiKey').value = localStorage.getItem('geminiApiKey') || '';
        document.getElementById('googleApiKey').value = localStorage.getItem('googleApiKey') || '';
        document.getElementById('searchEngineId').value = localStorage.getItem('searchEngineId') || '';
        document.getElementById('senderEmail').value = localStorage.getItem('senderEmail') || '';
        document.getElementById('senderPassword').value = localStorage.getItem('senderPassword') || '';
        proSearchToggle.checked = localStorage.getItem('proSearchEnabled') === 'true';
    }

    loadSettings();

    // Pro Search Toggle
    proSearchToggle.addEventListener('change', function() {
        localStorage.setItem('proSearchEnabled', this.checked);
    });

    // --- Chat History Management ---
    chatItems.forEach(item => {
        item.addEventListener('click', () => {
            chatItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            document.querySelector('.chat-title').textContent = item.textContent;
        });
    });

    newChatBtn.addEventListener('click', () => {
        chatItems.forEach(i => i.classList.remove('active'));
        document.querySelector('.chat-title').textContent = 'New Chat';
        chatContainer.innerHTML = `
            <div class="message bot-message">
                <div class="message-avatar">AI</div>
                <div class="message-content">
                    <div class="message-role">AI Assistant</div>
                    <div class="message-bubble">
                        <div class="message-text">
                            Hello! I'm your AI assistant. What would you like to discuss today?
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    // --- Message Handling ---
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    messageInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    // File attachment handling
    attachBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            showStatus(`File "${this.files[0].name}" ready for upload`, 'success');
        }
    });

    function sendMessage() {
        const message = messageInput.value.trim();
        if (!message && fileInput.files.length === 0) return;

        // Collect previous chat messages
        const chatHistory = [];
        const messages = chatContainer.querySelectorAll('.message');
        messages.forEach(msg => {
            const role = msg.classList.contains('user-message') ? 'user' : 'assistant';
            const text = msg.querySelector('.message-text').textContent;
            chatHistory.push({ role, content: text });
        });

        // Add user message immediately
        addMessage(message, 'user');
        messageInput.value = '';
        messageInput.style.height = 'auto';

        // Show loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'message bot-message';
        loadingIndicator.innerHTML = `
            <div class="message-avatar">AI</div>
            <div class="message-content">
                <div class="message-role">AI Assistant</div>
                <div class="message-bubble">
                    <div class="loading-indicator">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        `;
        chatContainer.appendChild(loadingIndicator);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Process the message with chat history
        processUserMessage(message, chatHistory)
            .then(response => {
                loadingIndicator.remove();
                if (response) {
                    addMessage(response.content, 'bot', response.sources);
                    if (response.showDataPanel && dataPanelContent) {
                        dataPanelContent.innerHTML = response.dataContent || '<p>No data to display.</p>';
                        dataPanel.classList.add('open');
                    }
                    if (response.showBrowserPanel) {
                        browserPanel.classList.add('open');
                    }
                }
            })
            .catch(error => {
                console.error("Error processing message:", error);
                loadingIndicator.remove();
                addMessage("Sorry, an error occurred while processing your request.", 'bot');
                showStatus(`Error: ${error.message}`, 'error');
            });
    }

    async function processUserMessage(message, chatHistory) {
        const geminiApiKey = document.getElementById('geminiApiKey').value;
        if (!geminiApiKey) {
            return { content: "Please set Gemini API key in settings." };
        }

        const toolResponse = await determineTool(message, geminiApiKey, chatHistory);
        if (!toolResponse.success) {
            return { content: "Error determining tool: " + toolResponse.error };
        }

        const tool = toolResponse.tool;
        console.log(`Tool determined: ${tool}`);

        switch (tool) {
            case 'Email':
                return await handleEmailIntent(message, geminiApiKey, chatHistory);
            case 'BrowserUse':
                return await handleBrowserIntent(message, geminiApiKey, chatHistory);
            case 'DataAnalysis':
                return await handleDataAnalysisIntent(message, geminiApiKey, chatHistory);
            case 'None':
            default:
                return await handleChatIntent(message, geminiApiKey, chatHistory);
        }
    }

    async function determineTool(message, geminiApiKey, chatHistory) {
        try {
            const response = await fetch('/determine_tool', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    gemini_api_key: geminiApiKey,
                    chat_history: chatHistory
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const validTools = ["Email", "BrowserUse", "DataAnalysis", "None"];
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
        try {
            const response = await fetch('/browser_action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task: message,
                    gemini_api_key: geminiApiKey,
                    chat_history: chatHistory
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                // Update screenshot immediately
                updateScreenshot();
                // Show browser panel
                browserPanel.classList.add('open');
                // Return the result from the browser action
                return {
                    content: data.result || "Browser action completed successfully.",
                    showBrowserPanel: true
                };
            } else {
                throw new Error(data.error || "Unknown browser tool error");
            }
        } catch (error) {
            console.error("Error in handleBrowserIntent:", error);
            return { content: `Browser tool failed: ${error.message}` };
        }
    }

    async function handleDataAnalysisIntent(message, geminiApiKey, chatHistory) {
        const file = fileInput.files[0];
        
        if (!file) {
            return { content: "Please upload a CSV or Excel file first to use the Data Analysis tool." };
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('message', message);
        formData.append('chat_history', JSON.stringify(chatHistory));

        try {
            const response = await fetch('http://localhost:5001/data_analysis_action', {
                method: 'POST',
                body: formData,
                mode: 'cors'
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            let data;
            try {
                const responseText = await response.text();
                data = JSON.parse(responseText);
            } catch (e) {
                console.error("Failed to parse JSON response:", e);
                throw new Error("Invalid response format from server");
            }

            if (typeof data !== 'object' || data === null) {
                throw new Error("Invalid response data format");
            }

            if (data.success) {
                if (data.type === 'text') {
                    return { content: data.content };
                } else if (data.type === 'dataframe') {
                    const tableHtml = createTableFromData(data.content, data.filename);
                    return { 
                        content: `Analysis results for ${data.filename} are ready in the Data panel.`,
                        showDataPanel: true,
                        dataContent: tableHtml
                    };
                } else if (data.type === 'plot') {
                    let plotUrl = "http://localhost:5001"+data.content;
                    const imgHtml = `<img src="${plotUrl}" alt="Generated Plot" class="plot-image">`;
                    return { 
                        content: `Analysis plot for ${file.name} is ready in the Data panel.`,
                        showDataPanel: true,
                        dataContent: `<div class="plot-container">${imgHtml}</div>`
                    };
                } else {
                    return { content: "Received unexpected analysis result type." };
                }
            } else {
                throw new Error(data.error || "Unknown data analysis error");
            }
        } catch (error) {
            console.error("Error in handleDataAnalysisIntent:", error);
            return { content: `Data analysis failed: ${error.message}` };
        }
    }

    function createTableFromData(data, filename = "Data") {
        if (!data || data.length === 0) {
            return "<p>No data to display.</p>";
        }
        
        const headers = Object.keys(data[0]);
        let table = `
            <div class="dataframe-container">
                <p>Showing analysis results from ${filename}:</p>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>`;
        
        headers.forEach(header => {
            table += `<th onclick="sortTable(this)">${escapeHtml(header)}
                        <span class="sort-icon"><i class="bi bi-arrow-down-up"></i></span>
                    </th>`;
        });
        
        table += `</tr></thead><tbody>`;
        
        data.forEach(row => {
            table += `<tr>`;
            headers.forEach(header => {
                let value = row[header];
                if (typeof value === 'number') {
                    if (Number.isInteger(value)) {
                        value = value.toLocaleString();
                    } else {
                        value = value.toFixed(2);
                    }
                }
                if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
                    value = '-';
                }
                table += `<td>${escapeHtml(value)}</td>`;
            });
            table += `</tr>`;
        });
        
        table += `</tbody></table>
                </div>
                <div class="table-footer">
                    <small>Showing ${Math.min(data.length, 50)} of ${data.length} rows</small>
                </div>
            </div>`;
        
        return table;
    }

    async function handleEmailIntent(message, geminiApiKey, chatHistory) {
        let receiver = extractEmail(message);
        if (receiver) document.getElementById('receiverEmail').value = receiver;
        
        const googleApiKey = document.getElementById('googleApiKey').value;
        const searchEngineId = document.getElementById('searchEngineId').value;
        const searchEnabled = proSearchToggle.checked;
        
        const emailContent = await getAIResponse({
            query: message,
            gemini_api_key: geminiApiKey,
            google_api_key: googleApiKey,
            search_engine_id: searchEngineId,
            useSearch: searchEnabled,
            isEmail: true,
            chat_history: chatHistory
        });

        if (emailContent && emailContent.success) {
            document.getElementById('emailSubject').value = emailContent.subject || '';
            document.getElementById('emailBody').value = emailContent.body || '';
            emailForm.classList.add('open');
            return { content: "I've prepared an email draft for you. Please review it in the email form before sending." };
        } else {
            return { content: `Couldn't generate email content. ${emailContent?.error || ''}` };
        }
    }

    async function handleChatIntent(message, geminiApiKey, chatHistory) {
        const googleApiKey = document.getElementById('googleApiKey').value;
        const searchEngineId = document.getElementById('searchEngineId').value;
        let useSearch = proSearchToggle.checked;
        if (useSearch && (!googleApiKey || !searchEngineId)) { 
            useSearch = false; 
        }
        
        const file = fileInput.files[0];
        let formData = new FormData();
        formData.append('query', message);
        if (file) {
            formData.append('image', file);
        }
        formData.append('gemini_api_key', geminiApiKey);
        formData.append('google_api_key', googleApiKey);
        formData.append('search_engine_id', searchEngineId);
        formData.append('useSearch', useSearch);
        formData.append('chat_history', JSON.stringify(chatHistory));

        const aiResponseData = await getAIResponse(formData);

        if (aiResponseData && typeof aiResponseData.ai_response !== 'undefined') {
            return { 
                content: aiResponseData.ai_response, 
                sources: aiResponseData.search_results || [] 
            };
        } else {
            return { content: "Sorry, couldn't get a response." };
        }
    }

    async function sendEmail() {
        const senderEmail = document.getElementById('senderEmail').value;
        const senderPassword = document.getElementById('senderPassword').value;
        const receiverEmail = document.getElementById('receiverEmail').value;
        const subject = document.getElementById('emailSubject').value;
        const body = document.getElementById('emailBody').value;
        
        if (!senderEmail || !senderPassword || !receiverEmail || !subject || !body) { 
            showStatus('Please fill all email fields.', 'warning'); 
            return; 
        }
        
        showStatus('Sending email...', 'success');
        
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
                addMessage(`Email sent to ${receiverEmail}!`, 'bot'); 
                showStatus(data.message || 'Email sent!', 'success'); 
                document.getElementById('receiverEmail').value = ''; 
                document.getElementById('emailSubject').value = ''; 
                document.getElementById('emailBody').value = ''; 
                emailForm.classList.remove('open');
            } else {
                throw new Error(data.message || `HTTP error ${response.status}`);
            }
        } catch (error) {
            console.error("Error sending email:", error);
            addMessage(`Failed to send email: ${error.message}`, 'bot');
            showStatus(`Email Error: ${error.message}`, 'error');
        }
    }

    function addMessage(content, sender, sources = [], allowHtml = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatar = sender === 'user' ? 'U' : 'AI';
        const role = sender === 'user' ? 'You' : 'AI Assistant';
        
        let messageContent = content;
        if (!allowHtml) {
            messageContent = content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>');
        }
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-role">${role}</div>
                <div class="message-bubble">
                    <div class="message-text">${messageContent}</div>
                </div>
            </div>
        `;
        
        // Add sources if available, inside the bubble
        if (sources && sources.length > 0) {
            const sourcesDiv = document.createElement('div');
            sourcesDiv.className = 'search-container';
            // Removed marginTop, using margin-bottom on container now
            displaySearchResults(sources, sourcesDiv, false);
            
            // Find the message bubble and insert sources before the text
            const messageBubble = messageDiv.querySelector('.message-bubble');
            const messageText = messageBubble.querySelector('.message-text');
            if (messageBubble && messageText) {
                messageBubble.insertBefore(sourcesDiv, messageText);
            } else {
                // Fallback: append to the message content if structure is unexpected
                messageDiv.querySelector('.message-content').appendChild(sourcesDiv);
            }

            // Add "+ Sources" button if needed
            if (sources.length > MAX_SOURCES_DISPLAY_IN_CHAT) {
                const remainingCount = sources.length - MAX_SOURCES_DISPLAY_IN_CHAT;
                const moreSourcesBtn = document.createElement('button');
                moreSourcesBtn.className = 'more-sources-btn action-btn'; // Reuse action-btn style
                moreSourcesBtn.innerHTML = `<i class="bi bi-plus-lg"></i> ${remainingCount} More Sources`;
                moreSourcesBtn.title = 'View all sources';
                // Store all sources on the container for the event listener
                sourcesDiv.dataset.sources = JSON.stringify(sources);
                sourcesDiv.appendChild(moreSourcesBtn);
            }
        }
        
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    async function getAIResponse(formData) {
        try {
            let url = '/ai_search';
            let options = { method: 'POST' };
            
            if (formData instanceof FormData) {
                options.body = formData;
            } else {
                url = '/ai_search_email';
                options.headers = { 'Content-Type': 'application/json' };
                options.body = JSON.stringify(formData);
            }
            
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `API Error: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Error calling API:`, error);
            return { success: false, error: error.message };
        }
    }

    function displaySearchResults(results, containerElement, fullView = false) {
        containerElement.innerHTML = '';
        if (!results || results.length === 0) {
            return;
        }

        const numToDisplay = fullView ? results.length : Math.min(results.length, MAX_SOURCES_DISPLAY_IN_CHAT);
        const showMoreSourcesIndicator = !fullView && results.length > MAX_SOURCES_DISPLAY_IN_CHAT;

        for (let i = 0; i < numToDisplay; i++) {
            const result = results[i];
            const itemLink = document.createElement('a');
            itemLink.className = 'search-result-item';
            itemLink.href = result.link;
            itemLink.target = '_blank';
            itemLink.rel = 'noopener noreferrer';
            itemLink.title = result.title + "\n" + result.snippet;

            // Store data for the modal
            itemLink.dataset.link = result.link;
            itemLink.dataset.title = result.title;
            itemLink.dataset.snippet = result.snippet;

            const favicon = document.createElement('img');
            favicon.className = 'favicon';
            try { favicon.src = `https://www.google.com/s2/favicons?domain=${new URL(result.link).hostname}&sz=16`; }
            catch { favicon.src = 'https://www.google.com/favicon.ico'; }
            itemLink.dataset.favicon = favicon.src; // Store favicon source

            const titleSpan = document.createElement('span');
            titleSpan.className = 'title';
            titleSpan.textContent = result.title;

            itemLink.appendChild(favicon);
            itemLink.appendChild(titleSpan);

            // Create and add the "+ Source Details" button
            const sourceDetailsBtn = document.createElement('button');
            sourceDetailsBtn.className = 'show-source-details-btn';
            sourceDetailsBtn.innerHTML = '<i class="bi bi-plus-circle"></i>';
            sourceDetailsBtn.title = 'Show source details';
            // Add event listener to the button to open the single source modal
            sourceDetailsBtn.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default button action
                e.stopPropagation(); // Stop the click from propagating to the parent link

                // Get the parent link element to access its dataset
                const parentLink = e.currentTarget.closest('.search-result-item');
                if (parentLink && parentLink.dataset) {
                    const faviconSrc = parentLink.dataset.favicon || 'https://www.google.com/favicon.ico';
                    const title = parentLink.dataset.title || 'No Title';
                    const link = parentLink.dataset.link || '#';
                    const snippet = parentLink.dataset.snippet || 'No Snippet Available.';
                    openSingleSourceModal(faviconSrc, title, link, snippet);
                } else {
                    console.error("Could not find source data for modal.");
                    showStatus("Error: Could not load source details.", "error");
                }
            });
            itemLink.appendChild(sourceDetailsBtn); // Add the button to the link

            containerElement.appendChild(itemLink);
        }

        // Removed the "more sources" indicator logic here.
        // A dedicated button will be added in addMessage if needed.
    }

    function extractEmail(text) {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        return text.match(emailRegex)?.[0] || null;
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
        statusMessage.className = 'status-message visible ' + type;
        statusMessage.innerHTML = `
            <i class="bi ${type === 'success' ? 'bi-check-circle' : 
                              type === 'error' ? 'bi-exclamation-circle' : 
                              'bi-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        setTimeout(() => {
            statusMessage.classList.remove('visible');
        }, 3000);
    }

    // --- Responsive Adjustments ---
    function handleResize() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('open');
        }
    }

    window.addEventListener('resize', handleResize);

    // --- File Input Handling ---
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            showStatus(`File "${this.files[0].name}" ready for upload`, 'success');
        }
    });

    // --- Sources Modal Handling ---

    // Event listener for the "+ Sources" button (using event delegation)
    chatContainer.addEventListener('click', (event) => {
        const moreSourcesButton = event.target.closest('.more-sources-btn');
        if (moreSourcesButton) {
            const sourcesContainer = moreSourcesButton.closest('.search-container');
            if (sourcesContainer && sourcesContainer.dataset.sources) {
                try {
                    const allSources = JSON.parse(sourcesContainer.dataset.sources);
                    openSourcesModal(allSources);
                } catch (e) {
                    console.error("Failed to parse sources data:", e);
                    showStatus("Error opening sources.", "error");
                }
            }
        }
    });

    function openSourcesModal(allSources) {
        sourcesModalBody.innerHTML = ''; // Clear previous content
        if (!allSources || allSources.length === 0) return;

        allSources.forEach((source, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'modal-source-item';

            let faviconSrc = 'https://www.google.com/favicon.ico'; // Default favicon
            try {
                faviconSrc = `https://www.google.com/s2/favicons?domain=${new URL(source.link).hostname}&sz=16`;
            } catch (e) { console.warn("Could not parse URL for favicon:", source.link); }

            itemDiv.innerHTML = `
                <div class="modal-source-number">${index + 1}</div>
                <div class="modal-source-content">
                    <div class="modal-source-header">
                        <img src="${faviconSrc}" alt="" class="modal-source-favicon">
                        <span class="modal-source-domain">${escapeHtml(new URL(source.link).hostname)}</span>
                        <a href="${escapeHtml(source.link)}" target="_blank" rel="noopener noreferrer" class="modal-source-link" title="${escapeHtml(source.link)}">
                            ${escapeHtml(source.link.length > 50 ? source.link.substring(0, 50) + '...' : source.link)}
                        </a>
                    </div>
                    <a href="${escapeHtml(source.link)}" target="_blank" rel="noopener noreferrer" class="modal-source-title">${escapeHtml(source.title)}</a>
                    <div class="modal-source-snippet">${escapeHtml(source.snippet)}</div>
                </div>
            `;
            sourcesModalBody.appendChild(itemDiv);
        });

        sourcesModalOverlay.classList.add('visible');
    }

    closeSourcesModalBtn.addEventListener('click', () => {
        sourcesModalOverlay.classList.remove('visible');
    });

    sourcesModalOverlay.addEventListener('click', (event) => {
        // Close only if clicked on the overlay itself, not the content
        if (event.target === sourcesModalOverlay) {
            sourcesModalOverlay.classList.remove('visible');
        }
    });

    // --- Single Source Modal Logic ---
    function openSingleSourceModal(faviconSrc, title, link, snippet) {
        singleSourceModalFavicon.src = faviconSrc || ''; // Handle cases where favicon might be missing
        singleSourceModalFavicon.alt = title ? `Favicon for ${title.split(' ')[0]}` : 'Favicon';
        // Use the h4 element for the title inside the modal body
        const modalBodyTitle = singleSourceModalOverlay.querySelector('#singleSourceModalContentTitle');
        if (modalBodyTitle) modalBodyTitle.textContent = title || 'No Title';
        // Also update the header title span if needed (optional, depends on design)
        const modalHeaderTitleSpan = singleSourceModalOverlay.querySelector('.single-source-modal-title span');
        if (modalHeaderTitleSpan) modalHeaderTitleSpan.textContent = title || 'Source Details';

        singleSourceModalLink.href = link || '#';
        singleSourceModalLink.textContent = link || 'No Link';
        singleSourceModalSnippet.textContent = snippet || 'No snippet available.';
        singleSourceModalOverlay.classList.add('visible');
    }

    // Event listener for clicking on individual source items (using delegation)
    chatContainer.addEventListener('click', (event) => {
        const sourceItemLink = event.target.closest('.search-result-item');
        if (sourceItemLink) {
            event.preventDefault(); // Prevent default link navigation

            // Retrieve data directly from the dataset attributes
            const faviconSrc = sourceItemLink.dataset.favicon || 'https://www.google.com/favicon.ico'; // Fallback favicon
            const title = sourceItemLink.dataset.title || 'No Title';
            const link = sourceItemLink.dataset.link || '#';
            const snippet = sourceItemLink.dataset.snippet || 'No Snippet Available.';

            openSingleSourceModal(faviconSrc, title, link, snippet);
        }
    });

    // Close single source modal button
    closeSingleSourceModalBtn.addEventListener('click', () => {
        singleSourceModalOverlay.classList.remove('visible');
    });

    // Close single source modal if clicked outside the content
    singleSourceModalOverlay.addEventListener('click', (event) => {
        // Check if the click is directly on the overlay, not on the content div or its children
        if (event.target === singleSourceModalOverlay) {
            singleSourceModalOverlay.classList.remove('visible');
        }
    });

    // Global function for table sorting
    window.sortTable = function(header) {
        const table = header.closest('table');
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const headerIndex = Array.from(header.parentNode.children).indexOf(header);
        const isAscending = !header.classList.contains('asc');
        
        table.querySelectorAll('th').forEach(th => {
            th.classList.remove('asc', 'desc');
            const icon = th.querySelector('.sort-icon i');
            if (icon) icon.className = 'bi bi-arrow-down-up';
        });
        
        header.classList.add(isAscending ? 'asc' : 'desc');
        const icon = header.querySelector('.sort-icon i');
        if (icon) icon.className = isAscending ? 'bi bi-arrow-down' : 'bi bi-arrow-up';
        
        rows.sort((a, b) => {
            const aValue = a.children[headerIndex].textContent;
            const bValue = b.children[headerIndex].textContent;
            
            const aNum = parseFloat(aValue.replace(/,/g, ''));
            const bNum = parseFloat(bValue.replace(/,/g, ''));
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return isAscending ? aNum - bNum : bNum - aNum;
            }
            
            return isAscending
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        });
        
        rows.forEach(row => tbody.appendChild(row));
    };
});