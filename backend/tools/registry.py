from tools.search import search
from tools.calculator import calculate
from tools.database import db_lookup
from tools.weather import get_weather
from tools.summarizer import summarize
from tools.code_exec import execute_code

# Tool registry — maps string names to functions
# Orchestrator uses this to call tools by name

TOOL_REGISTRY = {
    "search": {
        "function": search,
        "description": "Search the web for current information",
        "input_key": "query",
    },
    "calculator": {
        "function": calculate,
        "description": "Perform mathematical calculations",
        "input_key": "expression",
    },
    "database": {
        "function": db_lookup,
        "description": "Look up records from the database by ID",
        "input_key": "record_id",
    },
    "weather": {
        "function": get_weather,
        "description": "Get current weather for a city",
        "input_key": "city",
    },
    "summarizer": {
        "function": summarize,
        "description": "Summarize a block of text",
        "input_key": "text",
    },
    "code_exec": {
        "function": execute_code,
        "description": "Execute a Python code snippet and return output",
        "input_key": "snippet",
    },
}


def call_tool(tool_name: str, input_value) -> dict:
    """
    Call a tool by name with its input value.
    Returns the tool's response dict, or an error dict if tool not found.
    """
    if tool_name not in TOOL_REGISTRY:
        return {
            "status": "error",
            "error": f"Tool '{tool_name}' not found in registry"
        }
    
    tool = TOOL_REGISTRY[tool_name]
    func = tool["function"]
    input_key = tool["input_key"]
    
    try:
        result = func(**{input_key: input_value})
        return result
    except Exception as e:
        return {
            "status": "error",
            "error": f"Tool execution failed: {str(e)}"
        }


def list_tools() -> list:
    """Return all available tool names and descriptions."""
    return [
        {"name": name, "description": tool["description"]}
        for name, tool in TOOL_REGISTRY.items()
    ]