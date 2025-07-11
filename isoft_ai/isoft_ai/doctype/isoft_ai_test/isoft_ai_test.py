import frappe
import openai
import re
import json
import csv
import io
import os
from typing import List, Dict
import pdfkit
try:
    import pdfkit
except ImportError:
    pdfkit = None
from frappe.model.document import Document
from frappe.utils import escape_html
from frappe import whitelist
from frappe.utils.file_manager import save_file


class ISOFTAITEST(Document):
    pass


@whitelist()
def ask_ai(user_question: str, chat_history_json: str = "[]", ai_chat_name: str = "") -> dict:
    if not user_question or not user_question.strip():
        return {"ai_response": "<div class='alert alert-warning'>No question provided.</div>", "chat_name": None}

    if "AI User" not in frappe.get_roles(frappe.session.user):
        return {"ai_response": "<div class='alert alert-danger'>You can't use AI. Access denied.</div>", "chat_name": None}

    api_key = frappe.conf.get("openai_api_key")
    if not api_key:
        frappe.throw("OpenAI API key not configured in site_config.json")

    openai.api_key = api_key
    user_question = user_question.strip()

    try:
        try:
            chat_history = json.loads(chat_history_json)
        except Exception:
            chat_history = []

        # Find the first user message for title generation
        first_user_message = None
        for msg in chat_history:
            if msg.get("role") == "user" and msg.get("content") and msg["content"].strip():
                first_user_message = msg["content"].strip()
                break
        if not first_user_message:
            first_user_message = user_question

        ai_chat = get_or_create_ai_chat(ai_chat_name or "", first_user_message or "")

        token_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}

        user_question = preprocess_question(user_question, chat_history)
        # --- OPTIMIZED SYSTEM PROMPT FOR INTENT DETECTION (shorter, same meaning) ---
        intent_check_prompt = [
            {
                "role": "system",
                "content": (
                    "Classify as 'ERP' (data/report), 'KNOWLEDGE' (general info), 'STUDY' (item analysis) or 'CLARIFY' (ambiguous). "
                    "Examples: 'Top 5 customers'->ERP, 'What is invoice?'->KNOWLEDGE, 'Tell me more?'->CLARIFY, 'Give me a study on item X'->STUDY."
                )
            },
            {"role": "user", "content": user_question}
        ]

        intent_response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=intent_check_prompt,
            max_tokens=10,
            temperature=0,
        )

        token_usage["prompt_tokens"] += intent_response['usage']['prompt_tokens']
        token_usage["completion_tokens"] += intent_response['usage']['completion_tokens']
        token_usage["total_tokens"] += intent_response['usage']['total_tokens']

        intent = clean_intent(intent_response.choices[0].message["content"])

        if intent not in ("ERP", "KNOWLEDGE", "CLARIFY", "STUDY"):
            intent = "KNOWLEDGE"
        frappe.logger().info(f"Detected intent: {intent} for question: {user_question}")
        
        if intent == "CLARIFY":
            clarifying_prompt = [
                {
                    "role": "system",
                    "content": (
                        "You are an assistant for ISOFT ERP. The user's question is ambiguous or incomplete. "
                        "Ask a polite, clarifying question to understand exactly what they want."
                    )
                },
                {"role": "user", "content": user_question}
            ]
            clarifying_response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=clarifying_prompt,
                max_tokens=100,
                temperature=0,
            )

            token_usage["prompt_tokens"] += clarifying_response['usage']['prompt_tokens']
            token_usage["completion_tokens"] += clarifying_response['usage']['completion_tokens']
            token_usage["total_tokens"] += clarifying_response['usage']['total_tokens']

            add_ai_message(ai_chat, user_question, clarifying_response.choices[0].message["content"].strip(), token_usage)

            return {"ai_response": clarifying_response.choices[0].message["content"].strip(), "chat_name": ai_chat.name}

        elif intent == "ERP":
            sql_query = generate_sql_from_question(user_question, token_usage)
            if not sql_query:
                result = ask_knowledge_question_html(chat_history, user_question, token_usage)
                add_ai_message(ai_chat, user_question, result, token_usage)
                return {"ai_response": result, "chat_name": ai_chat.name}

            frappe.logger().info(f"Generated SQL: {sql_query}")

            db_result = frappe.db.sql(sql_query, as_dict=True)
            if not db_result:
                result = (
                    "<div class='alert alert-warning'>"
                    "No data found for your query. If you believe this is an error, contact "
                    "<a href='mailto:support@isoft.ao'>support@isoft.ao</a>."
                    "</div>"
                )
                add_ai_message(ai_chat, user_question, result, token_usage)
                return {"ai_response": result, "chat_name": ai_chat.name}

            too_many_rows = len(db_result) > 10
            too_many_cols = len(db_result[0].keys()) > 5

            if too_many_rows or too_many_cols:
                result = generate_csv_file(db_result) 
                add_ai_message(ai_chat, user_question, result, token_usage)
                return {"ai_response": result, "chat_name": ai_chat.name}

            result = polish_erp_answer_html(user_question, format_result(db_result), token_usage)
      
            add_ai_message(ai_chat, user_question, result, token_usage)
            return {"ai_response": result, "chat_name": ai_chat.name}

        elif intent == "STUDY":
            # Step 1: Extract keywords (item codes/names) from the user question using OpenAI
            extract_prompt = [
                {"role": "system", "content": "Extract a list of item codes or item names (as keywords) from the user's request. Return only a JSON array of keywords, no explanation."},
                {"role": "user", "content": user_question}
            ]
            extract_response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=extract_prompt,
                max_tokens=64,
                temperature=0,
            )
            try:
                keywords = json.loads(extract_response.choices[0].message["content"].strip())
            except Exception:
                keywords = []
            if not isinstance(keywords, list) or not keywords:
                result = "<div class='alert alert-warning'>Could not detect any item keywords for study. Please specify item codes or names.</div>"
                add_ai_message(ai_chat, user_question, result, token_usage)
                return {"ai_response": result, "chat_name": ai_chat.name}
            # Step 2: Get item summary data
            summary_data = get_item_summary_for_study(keywords)
            # Step 3: Use OpenAI to generate a human summary and suggestions
            study_prompt = [
                {"role": "system", "content": "You are an expert ERP analyst. Given the following item summary data (JSON), write a clear, human-friendly summary and provide actionable suggestions based on analytics. Use business language, highlight trends, and suggest next steps. Format your response as rich HTML: use <div>, <span>, <b>, <ul>, <li>, and inline styles (color, background, font-weight, etc.) to highlight important numbers, warnings, or suggestions. Use <table> for tabular data when appropriate. Do NOT use large font sizes. Do NOT use HTML character entities for normal text. The output will be rendered as HTML, so do not escape or encode it."},
                {"role": "user", "content": f"User request: {user_question}\n\nItem summary data (JSON):\n{json.dumps(summary_data)}"}
            ]
            study_response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=study_prompt,
                max_tokens=700,
                temperature=0.3,
            )
            result = study_response.choices[0].message["content"].strip()
            # If result is very large, convert to PDF and return a download link
            if len(result) > 10000 and pdfkit is not None:
                pdf_file_path = f"/tmp/ai_study_{frappe.generate_hash()}.pdf"
                pdfkit.from_string(result, pdf_file_path)
                file_doc = frappe.get_doc({
                    "doctype": "File",
                    "file_name": os.path.basename(pdf_file_path),
                    "is_private": 0
                })
                with open(pdf_file_path, "rb") as f:
                    file_doc.save_file(os.path.basename(pdf_file_path), f, is_private=0)
                file_url = file_doc.file_url
                os.remove(pdf_file_path)
                result = f"<div class='alert alert-info'>The study is very large. <a href='{file_url}' target='_blank' download>Download the PDF here</a>.</div>"
            add_ai_message(ai_chat, user_question, result, token_usage)
            return {"ai_response": result, "chat_name": ai_chat.name}

        else:
            result = ask_knowledge_question_html(chat_history, user_question, token_usage)
            add_ai_message(ai_chat, user_question, result, token_usage)
            return {"ai_response": result, "chat_name": ai_chat.name}

    except Exception:
        frappe.log_error(frappe.get_traceback(), "OpenAI API Error")
        return {"ai_response": "<div class='alert alert-danger'>"
                "An unexpected error occurred. Please contact ISOFT Support at "
                "<a href='mailto:support@isoft.ao'>support@isoft.ao</a>."
                "</div>", "chat_name": None}


