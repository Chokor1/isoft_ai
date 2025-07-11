frappe.AI_Chat = class {
    constructor() {
        this.selected_chat_name = null;
        this.is_new_chat = false;
        this.setup_app();
    }

    create_app() {
        this.$app_element = $(document.createElement('div')).addClass('ai-chat-app').hide(); // Hide by default
        $('body').append(this.$app_element);
        this.is_open = false;

        // Main chat container with sidebar and chat window
        this.$main_container = $('<div class="ai-chat-main-container"></div>');
        this.$app_element.append(this.$main_container);

        // Sidebar (like ChatGPT)
        this.$sidebar = $('<div class="ai-chat-sidebar"></div>');
        this.$main_container.append(this.$sidebar);

        // New Chat button
        this.$new_chat_btn = $('<button class="ai-new-chat-btn">+ New Chat</button>');
        this.$sidebar.append(this.$new_chat_btn);

        // Chat list
        this.$chat_list = $('<div class="ai-chat-list"></div>');
        this.$sidebar.append(this.$chat_list);

        // Chat window
        this.$ai_chat_element = $(document.createElement('div'))
            .addClass('ai-chat-element')
            .hide();
        this.$main_container.append(this.$ai_chat_element);

        this.$ai_chat_element.append(`
<div class="ai-chat-header">
    <span class="ai-chat-cross-button">
        ${frappe.utils.icon('close', 'lg')}
    </span>
</div>

<div class="ai-chat-body" id="ai-chat-history" aria-live="polite" aria-relevant="additions"></div>

<div class="ai-chat-footer">
    <div class="input-group">
        <input type="text" id="ai-user-input" class="form-control text-dark" placeholder="Ask a question..." autocomplete="off" />
        <button id="ai-send-btn">  <svg xmlns="http://www.w3.org/2000/svg" height="12" viewBox="0 0 24 24">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg></button>
    </div>
</div>
        `);

        // Remove file upload UI from chat footer
        // this.$ai_chat_element.find('.ai-chat-footer .input-group').prepend(...)

        // Modern animated robot icon for navbar
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
        }

        this.chat_history = [];
        this.append_message('assistant', "👋 Welcome to Pulsar AI Assistant!\nAsk me anything about your ERP system, reports, invoices, stock..");
        this.setup_events();
        this.load_chat_list();
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
        // Only escape user messages, allow assistant messages to be raw HTML
        const isHTML = /<\/?[a-z][\s\S]*>/i.test(message);
        const safe_msg = (role === 'assistant') ? message : (isHTML ? message : frappe.utils.escape_html(message));

        const msgDiv = $(`<div class="message ${role}">
            <div class="sender">${role === 'user' ? 'You' : 'Pulsar AI'}:</div>
            <div class="bubble">${safe_msg}</div>
        </div>`);

        chatBox.append(msgDiv);
        const chatBoxEl = chatBox[0];
        if (chatBoxEl) chatBoxEl.scrollTop = chatBoxEl.scrollHeight;
    }

    simulateTyping(text, done) {
        // Show typing indicator for 1.2 seconds, then display full HTML response
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
        const chatBoxEl = chatBox[0];
        if (chatBoxEl) chatBoxEl.scrollTop = chatBoxEl.scrollHeight;
        setTimeout(() => {
            typingDiv.remove();
            this.append_message('assistant', text);
            if (done) done();
        }, 1200);
    }

    setup_events() {
        const me = this;

        // New Chat button logic
        this.$new_chat_btn.on('click', function () {
            me.is_new_chat = true;
            me.selected_chat_name = null;
            me.chat_history = [];
            $('#ai-chat-history').empty();
            me.append_message('assistant', "👋 Welcome to Pulsar AI Assistant!\nAsk me anything about your ERP system, reports, invoices, stock..");
            me.$ai_chat_element.show();
            // Remove active from all chat list items
            me.$chat_list.find('.ai-chat-list-item').removeClass('active');
        });

        const mainInput = this.$ai_chat_element.find('#ai-user-input');
        // Remove reference to the order input (no longer needed)

        // Remove all file upload and order related event handlers and logic in setup_events
        // Remove all references to upload_file_with_order API, file preview, file input, and order

        // Use only one send button for both text and file
        $('#ai-send-btn').off('click').on('click', function () {
            const user_input = mainInput.val().trim();
            if (!user_input) return;
            me.append_message('user', user_input);
            mainInput.val('');
            me.chat_history.push({ role: 'user', content: user_input });
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
                    if (r.message) {
                        // --- NEW LOGIC: store chat_name after first message ---
                        if (me.is_new_chat && r.message.chat_name) {
                            me.selected_chat_name = r.message.chat_name;
                            me.is_new_chat = false;
                        }
                        // --- END NEW LOGIC ---
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

        $('#ai-user-input').on('keypress', function (e) {
            if (e.which === 13) {
                $('#ai-send-btn').click();
            }
        });

        // Attach open/close logic directly to the robot icon
        $(document).on('click', '#ai-robot-navbar', (e) => {
            e.stopPropagation();
            if (!this.is_open) {
                this.$app_element.show();
                // Open new chat by default
                this.is_new_chat = true;
                this.selected_chat_name = null;
                this.chat_history = [];
                $('#ai-chat-history').empty();
                this.append_message('assistant', "👋 Welcome to Pulsar AI Assistant!\nAsk me anything about your ERP system, reports, invoices, stock..");
                this.$ai_chat_element.show();
                $('#ai-robot-navbar').removeClass('ai-robot-sleeping').addClass('ai-robot-awake');
                // Remove active from all chat list items
                this.$chat_list.find('.ai-chat-list-item').removeClass('active');
            } else {
                this.$app_element.hide();
                $('#ai-robot-navbar').removeClass('ai-robot-awake').addClass('ai-robot-sleeping');
            }
            this.is_open = !this.is_open;
        });
        // Also close on cross button
        this.$ai_chat_element.find('.ai-chat-cross-button').on('click', () => {
            this.$app_element.hide();
            $('#ai-robot-navbar').removeClass('ai-robot-awake').addClass('ai-robot-sleeping');
            this.is_open = false;
        });
    }

    // Load chat list for the user and render clickable items
    load_chat_list() {
        const me = this;
        frappe.call({
            method: 'isoft_ai.isoft_ai.doctype.isoft_ai_test.isoft_ai_test.get_user_ai_chats',
            args: { owner_id: frappe.session.user },
            callback: function(r) {
                if (r.message && Array.isArray(r.message)) {
                    me.$chat_list.empty();
                    r.message.forEach(chat => {
                        const $item = $(`<div class="ai-chat-list-item" data-chat-name="${chat.name}">
                            <span class="ai-chat-title">${frappe.utils.escape_html(chat.title)}</span>
                            <span class="ai-chat-delete" title="Delete chat" aria-label="Delete chat">
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="10" cy="10" r="9" stroke="#f5c6cb" stroke-width="1.5"/>
                                <line x1="6" y1="6" x2="14" y2="14" stroke="#e74c3c" stroke-width="2" stroke-linecap="round"/>
                                <line x1="14" y1="6" x2="6" y2="14" stroke="#e74c3c" stroke-width="2" stroke-linecap="round"/>
                              </svg>
                            </span>
                        </div>`);
                        $item.find('.ai-chat-delete').on('click', function(e) {
                            e.stopPropagation();
                            if (confirm('Are you sure you want to send this chat to the AI dreamland? (It will be softly deleted)')) {
                                frappe.call({
                                    method: 'isoft_ai.isoft_ai.doctype.isoft_ai_test.isoft_ai_test.soft_delete_ai_chat',
                                    args: { chat_name: chat.name },
                                    callback: function(r) {
                                        if (r.message && r.message.success) {
                                            $item.remove();
                                        } else {
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

    // Fetch and render messages for a specific chat
    load_chat_messages(chat_name) {
        const me = this;
        $('#ai-chat-history').empty();
        me.chat_history = [];
        frappe.call({
            method: 'isoft_ai.isoft_ai.doctype.isoft_ai_test.isoft_ai_test.get_ai_chat_messages',
            args: { chat_name: chat_name },
            callback: function(r) {
                if (r.message && Array.isArray(r.message)) {
                    r.message.forEach(msg => {
                        me.append_message('user', msg.user_question);
                        let ai_response = msg.ai_response;
                        if (typeof ai_response === 'string' && ai_response.trim().startsWith('/files/')) {
                            const file_url = window.location.origin + ai_response.trim();
                            ai_response = `📁 <a href="${file_url}" target="_blank" download>Download your file</a>`;
                        }
                        me.append_message('assistant', ai_response);
                        me.chat_history.push({ role: 'user', content: msg.user_question });
                        me.chat_history.push({ role: 'assistant', content: ai_response });
                    });
                }
            }
        });
    }
};

$(function () {
    const chatApp = new frappe.AI_Chat();
    // Click outside to close logic
    $(document).on('mousedown touchstart', function(e) {
        const $target = $(e.target);
        const isInChat = $target.closest('.ai-chat-app').length > 0;
        const isNavbarIcon = $target.closest('.ai-chat-navbar-icon').length > 0;
        if (!isInChat && !isNavbarIcon && chatApp.is_open) {
            chatApp.$app_element.hide();
            chatApp.is_open = false;
            $('#ai-robot-navbar').removeClass('ai-robot-awake').addClass('ai-robot-sleeping');
            // Do NOT reset chat state or remove active highlight here
        }
    });
});
