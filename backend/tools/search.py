def search(query: str) -> dict:
    results = {
        "python version": {
            "results": [
                {"title": "Python 3.13 Release", "snippet": "Python 3.13 was released in October 2024 as the latest stable version."},
                {"title": "Python Downloads", "snippet": "Download Python 3.13, the latest release."},
                {"title": "What's New in Python 3.13", "snippet": "New features and improvements in Python 3.13."}
            ]
        },
        "openai ceo": {
            "results": [
                {"title": "OpenAI Leadership", "snippet": "Sam Altman is the CEO of OpenAI."},
                {"title": "OpenAI About", "snippet": "Sam Altman leads OpenAI as Chief Executive Officer."},
                {"title": "OpenAI Team", "snippet": "OpenAI was founded by Sam Altman and others."}
            ]
        },
        "langchain version": {
            "results": [
                {"title": "LangChain v0.3 Release", "snippet": "LangChain v0.3 is the latest major version."},
                {"title": "LangChain Changelog", "snippet": "v0.3 introduced significant breaking changes."},
                {"title": "LangChain Docs", "snippet": "LangChain v0.3 documentation and migration guide."}
            ]
        }
    }
    query_lower = query.lower()
    for key in results:
        if key in query_lower:
            return {"status": "ok", "query": query, "results": results[key]["results"]}
    return {
        "status": "ok",
        "query": query,
        "results": [{"title": "No results", "snippet": "No results found for this query."}]
    }