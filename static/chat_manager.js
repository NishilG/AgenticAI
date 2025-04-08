// Chat Manager Script
document.addEventListener('DOMContentLoaded', function() {
    console.log('Chat Manager script loaded');
    
    // DOM Elements
    const newChatBtn = document.getElementById('newChatBtn');
    const chatHistory = document.getElementById('chatHistory');
    const chatContainer = document.getElementById('chatContainer');
    
    // Chat state
    let currentChatId = 'chat1';
    let chats = {};
    
    // Initialize
    function init() {
        console.log('Initializing chat manager');
        loadChats();
        
        // Add event listener to new chat button
        if (newChatBtn) {
            newChatBtn.addEventListener('click', function(e) {
                console.log('New chat button clicked');
                e.preventDefault();
                createNewChat();
            });
        } else {
            console.error('New chat button not found');
        }
    }
    
    // Load chats from localStorage
    function loadChats() {
        console.log('Loading chats from localStorage');
        const savedChats = localStorage.getItem('chats');
        if (savedChats) {
            chats = JSON.parse(savedChats);
            renderChats();
        } else {
            // Initialize with default chat
            chats = {
                'chat1': {
                    title: 'Chat 1',
                    messages: [{
                        role: 'assistant',
                        content: "Hello! I'm your AI assistant. How can I help you today?"
                    }]
                }
            };
            saveChats();
            renderChats();
        }
    }
    
    // Save chats to localStorage
    function saveChats() {
        localStorage.setItem('chats', JSON.stringify(chats));
    }
    
    // Render all chats in the sidebar
    function renderChats() {
        console.log('Rendering chats:', Object.keys(chats));
        chatHistory.innerHTML = '';
        
        Object.keys(chats).forEach(chatId => {
            const chat = chats[chatId];
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item' + (chatId === currentChatId ? ' active' : '');
            chatItem.dataset.chatId = chatId;
            
            chatItem.innerHTML = `
                <span class="chat-item-title">${chat.title}</span>
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
        
        // Add event listeners to chat items
        addChatItemEventListeners();
    }
    
    // Add event listeners to chat items and buttons
    function addChatItemEventListeners() {
        // Chat item click
        document.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.chat-action-btn')) {
                    document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    currentChatId = item.dataset.chatId;
                    document.querySelector('.chat-title').textContent = chats[currentChatId].title;
                    loadChatMessages(currentChatId);
                }
            });
        });

        // Rename button click
        document.querySelectorAll('.rename-chat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Rename button clicked');
                e.stopPropagation();
                const chatItem = btn.closest('.chat-item');
                const chatId = chatItem.dataset.chatId;
                const titleSpan = chatItem.querySelector('.chat-item-title');
                const currentTitle = titleSpan.textContent;
                
                // Create rename dialog
                const renameDialog = document.createElement('div');
                renameDialog.className = 'modal-overlay visible';
                renameDialog.innerHTML = `
                    <div class="modal-content" style="max-width: 400px;">
                        <div class="modal-header">
                            <h3 class="modal-title">Rename Chat</h3>
                            <button class="modal-close-btn cancel-rename">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group" style="margin-bottom: 20px;">
                                <label class="form-label" for="newChatTitle">New Title</label>
                                <input type="text" class="form-control" id="newChatTitle" value="${currentTitle}">
                            </div>
                            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                                <button class="new-chat-btn cancel-rename" style="background-color: var(--secondary);">Cancel</button>
                                <button class="new-chat-btn save-rename">Save</button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(renameDialog);
                const titleInput = document.getElementById('newChatTitle');
                titleInput.focus();
                titleInput.select();
                
                // Handle save button click
                function saveNewTitle() {
                    const newTitle = titleInput.value.trim() || currentTitle;
                    titleSpan.textContent = newTitle;
                    
                    // Update chat title
                    chats[chatId].title = newTitle;
                    saveChats();
                    
                    // Update chat title in header if this is the active chat
                    if (chatItem.classList.contains('active')) {
                        document.querySelector('.chat-title').textContent = newTitle;
                    }
                    
                    // Remove dialog
                    renameDialog.remove();
                }
                
                // Handle cancel button click
                function cancelRename() {
                    renameDialog.remove();
                }
                
                // Add event listeners
                renameDialog.querySelector('.save-rename').addEventListener('click', saveNewTitle);
                renameDialog.querySelectorAll('.cancel-rename').forEach(btn => {
                    btn.addEventListener('click', cancelRename);
                });
                
                // Handle Enter key
                titleInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        saveNewTitle();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelRename();
                    }
                });
                
                // Close when clicking outside
                renameDialog.addEventListener('click', (e) => {
                    if (e.target === renameDialog) {
                        cancelRename();
                    }
                });
            });
        });

        // Delete button click
        document.querySelectorAll('.delete-chat').forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Delete button clicked');
                e.stopPropagation();
                const chatItem = btn.closest('.chat-item');
                const chatId = chatItem.dataset.chatId;
                
                // If this is the only chat, don't delete it
                if (Object.keys(chats).length <= 1) {
                    alert('You cannot delete the only chat. Create a new chat first.');
                    return;
                }
                
                // Create delete confirmation dialog
                const deleteDialog = document.createElement('div');
                deleteDialog.className = 'modal-overlay visible';
                deleteDialog.innerHTML = `
                    <div class="modal-content" style="max-width: 400px;">
                        <div class="modal-header">
                            <h3 class="modal-title">Delete Chat</h3>
                            <button class="modal-close-btn cancel-delete">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p>Are you sure you want to delete "${chats[chatId].title}"?</p>
                            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                                <button class="new-chat-btn cancel-delete" style="background-color: var(--secondary);">No</button>
                                <button class="new-chat-btn confirm-delete" style="background-color: var(--error);">Yes, Delete</button>
                            </div>
                        </div>
                    </div>
                `;
                
                document.body.appendChild(deleteDialog);
                
                // Handle confirm button click
                function confirmDelete() {
                    // Delete chat
                    delete chats[chatId];
                    saveChats();
                    
                    // If this was the active chat, switch to another chat
                    if (currentChatId === chatId) {
                        currentChatId = Object.keys(chats)[0];
                        document.querySelector('.chat-title').textContent = chats[currentChatId].title;
                        loadChatMessages(currentChatId);
                    }
                    
                    // Re-render chats
                    renderChats();
                    
                    // Remove dialog
                    deleteDialog.remove();
                }
                
                // Handle cancel button click
                function cancelDelete() {
                    deleteDialog.remove();
                }
                
                // Add event listeners
                deleteDialog.querySelector('.confirm-delete').addEventListener('click', confirmDelete);
                deleteDialog.querySelectorAll('.cancel-delete').forEach(btn => {
                    btn.addEventListener('click', cancelDelete);
                });
                
                // Close when clicking outside
                deleteDialog.addEventListener('click', (e) => {
                    if (e.target === deleteDialog) {
                        cancelDelete();
                    }
                });
            });
        });
    }
    
    // Load chat messages for a specific chat
    function loadChatMessages(chatId) {
        if (!chats[chatId]) return;
        
        chatContainer.innerHTML = '';
        chats[chatId].messages.forEach(msg => {
            addMessage(msg.content, msg.role === 'user' ? 'user' : 'bot');
        });
    }
    
    // Create a new chat
    function createNewChat() {
        console.log('Creating new chat');
        // Generate a new chat ID
        const timestamp = Date.now();
        const newChatId = `chat${timestamp}`;
        
        // Find the highest chat number to increment
        let highestNum = 0;
        Object.values(chats).forEach(chat => {
            const match = chat.title.match(/Chat (\\d+)/);
            if (match && parseInt(match[1]) > highestNum) {
                highestNum = parseInt(match[1]);
            }
        });
        
        // Create new chat
        chats[newChatId] = {
            title: `Chat ${highestNum + 1}`,
            messages: [{
                role: 'assistant',
                content: "Hello! I'm your AI assistant. What would you like to discuss today?"
            }]
        };
        
        // Save and switch to new chat
        saveChats();
        currentChatId = newChatId;
        document.querySelector('.chat-title').textContent = chats[newChatId].title;
        renderChats();
        loadChatMessages(newChatId);
        
        console.log('New chat created:', newChatId, chats[newChatId].title);
    }
    
    // Add a message to the chat
    function addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const avatar = sender === 'user' ? 'U' : 'AI';
        const role = sender === 'user' ? 'You' : 'AI Assistant';
        
        let messageContent = content;
        messageContent = content
            .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
            .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\\n/g, '<br>');
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-role">${role}</div>
                <div class="message-bubble">
                    <div class="message-text">${messageContent}</div>
                </div>
            </div>
        `;
        
        chatContainer.appendChild(messageDiv);
        
        // Save message to current chat
        if (chats[currentChatId]) {
            chats[currentChatId].messages.push({
                role: sender === 'user' ? 'user' : 'assistant',
                content: content
            });
            saveChats();
        }
        
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Initialize the chat manager
    init();
});
