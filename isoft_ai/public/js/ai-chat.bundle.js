frappe.AI_Chat = class {
    constructor() {
        this.setup_app();
    }

    create_app() {
        this.$app_element = $(document.createElement('div')).addClass('ai-chat-app');
        $('body').append(this.$app_element);
        this.is_open = false;

        this.$ai_chat_element = $(document.createElement('div'))
            .addClass('ai-chat-element')
            .hide();

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

        this.$ai_chat_element.appendTo(this.$app_element);

        const navbar_icon_html = `
        <li class='nav-item dropdown dropdown-notifications dropdown-mobile ai-chat-navbar-icon' title="Show AI Chats">
<svg id="_x2018_ëîé_x5F_1" xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 2000 2000" width="35" height="35">
  <!-- Generator: Adobe Illustrator 29.6.1, SVG Export Plug-In . SVG Version: 2.1.1 Build 9)  -->
  <defs>
    <style>
      .st0 {
        fill: #fff;
      }

      .st1 {
        fill: url(#_åçûìßííûé_ãðàäèåíò_22);
      }
    </style>
    <linearGradient id="_åçûìßííûé_ãðàäèåíò_22" data-name="åçûìßííûé ãðàäèåíò 22" x1="1000" y1="367.35" x2="1000" y2="1718.17" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#00b0ff"/>
      <stop offset="1" stop-color="#007fff"/>
    </linearGradient>
  </defs>
  <path class="st1" d="M1608.64,994.08c0-336.15-272.5-608.64-608.64-608.64S391.36,657.94,391.36,994.08s272.5,608.65,608.64,608.65c2.46,0,4.91-.02,7.36-.05-18.07,36.39-46.92,70.21-98.74,91.88,133.99-8.6,342.71-103.03,442.65-203.34,0,0-.01-.01-.02-.02,155.73-110.24,257.39-291.8,257.39-497.12Z"/>
  <g>
    <path class="st0" d="M1388.86,951.94h-.42c9.52,26.94,14.48,55.6,14.48,85.02s-4.97,58.08-14.48,85.02h.42c30.4,0,55.05-24.65,55.05-55.05v-59.95c0-30.4-24.64-55.05-55.05-55.05Z"/>
    <path class="st0" d="M611.14,951.94c-30.4,0-55.05,24.65-55.05,55.05v59.95c0,30.4,24.64,55.05,55.05,55.05h.42c-9.52-26.94-14.48-55.6-14.48-85.02s4.97-58.08,14.48-85.02h-.42Z"/>
    <path class="st0" d="M1148.29,800.57h-25.04v-1.29c0-16.55-13.42-29.96-29.96-29.96h-56.24c0-17.05-11.52-31.4-27.19-35.71v-76.44c15.68-4.32,27.19-18.67,27.19-35.71,0-20.46-16.59-37.05-37.05-37.05s-37.05,16.59-37.05,37.05c0,17.05,11.52,31.4,27.19,35.71v76.44c-15.68,4.32-27.19,18.67-27.19,35.71h-56.24c-16.55,0-29.96,13.42-29.96,29.96v1.29h-25.04c-130.56,0-236.39,105.84-236.39,236.39h0c0,130.56,105.84,236.39,236.39,236.39h296.58c130.56,0,236.39-105.84,236.39-236.39h0c0-130.56-105.84-236.39-236.39-236.39ZM1148.29,1153.8h-296.58c-64.42,0-116.84-52.41-116.84-116.84s52.41-116.84,116.84-116.84h296.58c64.42,0,116.84,52.41,116.84,116.84s-52.41,116.84-116.84,116.84Z"/>
    <path class="st0" d="M884.31,1004.17c-22.82,0-41.33,18.5-41.33,41.33s18.5,24.25,41.33,24.25,41.33-1.42,41.33-24.25-18.5-41.33-41.33-41.33Z"/>
    <path class="st0" d="M1115.69,1004.17c-22.82,0-41.33,18.5-41.33,41.33s18.5,24.25,41.33,24.25,41.33-1.42,41.33-24.25-18.5-41.33-41.33-41.33Z"/>
  </g>
</svg>
        </li>`;

        if (this.is_desk === true) {
            $('header.navbar > .container > .navbar-collapse > ul').prepend(navbar_icon_html);
        }

        this.chat_history = [];
        this.append_message('assistant', "👋 Welcome to Pulsar AI Assistant!\nAsk me anything about your ERP system, reports, invoices, stock..");
        this.setup_events();
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
        const safe_msg = isHTML ? message : frappe.utils.escape_html(message);

        const msgDiv = $(`<div class="message ${role}">
            <div class="sender">${role === 'user' ? 'You' : 'Pulsar AI'}:</div>
            <div class="bubble">${safe_msg}</div>
        </div>`);

        chatBox.append(msgDiv);
        const chatBoxEl = chatBox[0];
        if (chatBoxEl) chatBoxEl.scrollTop = chatBoxEl.scrollHeight;
    }

    simulateTyping(text, done) {
        const chatBox = $('#ai-chat-history');
        const typingDiv = $(`<div class="message assistant typing">
            <div class="sender">Pulsar AI:</div>
            <div class="bubble" id="typing-bubble"><span class="blink">|</span></div>
        </div>`);
        chatBox.append(typingDiv);

        const chatBoxEl = chatBox[0];
        if (chatBoxEl) chatBoxEl.scrollTop = chatBoxEl.scrollHeight;

        let index = 0;
        let displayed = "";

        const interval = setInterval(() => {
            const bubble = $('#typing-bubble');
            if (!bubble.length) {
                clearInterval(interval);
                return;
            }

            if (index >= text.length) {
                clearInterval(interval);
                typingDiv.remove();
                this.append_message('assistant', text);
                if (done) done();
            } else {
                displayed += frappe.utils.escape_html(text[index]);
                bubble.html(displayed + '<span class="blink">|</span>');
                if (chatBoxEl) chatBoxEl.scrollTop = chatBoxEl.scrollHeight;
                index++;
            }
        }, 20);
    }

    setup_events() {
        const me = this;

        $('#ai-send-btn').on('click', function () {
            const user_input = $('#ai-user-input').val().trim();
            if (!user_input) return;

            me.append_message('user', user_input);
            $('#ai-user-input').val('');
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
                    chat_history_json: JSON.stringify(me.chat_history)
                },
                callback: function (r) {
                    $('#ai-typing-indicator').closest('.typing').remove();

                    if (r.message) {
                        if (typeof r.message === 'string' && r.message.startsWith('/files/')) {
                            const file_url = window.location.origin + r.message;
                            me.append_message('assistant', `📁 <a href="${file_url}" target="_blank" download>Download your file</a>`);
                        } else {
                            me.chat_history.push({ role: 'assistant', content: r.message });
                            me.simulateTyping(r.message);
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

        $('.ai-chat-navbar-icon').on('click', function () {
            me.$ai_chat_element.toggle();
            me.is_open = !me.is_open;
        });

        this.$ai_chat_element.find('.ai-chat-cross-button').on('click', function () {
            me.$ai_chat_element.hide();
            me.is_open = false;
        });
    }
};

$(function () {
    new frappe.AI_Chat();
});