def preprocess_question(current_question: str, chat_history: list) -> str:
    current_question = current_question.strip()

    if len(current_question.split()) < 6 or re.match(r"^(by|include|only|group by|filter|sort by)", current_question, re.I):
        for msg in reversed(chat_history):
            if msg.get("role") == "user" and len(msg["content"].split()) >= 6:
                return f"{msg['content'].strip()} {current_question}"
    return current_question



def generate_sql_from_question(question: str, token_usage=None) -> str:
    if token_usage is None:
        token_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    messages = [
    {
        "role": "system",
        "content": (
            "You are an expert assistant that converts complex natural language questions into secure, valid, and syntactically correct "
            "SQL SELECT queries for ISOFT ERP, a system built on ERPNext.\n\n"

            " NEVER return explanations. Only return a valid SQL SELECT query.\n"
            " Only generate SELECT queries — NO INSERT, UPDATE, DELETE, or DDL.\n\n"

            " ERP STRUCTURE AND CONVENTIONS:\n"
            "- Tables follow the ERPNext format: all table names are prefixed with `tab`.\n"
            "- For transactional documents like Sales Invoice, Purchase Invoice, Delivery Note: filter with `docstatus = 1` (submitted).\n"
            "- For Stock Ledger Entry, GL Entry, and other tables with `is_cancelled` field, filter with `is_cancelled = 0`.\n"
            "- Some tables like `tabBin` do not have `docstatus` or `is_cancelled`.\n"
            "- Parent and child documents are linked using `parent`, `parenttype`, and `parentfield`.\n"
            "- Use `JOIN` for parent-child queries (e.g., Invoice + Invoice Items).\n"
            "- Use subqueries when you need filtering on aggregates, last values, or conditional logic.\n\n"

            " STOCK MANAGEMENT:\n"
            "- `tabBin`: current stock — `item_code`, `warehouse`, `actual_qty`, `valuation_rate`, `reserved_qty`, etc.\n"
            "- `tabStock Ledger Entry`: detailed movements — `posting_date`, `item_code`, `actual_qty`, `stock_value_difference`, `voucher_type`, `voucher_no`, etc.\n"
            "- For valuation, use: `actual_qty * valuation_rate`.\n\n"
            "- `tabItem Price`: item price — `item_code`, `uom`, `selling`, `buying`, `price_list`, `price_list_rate`, `creation`, etc. it's not has posting_date"

            " SALES MODULE:\n"
            "- `tabSales Invoice`: `customer`, `grand_total`, `posting_date`, `is_return`, `return_against`.\n"
            "- `tabSales Invoice Item`: `item_code`, `qty`, `rate`, `amount`, `parent`.\n"
            "- `is_return = 1` means this is a return or credit note (negative invoice).\n\n"

            " PURCHASE MODULE:\n"
            "- `tabPurchase Invoice` and `tabPurchase Receipt`: `supplier`, `posting_date`, `grand_total`, `is_return`, `return_against`.\n"
            "- `is_return = 1` indicates a returned or reversed purchase.\n"
            "- Use `return_against` to trace the original document.\n\n"

            " DELIVERY MODULE:\n"
            "- `tabDelivery Note`: `customer`, `posting_date`, `is_return`, `return_against`.\n"
            "- If `is_return = 1`, this is a returned delivery.\n\n"

            " ACCOUNTING:\n"
            "- `tabGL Entry`: `posting_date`, `account`, `debit`, `credit`, `voucher_type`, `party`.\n"
            "- Use to trace financial transactions from all modules.\n\n"

            " HR & PAYROLL:\n"
            "- `tabEmployee`, `tabSalary Slip`: `net_pay`, `employee`, `posting_date`, `salary_structure`.\n\n"

            " MANUFACTURING:\n"
            "- `tabWork Order`: `production_item`, `qty`, `status`, `actual_start_date`, `actual_end_date`.\n"
            "- `tabBOM`, `tabBOM Item`: `item_code`, `qty`, `rate`.\n\n"

            " QUERY LOGIC GUIDELINES:\n"
            "- Use `JOIN` when pulling from both parent and child tables.\n"
            "- Use `GROUP BY`, `SUM()`, `HAVING`, etc. when aggregating.\n"
            "- Use `subqueries` to find latest entries, filter by conditions, or compute derived values.\n"
            "- Use table aliasing for clarity (e.g., `si`, `sii`, `pi`, `pri`, `dn`, `dnl`, etc.).\n"
            "- Always apply `is_return` filter when analyzing net sales/purchases/deliveries.\n\n"

            " EXAMPLES:\n"
            "Q: Total net sales (excluding returns) per customer this year\n"
            "A: SELECT customer, SUM(grand_total) AS net_sales FROM `tabSales Invoice` WHERE docstatus = 1 AND is_return = 0 AND posting_date >= '2025-01-01' GROUP BY customer\n\n"

            "Q: Items returned to suppliers in June 2025\n"
            "A: SELECT pri.item_code, SUM(pri.qty) AS total_returned FROM `tabPurchase Receipt Item` pri JOIN `tabPurchase Receipt` pr ON pri.parent = pr.name WHERE pr.docstatus = 1 AND pr.is_return = 1 AND pr.posting_date BETWEEN '2025-06-01' AND '2025-06-30' GROUP BY pri.item_code\n\n"

            "Q: Get the original invoice number for returned sales invoices\n"
            "A: SELECT name, return_against FROM `tabSales Invoice` WHERE docstatus = 1 AND is_return = 1\n\n"

            "Now convert the following question into a valid SQL SELECT query:"
        )
    },
    {
        "role": "user",
        "content": question
    }
]


    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=messages,
        max_tokens=300,
        temperature=0,
    )

    token_usage["prompt_tokens"] += response['usage']['prompt_tokens']
    token_usage["completion_tokens"] += response['usage']['completion_tokens']
    token_usage["total_tokens"] += response['usage']['total_tokens']
    
    sql = (response.choices[0].message['content'].strip()).rstrip(";")
    if not sql.lower().startswith("select") or re.search(r";|insert|update|delete|drop|alter|truncate", sql, re.I):
        return None

    return sql


