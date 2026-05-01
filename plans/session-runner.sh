#!/bin/bash
# Tactical Agentic Coding - Session Runner Template
# Executes tasks in fresh Claude Code sessions to stay in the "smart zone" (<40% context)
#
# Usage:
#   1. Copy this file to your project: cp ~/.claude/templates/session-runner.sh plans/
#   2. Make executable: chmod +x plans/session-runner.sh
#   3. Create a progress.json file (or use /tactical to generate)
#   4. Run: ./plans/session-runner.sh

set -e

# Configuration - adjust these for your project
PLANS_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$PLANS_DIR")"
PROGRESS_FILE="$PLANS_DIR/progress.json"
PLAN_FILE="$PLANS_DIR/plan.md"  # Your main plan file
SESSION_PROMPT_FILE="$PLANS_DIR/session-prompt.md"
LOG_DIR="$PLANS_DIR/session-logs"
JSON_DIR="$PLANS_DIR/session-json"
MAX_SESSION_TIME=1800  # 30 minutes in seconds
MAX_ITERATIONS=50      # Safety limit

# Create log directories
mkdir -p "$LOG_DIR"
mkdir -p "$JSON_DIR"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Tactical Agentic Coding - Session Runner ===${NC}"
echo -e "${CYAN}Project:${NC} $PROJECT_DIR"
echo -e "${CYAN}Progress file:${NC} $PROGRESS_FILE"
echo ""

# Check if progress file exists
if [ ! -f "$PROGRESS_FILE" ]; then
    echo -e "${RED}Error: Progress file not found at $PROGRESS_FILE${NC}"
    echo "Create a progress.json file or use /tactical to generate one."
    exit 1
fi

# Function to get next incomplete issue
get_next_issue() {
    python3 -c "
import json
with open('$PROGRESS_FILE', 'r') as f:
    data = json.load(f)

for slice in data.get('slices', []):
    for issue in slice.get('issues', []):
        if issue.get('status') not in ['completed', 'skipped']:
            print(json.dumps({
                'id': issue.get('id'),
                'title': issue.get('title', 'Untitled'),
                'githubIssue': issue.get('githubIssue', ''),
                'githubNumber': issue.get('githubNumber', 0),
                'sliceName': slice.get('name', 'Unknown'),
                'priority': slice.get('priority', 'MEDIUM'),
                'status': issue.get('status', 'pending')
            }))
            exit(0)
print('null')
"
}

# Function to count remaining issues
count_remaining() {
    python3 -c "
import json
with open('$PROGRESS_FILE', 'r') as f:
    data = json.load(f)

total = 0
completed = 0
for slice in data.get('slices', []):
    for issue in slice.get('issues', []):
        total += 1
        if issue.get('status') in ['completed', 'skipped']:
            completed += 1

print(f'{completed}/{total}')
"
}

# Function to get initiative name
get_initiative_name() {
    python3 -c "
import json
with open('$PROGRESS_FILE', 'r') as f:
    data = json.load(f)
print(data.get('initiative', 'Unknown Initiative'))
"
}

INITIATIVE=$(get_initiative_name)
echo -e "${CYAN}Initiative:${NC} $INITIATIVE"
echo ""

# Main loop
iteration=0

while true; do
    iteration=$((iteration + 1))

    if [ $iteration -gt $MAX_ITERATIONS ]; then
        echo -e "${RED}Max iterations ($MAX_ITERATIONS) reached. Stopping.${NC}"
        break
    fi

    # Get next issue
    NEXT_ISSUE=$(get_next_issue)

    if [ "$NEXT_ISSUE" = "null" ]; then
        echo -e "${GREEN}All issues completed!${NC}"
        break
    fi

    # Parse issue details
    ISSUE_ID=$(echo "$NEXT_ISSUE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['id'])")
    ISSUE_TITLE=$(echo "$NEXT_ISSUE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['title'])")
    GITHUB_NUM=$(echo "$NEXT_ISSUE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['githubNumber'])")
    SLICE_NAME=$(echo "$NEXT_ISSUE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['sliceName'])")
    PRIORITY=$(echo "$NEXT_ISSUE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['priority'])")
    ISSUE_STATUS=$(echo "$NEXT_ISSUE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['status'])")

    PROGRESS=$(count_remaining)

    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}Session #$iteration - Progress: $PROGRESS${NC}"
    echo -e "${YELLOW}Issue #$ISSUE_ID: $ISSUE_TITLE${NC}"
    if [ "$GITHUB_NUM" != "0" ]; then
        echo -e "${YELLOW}GitHub Issue: #$GITHUB_NUM${NC}"
    fi
    echo -e "${YELLOW}Slice: $SLICE_NAME | Priority: $PRIORITY${NC}"
    echo -e "${YELLOW}========================================${NC}"

    # Create session log and json files
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    LOG_FILE="$LOG_DIR/session_${TIMESTAMP}_issue_${ISSUE_ID}.log"
    JSON_FILE="$JSON_DIR/session_${TIMESTAMP}_issue_${ISSUE_ID}.json"

    # Build continuation note if resuming
    if [ "$ISSUE_STATUS" = "in_progress" ]; then
        CONTINUATION_NOTE="
