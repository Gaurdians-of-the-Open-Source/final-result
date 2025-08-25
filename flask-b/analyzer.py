import os
import json
import shutil
import uuid, markdown
from datetime import datetime, timezone
from xhtml2pdf import pisa
from collections import defaultdict
from pathlib import Path
from llm_utils import generate_llm_md
from concurrent.futures import ThreadPoolExecutor

def load_and_group_issues(json_path):
    json_path = Path(json_path)
    with open(json_path, 'r', encoding='utf-8') as f:
        issues_data = json.load(f)
    
    grouped = defaultdict(list)
    for issue in issues_data:
        fp = issue.get('path')
        if fp:
            grouped[fp].append(issue)
    
    return dict(grouped)

def save_grouped_issues(files_dir, grouped_issues, extracted_root):
    files_dir = Path(files_dir)
    extracted_root = Path(extracted_root)
    
    for file_path, issues in grouped_issues.items():
        filename = os.path.basename(file_path)
        name_no_ext = os.path.splitext(filename)[0]
        folder_path = Path(files_dir) / filename
        folder_path.mkdir(parents=True, exist_ok=True)

        save_path = folder_path / f'issues_{name_no_ext}.json'
        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(issues, f, ensure_ascii=False, indent=2)
    
        rel = Path(str(file_path).replace('\\', '/').lstrip('/'))
        src = extracted_root / rel
        dst = folder_path / filename

        if src.exists():
            shutil.copy2(src, dst)

def process_file_with_llm(sub, markdown_dir):
    """단일 파일에 대한 LLM 처리 로직"""
    try:
        try:
            issue_file = next(sub.glob('issues_*.json'))
        except StopIteration:
            raise FileNotFoundError('missing issues_*.json')

        try:
            code_file = next(
                p for p in sub.iterdir()
                if p.is_file() and p.suffix.lower() != '.json'
            )
        except StopIteration:
            raise FileNotFoundError('missing source file')

        issue_text = issue_file.read_text(encoding='utf-8')
        code_text  = code_file.read_text(encoding='utf-8')

        parsed = json.loads(issue_text)

        if isinstance(parsed, list) and len(parsed) == 0:
            return {'status': 'skipped', 'name': sub.name}

        md = generate_llm_md(issue_text, code_text)
        piece_path = markdown_dir / f'{sub.name}.md'
        piece_path.write_text(md, encoding='utf-8')

        return {'status': 'success', 'path': str(piece_path)}

    except Exception as e:
        return {'status': 'failure', 'name': sub.name, 'error': str(e), 'type': type(e).__name__}

def save_piece_markdowns(files_dir, markdown_dir):
    files_dir = Path(files_dir)
    markdown_dir = Path(markdown_dir)
    
    job_id = str(uuid.uuid4())
    started_at = datetime.now(timezone.utc).isoformat()
    
    piece_paths = []
    failed_items = []
    success_count = 0
    skipped_count = 0
    processed_total = 0

    sub_dirs = sorted((d for d in files_dir.glob('*') if d.is_dir()), key=lambda p: p.name)
    processed_total = len(sub_dirs)
    
    with ThreadPoolExecutor(max_workers=5) as executor: # 병렬 처리를 위한 Executor
        futures = {executor.submit(process_file_with_llm, sub, markdown_dir): sub for sub in sub_dirs}

        for future in futures:
            result = future.result()
            if result['status'] == 'success':
                success_count += 1
                piece_paths.append(result['path'])
            elif result['status'] == 'skipped':
                skipped_count += 1
            else:
                failed_items.append(f"{result['name']}: {result['type']} - {result['error']}")
    
    finished_at = datetime.now(timezone.utc).isoformat()

    return {
        'job_id': job_id,
        'started_at': started_at,
        'finished_at': finished_at,
        'processed_total': processed_total,
        'success_count': success_count,
        'skipped_count': skipped_count,
        'failure_count': len(failed_items),
        'failed_items': failed_items,
        'pieces': piece_paths,
    }
    
def merge_markdowns_to_pdf(markdown_dir, output_dir, meta):
    # 이 부분은 수정하지 않았다.
    markdown_dir = Path(markdown_dir)
    output_dir = Path(output_dir)
    
    job_id = meta['job_id']

    pieces = sorted(markdown_dir.glob('*.md'))

    merged_lines = ['# Security Audit Report', '']
    if not pieces:
        merged_lines.append('_No content_.')
    else:
        for p in pieces:
            merged_lines.append(f'---\n\n## File: `{p.stem}`\n')
            merged_lines.append(p.read_text(encoding='utf-8'))
            merged_lines.append('')

    merged_md = '\n'.join(merged_lines).strip()

    md_path = output_dir / f'{job_id}.md'
    md_path.write_text(merged_md, encoding="utf-8")

    html_body = markdown.markdown(merged_md, extensions=['fenced_code', 'tables'])

    full_html = (
        "<!doctype html>"
        '<meta charset="utf-8">'
        "<title>Security Audit Report</title>"
        '<body style="max-width:900px;margin:40px auto;font-family:Arial, sans-serif; line-height:1.6;">'
        f"{html_body}</body>"
    )

    pdf_path = output_dir / f'{job_id}.pdf'
    with open(pdf_path, "wb") as f:
        result = pisa.CreatePDF(src=full_html, dest=f, encoding="utf-8")

    if result.err:
        raise RuntimeError("PDF 생성 중 오류가 발생했습니다.")

    (output_dir / f"{job_id}.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )