from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pathlib import Path
from unzipper import extract_zip
from analyzer import (
    load_and_group_issues,
    save_grouped_issues,
    save_piece_markdowns,
    merge_markdowns_to_pdf,
)
import zipfile, json, uuid, shutil, traceback
import os
from dotenv import load_dotenv
from datetime import datetime

# .env 파일 로드
load_dotenv()

app = Flask(__name__)
CORS(app)

# 공유 볼륨의 올바른 기본 경로를 .env 파일의 환경 변수에서 직접 가져옵니다.
SHARED_JOBS_DIR = Path(os.environ.get("WORKSPACE_DIR", "./workspace")) / 'jobs'

def _job_dirs(job_id: str) -> dict:
    """요청별 job_id 하위 디렉토리 생성(있으면 초기화)"""
    # jobs 디렉토리가 없으면 먼저 생성
    SHARED_JOBS_DIR.mkdir(parents=True, exist_ok=True)
    
    job_base = SHARED_JOBS_DIR / job_id
    
    # DIRS 변수를 사용하는 대신 올바른 절대 경로를 직접 생성합니다.
    paths = {
        "received":   job_base / "received",
        "extracted":  job_base / "extracted",
        "files":      job_base / "files",
        "markdowns":  job_base / "markdowns",
        "output":     job_base / "output",
    }

    # received/extracted/files/markdowns는 싹 비우고 다시 생성
    for k in ["received", "extracted", "files", "markdowns"]:
        p = paths[k]
        if p.exists():
            shutil.rmtree(p, ignore_errors=True)
        p.mkdir(parents=True, exist_ok=True)

    # output은 결과물 위치: 폴더만 보장 (덮어쓰기 허용)
    paths["output"].mkdir(parents=True, exist_ok=True)
    return paths

@app.route('/deep-analyze', methods=['POST'])
def deep_analyze():
    print("=== Flask-B: Deep Analysis 시작 ===")
    print(f"요청 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if 'json_file' not in request.files or 'source_zip' not in request.files:
        print("[에러] 필수 파일이 누락되었습니다")
        return jsonify({'error': 'Missing files'}), 400

    json_file  = request.files['json_file']
    source_zip = request.files['source_zip']
    if not json_file.filename or not source_zip.filename:
        print("[에러] 파일명이 비어있습니다")
        return jsonify({'error': 'Empty files'}), 400

    job_id = (request.form.get("job_id") or "").strip() or uuid.uuid4().hex
    print(f"[작업 ID] {job_id}")
    
    J = _job_dirs(job_id)
    print(f"[디렉토리 생성 완료] {J}")

    json_path = J['received'] / 'issues.json'
    zip_path  = J['received'] / 'source.zip'

    json_file.save(str(json_path))
    source_zip.save(str(zip_path))
    print(f"[파일 저장 완료] JSON: {json_path}, ZIP: {zip_path}")

    try:
        print("[1단계] ZIP 압축 해제 시작...")
        extract_zip(zip_path, J['extracted'])
        print(f"[1단계 완료] 압축 해제: {J['extracted']}")
        
        print("[2단계] JSON 분석 및 그룹화 시작...")
        grouped = load_and_group_issues(json_path)
        print(f"[2단계 완료] 그룹화된 이슈: {len(grouped)}개")
        
        print("[3단계] 그룹화된 이슈 저장 시작...")
        save_grouped_issues(J['files'], grouped, J['extracted'])
        print(f"[3단계 완료] 파일 저장: {J['files']}")
        
        print("[4단계] LLM 분석 시작...")
        meta = save_piece_markdowns(J['files'], J['markdowns'])
        print(f"[4단계 완료] LLM 분석: 성공 {meta.get('success_count', 0)}개, 실패 {meta.get('failure_count', 0)}개")
        
        print("[5단계] PDF 생성 시작...")
        output_pdf_path = J['output'] / f"{meta.get('job_id', job_id)}.pdf"
        merge_markdowns_to_pdf(J['markdowns'], J['output'], meta)
        
        if not output_pdf_path.exists():
            print(f"[에러] PDF 파일이 생성되지 않음: {output_pdf_path}")
            return jsonify({'error': 'PDF not generated'}), 500
        
        pdf_size = output_pdf_path.stat().st_size
        print(f"[5단계 완료] PDF 생성: {output_pdf_path} ({pdf_size} bytes)")

        accept = (request.headers.get('Accept') or '').lower()
        if 'application/pdf' in accept:
            print(f"[응답] PDF 파일 전송: {output_pdf_path}")
            return send_file(
                str(output_pdf_path),
                mimetype='application/pdf',
                as_attachment=True,
                download_name=f"{job_id}.pdf"
            )

        print(f"[응답] JSON 응답 전송: job_id={job_id}")
        return jsonify({
            'message': 'ok',
            'job_id': job_id,
            'total': len(grouped),
            'processed_total': meta.get('processed_total'),
            'success_count': meta.get('success_count'),
            'skipped_count': meta.get('skipped_count'),
            'pdf_path': str(output_pdf_path),
        }), 200

    except (zipfile.BadZipFile, json.JSONDecodeError) as e:
        print(f"[에러] 잘못된 파일 형식: {e}")
        return jsonify({'error': 'Bad request: invalid zip or json'}), 400
    except Exception as e:
        print(f"[에러] 내부 오류: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Internal error', 'detail': str(e)}), 500

if __name__ == '__main__':
    # .env 파일을 직접 읽어서 환경변수 설정
    if os.path.exists('.env'):
        with open('.env', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
                    print(f"[Flask-B] 환경변수 설정: {key.strip()} = {value.strip()}")
    
    # 환경변수 로딩 상태 출력
    print("=== Flask-B 환경변수 로딩 상태 ===")
    print(f"ANTHROPIC_API_KEY: {'설정됨' if os.environ.get('ANTHROPIC_API_KEY') else 'NOT_SET'}")
    print(f"WORKSPACE_DIR: {os.environ.get('WORKSPACE_DIR', 'NOT_SET')}")
    print(f"현재 작업 디렉토리: {os.getcwd()}")
    print(f".env 파일 존재: {os.path.exists('.env')}")
    print("=================================")
    
    app.run(port=5001, debug=True)