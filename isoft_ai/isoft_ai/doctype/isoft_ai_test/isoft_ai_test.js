// Copyright (c) 2025, Abbass Chokor
// For license information, please see license.txt

frappe.ui.form.on('ISOFT AI TEST', {
    refresh: function(frm) {
        frm.disable_save();

        // Ensure we only inject once
        if (!frm.custom_ai_response_rendered) {
            frm.custom_ai_response_rendered = true;

            // Create container for the logo and AI response
            const $customContainer = $(`
                <div id="isoft-ai-custom-container" style="
                    margin-top: 30px;
                    padding: 20px;
                    background: linear-gradient(135deg, #87CEFA, #00BFFF);
                    border-radius: 12px;
                    box-shadow: 0 8px 16px rgba(0,123,255,0.3);
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    color: #003366;
                    min-height: 280px;
                    max-width: 900px;
                    ">
                    <div id="ai-logo" style="text-align:center; margin-bottom: 15px;">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/6/6a/Artificial_Intelligence_logo.svg" alt="AI Logo" style="max-height: 60px;"/>
                    </div>
                    <div id="ai-response-container" style="
                        background: rgba(255, 255, 255, 0.9);
                        border-radius: 10px;
                        padding: 20px;
                        height: 200px;
                        overflow-y: auto;
                        font-size: 1.15rem;
                        line-height: 1.6;
                        ">
                        <!-- AI Response will appear here -->
                    </div>
                </div>
            `);

            // Place the custom container below the user_chat field
            frm.fields_dict.user_chat.$wrapper.after($customContainer);
        }

        // Style the Ask AI button to be bigger and modern
        frm.page.clear_actions();

        frm.add_custom_button(__('Ask AI'), async function () {
            const question = frm.doc.user_chat;

            if (!question || !question.trim()) {
                frappe.msgprint(__('Please enter a question in the "User Chat" field.'));
                return;
            }

            frappe.call({
                method: "isoft_ai.isoft_ai.doctype.isoft_ai_test.isoft_ai_test.ask_ai",
                args: {
                    user_question: question
                },
                freeze: true,
                freeze_message: "Asking the AI, please wait...",
                callback: function (r) {
                    const container = document.getElementById("ai-response-container");
                    if (r.message && container) {
                        container.innerHTML = r.message;
                    } else {
                        frappe.msgprint(__('No response from AI.'));
                    }
                }
            });
        }).addClass("btn btn-primary btn-lg").css({
            'font-weight': '600',
            'padding': '12px 30px',
            'border-radius': '8px',
            'box-shadow': '0 4px 12px rgba(0,123,255,0.4)',
            'transition': 'background-color 0.3s ease'
        }).hover(function() {
            $(this).css('background-color', '#007ACC');
        }, function() {
            $(this).css('background-color', '');
        });
    }
});
