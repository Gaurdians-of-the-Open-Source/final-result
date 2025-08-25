// src/services/api.ts

import axios from 'axios';

// Flask-A의 기본 URL로 변경
const API_BASE_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * 파일을 Flask-A로 직접 업로드하는 함수
 * @param file 업로드할 파일 객체
 * @param onUploadProgress 업로드 진행 상태를 업데이트하는 콜백 함수
 * @returns Flask-A 응답 (PDF 파일 또는 에러)
 */
export const uploadFile = async (file: File, onUploadProgress?: (progress: number) => void) => {
  const formData = new FormData();
  formData.append('file', file);

  // 터미널에 API 호출 정보 출력
  console.log("=== Flask-A API 호출 시작 ===");
  console.log("요청 URL:", `${API_BASE_URL}/analyze`);
  console.log("파일 정보:", {
    name: file.name,
    size: file.size,
    type: file.type
  });
  console.log("FormData 내용:", {
    hasFile: formData.has('file'),
    fileCount: formData.getAll('file').length
  });
  console.log("요청 시간:", new Date().toLocaleString());
  console.log("=====================");

  try {
    const response = await api.post('/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const total = progressEvent.total ?? 0;
        if (total > 0 && onUploadProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
          onUploadProgress(percentCompleted);
          
          // 진행률 로깅 (25% 단위로)
          if (percentCompleted % 25 === 0 || percentCompleted === 100) {
            console.log(`Flask-A 전송 진행률: ${percentCompleted}% (${progressEvent.loaded}/${total} bytes)`);
          }
        } else if (onUploadProgress) {
          // total을 알 수 없을 때, 0으로 설정하거나 다른 처리
          console.log("Unable to compute progress. Total size not available.");
          console.log("Loaded bytes:", progressEvent.loaded);
        }
      },
             // responseType을 제거하여 응답 헤더를 제대로 받을 수 있도록 함
    });
    
         // 성공 응답 로깅
     console.log("=== Flask-A API 호출 성공 ===");
     console.log("응답 상태:", response.status);
     console.log("응답 헤더:", response.headers);
     console.log("응답 헤더 타입:", typeof response.headers);
     console.log("응답 헤더 키들:", Object.keys(response.headers));
     console.log("X-Job-ID 헤더:", response.headers['x-job-id']);
     console.log("응답 데이터 타입:", typeof response.data);
     console.log("응답 데이터:", response.data);
     console.log("완료 시간:", new Date().toLocaleString());
     console.log("=====================");
     
     // jobId를 응답 헤더에서 추출
     const jobId = response.headers['x-job-id'];
     if (jobId) {
       console.log("응답에서 추출된 Job ID:", jobId);
       
       // PDF 데이터를 blob으로 변환
       let pdfBlob;
       if (response.data instanceof ArrayBuffer) {
         pdfBlob = new Blob([response.data], { type: 'application/pdf' });
       } else if (response.data instanceof Blob) {
         pdfBlob = response.data;
       } else {
         // JSON 응답인 경우 PDF 데이터 추출
         pdfBlob = new Blob([response.data], { type: 'application/pdf' });
       }
       
       // blob 객체에 job_id 추가
       (pdfBlob as any).job_id = jobId;
       
       return pdfBlob;
     } else {
       console.warn("응답 헤더에서 Job ID를 찾을 수 없습니다.");
       throw new Error("Flask-A에서 Job ID를 받지 못했습니다.");
     }
  } catch (error: any) {
    // 에러 로깅
    console.error("=== Flask-A API 호출 실패 ===");
    console.error("에러 타입:", error.constructor.name);
    console.error("에러 메시지:", error.message);
    
    if (axios.isAxiosError(error)) {
      console.error("Axios 에러 상세:");
      if (error.response) {
        console.error("응답 상태:", error.response.status);
        console.error("응답 데이터:", error.response.data);
        console.error("응답 헤더:", error.response.headers);
      } else if (error.request) {
        console.error("요청 객체:", error.request);
        console.error("네트워크 오류: Flask-A로부터 응답이 없습니다.");
      }
      console.error("요청 설정:", error.config);
    } else {
      console.error("에러 객체:", error);
    }
    console.error("실패 시간:", new Date().toLocaleString());
    console.error("=====================");
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(`Flask-A 서버 오류: ${error.response.status} - ${error.response.data?.detail || error.response.data || '알 수 없는 오류'}`);
      } else if (error.request) {
        throw new Error("네트워크 오류: Flask-A로부터 응답이 없습니다.");
      }
    }
    
    throw error;
  }
};

/**
 * Flask-A의 분석 상태를 확인하는 함수
 * @param jobId 작업 ID
 * @returns 분석 상태 정보
 */
export const checkFlaskAStatus = async (jobId: string) => {
  try {
    const response = await api.get(`/status/${jobId}`);
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        throw new Error(`Flask-A 상태 확인 오류: ${error.response.status} - ${error.response.data?.detail || error.response.data || '알 수 없는 오류'}`);
      } else if (error.request) {
        throw new Error("네트워크 오류: Flask-A 상태 확인 실패");
      }
    }
    throw error;
  }
};


