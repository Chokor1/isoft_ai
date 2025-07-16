# iSoft AI - ERPNext AI Integration Module

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://github.com/abbasschokor/isoft_ai)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://python.org)
[![Frappe](https://img.shields.io/badge/frappe-13+-orange.svg)](https://frappe.io)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## 🚀 Overview

**iSoft AI** is an advanced AI integration module designed to seamlessly enhance your ERPNext experience with cutting-edge artificial intelligence capabilities. It empowers businesses by automating routine tasks, providing predictive analytics, and delivering actionable insights to optimize decision-making across all departments.

### Key Benefits

- 🤖 **Intelligent Chat Interface**: Natural language queries for ERP data
- 📊 **Advanced Analytics**: AI-powered insights and reporting
- 🔄 **Smart Caching**: Optimized performance with intelligent caching
- 📱 **Responsive Design**: Works seamlessly across all devices
- 🔒 **Role-Based Access**: Secure access control with AI User permissions
- 🎯 **ERPNext Integration**: Deep integration with ERPNext v13 modules

## ✨ Features

### Core AI Capabilities

- **Natural Language Processing**: Ask questions in plain English
- **SQL Generation**: Automatic SQL query generation from natural language
- **Intent Detection**: Smart classification of user queries
- **Context Awareness**: Maintains conversation context across sessions
- **Multi-Module Support**: Covers all major ERPNext modules

### ERPNext Module Coverage

| Module | Supported DocTypes | Features |
|--------|-------------------|----------|
| **ACCOUNTING** | GL Entry, Journal Entry, Payment Entry, Account | Financial reporting, transaction analysis |
| **SELLING** | Sales Invoice, Sales Order, Quotation, Customer | Sales analytics, customer insights |
| **BUYING** | Purchase Invoice, Purchase Order, Purchase Receipt, Supplier | Procurement analysis, supplier management |
| **STOCK** | Stock Entry, Stock Ledger Entry, Bin, Item, Warehouse | Inventory management, stock analytics |
| **MANUFACTURING** | Work Order, BOM, Production Plan, Job Card | Production planning, efficiency analysis |
| **HR** | Employee, Salary Slip, Attendance, Leave Application | HR analytics, workforce insights |
| **PROJECTS** | Project, Task, Timesheet, Issue | Project management, time tracking |
| **CRM** | Lead, Opportunity, Customer, Contact | Customer relationship analytics |
| **ASSETS** | Asset, Asset Movement, Asset Maintenance | Asset lifecycle management |
| **QUALITY** | Quality Inspection, Quality Goal | Quality control and compliance |

### Advanced Features

- **Smart Caching System**: Dynamic cache expiry based on data volatility
- **Export Capabilities**: Excel and PDF export for large datasets
- **Real-time Analytics**: Live data processing and insights
- **Conversation Management**: Persistent chat history and session management
- **Responsive UI**: Modern, mobile-friendly interface

## 📁 Project Structure

```
isoft_ai/
├── __init__.py                 # App initialization and version
├── hooks.py                    # Frappe app hooks and configuration
├── modules.txt                 # Module definition
├── patches.txt                 # Database patches (empty)
│
├── config/                     # Configuration files
│   ├── __init__.py
│   ├── desktop.py             # Desktop module configuration
│   └── docs.py                # Documentation configuration
│
├── isoft_ai/                   # Main application package
│   ├── __init__.py
│   ├── doctype/               # Custom DocTypes
│   │   ├── ai_chat/           # AI Chat management
│   │   │   ├── ai_chat.json   # DocType schema
│   │   │   ├── ai_chat.py     # DocType class
│   │   │   └── test_ai_chat.py
│   │   ├── ai_cache/          # Caching system
│   │   │   ├── ai_cache.json
│   │   │   ├── ai_cache.py
│   │   │   └── test_ai_cache.py
│   │   ├── ai_chat_message/   # Chat message storage
│   │   │   ├── ai_chat_message.json
│   │   │   ├── ai_chat_message.py
│   │   │   └── test_ai_chat_message.py
│   │   └── isoft_ai_test/     # Main AI functionality
│   │       ├── isoft_ai_test.json
│   │       ├── isoft_ai_test.py  # Core AI logic
│   │       └── test_isoft_ai_test.py
│   ├── page/                  # Custom pages
│   └── workspace/             # Workspace configurations
│
├── public/                    # Frontend assets
│   ├── build.json            # Asset build configuration
│   ├── css/                  # Compiled CSS files
│   ├── js/                   # Compiled JavaScript files
│   └── scss/                 # Source SCSS files
│       └── ai-chat.bundle.scss  # Main stylesheet
│
├── templates/                 # Jinja2 templates
├── www/                      # Web assets
└── .idea/                    # IDE configuration
```

## 🛠️ Installation

### Prerequisites

- Frappe Framework v13+
- Python 3.8+
- ERPNext v13+
- OpenAI API key

### Step 1: Install the App

```bash
# Navigate to your Frappe bench
cd /path/to/frappe-bench

# Install the app
bench get-app isoft_ai https://github.com/abbasschokor/isoft_ai.git

# Install dependencies
bench install-app isoft_ai
```

### Step 2: Configure OpenAI API

Add your OpenAI API key to your site's configuration:

```bash
# Edit site_config.json
bench --site your-site.com set-config openai_api_key "your-openai-api-key-here"
```

### Step 3: Set Up Permissions

Create the "AI User" role and assign it to users who should have access to the AI features:

```bash
# Via Frappe Desk
# Go to Setup > Users and Permissions > Role
# Create new role: "AI User"
# Assign to appropriate users
```

### Step 4: Build Assets

```bash
# Build frontend assets
bench build --app isoft_ai

# Restart Frappe server
bench restart
```

## ⚙️ Configuration

### App Configuration (`hooks.py`)

The main configuration is handled in `hooks.py`:

```python
app_name = "isoft_ai"
app_title = "Isoft Ai"
app_publisher = "Abbass Chokor"
app_description = "Advanced AI integration for ERPNext"
app_icon = "octicon octicon-file-directory"
app_color = "yellow"
app_email = "abbasschokor225@gmail.com"
app_license = "MIT"
```

### Frontend Assets

CSS and JavaScript files are automatically included:

```python
# Desktop assets
app_include_css = ['/assets/css/ai-chat.css']
app_include_js = ['/assets/js/ai-chat.js']

# Web assets
web_include_css = ['/assets/css/ai-chat.css']
web_include_js = ['/assets/js/ai-chat.js']
```

### Cache Configuration

The system uses intelligent caching with dynamic expiry:

```python
CACHE_EXPIRY_RULES = {
    'REAL_TIME': 0,      # No caching for real-time data
    'HIGH_FREQ': 5,      # 5 minutes for frequently changing data
    'MEDIUM_FREQ': 30,   # 30 minutes for moderately changing data
    'LOW_FREQ': 120,     # 2 hours for slowly changing data
    'STATIC': 1440       # 24 hours for static/reference data
}
```

## 🎯 Usage

### Accessing the AI Assistant

1. **Desktop Interface**: Click the robot icon in the navbar
2. **Mobile Interface**: The interface automatically adapts to mobile screens
3. **Chat Interface**: Modern, responsive chat window with sidebar

### Example Queries

#### Financial Analytics
```
"Show me top 10 customers by sales this year"
"Generate a report of outstanding invoices"
"What are our monthly revenue trends?"
```

#### Inventory Management
```
"Which items have low stock levels?"
"Show me the most profitable products"
"Generate a stock movement report"
```

#### HR Analytics
```
"Show employee attendance for this month"
"Which departments have the highest turnover?"
"Generate a salary analysis report"
```

#### Manufacturing Insights
```
"Show me production efficiency metrics"
"Which work orders are behind schedule?"
"Generate a BOM cost analysis"
```

### Advanced Features

#### Export Capabilities
- **Excel Export**: Large datasets are automatically exported to Excel
- **PDF Reports**: Comprehensive reports are generated as PDF files
- **Real-time Data**: Live data processing for time-sensitive queries

#### Conversation Management
- **Chat History**: Persistent conversation history
- **Context Awareness**: Maintains context across multiple queries
- **Session Management**: Automatic session creation and management

## 🔌 API Reference

### Core Functions

#### `ask_ai(user_question, chat_history_json, ai_chat_name)`

Main AI query function.

**Parameters:**
- `user_question` (str): Natural language query
- `chat_history_json` (str): JSON string of previous conversation
- `ai_chat_name` (str): Optional chat session name

**Returns:**
```json
{
    "ai_response": "AI generated response",
    "chat_name": "chat_session_name"
}
```

#### `get_user_ai_chats(owner_id)`

Retrieve user's chat history.

**Parameters:**
- `owner_id` (str): User ID

**Returns:**
```json
[
    {
        "name": "chat_name",
        "title": "chat_title",
        "modified": "timestamp"
    }
]
```

#### `get_ai_chat_messages(chat_name)`

Get messages from a specific chat.

**Parameters:**
- `chat_name` (str): Chat session name

**Returns:**
```json
[
    {
        "user_question": "User's question",
        "ai_response": "AI's response",
        "prompt_tokens": 100,
        "completion_tokens": 50,
        "total_tokens": 150
    }
]
```

### DocTypes

#### AI Chat
- **Purpose**: Manages chat sessions
- **Fields**: title, messages (table), soft_delete
- **Permissions**: System Manager, AI User

#### AI Cache
- **Purpose**: Intelligent response caching
- **Fields**: response_data, expires_at
- **Permissions**: System Manager

#### AI Chat Message
- **Purpose**: Stores individual chat messages
- **Fields**: user_question, ai_response, token_usage
- **Permissions**: Inherited from parent

## 🧪 Development

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/abbasschokor/isoft_ai.git

# Install in development mode
bench get-app isoft_ai ./isoft_ai

# Install dependencies
bench install-app isoft_ai

# Build assets in development mode
bench build --app isoft_ai --force
```

### Code Structure

#### Backend (Python)
- **Main Logic**: `isoft_ai/doctype/isoft_ai_test/isoft_ai_test.py`
- **AI Integration**: OpenAI GPT-4 integration
- **SQL Generation**: Intelligent SQL query generation
- **Caching**: Smart caching system with dynamic expiry

#### Frontend (JavaScript/SCSS)
- **Main Component**: `public/js/ai-chat.bundle.js`
- **Styling**: `public/scss/ai-chat.bundle.scss`
- **Responsive Design**: Mobile-first approach
- **Animations**: Smooth transitions and interactions

### Testing

```bash
# Run tests
bench --site your-site.com run-tests --app isoft_ai

# Run specific test
bench --site your-site.com run-tests --app isoft_ai --doctype "ISOFT AI TEST"
```

### Debugging

Enable debug logging in `site_config.json`:

```json
{
    "logging": {
        "level": "DEBUG",
        "file": "logs/isoft_ai.log"
    }
}
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Process

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards

- Follow PEP 8 for Python code
- Use meaningful variable and function names
- Add comprehensive docstrings
- Include unit tests for new features
- Update documentation for API changes

### Testing Guidelines

- Write tests for all new functionality
- Ensure existing tests pass
- Test on multiple screen sizes
- Verify accessibility features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Abbass Chokor**
- Email: abbasschokor225@gmail.com
- GitHub: [@abbasschokor](https://github.com/abbasschokor)

## 🙏 Acknowledgments

- **Frappe Framework** - The amazing framework that makes this possible
- **ERPNext** - The comprehensive ERP system we're enhancing
- **OpenAI** - Providing the AI capabilities
- **Open Source Community** - For inspiration and support

## 📞 Support

For support and questions:

- 📧 Email: abbasschokor225@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/abbasschokor/isoft_ai/issues)
- 📖 Documentation: [Wiki](https://github.com/abbasschokor/isoft_ai/wiki)

---

**Made with ❤️ for the ERPNext community** 