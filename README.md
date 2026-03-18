# 🐒 ToolMonkey

**ToolMonkey is to LLM tool-calling agents what Chaos Monkey is to Netflix.**

It creates a controlled environment where you inject deterministic failures 
into tool calls and measure exactly how your agent breaks before it reaches 
production.

Live demo: https://toolmonkey.vercel.app  
Backend API: https://toolmonkey-api.onrender.com/health  
Built by: Shubh Sankalp Das | GitHub: shubhdas0208

---

## The Problem

When AI agents fail in production, they rarely fail loudly. Here is what 
each failure mode looks like from a user's perspective.

A timeout means the tool never responds in time. A well-built agent retries 
and flags uncertainty. A poorly built one waits indefinitely or crashes 
mid-task.

A wrong answer means the tool returns plausible but incorrect data. The agent 
has no way to verify it. It uses the data confidently, and the user has no 
reason to doubt it.

Malformed JSON means the tool response is broken or incomplete. A well-built 
agent catches the parse error and escalates. A poorly built one hallucinates 
the missing fields and continues.

Silent failure is the most dangerous. The tool returns an empty response with 
no error signal. The agent sees no failure to detect, so it invents an answer 
or uses stale cached data. A user checking Mumbai's temperature in winter might 
see 40 degrees because that is what was cached in summer. They have no way to 
know the data is wrong. No warning. No uncertainty flag. Just a confident wrong 
answer delivered as fact.

As AI-native products become the default, silent agent failures do not just 
produce wrong answers. They destroy user trust, and they are invisible until 
a production incident teaches you the hard way.

---

## What ToolMonkey Does

ToolMonkey gives you a structured environment to find your agent's failure 
modes before your users do.

You pick a task scenario, inject a failure mode, and watch the agent attempt 
the task in real time. The system measures the agent's behavior across four 
reliability metrics and produces a health score with a full reasoning log.

15 predefined scenarios across 6 tool types: search, calculator, database, 
weather, summarizer, and code execution. 4 failure modes: timeout, wrong 
answer, malformed JSON, and silent failure. 4 eval metrics that each map to 
a real production failure consequence.

---

## The Eval Methodology

The eval layer is built around four metrics. Each one closes a specific blind 
spot that the others cannot.

**Task Completion Rate** measures whether the agent produced a usable final 
answer. Without it, you have no baseline. An agent that never finishes is 
broken regardless of everything else.

**Failure Detection Rate** measures whether the agent noticed that a tool 
returned bad data. Without it, you would miss agents that complete tasks using 
garbage input. Completion without detection is dangerous, not healthy.

**Retry Efficiency** measures whether retrying actually helped. Without it, 
you cannot distinguish between an agent that recovers intelligently and one 
that retries until it exhausts every available API key, burning quota without 
improving outcomes.

**Silent Failure Rate** is the most critical metric and the only one where 
lower is better. Without it, an agent can score 100% on task completion, look 
perfectly healthy on every dashboard, and still be delivering confident wrong 
answers to users with no uncertainty flag. This is the production killer. 
Target: below 10%.

These four metrics together answer the question every AI PM should ask before 
shipping an agent: does it finish, does it know when something is wrong, does 
recovery work, and is it ever lying confidently?

### What the data showed

The agent scored 100% on task completion across all scenarios. It completed 
every task regardless of failure mode. On the surface this looks healthy.

It detected only 33% of injected failures. It missed wrong answer and 
malformed JSON failures completely, using corrupted data as if it were correct.

Silent failure rate was 25%. One in four runs, the agent delivered a confident 
wrong answer with no uncertainty flag and no warning to the user.

The core insight: task completion rate is a vanity metric for agents. An agent 
that finishes 100% of tasks but silently fails 25% of the time is not reliable. 
It is dangerous.

---

## Architecture Decisions

**Why fake tools instead of real APIs**

Real APIs introduce noise that makes reliability testing impossible. If a 
weather API returns different data on every call, you cannot tell whether a bad 
score means your agent is unreliable or the API was having a bad day. Fake 
tools are deterministic. Same input always produces same output, which means 
every score is a measure of agent behavior, not external API variance. Accuracy 
testing requires real data. Reliability testing requires controlled data.

**Why Groq instead of Gemini for orchestration**

The original architecture used Gemini 1.5 Flash for orchestration. During Day 
1 build, all four Gemini keys returned limit: 0 regardless of usage, a regional 
restriction on free tier accounts in India. Rather than block on this, the 
orchestrator was switched to Groq Llama 3.3 70B, which has no such regional 
restriction and offers faster inference on the free tier. Gemini keys are 
retained in the key pool for future use if the restriction is lifted.

