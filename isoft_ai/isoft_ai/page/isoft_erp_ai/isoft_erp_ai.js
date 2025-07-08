frappe.pages['isoft-erp-ai'].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'ISOFT ERP AI Assistant',
		single_column: true
	});

	// Inject styled container with modern UI
	$(wrapper).html(`
		<style>
			.ai-chat-container {
				max-width: 960px;
				margin: 40px auto;
				background: #f0f8ff;
				border-radius: 16px;
				box-shadow: 0 10px 30px rgba(0, 123, 255, 0.15);
				display: flex;
				flex-direction: column;
				height: 85vh;
				padding: 30px;
				font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
			}
			#ai-chat-history {
				flex-grow: 1;
				padding: 30px 20px;
				overflow-y: auto;
				background: #ffffff;
				border-radius: 12px;
				box-shadow: inset 0 0 12px #d0e6ff;
				font-size: 1.15rem;
				line-height: 1.6;
				color: #0d3b66;
				margin-bottom: 25px;
				scroll-behavior: smooth;
			}
			#ai-chat-history .message {
				margin-bottom: 2rem;
				opacity: 0;
				transform: translateY(20px);
				animation: slideFadeIn 0.4s forwards;
			}
			@keyframes slideFadeIn {
				to {
					opacity: 1;
					transform: translateY(0);
				}
			}
			.message .sender {
				font-weight: 700;
				margin-bottom: 0.5rem;
				font-size: 1.2rem;
			}
			.message.user .sender {
				color: #007bff;
			}
			.message.assistant .sender {
				color: #00aaff;
			}
			.message .bubble {
				border-radius: 18px;
				padding: 16px 24px;
				font-size: 1.05rem;
				box-shadow: 0 3px 8px rgba(0, 123, 255, 0.1);
				white-space: pre-wrap;
			}
			.message.user .bubble {
				background: #d0e7ff;
				color: #003d99;
				align-self: flex-end;
				max-width: 80%;
			}
			.message.assistant .bubble {
				background: #e0f4ff;
				color: #004d99;
				max-width: 85%;
			}
			.input-group {
				display: flex;
				gap: 15px;
				align-items: center;
			}
			#ai-user-input {
				flex-grow: 1;
				font-size: 1.2rem;
				padding: 18px 24px;
				border: 2px solid #87cefa;
				border-radius: 30px;
				box-shadow: 0 0 10px #87cefa55;
				transition: all 0.3s ease;
			}
			#ai-user-input:focus {
				border-color: #007bff;
				box-shadow: 0 0 14px #007bffaa;
				outline: none;
			}
			#ai-send-btn {
				background: #007bff;
				color: white;
				font-size: 1.2rem;
				padding: 12px 28px;
				border-radius: 30px;
				border: none;
				box-shadow: 0 5px 18px rgba(0, 123, 255, 0.4);
				cursor: pointer;
				transition: all 0.2s ease;
			}
			#ai-send-btn:hover {
				background: #0056b3;
				transform: scale(1.05);
			}
			#ai-send-btn:active {
				transform: scale(0.95);
			}
			.blink {
				animation: blink 1s infinite;
			}
			@keyframes blink {
				0% { opacity: 1; }
				50% { opacity: 0; }
				100% { opacity: 1; }
			}
			@media (max-width: 768px) {
				.ai-chat-container {
					margin: 20px;
					padding: 20px;
					height: auto;
				}
				#ai-user-input {
					font-size: 1rem;
					padding: 14px 18px;
				}
				#ai-send-btn {
					font-size: 1rem;
					padding: 10px 20px;
				}
			}
		</style>

		<div class="ai-chat-container" role="main" aria-label="AI chat container">
			<div id="ai-chat-history" aria-live="polite" aria-relevant="additions"></div>
			<div class="input-group">
				<input type="text" id="ai-user-input" class="form-control" placeholder="Ask a question..." aria-label="AI question input" autocomplete="off" />
				<button id="ai-send-btn" aria-label="Send question to AI">Send</button>
			</div>
		</div>
	`);

	let chat_history = [];

	function append_message(role, message) {
		const chatBox = $('#ai-chat-history');
		const isHTML = /<\/?[a-z][\s\S]*>/i.test(message);
		const safe_msg = isHTML ? message : frappe.utils.escape_html(message);

		const msgDiv = $(`
			<div class="message ${role}">
				<div class="sender">${role === 'user' ? '🧑‍💻 You' : '🤖 AI'}:</div>
				<div class="bubble">${safe_msg}</div>
			</div>
		`);

		chatBox.append(msgDiv);
		const chatBoxEl = chatBox[0];
		if (chatBoxEl) {
			chatBoxEl.scrollTop = chatBoxEl.scrollHeight;
		}
	}

	function simulateTyping(text, done) {
		const chatBox = $('#ai-chat-history');
		const typingDiv = $(`
			<div class="message assistant typing">
				<div class="sender">🤖 AI:</div>
				<div class="bubble" id="typing-bubble"><span class="blink">|</span></div>
			</div>
		`);
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
				typingDiv.remove(); // remove typing effect
				append_message('assistant', text); // append final response
				if (done) done();
			} else {
				displayed += frappe.utils.escape_html(text[index]);
				bubble.html(displayed + '<span class="blink">|</span>');
				if (chatBoxEl) chatBoxEl.scrollTop = chatBoxEl.scrollHeight;
				index++;
			}
		}, 20);
	}

	// Initial welcome message
	const welcome_msg = "👋 Welcome to ISOFT ERP AI Assistant!\nAsk me anything about your ERP system, reports, invoices, or users.";

	append_message('assistant', welcome_msg);
	chat_history.push({ role: 'assistant', content: welcome_msg });

	$('#ai-user-input').focus();

	$('#ai-send-btn').on('click', function () {
		const user_input = $('#ai-user-input').val().trim();
		if (!user_input) return;

		append_message('user', user_input);
		$('#ai-user-input').val('');
		chat_history.push({ role: 'user', content: user_input });

		frappe.call({
			method: 'isoft_ai.isoft_ai.doctype.isoft_ai_test.isoft_ai_test.ask_ai',
			args: {
				user_question: user_input,
				chat_history_json: JSON.stringify(chat_history)
			},
			freeze: true,
			freeze_message: 'AI is thinking...',
			callback: function (r) {
				if (r.message) {
					chat_history.push({ role: 'assistant', content: r.message });
					simulateTyping(r.message);
				}
			}
		});
	});

	$('#ai-user-input').on('keypress', function (e) {
		if (e.which === 13) {
			$('#ai-send-btn').click();
		}
	});
};
