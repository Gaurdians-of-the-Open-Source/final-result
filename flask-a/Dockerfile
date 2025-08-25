# 1. 베이스 이미지 선택
FROM python:3.11-slim

# 2. 작업 디렉토리 설정
WORKDIR /app

# 3. 의존성 파일 복사 및 설치
# 이 부분을 수정하여 모든 의존성을 requirements.txt에 넣고 한 번에 설치
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. 소스 코드 복사
COPY . .

# 5. 컨테이너가 시작될 때 실행할 명령어
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]