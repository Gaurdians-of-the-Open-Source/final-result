import anthropic
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# .env 파일을 직접 읽어서 환경변수 설정
if os.path.exists('.env'):
    with open('.env', 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()
                print(f"[llm_utils] 환경변수 설정: {key.strip()} = {value.strip()}")

MODEL = 'claude-sonnet-4-20250514'
MAX_TOKENS = 2048

# 환경변수에서 API 키 가져오기 (방금 설정한 환경변수 사용)
ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')
print(f"[llm_utils] 환경변수에서 읽은 ANTHROPIC_API_KEY: {ANTHROPIC_API_KEY[:20] if ANTHROPIC_API_KEY else 'None'}...")

if not ANTHROPIC_API_KEY:
    print("Warning: ANTHROPIC_API_KEY not found in environment variables")
    # 환경변수가 없으면 직접 설정
    os.environ['ANTHROPIC_API_KEY'] = 'sk-ant-api03-T8A5_W01G2EPQ0Rg8gz3o_R6EdkBKMLkMLFVvYDWQUVBugnkQ3QV68T7bQdScWlHL3TzIj61Vbw__9fDAAOl1sA-vBX43QAA'
    ANTHROPIC_API_KEY = os.environ['ANTHROPIC_API_KEY']
    print(f"[llm_utils] 환경변수 직접 설정: {ANTHROPIC_API_KEY[:20]}...")
    print(f"[llm_utils] 실제 API 키 사용: {ANTHROPIC_API_KEY[:20]}...")
else:
    print(f"[llm_utils] 실제 API 키 사용: {ANTHROPIC_API_KEY[:20]}...")

CLIENT = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

SYSTEM_DEFAULT = (
    'Act as a senior security auditor. Output pure Markdown with a final "Instructions" section. '
    'For each issue: summary, risk, vulnerable snippet, fixed snippet.'
)

def generate_llm_md(issue_json_text, code_text, system=SYSTEM_DEFAULT):
    # API 키가 더미 키인 경우 실제 API 호출 대신 더미 응답 반환
    if ANTHROPIC_API_KEY == 'dummy_key_for_development':
        print("Warning: Using dummy API key. LLM analysis will be skipped.")
        return f"""# Security Analysis Report

## Summary
This is a dummy report generated for development purposes.

## Issues Found
- No actual LLM analysis performed due to missing API key

## Instructions
Please set a valid ANTHROPIC_API_KEY in your environment variables for production use.
"""

    try:
        resp = CLIENT.messages.create(
            model=MODEL,
            system=system,
            messages=[{
                'role': 'user',
                'content': (
                    '## JSON\n```json\n' + issue_json_text + '\n```\n\n'
                    '## Source Code\n```text\n' + code_text + '\n```\n'
                    '## Output Rules\nPure Markdown only; include "Instructions" at the end.'
                ),
            }],
            max_tokens=MAX_TOKENS,
            timeout = 30
        )

        parts = []
        for block in resp.content:
            text = getattr(block, 'text', None)
            if isinstance(text, str):
                parts.append(text)
        return "".join(parts).strip()
    except Exception as e:
        print(f"Error in LLM analysis: {e}")
        return f"""# Security Analysis Report

## Summary
Error occurred during LLM analysis: {str(e)}

## Instructions
Please check your API configuration and try again.
"""