def format_result(results: list) -> str:
    max_rows = 10
    limited_results = results[:max_rows]

    formatted_rows = []
    for row in limited_results:
        formatted_row = ", ".join(f"{escape_html(str(k))}: {escape_html(str(v))}" for k, v in row.items())
        formatted_rows.append(formatted_row)

    if len(results) > max_rows:
        formatted_rows.append(f"... (truncated {len(results) - max_rows} more rows)")

    return "\n".join(formatted_rows)


def generate_csv_file(results: list) -> str:
    if not results:
        frappe.throw("No results to export.")

    normalized_results = []
    for row in results:
        plain_row = {}
        for k, v in row.items():
            if v is None:
                plain_row[k] = ""
            elif isinstance(v, str) and v.isdigit() and v.startswith("0"):
                # Preserve leading zeros in Excel
                plain_row[k] = f'="{v}"'
            else:
                plain_row[k] = str(v)
        normalized_results.append(plain_row)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=normalized_results[0].keys())
    writer.writeheader()
    writer.writerows(normalized_results)
    csv_content = output.getvalue()
    output.close()

    file_doc = frappe.get_doc({
        "doctype": "File",
        "file_name": "erp_query_result.csv",
        "content": csv_content,
        "is_private": 0
    }).insert(ignore_permissions=True)

    return file_doc.file_url



