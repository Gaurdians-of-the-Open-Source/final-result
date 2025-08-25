from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import os
import uuid
import json
from dotenv import load_dotenv
import threading
import time

# .env 파일 로드
load_dotenv()

from analysis.unzip import save_and_unzip
from analysis.detector import analyze_project

# B로 보내는 유틸
from forwarder import send_to_flask_b, ForwardError

# 분석 상태를 저장할 전역 딕셔너리
analysis_status = {}

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
FINAL_OUTPUT_DIR = os.path.join(BASE_DIR, "final_output")  # 최종 PDF 저장 디렉토리
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)
os.makedirs(FINAL_OUTPUT_DIR, exist_ok=True)  # final_output 디렉토리 생성

@app.route("/analyze", methods=["POST"])
def analyze():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    try:
        # === 0) job_id 생성 ===
        job_id = request.form.get("job_id") or str(uuid.uuid4())
        job_upload_dir = os.path.join(UPLOADS_DIR, job_id)
        job_output_dir = os.path.join(OUTPUTS_DIR, job_id)
        os.makedirs(job_upload_dir, exist_ok=True)
        os.makedirs(job_output_dir, exist_ok=True)
        
        # 분석 시작 상태 설정
        analysis_status[job_id] = {
            "status": "uploading",
            "message": "File uploaded, starting analysis...",
            "progress": 10,
            "timestamp": time.time()
        }

        # === 1) 업로드 ZIP을 먼저 저장 (B로 보낼 원본 보존) ===
        zip_save_path = os.path.join(job_upload_dir, "source.zip")
        file.save(zip_save_path)

        # save_and_unzip에서 동일 파일 객체를 쓰길 원할 수 있으니 스트림 위치 초기화
        try:
            file.stream.seek(0)
        except Exception:
            pass

        # === 2) 압축 해제 ===
        analysis_status[job_id].update({
            "status": "extracting",
            "message": "Extracting ZIP file...",
            "progress": 20
        })
        
        extracted_path = save_and_unzip(file)
        print("[압축 해제 위치]", extracted_path)
        print("[압축 해제 후 내용]", os.listdir(extracted_path))

        # === 3) 상위 디렉토리 1개만 있으면 내부로 자동 진입 ===
        subitems = os.listdir(extracted_path)
        if len(subitems) == 1:
            subdir = os.path.join(extracted_path, subitems[0])
            if os.path.isdir(subdir):
                print("[자동 진입] →", subdir)
                extracted_path = subdir

        # === 4) 정적 분석 수행 ===
        analysis_status[job_id].update({
            "status": "analyzing",
            "message": "Performing static analysis...",
            "progress": 30
        })
        
        formatted = analyze_project(extracted_path)

        # === 5) issues.json 저장 (outputs/{job_id}/issues.json) ===
        analysis_status[job_id].update({
            "status": "static_completed",
            "message": "Static analysis completed, forwarding to Flask-B...",
            "progress": 40
        })
        
        issues_path = os.path.join(job_output_dir, "issues.json")
        with open(issues_path, "w", encoding="utf-8") as f:
            json.dump(formatted, f, ensure_ascii=False, indent=2)

        # === 6) 즉시 Flask B로 전송 → B의 응답 그대로 리턴 ===
        # B로 보내는 과정에서 발생하는 오류를 별도로 처리합니다.
        try:
            analysis_status[job_id].update({
                "status": "forwarding",
                "message": "Forwarding to Flask-B for LLM analysis...",
                "progress": 50
            })
            
            print(f"[Flask-B 전송 시작] job_id: {job_id}")
            body, content_type, filename = send_to_flask_b(
                job_id=job_id,
                source_zip_path=zip_save_path,     # A가 받은 업로드 ZIP
                issues_json_path=issues_path,      # A가 만든 issues.json
                # flask_b_base_url 미지정 시 환경변수 FLASK_B_BASE_URL 또는 http://127.0.0.1:5001
                accept=request.headers.get("Accept", "application/pdf"),
            )
            
            # Flask-B에서 받은 PDF를 final_output 디렉토리에 저장
            print(f"[Flask-B 응답 정보] content_type: {content_type}")
            print(f"[Flask-B 응답 정보] body 크기: {len(body)} bytes")
            print(f"[Flask-B 응답 정보] filename: {filename}")
            
            if content_type and 'pdf' in content_type.lower():
                final_pdf_path = os.path.join(FINAL_OUTPUT_DIR, f"{job_id}.pdf")
                with open(final_pdf_path, "wb") as f:
                    f.write(body)
                print(f"[PDF 저장 완료] {final_pdf_path}")
                print(f"[파일 크기] {len(body)} bytes")
            else:
                print(f"[PDF 저장 실패] content_type이 PDF가 아님: {content_type}")
                # content_type이 PDF가 아니어도 body가 있으면 저장 시도
                if body and len(body) > 0:
                    final_pdf_path = os.path.join(FINAL_OUTPUT_DIR, f"{job_id}.pdf")
                    with open(final_pdf_path, "wb") as f:
                        f.write(body)
                    print(f"[강제 PDF 저장] {final_pdf_path} (content_type 무시)")
                    print(f"[파일 크기] {len(body)} bytes")
            
        except ForwardError as fe:
            # send_to_flask_b에서 발생한 특정 오류를 잡아내서 처리합니다.
            print(f"[Flask-B 전송 실패] {str(fe)}")
            error_msg = f"Failed to forward to Flask B: {str(fe)}"
            print(f"[에러 메시지] {error_msg}")
            return jsonify({"error": error_msg, "details": str(fe)}), 502 # 502 Bad Gateway

        # Flask-B에서 PDF를 받았으므로 LLM 분석 완료 상태로 업데이트
        analysis_status[job_id] = {
            "status": "llm_completed",
            "message": "LLM analysis completed successfully! PDF generated and saved.",
            "progress": 100,
            "timestamp": time.time(),
            "pdf_path": os.path.join(FINAL_OUTPUT_DIR, f"{job_id}.pdf")
        }
        
        # 콘텐츠 타입 보고 그대로 내려보냄
        resp = Response(body, mimetype=content_type if content_type else None)
        if filename:
            resp.headers["Content-Disposition"] = f'attachment; filename="{filename}"'
        
        # jobId를 응답 헤더에 포함
        resp.headers["X-Job-ID"] = job_id
        resp.headers["Access-Control-Expose-Headers"] = "X-Job-ID"
        
        print(f"[응답 헤더 설정] X-Job-ID: {job_id}")
        print(f"[응답 헤더 설정] 모든 헤더: {dict(resp.headers)}")
        
        return resp

    except Exception as e:
        print(f"[Flask-A 오류] {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # 더 자세한 오류 정보 제공
        error_details = {
            "error": str(e),
            "error_type": type(e).__name__,
            "message": "파일 처리 중 오류가 발생했습니다."
        }
        
        return jsonify(error_details), 500


@app.route("/status/<job_id>", methods=["GET"])
def get_status(job_id):
    """분석 작업의 상태를 조회하는 엔드포인트"""
    if job_id not in analysis_status:
        return jsonify({"error": "Job not found"}), 404
    
    status_info = analysis_status[job_id].copy()
    # 민감한 정보 제거
    if "pdf_path" in status_info:
        del status_info["pdf_path"]
    
    return jsonify(status_info)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "service": "Flask A"})

if __name__ == "__main__":
    # .env 파일을 직접 읽어서 환경변수 설정
    if os.path.exists('.env'):
        with open('.env', 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
                    print(f"환경변수 설정: {key.strip()} = {value.strip()}")
    
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("outputs", exist_ok=True)
    os.makedirs("final_output", exist_ok=True)  # final_output 디렉토리 생성
    
    # 환경변수 로딩 상태 출력
    print("=== Flask-A 환경변수 로딩 상태 ===")
    print(f"환경변수 설정 완료")
    print(f"현재 작업 디렉토리: {os.getcwd()}")
    print(f".env 파일 존재: {os.path.exists('.env')}")
    if os.path.exists('.env'):
        with open('.env', 'r', encoding='utf-8') as f:
            print(f".env 파일 내용: {f.read().strip()}")
    print("=================================")
    
    app.run(debug=True, host="0.0.0.0", port=5000)