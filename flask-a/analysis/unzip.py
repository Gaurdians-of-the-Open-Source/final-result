import os
import zipfile
import shutil
import uuid
import json

UPLOAD_DIR = "uploads"
SEED_FILE = os.path.join(UPLOAD_DIR, "job_id_seed.txt") # 사용하지 않음

def get_next_job_id():
    """안전하게 고유한 Job ID를 생성한다."""
    return str(uuid.uuid4())

def safe_extractall(zip_file, path):
    """경로 조작을 방어하며 압축 파일을 해제한다."""
    for member in zip_file.namelist():
        # 경로 조작 문자가 있는지 확인
        if member.startswith('/') or '..' in member:
            print(f"경로 조작 시도 감지: {member}")
            continue
        
        # 안전한 경로 생성
        dest_path = os.path.join(path, member)
        if not dest_path.startswith(path):
            print(f"경로 조작 시도 감지: {member}")
            continue

        # 파일만 추출 (디렉토리 무시)
        if not member.endswith('/'):
            zip_file.extract(member, path)

def flatten_directory(root_path):
    # 사용하지 않는 함수이므로 그대로 둔다.
    index = 0
    mapping = {}

    for root, dirs, files in os.walk(root_path):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            src = os.path.join(root, file)
            short_name = f"file_{index}{ext}"
            dst = os.path.join(root_path, short_name)
            try:
                if not os.path.exists(dst):
                    shutil.copy2(src, dst)
                    rel_src = os.path.relpath(src, root_path)
                    mapping[short_name] = rel_src.replace("\\", "/")
                    index += 1
            except Exception:
                pass

    map_path = os.path.join(root_path, "flatten_map.json")
    with open(map_path, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)

def save_and_unzip(file_storage):
    """파일을 저장하고 안전하게 압축을 해제한다."""
    job_id = get_next_job_id()
    job_path = os.path.join(UPLOAD_DIR, job_id)
    zip_path = os.path.join(job_path, "input.zip")

    os.makedirs(job_path, exist_ok=True)
    file_storage.save(zip_path)

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        safe_extractall(zip_ref, job_path) # 수정된 함수 호출

    subitems = os.listdir(job_path)
    if len(subitems) == 1:
        subdir = os.path.join(job_path, subitems[0])
        if os.path.isdir(subdir):
            print("[자동 진입] →", subdir)
            job_path = subdir

    return job_path