NOTE: This issue was previously started but not completed.
Check sessionHistory in progress.json for context from the previous attempt(s)."
    else
        CONTINUATION_NOTE=""
    fi

    # Build the session prompt
    SESSION_PROMPT="You are working on: $INITIATIVE

## Your Task
Work on Issue #$ISSUE_ID: $ISSUE_TITLE
Slice: $SLICE_NAME | Priority: $PRIORITY
$CONTINUATION_NOTE

## Instructions
1. First, read the progress file to get the current state and any context from previous attempts:
   - Progress: $PROGRESS_FILE

2. If a plan file exists, read it for full issue details:
   - Plan: $PLAN_FILE

3. Implement the changes needed to complete all acceptance criteria

4. Run tests to verify your changes work

5. When done (success OR failure), you MUST update the progress file with:
   - Set status to 'completed' if all acceptance criteria are met
   - Set status to 'in_progress' if partially done
   - Add a 'sessionHistory' array entry with:
     - timestamp: current ISO timestamp
     - attemptNumber: increment from last attempt (or 1 if first)
     - workDone: what you accomplished
     - challenges: any issues encountered
     - nextSteps: what the next session should do
     - testResults: results of any tests run
   - Update acceptanceCriteria 'met' flags as appropriate

## Within-Session Work Management
Use Claude Code native tools to track and execute sub-steps:

1. **TaskCreate** sub-steps from the acceptance criteria (one task per criterion)
2. **TaskUpdate** each task as you progress (pending → in_progress → completed)
3. **Task tool** with specialist sub-agents when work spans domains:
   - Task(subagent_type=\"Explore\") for codebase research
   - Task(subagent_type=\"frontend\"/\"backend\"/\"tester\") for specialist work
4. **TaskList** on resume to check if previous session left partial progress

Skip task ceremony for trivial issues (single file, obvious fix). Use judgment.

## Critical Rules
- Focus ONLY on this single issue
- Do NOT work on other issues
- ALWAYS update progress file before finishing
- If you cannot complete the task, document why in the progress file
- Keep your changes focused and minimal

Begin by reading the progress file to check for any context from previous sessions."

    echo "$SESSION_PROMPT" > "$SESSION_PROMPT_FILE"

    echo ""
    echo "Starting Claude Code session..."
    echo -e "${CYAN}Log file:${NC} $LOG_FILE"
    echo -e "${CYAN}JSON file:${NC} $JSON_FILE"
    echo ""

    # Run Claude Code with the session prompt
    cd "$PROJECT_DIR"

    # Enable native task list persistence across sessions
    export CLAUDE_CODE_TASK_LIST_ID="${INITIATIVE// /-}_issue_${ISSUE_ID}"

    # Track session start time
    SESSION_START=$(date +%s)

    # Use timeout to prevent runaway sessions
    # Use --output-format json to capture token usage statistics
    if timeout $MAX_SESSION_TIME claude --dangerously-skip-permissions --print --output-format json "$SESSION_PROMPT" 2>&1 | tee "$JSON_FILE"; then
        echo ""
        echo -e "${GREEN}Session completed successfully${NC}"
    else
        EXIT_CODE=$?
        echo ""
        if [ $EXIT_CODE -eq 124 ]; then
            echo -e "${RED}Session timed out after $((MAX_SESSION_TIME / 60)) minutes${NC}"
        else
            echo -e "${RED}Session ended with code $EXIT_CODE${NC}"
        fi
    fi

    # Calculate session duration
    SESSION_END=$(date +%s)
    SESSION_DURATION=$((SESSION_END - SESSION_START))
    SESSION_MINUTES=$((SESSION_DURATION / 60))
    SESSION_SECONDS=$((SESSION_DURATION % 60))

    # Parse JSON output for statistics
    echo ""
    echo -e "${CYAN}=== Session Statistics ===${NC}"
    echo -e "Duration: ${SESSION_MINUTES}m ${SESSION_SECONDS}s"

    # Extract token usage and cost from JSON output
    if [ -f "$JSON_FILE" ]; then
        # Parse the JSON for token and cost data
        STATS=$(python3 -c "
import json
import sys

try:
    with open('$JSON_FILE', 'r') as f:
        data = json.load(f)

    usage = data.get('usage', {})
    input_tokens = usage.get('input_tokens', 0)
    output_tokens = usage.get('output_tokens', 0)
    cache_read = usage.get('cache_read_input_tokens', 0)
    cache_creation = usage.get('cache_creation_input_tokens', 0)

    total_cost = data.get('total_cost_usd', 0)
    duration_ms = data.get('duration_ms', 0)
    num_turns = data.get('num_turns', 0)

    # Also get result text for the log file
    result_text = data.get('result', '')

    print(json.dumps({
        'input_tokens': input_tokens,
        'output_tokens': output_tokens,
        'cache_read_tokens': cache_read,
        'cache_creation_tokens': cache_creation,
        'total_tokens': input_tokens + output_tokens + cache_read + cache_creation,
        'cost_usd': round(total_cost, 4),
        'duration_ms': duration_ms,
        'num_turns': num_turns,
        'result': result_text
    }))
except Exception as e:
    print(json.dumps({'error': str(e)}))
" 2>/dev/null)

        if [ -n "$STATS" ] && [ "$STATS" != "null" ]; then
            # Parse stats
            INPUT_TOKENS=$(echo "$STATS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('input_tokens', 0))")
            OUTPUT_TOKENS=$(echo "$STATS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('output_tokens', 0))")
            CACHE_READ=$(echo "$STATS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cache_read_tokens', 0))")
            CACHE_CREATION=$(echo "$STATS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cache_creation_tokens', 0))")
            TOTAL_TOKENS=$(echo "$STATS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('total_tokens', 0))")
            COST_USD=$(echo "$STATS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('cost_usd', 0))")
            NUM_TURNS=$(echo "$STATS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('num_turns', 0))")
            RESULT_TEXT=$(echo "$STATS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result', ''))")

            # Display token usage
            echo -e "${CYAN}Token Usage:${NC}"
            echo -e "  Input: $INPUT_TOKENS | Output: $OUTPUT_TOKENS"
            echo -e "  Cache Read: $CACHE_READ | Cache Creation: $CACHE_CREATION"
            echo -e "  Total: $TOTAL_TOKENS tokens"
            echo -e "${CYAN}Cost:${NC} \$$COST_USD USD"
            echo -e "${CYAN}Turns:${NC} $NUM_TURNS"

            # Save result text to log file for readability
            echo "$RESULT_TEXT" > "$LOG_FILE"

            # Update progress.json with session stats including token usage
            python3 -c "
import json
from datetime import datetime

with open('$PROGRESS_FILE', 'r') as f:
    data = json.load(f)

# Find the current issue and update its last session with stats
for slice in data.get('slices', []):
    for issue in slice.get('issues', []):
        if issue.get('id') == $ISSUE_ID:
            if issue.get('sessionHistory') and len(issue['sessionHistory']) > 0:
                # Update the last session entry with stats
                last_session = issue['sessionHistory'][-1]
                last_session['stats'] = {
                    'durationSeconds': $SESSION_DURATION,
                    'numTurns': $NUM_TURNS,
                    'tokenUsage': {
                        'input': $INPUT_TOKENS,
                        'output': $OUTPUT_TOKENS,
                        'cacheRead': $CACHE_READ,
                        'cacheCreation': $CACHE_CREATION,
                        'total': $TOTAL_TOKENS
                    },
                    'costUSD': $COST_USD,
                    'logFile': '$LOG_FILE',
                    'jsonFile': '$JSON_FILE'
                }
            break

with open('$PROGRESS_FILE', 'w') as f:
    json.dump(data, f, indent=2)
" 2>/dev/null || echo -e "${YELLOW}Warning: Could not update progress.json with stats${NC}"
        else
            echo -e "${YELLOW}Warning: Could not parse session JSON output${NC}"
        fi
    fi

    # Check if user wants to continue (requires explicit approval)
    echo ""
    echo -e "${CYAN}Session complete. Review the changes before continuing.${NC}"
    echo -n "Continue to next issue? (y=continue/n=stop/s=skip current): "
    read RESPONSE

    case "$RESPONSE" in
        [yY])
            echo "Continuing to next issue..."
            ;;
        [sS])
            echo "Skipping issue #$ISSUE_ID..."
            python3 -c "
import json
with open('$PROGRESS_FILE', 'r') as f:
    data = json.load(f)

for slice in data.get('slices', []):
    for issue in slice.get('issues', []):
        if issue.get('id') == $ISSUE_ID:
            issue['status'] = 'skipped'
            break

with open('$PROGRESS_FILE', 'w') as f:
    json.dump(data, f, indent=2)
"
            ;;
        *)
            echo "Stopping runner."
            break
            ;;
    esac
done

echo ""
echo -e "${GREEN}=== Session Runner Complete ===${NC}"
FINAL_PROGRESS=$(count_remaining)
echo -e "Final progress: ${CYAN}$FINAL_PROGRESS${NC}"
echo ""
echo "Session logs available in: $LOG_DIR"
echo "Session JSON (with token stats) available in: $JSON_DIR"
