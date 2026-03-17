import json
from orchestrator import run_simulation

print("=== TEST 1: No failure ===")
result = run_simulation("What is 847 multiplied by 23?", "none")
print(json.dumps(result, indent=2))

print("\n=== TEST 2: Wrong answer ===")
result = run_simulation("What is 847 multiplied by 23?", "wrong_answer")
print(json.dumps(result, indent=2))

print("\n=== TEST 3: Silent failure ===")
result = run_simulation("What is 847 multiplied by 23?", "silent_failure")
print(json.dumps(result, indent=2))

print("\n=== TEST 4: Malformed JSON ===")
result = run_simulation("What is 847 multiplied by 23?", "malformed_json")
print(json.dumps(result, indent=2))