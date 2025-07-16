frappe.AI_Chat = class {
    constructor() {
        this.selected_chat_name = null;
        this.is_new_chat = false;
        this.isTyping = false;
        this.autoSuggestions = [];
        this.voiceRecognition = null;
        this.isListening = false;
        this.setup_app();
        this.initializeAutomation();
    }

    create_app() {
        this.$app_element = $(document.createElement('div')).addClass('ai-chat-app').hide();
        $('body').append(this.$app_element);
        this.is_open = false;

        // Main chat container with sidebar and chat window
        this.$main_container = $('<div class="ai-chat-main-container"></div>');
        this.$app_element.append(this.$main_container);

        // Sidebar (like ChatGPT)
        this.$sidebar = $('<div class="ai-chat-sidebar"></div>');
        this.$main_container.append(this.$sidebar);

        // New Chat button with enhanced animation
        this.$new_chat_btn = $('<button class="ai-new-chat-btn"><span class="ai-new-chat-icon"><svg width="20" height="20" viewBox="0 0 20 20"><path d="M10 4v12M4 10h12" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></span><span class="ai-new-chat-label">New Chat</span></button>');
        this.$sidebar.append(this.$new_chat_btn);

        // Chat list with enhanced animations
        this.$chat_list = $('<div class="ai-chat-list"></div>');
        this.$sidebar.append(this.$chat_list);

        // Chat window with enhanced features
        this.$ai_chat_element = $(document.createElement('div'))
            .addClass('ai-chat-element')
            .hide();
        this.$main_container.append(this.$ai_chat_element);

        this.$ai_chat_element.append(`
<div class="ai-chat-header">
    <div class="ai-chat-header-content">
        <div class="ai-chat-status">
            <span class="ai-status-indicator"></span>
            <span class="ai-status-text">AI Assistant Ready</span>
        </div>
        <span class="ai-chat-cross-button">
            ${frappe.utils.icon('close', 'lg')}
        </span>
    </div>
</div>

<div class="ai-chat-body" id="ai-chat-history" aria-live="polite" aria-relevant="additions"></div>

<div class="ai-chat-footer">
    <div class="ai-input-container">
        <div class="ai-input-wrapper">
            <input type="text" id="ai-user-input" class="form-control text-dark" placeholder="Ask a question..." autocomplete="off" />
            <div class="ai-input-actions">
                <button class="ai-voice-btn" id="ai-voice-btn" title="Voice Input">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
                <button id="ai-send-btn" class="ai-send-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" height="22" width="22" viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
                    </svg>
                </button>
            </div>
        </div>
        <div class="ai-auto-suggestions" id="ai-auto-suggestions"></div>
    </div>
</div>
        `);

        // Enhanced animated robot icon for navbar
        const navbar_icon_html = `
        <li class='nav-item dropdown dropdown-notifications dropdown-mobile ai-chat-navbar-icon' title="Open AI Assistant" aria-label="Open AI Assistant">
          <div class="ai-robot-icon ai-robot-sleeping" id="ai-robot-navbar">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="22" fill="#e3eefe" stroke="#007bff" stroke-width="2"/>
              <ellipse cx="24" cy="30" rx="10" ry="6" fill="#b0d4ff"/>
              <rect x="14" y="16" width="20" height="14" rx="7" fill="#fff" stroke="#007bff" stroke-width="2"/>
              <!-- Eyes: open (awake) -->
              <circle class="ai-robot-eye-open" cx="18.5" cy="23" r="2.5" fill="#007bff"/>
              <circle class="ai-robot-eye-open" cx="29.5" cy="23" r="2.5" fill="#007bff"/>
              <!-- Eyes: closed (sleeping) -->
              <ellipse class="ai-robot-eye-closed" cx="18.5" cy="23" rx="2.2" ry="0.5" fill="#007bff"/>
              <ellipse class="ai-robot-eye-closed" cx="29.5" cy="23" rx="2.2" ry="0.5" fill="#007bff"/>
              <rect x="21" y="27" width="6" height="2" rx="1" fill="#007bff"/>
              <circle cx="12" cy="18" r="2" fill="#b0d4ff"/>
              <circle cx="36" cy="18" r="2" fill="#b0d4ff"/>
              <g class="ai-robot-gear">
                <circle cx="24" cy="10" r="3" fill="#007bff"/>
                <rect x="23.2" y="5" width="1.6" height="3" rx="0.8" fill="#007bff"/>
                <rect x="23.2" y="12" width="1.6" height="3" rx="0.8" fill="#007bff"/>
                <rect x="19.5" y="8.2" width="3" height="1.6" rx="0.8" fill="#007bff" transform="rotate(-45 19.5 8.2)"/>
                <rect x="25.5" y="8.2" width="3" height="1.6" rx="0.8" fill="#007bff" transform="rotate(45 25.5 8.2)"/>
              </g>
              <g class="ai-robot-zs">
                <text x="38" y="10" font-size="6" fill="#b0d4ff" opacity="0.8">Z</text>
                <text x="41" y="6" font-size="4" fill="#b0d4ff" opacity="0.7">z</text>
                <text x="43" y="3" font-size="3" fill="#b0d4ff" opacity="0.6">z</text>
              </g>
            </svg>
          </div>
        </li>`;

        if (this.is_desk === true) {
            $('header.navbar > .container > .navbar-collapse > ul').prepend(navbar_icon_html);
        } else {
            // For non-desk environments, add to body
            $('body').append(navbar_icon_html);
        }

        this.$collapse_btn = $('<button class="ai-sidebar-collapse-btn" aria-label="Collapse sidebar" title="Collapse sidebar"><span class="chevron"><svg width="20" height="20" viewBox="0 0 20 20"><path d="M7 5l5 5-5 5" stroke="#007bff" stroke-width="2" fill="none" stroke-linecap="round"/></svg></span></button>');
        this.$sidebar.prepend(this.$collapse_btn);

        this.$resize_handle = $('<div class="ai-chat-resize-handle" tabindex="0" aria-label="Resize chat window"></div>');
        this.$app_element.append(this.$resize_handle);

        this.chat_history = [];
        this.append_message('assistant', "👋 Welcome to Pulsar AI Assistant!\nAsk me anything about your ERP system, reports, invoices, stock..");
        this.setup_events();
        this.load_chat_list();
    }

    initializeAutomation() {
        // Initialize voice recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.voiceRecognition = new SpeechRecognition();
            this.voiceRecognition.continuous = false;
            this.voiceRecognition.interimResults = false;
            this.voiceRecognition.lang = 'en-US';
            
            this.voiceRecognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                $('#ai-user-input').val(transcript);
                this.isListening = false;
                this.updateVoiceButton();
            };
            
            this.voiceRecognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.isListening = false;
                this.updateVoiceButton();
            };
        }

        // Predefined suggestions for quick access
        this.autoSuggestions = [
            "Show me top selling items this month",
            "Analyze customer ABC Corp",
            "Generate sales report for Q1",
            "What's my current stock level?",
            "Show overdue invoices",
            "Create a study on item 000125",
            "List all customers with outstanding balance",
            "Show purchase trends for this year"
        ];
    }

    setup_app() {
        try {
            this.is_desk = 'desk' in frappe;
            this.create_app();
        } catch (error) {
            console.error(error);
        }
    }

    append_message(role, message) {
        const chatBox = $('#ai-chat-history');
        const isHTML = /<\/?[a-z][\s\S]*>/i.test(message);
        const safe_msg = (role === 'assistant') ? message : (isHTML ? message : frappe.utils.escape_html(message));

        const msgDiv = $(`<div class="message ${role}">
            <div class="sender">${role === 'user' ? 'You' : 'Pulsar AI'}:</div>
            <div class="bubble">${safe_msg}</div>
            <div class="message-timestamp">${new Date().toLocaleTimeString()}</div>
        </div>`);

        chatBox.append(msgDiv);
        
        // Smooth scroll animation
        this.smoothScrollToBottom(chatBox[0]);
        
        // Add message animation
        msgDiv.addClass('message-enter');
        setTimeout(() => msgDiv.removeClass('message-enter'), 300);
    }

    smoothScrollToBottom(element) {
        if (!element) return;
        
        const targetScrollTop = element.scrollHeight - element.clientHeight;
        const startScrollTop = element.scrollTop;
        const distance = targetScrollTop - startScrollTop;
        const duration = 300;
        const startTime = performance.now();

        const animateScroll = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            
            element.scrollTop = startScrollTop + (distance * easeOutCubic);
            
            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            }
        };
        
        requestAnimationFrame(animateScroll);
    }

    simulateTyping(text, done) {
        const chatBox = $('#ai-chat-history');
        const typingDiv = $(`<div class="message assistant typing">
            <div class="sender">Pulsar AI:</div>
            <div class="bubble" id="typing-indicator">
                <span class="dot dot1"></span>
                <span class="dot dot2"></span>
                <span class="dot dot3"></span>
            </div>
        </div>`);
        
        chatBox.append(typingDiv);
        this.smoothScrollToBottom(chatBox[0]);
        
        setTimeout(() => {
            typingDiv.fadeOut(200, () => {
                typingDiv.remove();
                this.append_message('assistant', text);
                if (done) done();
            });
        }, 1200);
    }

    updateVoiceButton() {
        const $voiceBtn = $('#ai-voice-btn');
        if (this.isListening) {
            $voiceBtn.addClass('listening').html(`
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" fill="currentColor"/>
                    <circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" opacity="0.5"/>
                    <circle cx="12" cy="12" r="12" stroke="currentColor" stroke-width="1" opacity="0.3"/>
                </svg>
            `);
        } else {
            $voiceBtn.removeClass('listening').html(`
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            `);
        }
    }

    showAutoSuggestions(input) {
        const $suggestions = $('#ai-auto-suggestions');
        const query = input.toLowerCase();
        
        if (query.length < 2) {
            $suggestions.empty().hide();
            return;
        }

        const filtered = this.autoSuggestions.filter(suggestion => 
            suggestion.toLowerCase().includes(query)
        ).slice(0, 3);

        if (filtered.length === 0) {
            $suggestions.empty().hide();
            return;
        }

        const suggestionsHtml = filtered.map(suggestion => 
            `<div class="ai-suggestion-item">${suggestion}</div>`
        ).join('');

        $suggestions.html(suggestionsHtml).show();

        // Add click handlers
        $suggestions.find('.ai-suggestion-item').on('click', function() {
            $('#ai-user-input').val($(this).text());
            $suggestions.hide();
            $('#ai-send-btn').click();
        });
    }

    setup_events() {
        const me = this;

        // Enhanced input handling with auto-suggestions
        const mainInput = this.$ai_chat_element.find('#ai-user-input');
        
        mainInput.on('input', function() {
            const value = $(this).val();
            me.showAutoSuggestions(value);
            
            // Update send button state
            const $sendBtn = $('#ai-send-btn');
            if (value.trim()) {
                $sendBtn.addClass('active');
            } else {
                $sendBtn.removeClass('active');
            }
        });

        mainInput.on('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                $('#ai-send-btn').click();
            } else if (e.key === 'Escape') {
                $('#ai-auto-suggestions').hide();
            }
        });

        // Voice input handling
        $('#ai-voice-btn').on('click', function() {
            if (!me.voiceRecognition) {
                frappe.msgprint('Voice input is not supported in your browser.');
                return;
            }

            if (me.isListening) {
                me.voiceRecognition.stop();
                me.isListening = false;
            } else {
                me.voiceRecognition.start();
                me.isListening = true;
            }
            me.updateVoiceButton();
        });

        // Enhanced send button with loading state
        $('#ai-send-btn').off('click').on('click', function () {
            const user_input = mainInput.val().trim();
            if (!user_input || me.isTyping) return;

            me.isTyping = true;
            $(this).addClass('loading');
            
            me.append_message('user', user_input);
            mainInput.val('');
            me.chat_history.push({ role: 'user', content: user_input });
            
            // Hide suggestions
            $('#ai-auto-suggestions').hide();
            
            // Keep focus on input after sending
            setTimeout(() => {
                mainInput.focus();
            }, 100);

            const typingDiv = $(`<div class="message assistant typing">
                <div class="sender">Pulsar AI:</div>
                <div class="bubble" id="ai-typing-indicator">
                    <span class="dot dot1"></span>
                    <span class="dot dot2"></span>
                    <span class="dot dot3"></span>
                </div>
            </div>`);
            $('#ai-chat-history').append(typingDiv);

            frappe.call({
                method: 'isoft_ai.isoft_ai.doctype.isoft_ai_test.isoft_ai_test.ask_ai',
                args: {
                    user_question: user_input,
                    chat_history_json: JSON.stringify(me.chat_history),
                    ai_chat_name: me.is_new_chat ? '' : (me.selected_chat_name || '')
                },
                callback: function (r) {
                    $('#ai-typing-indicator').closest('.typing').remove();
                    me.isTyping = false;
                    $('#ai-send-btn').removeClass('loading');
                    
                    if (r.message) {
                        if (me.is_new_chat && r.message.chat_name) {
                            me.selected_chat_name = r.message.chat_name;
                            me.is_new_chat = false;
                            
                            const chatTitle = user_input.length > 30 ? user_input.substring(0, 30) + '...' : user_input;
                            me.add_chat_to_sidebar(r.message.chat_name, chatTitle);
                            
                            me.$chat_list.find('.ai-chat-list-item').removeClass('active');
                            me.$chat_list.find(`[data-chat-name="${r.message.chat_name}"]`).addClass('active');
                        }
                        
                        if (typeof r.message.ai_response === 'string' && r.message.ai_response.startsWith('/files/')) {
                            const file_url = window.location.origin + r.message.ai_response;
                            me.append_message('assistant', `📁 <a href="${file_url}" target="_blank" download>Download your file</a>`);
                        } else {
                            me.chat_history.push({ role: 'assistant', content: r.message.ai_response });
                            me.simulateTyping(r.message.ai_response);
                        }
                    }
                }
            });
        });

        // New Chat button with enhanced animation
        this.$new_chat_btn.on('click', function () {
            $(this).addClass('clicked');
            setTimeout(() => $(this).removeClass('clicked'), 200);
            
            me.is_new_chat = true;
            me.selected_chat_name = null;
            me.chat_history = [];
            $('#ai-chat-history').empty();
            me.append_message('assistant', "👋 Welcome to Pulsar AI Assistant!\nAsk me anything about your ERP system, reports, invoices, stock..");
            me.$ai_chat_element.show();
            me.$chat_list.find('.ai-chat-list-item').removeClass('active');
        });

        // Enhanced robot icon interaction - use event delegation for better reliability
        $(document).on('click', '#ai-robot-navbar, .ai-robot-icon', (e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('Robot icon clicked!'); // Debug log
            
            if (!me.is_open) {
                me.$app_element.show().addClass('show');
                me.is_new_chat = true;
                me.selected_chat_name = null;
                me.chat_history = [];
                $('#ai-chat-history').empty();
                me.append_message('assistant', "👋 Welcome to Pulsar AI Assistant!\nAsk me anything about your ERP system, reports, invoices, stock..");
                me.$ai_chat_element.show();
                $('#ai-robot-navbar').removeClass('ai-robot-sleeping').addClass('ai-robot-awake');
                me.$chat_list.find('.ai-chat-list-item').removeClass('active');
            } else {
                me.$app_element.removeClass('show').fadeOut(300);
                $('#ai-robot-navbar').removeClass('ai-robot-awake').addClass('ai-robot-sleeping');
            }
            me.is_open = !me.is_open;
        });
        
        // Enhanced close button
        this.$ai_chat_element.find('.ai-chat-cross-button').on('click', () => {
            me.$app_element.fadeOut(300);
            $('#ai-robot-navbar').removeClass('ai-robot-awake').addClass('ai-robot-sleeping');
            me.is_open = false;
        });

        // Enhanced resize functionality
        let isResizing = false, lastX = 0, lastY = 0, startW = 0, startH = 0;
        this.$resize_handle.on('mousedown touchstart', function(e) {
            e.preventDefault();
            isResizing = true;
            const evt = e.type === 'touchstart' ? e.originalEvent.touches[0] : e;
            lastX = evt.clientX;
            lastY = evt.clientY;
            startW = me.$main_container.width();
            startH = me.$main_container.height();
            $('body').addClass('ai-chat-resizing');
        });
        
        $(window).on('mousemove touchmove', function(e) {
            if (!isResizing) return;
            const evt = e.type === 'touchmove' ? e.originalEvent.touches[0] : e;
            let dx = evt.clientX - lastX;
            let dy = evt.clientY - lastY;
            let newW = Math.max(320, Math.min(startW + dx, $(window).width() - 40));
            let newH = Math.max(320, Math.min(startH + dy, $(window).height() - 40));
            me.$main_container.css({ width: newW + 'px', height: newH + 'px' });
            localStorage.setItem('aiChatModalSize', JSON.stringify({w: newW, h: newH}));
        });
        
        $(window).on('mouseup touchend', function() {
            if (isResizing) {
                isResizing = false;
                $('body').removeClass('ai-chat-resizing');
            }
        });

        // Restore modal size with animation
        const savedSize = localStorage.getItem('aiChatModalSize');
        if (savedSize) {
            const sz = JSON.parse(savedSize);
            this.$main_container.css({ width: sz.w + 'px', height: sz.h + 'px' });
        }

        // Enhanced sidebar collapse with smooth animation
        this.$collapse_btn.on('click', function(e) {
            e.stopPropagation();
            me.$main_container.toggleClass('sidebar-collapsed');
            me.$sidebar.toggleClass('collapsed');
            
            if (me.$sidebar.hasClass('collapsed')) {
                me.$new_chat_btn.addClass('icon-only');
            } else {
                me.$new_chat_btn.removeClass('icon-only');
            }
        });

        // Click outside to close suggestions
        $(document).on('click', function(e) {
            if (!$(e.target).closest('.ai-input-container').length) {
                $('#ai-auto-suggestions').hide();
            }
        });
        
        // Additional fallback for robot icon clicks
        $(document).on('click', '.ai-chat-navbar-icon', function(e) {
            e.stopPropagation();
            e.preventDefault();
            console.log('Navbar icon clicked!'); // Debug log
            if (window.aiChatInstance) {
                window.aiChatInstance.toggleChat();
            }
        });
    }

    // Enhanced chat list loading with animations
    load_chat_list() {
        const me = this;
        frappe.call({
            method: 'isoft_ai.isoft_ai.doctype.isoft_ai_test.isoft_ai_test.get_user_ai_chats',
            args: { owner_id: frappe.session.user },
            callback: function(r) {
                if (r.message && Array.isArray(r.message)) {
                    me.$chat_list.empty();
                    r.message.forEach((chat, index) => {
                        const $item = $(`<div class="ai-chat-list-item" data-chat-name="${chat.name}" style="animation-delay: ${index * 0.1}s">
                            <div class="ai-chat-content">
                                <span class="ai-chat-title">${frappe.utils.escape_html(chat.title)}</span>
                                <span class="ai-chat-subtitle">Click to open chat</span>
                            </div>
                            <span class="ai-chat-delete" title="Delete chat" aria-label="Delete chat">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                              </svg>
                            </span>
                        </div>`);
                        
                        $item.find('.ai-chat-delete').on('click', function(e) {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to send this chat to the AI dreamland? (It will be softly deleted)')) {
                                $item.addClass('deleting');
                                frappe.call({
                                    method: 'isoft_ai.isoft_ai.doctype.isoft_ai_test.isoft_ai_test.soft_delete_ai_chat',
                                    args: { chat_name: chat.name },
                                    callback: function(r) {
                                        if (r.message && r.message.success) {
                                            $item.fadeOut(300, () => $item.remove());
                                        } else {
                                            $item.removeClass('deleting');
                                            frappe.msgprint('Failed to delete chat.');
                                        }
                                    }
                                });
                            }
                        });
                        
                        $item.on('click', function() {
                            me.is_new_chat = false;
                            me.selected_chat_name = chat.name;
                            me.load_chat_messages(chat.name);
                            me.$ai_chat_element.show();
                            me.$chat_list.find('.ai-chat-list-item').removeClass('active');
                            $item.addClass('active');
                        });
                        
                        me.$chat_list.append($item);
                    });
                }
            }
        });
    }

    // Enhanced message loading with animations
    load_chat_messages(chat_name) {
        const me = this;
        $('#ai-chat-history').empty();
        me.chat_history = [];
        
        frappe.call({
            method: 'isoft_ai.isoft_ai.doctype.isoft_ai_test.isoft_ai_test.get_ai_chat_messages',
            args: { chat_name: chat_name },
            callback: function(r) {
                if (r.message && Array.isArray(r.message)) {
                    r.message.forEach((msg, index) => {
                        setTimeout(() => {
                            me.append_message('user', msg.user_question);
                            let ai_response = msg.ai_response;
                            if (typeof ai_response === 'string' && ai_response.trim().startsWith('/files/')) {
                                const file_url = window.location.origin + ai_response.trim();
                                ai_response = `📁 <a href="${file_url}" target="_blank" download>Download your file</a>`;
                            }
                            me.append_message('assistant', ai_response);
                            me.chat_history.push({ role: 'user', content: msg.user_question });
                            me.chat_history.push({ role: 'assistant', content: ai_response });
                        }, index * 100);
                    });
                }
            }
        });
    }

    // Enhanced sidebar addition with animation
    add_chat_to_sidebar(chat_name, chat_title) {
        const me = this;
        
        const $item = $(`<div class="ai-chat-list-item new-chat" data-chat-name="${chat_name}">
            <div class="ai-chat-content">
                <span class="ai-chat-title">${frappe.utils.escape_html(chat_title)}</span>
                <span class="ai-chat-subtitle">New chat</span>
            </div>
            <span class="ai-chat-delete" title="Delete chat" aria-label="Delete chat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
              </svg>
            </span>
        </div>`);
        
        $item.find('.ai-chat-delete').on('click', function(e) {
            e.stopPropagation();
            if (confirm('Are you sure you want to send this chat to the AI dreamland? (It will be softly deleted)')) {
                $item.addClass('deleting');
                frappe.call({
                    method: 'isoft_ai.isoft_ai.doctype.isoft_ai_test.isoft_ai_test.soft_delete_ai_chat',
                    args: { chat_name: chat_name },
                    callback: function(r) {
                        if (r.message && r.message.success) {
                            $item.fadeOut(300, () => $item.remove());
                            if (me.selected_chat_name === chat_name) {
                                me.is_new_chat = true;
                                me.selected_chat_name = null;
                                me.chat_history = [];
                                $('#ai-chat-history').empty();
                                me.append_message('assistant', "👋 Welcome to Pulsar AI Assistant!\nAsk me anything about your ERP system, reports, invoices, stock..");
                                me.$chat_list.find('.ai-chat-list-item').removeClass('active');
                            }
                        } else {
                            $item.removeClass('deleting');
                            frappe.msgprint('Failed to delete chat.');
                        }
                    }
                });
            }
        });
        
        $item.on('click', function() {
            me.is_new_chat = false;
            me.selected_chat_name = chat_name;
            me.load_chat_messages(chat_name);
            me.$ai_chat_element.show();
            me.$chat_list.find('.ai-chat-list-item').removeClass('active');
            $item.addClass('active');
        });
        
        me.$chat_list.prepend($item);
        setTimeout(() => $item.removeClass('new-chat'), 500);
    }
    
    // Toggle chat visibility
    toggleChat() {
        if (!this.is_open) {
            this.$app_element.show().addClass('show');
            this.is_new_chat = true;
            this.selected_chat_name = null;
            this.chat_history = [];
            $('#ai-chat-history').empty();
            this.append_message('assistant', "👋 Welcome to Pulsar AI Assistant!\nAsk me anything about your ERP system, reports, invoices, stock..");
            this.$ai_chat_element.show();
            $('#ai-robot-navbar').removeClass('ai-robot-sleeping').addClass('ai-robot-awake');
            this.$chat_list.find('.ai-chat-list-item').removeClass('active');
        } else {
            this.$app_element.removeClass('show').fadeOut(300);
            $('#ai-robot-navbar').removeClass('ai-robot-awake').addClass('ai-robot-sleeping');
        }
        this.is_open = !this.is_open;
    }
}

// Global functions for external access
function openChat() {
    if (window.aiChatInstance) {
        $('#ai-robot-navbar').click();
    }
}

function closeChat() {
    if (window.aiChatInstance) {
        window.aiChatInstance.$app_element.hide();
        window.aiChatInstance.is_open = false;
        $('#ai-robot-navbar').removeClass('ai-robot-awake').addClass('ai-robot-sleeping');
    }
}

// Initialize when document is ready
$(document).ready(function() {
    // Wait a bit to ensure Frappe is fully loaded
    setTimeout(function() {
        if (!window.aiChatInstance && frappe.session.user !== "Guest") {
            console.log('Initializing AI Chat...');
            window.aiChatInstance = new frappe.AI_Chat();
        } else if (frappe.session.user === "Guest") {
            // Remove AI chat elements for guest users
            $('.ai-chat-navbar-icon, .ai-robot-icon').remove();
        }
    }, 1000);
});

// Also initialize when Frappe is ready
if (typeof frappe !== 'undefined') {
    frappe.ready(function() {
        if (!window.aiChatInstance && frappe.session.user !== "Guest") {
            console.log('Initializing AI Chat from Frappe ready...');
            window.aiChatInstance = new frappe.AI_Chat();
        }
    });
}
