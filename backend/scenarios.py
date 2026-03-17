SCENARIOS = [
    # Search scenarios
    {"id": "S1", "task": "Find the latest version of Python and when it was released", "tool": "search", "correct_answer": "Python 3.13, October 2024"},
    {"id": "S2", "task": "Search for the current CEO of OpenAI", "tool": "search", "correct_answer": "Sam Altman"},
    {"id": "S3", "task": "Find what LangChain's latest major version is", "tool": "search", "correct_answer": "LangChain v0.3"},

    # Calculator scenarios
    {"id": "C1", "task": "What is 847 multiplied by 23?", "tool": "calculator", "correct_answer": "19481"},
    {"id": "C2", "task": "What is the compound interest on 10000 at 8% for 3 years?", "tool": "calculator", "correct_answer": "2597.12"},
    {"id": "C3", "task": "What percentage is 340 of 1700?", "tool": "calculator", "correct_answer": "20%"},

    # Database scenarios
    {"id": "D1", "task": "Look up user record with ID 1042 and return their email", "tool": "database", "correct_answer": "user1042@test.com"},
    {"id": "D2", "task": "Fetch product record ID 77 and return its price", "tool": "database", "correct_answer": "149.99"},

    # Weather scenarios
    {"id": "W1", "task": "What is the current temperature in Mumbai in Celsius?", "tool": "weather", "correct_answer": "31"},
    {"id": "W2", "task": "Is it raining in London right now?", "tool": "weather", "correct_answer": "behavior_check"},

    # Summarizer scenarios
    {"id": "SM1", "task": "Summarize this paragraph: Neural networks are computational models inspired by the human brain. They consist of layers of interconnected nodes with adjustable weights. Training involves adjusting these weights to minimize prediction error.", "tool": "summarizer", "correct_answer": "must_mention:layers,weights,training"},
    {"id": "SM2", "task": "Summarize this product review: This product is absolutely excellent. The quality is outstanding and the value for money is fantastic. I would strongly recommend it to everyone.", "tool": "summarizer", "correct_answer": "must_be_positive"},

    # Code execution scenarios
    {"id": "CE1", "task": "Run this Python snippet: print(2 ** 10) and return the output", "tool": "code_exec", "correct_answer": "1024"},
    {"id": "CE2", "task": "Execute: len('ToolMonkey') and return result", "tool": "code_exec", "correct_answer": "10"},
    {"id": "CE3", "task": "Run this loop: sum([i for i in range(1,6)]) and return result", "tool": "code_exec", "correct_answer": "15"},
]