**Why run each scenario 3 times instead of once**

A single run result is noisy. An agent might detect a failure once by luck, or 
miss it once due to a transient LLM response variation. Running each scenario 
three times and averaging the scores produces stable, defensible metrics. A 
single run tells you what happened once. Three runs tell you what your agent 
does by default.

**Why Silent Failure Rate is scored inverted**

Every other metric measures something you want more of. Higher task completion 
is better. Higher failure detection is better. Silent Failure Rate measures 
something you want eliminated. It counts the number of times your agent 
confidently delivered a wrong answer without any warning. A score of 0% means 
your agent never did this. A score of 25% means 1 in 4 runs your users received 
confident misinformation with no way to know it was wrong. The inversion is 
intentional. It forces anyone reading the report to confront that this metric 
is not like the others.

**Why custom task mode uses behavior scoring only**

Custom task mode cannot check correctness because there is no ground truth. 
When a user types their own question, the system has no pre-verified answer to 
compare against. Custom mode therefore scores only behavioral signals: did the 
agent retry, did it flag uncertainty, did it produce a silent failure. This is 
honestly labeled in the UI. In V2, dynamic ground truth fetching from trusted 
sources would close this gap for factual queries.

---

## Known Limitations and Where This Breaks

**Ground truth is static for dynamic queries.** Scenarios like "what is the 
current temperature in Mumbai" have hardcoded correct answers. A production 
eval system would fetch ground truth independently at test time from a trusted 
source and compare dynamically. This means ToolMonkey measures behavioral 
reliability accurately but cannot measure factual accuracy for time-sensitive 
queries.

**Only a fixed agent can be tested.** ToolMonkey's eval layer assumes a 
specific agent architecture built around its own orchestrator. Any external 
agent would need to conform to a defined interface contract to be testable. V2 
would introduce a thin adapter layer allowing users to plug in their own agent 
endpoint and test it against the same four metrics.

**Evaluation is episodic, not continuous.** ToolMonkey runs scenarios on 
demand. A production reliability system would run the same scenarios 
continuously against a live agent, track score degradation over time, and alert 
when metrics drop below defined thresholds. A silent failure rate that was 5% 
last week and is 25% this week is a signal that something changed in the 
underlying model or tool behavior. ToolMonkey would not catch that drift.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js + Tailwind CSS | 3-screen UI with SSE streaming |
| Frontend Deploy | Vercel | Auto-deploy on git push |
| Backend | FastAPI (Python) | Simulation endpoints |
| Backend Deploy | Render.com | Free tier hosting |
| Orchestrator | Groq Llama 3.3 70B | Tool selection and planning |
| Eval | Pure Python | 4-metric reliability scoring |
| Tools | Pure Python | 6 deterministic fake tools |
| Failure Engine | Pure Python middleware | Intercepts and corrupts tool responses |
| Key Management | KeyPoolManager singleton | Round-robin API key rotation |

---

## Running Locally

**Backend**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Add a `backend/.env` file with your API keys. See `.env.example` for 
the required variables.

---

## The 15 Scenarios

| ID | Task | Tool | Correct Answer |
|---|---|---|---|
| S1 | Find the latest version of Python | search | Python 3.13, Oct 2024 |
| S2 | Current CEO of OpenAI | search | Sam Altman |
| S3 | LangChain latest major version | search | v0.3 |
| C1 | 847 multiplied by 23 | calculator | 19481 |
| C2 | Compound interest 10000 at 8% for 3 years | calculator | 2597.12 |
| C3 | What percentage is 340 of 1700 | calculator | 20% |
| D1 | User record ID 1042, return email | database | user1042@test.com |
| D2 | Product record ID 77, return price | database | 149.99 |
| W1 | Current temperature in Mumbai | weather | 28-34 range |
| W2 | Is it raining in London | weather | behavior check |
| SM1 | Summarize neural networks paragraph | summarizer | must mention layers, weights, training |
| SM2 | Summarize positive product review | summarizer | must be positive |
| CE1 | Run print(2 ** 10) | code_exec | 1024 |
| CE2 | Execute len('ToolMonkey') | code_exec | 10 |
| CE3 | Run sum([i for i in range(1,6)]) | code_exec | 15 |

---

*ToolMonkey v1.0 | March 2026 | Shubh Sankalp Das*