def polish_erp_answer_html(question: str, db_result: str, token_usage=None) -> str:
    if token_usage is None:
        token_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    max_len = 600  # Lowered from 1000 for efficiency
    truncated_result = db_result[:max_len] + "\n... (truncated)" if len(db_result) > max_len else db_result
    # --- SHORTER SYSTEM PROMPT FOR ERP FORMATTING ---
    messages = [
        {
            "role": "system",
            "content": (
                "Format ERP query results as readable text table."
            )
        },
        {
            "role": "user",
            "content": f"Q: {question}\nResult:\n{truncated_result}"
        }
    ]
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=messages,
        max_tokens=700,  # Lowered from 1000 for efficiency
        temperature=0.3,
    )
    token_usage["prompt_tokens"] += response['usage']['prompt_tokens']
    token_usage["completion_tokens"] += response['usage']['completion_tokens']
    token_usage["total_tokens"] += response['usage']['total_tokens']
    return response.choices[0].message['content'].strip()


def ask_knowledge_question_html(chat_history, current_question: str, token_usage=None) -> str:
    if token_usage is None:
        token_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    # --- LIMIT CHAT HISTORY TO LAST 2 USER/ASSISTANT TURNS FOR TOKEN EFFICIENCY ---
    trimmed_history = [msg for msg in chat_history if msg.get("role") == "system"]
    # Get last 2 user/assistant turns (4 messages max)
    turns = [msg for msg in chat_history if msg.get("role") in ("user", "assistant")]
    trimmed_history.extend(turns[-4:])
    if not any(msg.get("role") == "system" for msg in trimmed_history):
        trimmed_history.insert(0, {
            "role": "system",
            "content": (
                "You are a helpful assistant for ISOFT ERP, knowledgeable in business, accounting, and ERP usage. "
                "Do not mention 'erpnext v13'."
            )
        })
    trimmed_history.append({"role": "user", "content": current_question})
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=trimmed_history,
        max_tokens=700,  # Lowered from 1000 for efficiency
        temperature=0.3,
    )
    token_usage["prompt_tokens"] += response['usage']['prompt_tokens']
    token_usage["completion_tokens"] += response['usage']['completion_tokens']
    token_usage["total_tokens"] += response['usage']['total_tokens']
    return response.choices[0].message['content'].strip()

