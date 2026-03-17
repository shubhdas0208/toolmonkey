import json
from orchestrator import run_simulation
from eval.scorer import score_single_run, score_batch

# Run same scenario across all 4 failure modes
results = []
for mode in ["none", "wrong_answer", "malformed_json", "silent_failure"]:
    result = run_simulation("What is 847 multiplied by 23?", mode)
    result["scenario_id"] = "C1"
    scored = score_single_run(result)
    print(f"\n--- {mode.upper()} ---")
    print(f"Completion: {scored['task_completion']} | Detection: {scored['failure_detection']} | Silent: {scored['silent_failure']} | Retries: {scored['retries']}")
    print(f"Answer: {result['final_answer']}")
    results.append(result)

print("\n=== AGGREGATE ===")
batch = score_batch(results)
print(json.dumps({k: v for k, v in batch.items() if k != "per_scenario"}, indent=2))