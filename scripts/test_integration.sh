#!/bin/bash
set -e
BASE="http://localhost:8000/api/v1"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓ PASS${NC} — $1"; }
fail() { echo -e "${RED}✗ FAIL${NC} — $1"; exit 1; }

echo "═══════════════════════════════════════"
echo "  AI Career Copilot — Integration Test"
echo "═══════════════════════════════════════"

# 1. Health check
echo -e "\n▸ Test 1: Backend health"
STATUS=$(curl -sf -o /dev/null -w "%{http_code}" $BASE/../health) || fail "Backend unreachable"
[ "$STATUS" = "200" ] && pass "Backend is healthy" || fail "Health check returned $STATUS"

# 2. Register
echo -e "\n▸ Test 2: Register"
REGISTER=$(curl -sf -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test_'$RANDOM'@test.com","password":"testpass123"}')
echo "$REGISTER" | grep -q "email" && pass "Register → user created" || fail "Register failed: $REGISTER"
TEST_EMAIL=$(echo $REGISTER | python3 -c "import sys,json;print(json.load(sys.stdin)['email'])")

# 3. Login
echo -e "\n▸ Test 3: Login"
LOGIN=$(curl -sf -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"testpass123\"}")
TOKEN=$(echo $LOGIN | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
[ -n "$TOKEN" ] && pass "Login → token received" || fail "Login failed: $LOGIN"

# 4. Resume list (empty)
echo -e "\n▸ Test 4: Resume list (empty)"
LIST=$(curl -sf "$BASE/resume/list" -H "Authorization: Bearer $TOKEN")
echo "$LIST" | python3 -c "import sys,json;data=json.load(sys.stdin);assert isinstance(data,list)"
pass "Resume list → returns array"

# 5. Upload resume
echo -e "\n▸ Test 5: Resume upload"
# Create a minimal test PDF
echo "%PDF-1.4 Python SQL React Docker" > /tmp/test_resume.pdf
UPLOAD=$(curl -sf -X POST "$BASE/resume/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test_resume.pdf")
RESUME_ID=$(echo $UPLOAD | python3 -c "import sys,json;print(json.load(sys.stdin)['resume_id'])" 2>/dev/null)
[ -n "$RESUME_ID" ] && pass "Upload → resume_id=$RESUME_ID" || fail "Upload failed: $UPLOAD"

# 6. Get analysis
echo -e "\n▸ Test 6: Analysis"
ANALYSIS=$(curl -sf "$BASE/resume/analysis/$RESUME_ID" -H "Authorization: Bearer $TOKEN")
echo $ANALYSIS | python3 -c "import sys,json;d=json.load(sys.stdin);assert 'ats_score' in d"
pass "Analysis → ats_score present"

ANALYSIS_ID=$(echo $ANALYSIS | python3 -c "import sys,json;print(json.load(sys.stdin)['analysis_id'])")

# 7. Start interview
echo -e "\n▸ Test 7: Interview start"
SESSION=$(curl -sf -X POST "$BASE/interview/start" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"target_role\":\"Software Engineer\",\"analysis_id\":$ANALYSIS_ID}")
SESSION_ID=$(echo $SESSION | python3 -c "import sys,json;print(json.load(sys.stdin)['session_id'])" 2>/dev/null)
Q_ID=$(echo $SESSION | python3 -c "import sys,json;print(json.load(sys.stdin)['questions'][0]['id'])" 2>/dev/null)
[ -n "$SESSION_ID" ] && pass "Interview start → session_id=$SESSION_ID" || fail "Interview start failed: $SESSION"

# 8. Submit answer
echo -e "\n▸ Test 8: Interview answer"
ANSWER=$(curl -sf -X POST "$BASE/interview/answer" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":$SESSION_ID,\"question_id\":$Q_ID,\"answer\":\"I have strong Python and SQL skills.\"}")
echo $ANSWER | python3 -c "import sys,json;d=json.load(sys.stdin);assert 'score' in d"
pass "Answer → score present"

# 9. Delete resume
echo -e "\n▸ Test 9: Delete resume"
DEL=$(curl -sf -o /dev/null -w "%{http_code}" -X DELETE \
  "$BASE/resume/$RESUME_ID" -H "Authorization: Bearer $TOKEN")
[ "$DEL" = "204" ] && pass "Delete → 204 No Content" || fail "Delete returned $DEL"

echo -e "\n═══════════════════════════════════════"
echo -e "  ${GREEN}ALL TESTS PASSED ✓${NC}"
echo "═══════════════════════════════════════"
