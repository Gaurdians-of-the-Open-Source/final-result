# forwarder.py
import os
import time
import re
import urllib.parse
import requests
from typing import Optional, Tuple
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# B 서버 기본 주소: 환경변수 FLASK_B_BASE_URL로 덮어쓸 수 있음
# 함수 내부에서 동적으로 가져오도록 수정
# DEFAULT_FLASK_B_BASE = os.environ.get("FLASK_B_BASE_URL", "http://localhost:5001")

# Flask B의 수신 엔드포인트 (B의 app.py에서 /deep-analyze 사용 중)
RECEIVE_ENDPOINT = "/deep-analyze"

class ForwardError(Exception):
    pass

def _exists_or_raise(path: str, kind: str):
    if not os.path.exists(path):
        raise ForwardError(f"{kind} not found: {path}")

def _parse_filename_from_cd(content_disposition: str) -> Optional[str]:
    """
    Content-Disposition 헤더에서 파일명 파싱 (RFC 5987/6266 일부 대응)
    """
    if not content_disposition:
        return None

    # filename*=UTF-8''encoded-name.pdf
    m = re.search(r'filename\*\s*=\s*([^\'"]+)\'\'([^;]+)', content_disposition, flags=re.IGNORECASE)
    if m:
        enc, name = m.groups()
        try:
            return urllib.parse.unquote(name, encoding=enc, errors="replace")
        except Exception:
            return urllib.parse.unquote(name)

    # filename="name.pdf" 또는 filename=name.pdf
    m = re.search(r'filename\s*=\s*"?([^";]+)"?', content_disposition, flags=re.IGNORECASE)
    if m:
        return m.group(1)

    return None

def send_to_flask_b(
    job_id: str,
    source_zip_path: str,
    issues_json_path: str,
    flask_b_base_url: Optional[str] = None,
    timeout_sec: int = 600,
    retries: int = 1,
    accept: str = "application/pdf",
) -> Tuple[bytes, str, Optional[str]]:
    """
    Flask B의 /deep-analyze 로 멀티파트 업로드 → 응답 바디/콘텐츠타입/파일명 추출.
    반환: (body_bytes, content_type, filename_or_none)
    """
    # .env 파일을 직접 읽어서 환경변수 설정
    if os.path.exists('.env'):
        with open('.env', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
    
    # 함수 실행 시점에 환경변수에서 동적으로 가져오기
    default_flask_b_base = os.environ.get("FLASK_B_BASE_URL", "http://localhost:5001")
    
    base = (flask_b_base_url or default_flask_b_base).rstrip("/")
    url = f"{base}{RECEIVE_ENDPOINT}"
    
    # 디버깅을 위한 환경변수 및 URL 정보 출력
    print(f"[Forwarder Debug] default_flask_b_base: {default_flask_b_base}")
    print(f"[Forwarder Debug] flask_b_base_url parameter: {flask_b_base_url}")
    print(f"[Forwarder Debug] Final URL: {url}")
    print(f"[Forwarder Debug] Environment FLASK_B_BASE_URL: {os.environ.get('FLASK_B_BASE_URL', 'NOT_SET')}")

    _exists_or_raise(source_zip_path, "source_zip")
    _exists_or_raise(issues_json_path, "issues_json")

    headers = {"Accept": "application/pdf"}

    last_err = None
    for attempt in range(retries + 1):
        try:
            with open(source_zip_path, "rb") as f_zip, open(issues_json_path, "rb") as f_json:
                files = {
                    "source_zip": ("source.zip", f_zip, "application/zip"),
                    "json_file":  ("issues.json", f_json, "application/json"),
                }
                data = {"job_id": job_id}

                print(f"[Forwarder] Flask-B로 요청 전송 중... URL: {url}")
                resp = requests.post(
                    url,
                    data=data,
                    files=files,
                    headers=headers,
                    timeout=timeout_sec,
                    stream=True,
                )
                
                print(f"[Forwarder] Flask-B 응답 상태: {resp.status_code}")
                print(f"[Forwarder] Flask-B 응답 헤더: {dict(resp.headers)}")
                
                resp.raise_for_status()

                content_type = resp.headers.get("Content-Type", "") or ""
                body = resp.content

                print(f"[Forwarder] Flask-B 응답 성공 - Content-Type: {content_type}, Body 크기: {len(body)} bytes")

                # 파일명 파싱 (PDF일 때 다운로드 이름으로 활용)
                cd = resp.headers.get("Content-Disposition", "") or ""
                filename = _parse_filename_from_cd(cd)

                return body, content_type, filename

        except Exception as e:
            print(f"[Forwarder] Flask-B 연결 시도 {attempt + 1} 실패: {type(e).__name__}: {str(e)}")
            last_err = e
            if attempt < retries:
                print(f"[Forwarder] {time.sleep(1.0)}초 후 재시도...")
                time.sleep(1.0)
                continue
            break

    # 더 자세한 오류 정보 제공
    if isinstance(last_err, requests.exceptions.ConnectionError):
        error_msg = f"Flask-B 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요. (URL: {url})"
    elif isinstance(last_err, requests.exceptions.Timeout):
        error_msg = f"Flask-B 서버 응답 시간 초과. (timeout: {timeout_sec}초)"
    elif isinstance(last_err, requests.exceptions.HTTPError):
        error_msg = f"Flask-B 서버 HTTP 오류: {last_err}"
    else:
        error_msg = f"Flask-B 서버 연결 실패: {last_err}"
    
    print(f"[Forwarder] 최종 오류: {error_msg}")
    raise ForwardError(error_msg)