def clean_intent(raw_intent: str) -> str:
    cleaned = raw_intent.strip().strip("'\"").upper()
    if cleaned not in ("ERP", "KNOWLEDGE", "CLARIFY", "STUDY"):
        cleaned = "KNOWLEDGE"
    return cleaned


def generate_ai_chat_title(first_message: str) -> str:
    """Generate a concise AI chat title based on the first user message using OpenAI."""
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "Generate a short, clear chat title for this user message. Do not use quotes."},
            {"role": "user", "content": first_message}
        ],
        max_tokens=12,
        temperature=0.2,
    )
    return response.choices[0].message["content"].strip()

def get_or_create_ai_chat(ai_chat_name: str = "", first_message: str = "") -> 'Document':
    """
    If ai_chat_name is provided and exists, return that chat.
    Otherwise, create a new AI Chat with a generated title based on the first message.
    """
    if ai_chat_name:
        try:
            return frappe.get_doc("AI Chat", ai_chat_name)
        except Exception:
            pass  # If not found, fall through to create new
    # Generate title if not provided
    title = generate_ai_chat_title(first_message) if first_message else "AI Chat"
    doc = frappe.new_doc("AI Chat")
    doc.title = title
    doc.owner = frappe.session.user
    doc.insert(ignore_permissions=True)
    return doc


def add_ai_message(ai_chat, user_question, ai_response, token_usage):
    ai_chat.append("messages", {
        "user_question": user_question,
        "ai_response": ai_response,
        "prompt_tokens": token_usage["prompt_tokens"],
        "completion_tokens": token_usage["completion_tokens"],
        "total_tokens": token_usage["total_tokens"]
    })
    ai_chat.save()

@whitelist()
def get_user_ai_chats(owner_id: str) -> List[Dict]:
    """
    Return all AI Chat documents for a given owner id, excluding soft deleted.
    Returns a list of dicts with 'name' and 'title'.
    """
    return frappe.get_all(
        "AI Chat",
        filters={"owner": owner_id, "soft_delete": ["!=", 1]},
        fields=["name", "title"],
        order_by="creation desc"
    )


