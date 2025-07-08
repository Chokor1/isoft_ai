import frappe
import openai
import re
import json
import csv
import io
from frappe.model.document import Document
from frappe.utils import escape_html
from frappe import whitelist


class ISOFTAITEST(Document):
    pass


@whitelist()
def ask_ai(user_question: str, chat_history_json: str = "[]") -> str:
    if not user_question or not user_question.strip():
        return "<div class='alert alert-warning'>No question provided.</div>"

    if "AI User" not in frappe.get_roles(frappe.session.user):
        return "<div class='alert alert-danger'>You can't use AI. Access denied.</div>"

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

        user_question = preprocess_question(user_question, chat_history)

        intent_check_prompt = [
            {
                "role": "system",
                "content": (
                    "You are an assistant specialized in ISOFT ERP (do NOT mention 'erpnext v13' to the user). "
                    "Classify user's question intent into exactly one of: 'ERP', 'KNOWLEDGE', or 'CLARIFY'.\n\n"
                    "Classify as 'ERP' if the question is requesting specific data queries, reports, rankings, summaries, "
                    "or any ERP database info.\n"
                    "Classify as 'KNOWLEDGE' if the question is general business knowledge or conceptual.\n"
                    "Classify as 'CLARIFY' if question is ambiguous or incomplete.\n\n"
                    "Examples:\n"
                    "- 'Show me the top 5 customers this year' -> ERP\n"
                    "- 'What is an invoice?' -> KNOWLEDGE\n"
                    "- 'Can you tell me more about?' -> CLARIFY\n"
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
        intent = clean_intent(intent_response.choices[0].message["content"])
        if intent not in ("ERP", "KNOWLEDGE", "CLARIFY"):
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
            return clarifying_response.choices[0].message["content"].strip()

        elif intent == "ERP":
            sql_query = generate_sql_from_question(user_question)
            if not sql_query:
                return ask_knowledge_question_html(chat_history, user_question)

            frappe.logger().info(f"Generated SQL: {sql_query}")

            db_result = frappe.db.sql(sql_query, as_dict=True)
            if not db_result:
                return (
                    "<div class='alert alert-warning'>"
                    "No data found for your query. If you believe this is an error, contact "
                    "<a href='mailto:support@isoft.ao'>support@isoft.ao</a>."
                    "</div>"
                )

            too_many_rows = len(db_result) > 10
            too_many_cols = len(db_result[0].keys()) > 5

            if too_many_rows or too_many_cols:
                return generate_csv_file(db_result)

            return polish_erp_answer_html(user_question, format_result(db_result))

        else:
            return ask_knowledge_question_html(chat_history, user_question)

    except Exception:
        frappe.log_error(frappe.get_traceback(), "OpenAI API Error")
        return (
            "<div class='alert alert-danger'>"
            "An unexpected error occurred. Please contact ISOFT Support at "
            "<a href='mailto:support@isoft.ao'>support@isoft.ao</a>."
            "</div>"
        )


# ⬇️ Helper to combine short refinements with last full question
def preprocess_question(current_question: str, chat_history: list) -> str:
    current_question = current_question.strip()

    # If too short or clearly a refinement, merge with last full question
    if len(current_question.split()) < 6 or re.match(r"^(by|include|only|group by|filter|sort by)", current_question, re.I):
        for msg in reversed(chat_history):
            if msg.get("role") == "user" and len(msg["content"].split()) >= 6:
                # Merge intelligently
                return f"{msg['content'].strip()} {current_question}"
    return current_question



def generate_sql_from_question(question: str) -> str:
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





def polish_erp_answer_html(question: str, db_result: str) -> str:
    max_len = 1000
    truncated_result = db_result[:max_len] + "\n... (truncated)" if len(db_result) > max_len else db_result

    messages = [
        {
            "role": "system",
            "content": (
                "You are an ERP assistant for ISOFT ERP(USE ERPNEXT Structure And Doc). Format ERP query results "
                "as clean Text, using spaces or symbols to make tables clear."
            )
        },
        {
            "role": "user",
            "content": f"User question: {question}\nRaw result:\n{truncated_result}"
        }
    ]

    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=messages,
        max_tokens=1000,
        temperature=0.3,
    )
    return response.choices[0].message['content'].strip()


def ask_knowledge_question_html(chat_history, current_question: str) -> str:
    if not any(msg.get("role") == "system" for msg in chat_history):
        chat_history.insert(0, {
            "role": "system",
            "content": (
                "You are a helpful assistant for ISOFT ERP, knowledgeable in business, accounting, and ERP usage. "
                "Do not mention 'erpnext v13'."
            )
        })

    chat_history.append({"role": "user", "content": current_question})

    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=chat_history,
        max_tokens=1000,
        temperature=0.3,
    )
    return response.choices[0].message['content'].strip()

def clean_intent(raw_intent: str) -> str:
    cleaned = raw_intent.strip().strip("'\"").upper()
    if cleaned not in ("ERP", "KNOWLEDGE", "CLARIFY"):
        cleaned = "KNOWLEDGE"
    return cleaned
