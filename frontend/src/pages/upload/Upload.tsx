import React, { useState, useRef } from "react";
import "./upload.css";
import logo from "../../assets/logo.png";

// 백엔드 API 함수를 가져옵니다.
// uploadFile import 제거 - Upload.tsx에서는 파일 선택만 처리

import { FaCloudUploadAlt } from "react-icons/fa";
import { TbFileTypeZip } from "react-icons/tb";
import { BsTrash } from "react-icons/bs";
import { AiOutlineClose } from "react-icons/ai";
import { ImSpinner3 } from "react-icons/im";
import { CgCheckO } from "react-icons/cg";
import { Link, useNavigate } from "react-router-dom";
 
// 파일 아이템 타입 정의
type UploadStatus = "ready" | "uploading" | "done" | "error" | "canceled";
interface FileItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  jobId?: string; // 백엔드로부터 받은 job_id를 저장할 필드
}

export default function Upload() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  // isUploading 상태 제거 - Upload.tsx에서는 파일 선택만 처리

  // 파일 추가 (중복 방지 및 즉시 선택)
  const addFiles = (newFiles: FileList | File[]) => {
    const incoming = Array.from(newFiles);
    
    // 터미널에 파일 선택 정보 출력
    console.log("=== 파일 선택 정보 ===");
    incoming.forEach((file, index) => {
      console.log(`파일 ${index + 1}:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: new Date(file.lastModified).toLocaleString()
      });
    });
    console.log("=====================");

    // 새 파일만 추가 (기존 파일과 중복되지 않도록)
    const newFileObjs: FileItem[] = incoming.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      status: "ready",
      progress: 0,
    }));
    
    setFiles(newFileObjs); // 기존 파일을 모두 교체
  };

  const deleteFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const cancelUpload = (id: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status: "canceled", progress: 0 } : f
      )
    );
  };

  // startUpload 함수 제거 - Upload.tsx에서는 파일 선택만 처리

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      console.log("파일 선택기에서 선택된 파일 수:", e.target.files.length);
      console.log("선택된 파일:", e.target.files[0].name);
      
      addFiles(e.target.files);
    }
    
    // 파일 선택 후 input 값을 초기화하지 않음 - 한 번에 선택되도록
    // e.target.value = ""; // 이 줄 제거
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      console.log("드래그 앤 드롭으로 선택된 파일 수:", e.dataTransfer.files.length);
      addFiles(e.dataTransfer.files);
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Start analyzing 버튼
  const handleStartAnalyzing = async () => {
    console.log("=== handleStartAnalyzing 호출 ===");
    console.log("Files length:", files.length);
    console.log("=============================");
    
    if (files.length > 0) {
      console.log("=== Start Analyzing 버튼 클릭 ===");
      console.log("선택된 파일 수:", files.length);
      console.log("첫 번째 파일:", files[0]);
      console.log("===============================");
      
      // 파일 선택만 하고 Loading으로 이동 (업로드는 Loading에서)
      navigate("/loading", { 
        state: { 
          file: files[0],
          fileName: files[0].file.name,
          fileSize: files[0].file.size,
          analysisType: "Static Code Analysis + LLM Analysis",
          currentPhase: "Initializing analysis..."
        } 
      });
    }
  };

  // 단일 파일 업로드이므로 startUpload 버튼은 제거
  return (
    <div className="wrapper">
      <div className="ratio-box">
        <header className="header">
          <div className="left-box">
            <img src={logo} alt="LV.0 Logo" className="logo" />
            <nav className="folder-nav">
              <Link to="/" className="folder-tab active">Home</Link>
              <a href="#about" className="folder-tab">About</a>
              <a href="#how" className="folder-tab">How it Works</a>
              <a href="#project" className="folder-tab">Project</a>
            </nav>
          </div>

          <div className="right-buttons">
            <select className="lang-select">
              <option>English</option>
              <option>한국어</option>
            </select>
            <button className="contact-btn">Contact us</button>
          </div>
        </header>

        <div className="content-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
          {/* 업로드 박스 */}
          <div
            style={{
            width: '500px',
            height: '250px',
            border: '3px dashed #4a90e2',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #f8f9ff, #e8f4fd)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            marginBottom: '2rem'
          }}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onClick={() => {
              console.log("업로드 박스 클릭됨");
              inputRef.current?.click();
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#5677fc';
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#4a90e2';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <FaCloudUploadAlt size={48} color="#13113b" style={{ marginBottom: '1rem' }} />
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#13113b', marginBottom: '0.5rem' }}>
                Choose a file or drag & drop it here
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                ZIP formats, up to 100 MB
              </div>
            </div>

            <label 
              htmlFor="file-upload" 
              style={{
                background: 'linear-gradient(135deg, #5677fc, #4a90e2)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '25px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(74, 144, 226, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(74, 144, 226, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(74, 144, 226, 0.3)';
              }}
            >
              Browse File
            </label>
            <input
              ref={inputRef}
              id="file-upload"
              type="file"
              accept=".zip"
              multiple={false}
              onChange={onFileChange}
              style={{ display: "none" }}
            />
          </div>

          {/* 파일 리스트 + Start analyzing 버튼 */}
          <div style={{ width: "500px", textAlign: 'center' }}>
            {files.length === 0 && (
              <div style={{ textAlign: "center", color: "#777", marginTop: "1rem", fontSize: "18px" }}>
                No files selected.
              </div>
            )}

            {files.map(({ id, file, status, progress }) => (
              <div key={id} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1rem',
                margin: '0.5rem 0',
                background: 'white',
                borderRadius: '15px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e1e8ff'
              }}>
                <div style={{ marginRight: '1rem' }}>
                  <TbFileTypeZip size={28} color="#5677fc" />
                </div>

                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '0.5rem' }}>
                    {file.name}
                  </div>
                  <div style={{ 
                    width: '100%', 
                    height: '8px', 
                    background: '#f0f0f0', 
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${progress}%`, 
                      height: '100%', 
                      background: status === 'uploading' ? 'linear-gradient(90deg, #5677fc, #4a90e2)' : 
                                status === 'done' ? '#00c851' : '#ff4444',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                <div style={{ marginRight: '1rem' }}>
                  {status === "uploading" && <ImSpinner3 className="spin" size={22} color="#5677fc" />}
                  {status === "done" && <CgCheckO size={22} color="#00c851" />}
                  {status === "error" && <AiOutlineClose size={22} color="#ff4444" />}
                  {status === "canceled" && <AiOutlineClose size={22} color="#ff4444" />}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {status === "uploading" && (
                    <button
                      style={{
                        background: '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        console.log("업로드 취소:", file.name);
                        cancelUpload(id);
                      }}
                      title="Cancel upload"
                    >
                      <AiOutlineClose size={16} />
                    </button>
                  )}

                  {/* 재생 버튼 제거 - 개별 파일 업로드 불필요 */}

                  <button
                    style={{
                      background: '#666',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      console.log("파일 삭제:", file.name);
                      deleteFile(id);
                    }}
                    title="Delete file"
                  >
                    <BsTrash size={16} />
                  </button>
                </div>

                <div style={{ marginLeft: '1rem', fontSize: '14px', color: '#666', minWidth: '40px' }}>
                  {progress}%</div>
              </div>
            ))}

            {/* Start analyzing 버튼 */}
            <div style={{ marginTop: '2rem' }}>
              <button
                style={{
                  background: 'linear-gradient(135deg, #5677fc, #4a90e2)',
                  color: 'white',
                  padding: '15px 40px',
                  borderRadius: '30px',
                  fontSize: '18px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(74, 144, 226, 0.3)',
                  opacity: files.length > 0 ? 1 : 0.5
                }}
                disabled={!files.length}
                onClick={handleStartAnalyzing}
                onMouseEnter={(e) => {
                  if (files.length > 0) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(74, 144, 226, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (files.length > 0) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(74, 144, 226, 0.3)';
                  }
                }}
              >
                Start analyzing
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