@whitelist()
def get_ai_chat_messages(chat_name: str) -> List[Dict]:
    """
    Return all messages for a given AI Chat document as a list of dicts.
    """
    doc = frappe.get_doc('AI Chat', chat_name)
    return [msg.as_dict() for msg in doc.messages]

@whitelist()
def soft_delete_ai_chat(chat_name: str):
    """
    Soft delete an AI Chat by setting soft_delete=1.
    """
    try:
        doc = frappe.get_doc('AI Chat', chat_name)
        doc.soft_delete = 1
        doc.save(ignore_permissions=True)
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}


@frappe.whitelist()
def get_item_summary_for_study(keywords: List[str]) -> Dict:
    if not keywords:
        frappe.throw("Keywords array cannot be empty.")

    # Prepare the WHERE clause
    like_clauses = []
    for kw in keywords:
        kw_escaped = frappe.db.escape('%' + kw + '%')
        like_clauses.append(f"(i.item_code LIKE {kw_escaped} OR i.item_name LIKE {kw_escaped} OR i.description LIKE {kw_escaped})")
    where_clause = " OR ".join(like_clauses)

    query = f"""
    SELECT
        i.item_code,
        i.item_name,
        i.brand,
        i.item_group,
        DATE_FORMAT(COALESCE(
            q.transaction_date, so.transaction_date,
            si.posting_date, po.transaction_date,
            pi.posting_date
        ), '%Y-%m') AS month_year,

        COUNT(DISTINCT q.name) AS quotation_count,
        IFNULL(SUM(qi.qty), 0) AS quotation_qty,

        COUNT(DISTINCT so.name) AS sales_order_count,
        IFNULL(SUM(soi.qty), 0) AS sales_order_qty,

        COUNT(DISTINCT si.name) AS sales_invoice_count,
        IFNULL(SUM(sii.qty), 0) AS sales_invoice_qty,

        COUNT(DISTINCT po.name) AS purchase_order_count,
        IFNULL(SUM(poi.qty), 0) AS purchase_order_qty,

        COUNT(DISTINCT pi.name) AS purchase_invoice_count,
        IFNULL(SUM(pii.qty), 0) AS purchase_invoice_qty

    FROM tabItem i

    LEFT JOIN `tabQuotation Item` qi ON qi.item_code = i.item_code
    LEFT JOIN `tabQuotation` q ON q.name = qi.parent AND q.docstatus = 1

    LEFT JOIN `tabSales Order Item` soi ON soi.item_code = i.item_code
    LEFT JOIN `tabSales Order` so ON so.name = soi.parent AND so.docstatus = 1

    LEFT JOIN `tabSales Invoice Item` sii ON sii.item_code = i.item_code
    LEFT JOIN `tabSales Invoice` si ON si.name = sii.parent AND si.docstatus = 1

    LEFT JOIN `tabPurchase Order Item` poi ON poi.item_code = i.item_code
    LEFT JOIN `tabPurchase Order` po ON po.name = poi.parent AND po.docstatus = 1

    LEFT JOIN `tabPurchase Invoice Item` pii ON pii.item_code = i.item_code
    LEFT JOIN `tabPurchase Invoice` pi ON pi.name = pii.parent AND pi.docstatus = 1

    WHERE {where_clause}
    GROUP BY i.item_code, month_year
    ORDER BY month_year DESC
    """

    items = frappe.db.sql(query, as_dict=True)
    item_codes = list({item['item_code'] for item in items})
    stock_by_item = {}
    if item_codes:
        stock_rows = frappe.db.sql(f"""
            SELECT item_code, warehouse, actual_qty
            FROM tabBin
            WHERE item_code IN ({', '.join(['%s']*len(item_codes))})
        """, item_codes, as_dict=True)
        for row in stock_rows:
            stock_by_item.setdefault(row['item_code'], []).append({
                'warehouse': row['warehouse'],
                'actual_qty': row['actual_qty']
            })
    for item in items:
        item['stock_by_warehouse'] = stock_by_item.get(item['item_code'], [])
    return {'items': items}


