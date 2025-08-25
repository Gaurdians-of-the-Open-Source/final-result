
import logo from "../../assets/logo.png";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { uploadFile, checkFlaskAStatus } from "@/services/api";

export default function Loading() {
  const navigate = useNavigate();
  const location = useLocation();
  const { file, fileName, fileSize, analysisType, currentPhase: initialPhase } = location.state || {};
  const [currentPhase, setCurrentPhase] = useState(initialPhase || "preparing");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [actualJobId, setActualJobId] = useState<string>("");
  const hasStartedRef = useRef(false);

  const startAnalysis = useCallback(async () => {
    console.log("=== startAnalysis 함수 시작 ===");
    console.log("현재 시간:", new Date().toLocaleString());
    console.log("=============================");
    
    try {
      // 로그 초기화
      setLogs(prev => [...prev, "=== Security Analysis Started ==="]);
      setLogs(prev => [...prev, `Filename: ${fileName || file.name}`]);
      
      // 파일 크기 계산 수정 (바이트를 MB로 변환)
      const fileSizeInMB = (fileSize || file.size) / (1024 * 1024);
      setLogs(prev => [...prev, `File Size: ${fileSizeInMB.toFixed(2)} MB`]);
      
      setLogs(prev => [...prev, `Analysis Type: ${analysisType || "Static Code Analysis + LLM Analysis"}`]);
      setLogs(prev => [...prev, ""]);

      // Flask-A로 파일 업로드 시작
      setLogs(prev => [...prev, "🔄 Flask-A: File Upload Started..."]);
      setCurrentPhase("flask-a-analysis");
      setProgress(5);
      
      // 실제 파일 업로드 실행
      const response = await uploadFile(file.file, (progress) => {
        setLogs(prev => [...prev, `📤 Upload Progress: ${progress}%`]);
        setProgress(5 + (progress * 0.15)); // 5% ~ 20%
      });
      
      setLogs(prev => [...prev, "✅ File Upload Completed"]);
      setProgress(20);
      
      // Flask-A 분석 시작
      setLogs(prev => [...prev, "🔄 Flask-A: Static Analysis Started..."]);
      setCurrentPhase("flask-a-analysis");
      
      // Flask-A 정적 분석 상태 확인 (실제 API 호출)
      setLogs(prev => [...prev, "📊 Flask-A: Extracting ZIP File..."]);
      setProgress(25);
      
      // Flask-A 분석 완료까지 대기 (실제 상태 확인)
      let flaskACompleted = false;
      
      // Flask-A에서 반환된 실제 jobId 사용 (UUID)
      const jobId = (response as any).job_id;
      if (!jobId) {
        throw new Error("Flask-A에서 Job ID를 받지 못했습니다.");
      }
      
      setActualJobId(jobId);
      
      console.log("=== Job ID 확인 ===");
      console.log("Response object:", response);
      console.log("Response job_id:", jobId);
      console.log("Actual Job ID:", jobId);
      console.log("==================");
      
      setLogs(prev => [...prev, `📋 Job ID: ${jobId}`]);
      setLogs(prev => [...prev, `📋 Job ID Type: ${typeof jobId}`]);
      setLogs(prev => [...prev, `📋 Job ID Length: ${jobId.length}`]);
      
      // Flask-A 분석이 완료될 때까지 대기 (실제 상태 확인)
      setLogs(prev => [...prev, "⏳ Waiting for Flask-A analysis to complete..."]);
      
      let flaskAStatus: any = null;
      while (!flaskACompleted) {
        try {
          console.log(`🔍 Checking Flask-A status for Job ID: ${jobId}`);
          flaskAStatus = await checkFlaskAStatus(jobId);
          console.log("Flask-A Status Response:", flaskAStatus);
          
          if (flaskAStatus.status === 'completed' || flaskAStatus.status === 'llm_completed') {
            flaskACompleted = true;
            if (flaskAStatus.status === 'completed') {
              setLogs(prev => [...prev, "✅ Flask-A: Static Analysis Completed"]);
              setProgress(45);
            } else {
              setLogs(prev => [...prev, "✅ Flask-A: LLM Analysis Completed"]);
              setProgress(70);
            }
          } else if (flaskAStatus.status === 'error') {
            setLogs(prev => [...prev, `❌ Flask-A: Analysis Error - ${flaskAStatus.message}`]);
            throw new Error(`Flask-A analysis failed: ${flaskAStatus.message}`);
          } else {
            setLogs(prev => [...prev, `📊 Flask-A: ${flaskAStatus.message || 'Processing...'}`]);
            setProgress(flaskAStatus.progress || 25);
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
          }
        } catch (error: any) {
          console.log("Flask-A Status Check Error:", error);
          setLogs(prev => [...prev, `❌ Flask-A: ${error.message || 'Unknown error'}`]);
          throw error;
        }
      }
      
      // Flask-A에서 이미 llm_completed 상태라면 바로 완료 처리
      if (flaskAStatus && flaskAStatus.status === 'llm_completed') {
        setLogs(prev => [...prev, "✅ Flask-B: LLM Analysis Already Completed"]);
        setProgress(100);
        setCurrentPhase("completed");
        
        // 0.5초 후 Download 페이지로 이동
        setTimeout(() => {
          navigate("/download", { 
            state: { 
              pdfBlob: response, // 업로드 응답을 PDF로 사용
              fileName: (fileName || file.name).replace('.zip', '.pdf'),
              jobId: jobId // 실제 UUID 사용
            } 
          });
        }, 500);
        return; // 함수 종료
      } else {
        // Flask-A에서 LLM 분석 완료까지 대기 (Flask-B 처리가 완료되면 Flask-A 상태가 llm_completed로 변경됨)
        setLogs(prev => [...prev, "🔄 Flask-B: LLM Analysis Started..."]);
        setCurrentPhase("flask-b-analysis");
        setLogs(prev => [...prev, "📊 Flask-B: Loading AI Model..."]);
        setProgress(50);
        
        // Flask-A에서 llm_completed 상태가 될 때까지 대기
        let llmCompleted = false;
        setLogs(prev => [...prev, "⏳ Waiting for LLM analysis to complete..."]);
        
        while (!llmCompleted) {
          try {
            console.log(`🔍 Checking Flask-A status for Job ID: ${jobId}`);
            const flaskAStatus = await checkFlaskAStatus(jobId);
            console.log("Flask-A Status Response:", flaskAStatus);
            
            if (flaskAStatus.status === 'llm_completed') {
              llmCompleted = true;
              setLogs(prev => [...prev, "✅ Flask-B: LLM Analysis Completed"]);
              setProgress(70);
            } else if (flaskAStatus.status === 'error') {
              setLogs(prev => [...prev, `❌ Analysis Error - ${flaskAStatus.message}`]);
              throw new Error(`Analysis failed: ${flaskAStatus.message}`);
            } else {
              setLogs(prev => [...prev, `📊 Flask-A: ${flaskAStatus.message || 'Processing...'}`]);
              setProgress(flaskAStatus.progress || 50);
              await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
            }
          } catch (error: any) {
            console.log("Flask-A Status Check Error:", error);
            setLogs(prev => [...prev, `❌ Flask-A: ${error.message || 'Unknown error'}`]);
            throw error;
          }
        }
      }
      
      // PDF 생성 완료 확인
      setLogs(prev => [...prev, "🔄 PDF Generation Started..."]);
      setCurrentPhase("pdf-generation");
      setLogs(prev => [...prev, "📊 Organizing Analysis Results..."]);
      setProgress(75);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLogs(prev => [...prev, "📊 Converting to Markdown..."]);
      setProgress(80);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLogs(prev => [...prev, "📊 Rendering PDF..."]);
      setProgress(85);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLogs(prev => [...prev, "📊 Final Validation..."]);
      setProgress(90);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLogs(prev => [...prev, "✅ PDF Generation Completed"]);
      setProgress(100);
      setLogs(prev => [...prev, "📄 Analysis Complete! Preparing PDF..."]);
      setCurrentPhase("completed");
      
      // 0.5초 후 Download 페이지로 이동
      setTimeout(() => {
        navigate("/download", { 
          state: { 
            pdfBlob: response, // 업로드 응답을 PDF로 사용
            fileName: (fileName || file.name).replace('.zip', '.pdf'),
            jobId: jobId // 실제 UUID 사용
          } 
        });
      }, 500);
      
    } catch (error: any) {
      console.error("Analysis failed:", error);
      setLogs(prev => [...prev, `❌ Error occurred: ${error.message}`]);
      setLogs(prev => [...prev, "⚠️ Analysis has been interrupted. Please retry manually or return to home."]);
      setCurrentPhase("error");
    }
  }, [file, fileName, fileSize, analysisType]); // navigate 제거

  useEffect(() => {
    console.log("=== Loading useEffect 실행 ===");
    console.log("File:", file);
    console.log("Logs length:", logs.length);
    console.log("Has started:", hasStartedRef.current);
    console.log("========================");
    
    // Redirect to home if no file
    if (!file) {
      navigate("/", { replace: true });
      return;
    }

    // 파일이 있으면 분석 시작 (한 번만)
    if (file && !hasStartedRef.current) {
      console.log("🚀 startAnalysis 실행!");
      hasStartedRef.current = true;
      startAnalysis();
    }
  }, [file]); // file만 의존성으로 설정

  const getPhaseText = () => {
    switch (currentPhase) {
      case "preparing": return "Preparing Analysis...";
      case "flask-a-analysis": return "Flask-A: Static Analysis...";
      case "flask-b-analysis": return "Flask-B: LLM Analysis...";
      case "pdf-generation": return "PDF Generation...";
      case "completed": return "Analysis Complete! Preparing PDF...";
      case "error": return "Error Occurred";
      default: return "Analyzing...";
    }
  };

  const getPhaseIcon = () => {
    switch (currentPhase) {
      case "preparing": return "🔧";
      case "flask-a-analysis": return "🔍";
      case "flask-b-analysis": return "🤖";
      case "pdf-generation": return "📄";
      case "completed": return "✅";
      case "error": return "❌";
      default: return "⏳";
    }
  };

  const handleRetry = () => {
    setLogs(prev => [...prev, "🔄 User manually retrying analysis..."]);
    setCurrentPhase("preparing");
    setProgress(0);
    setLogs([]);
    startAnalysis();
  };

  return (
    <div className="wrapper">
      <div className="ratio-box">
        <header className="header">
          <div className="left-box">
            <img src={logo} alt="LV.0 Logo" className="logo" />
            <div className="folder-nav">
              <div className="folder-tab active">
                <span>Home</span>
              </div>
              <div className="folder-tab">
                <span>About</span>
              </div>
              <div className="folder-tab">
                <span>How it Works</span>
              </div>
              <div className="folder-tab">
                <span>Project</span>
              </div>
            </div>
          </div>
          <div className="right-buttons">
            <select className="lang-select" aria-label="Language">
              <option>English</option>
              <option>Korean</option>
            </select>
            <button className="contact-btn" type="button">Contact us</button>
          </div>
        </header>

        <main className="main">
          <div className="content-box">
            {/* File Information Display */}
            {file && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.9)',
                padding: '1.5rem',
                borderRadius: '15px',
                marginBottom: '2rem',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(74, 144, 226, 0.2)'
              }}>
                <h3 style={{ color: '#1a4a8a', marginBottom: '1rem', textAlign: 'center' }}>
                  📁 File Being Analyzed
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>Filename</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                      {fileName || file.name}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>File Size</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                      {((fileSize || file.size) / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>Analysis Type</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
                      {analysisType || "Static Code Analysis + LLM Analysis"}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '0.5rem' }}>Job ID</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', fontFamily: 'monospace' }}>
                      {actualJobId || 'Pending...'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Current Phase Display */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '2rem',
              borderRadius: '15px',
              marginBottom: '2rem',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(74, 144, 226, 0.2)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>{getPhaseIcon()}</div>
              <h2 style={{ color: '#1a4a8a', margin: '0 0 1.5rem 0' }}>{getPhaseText()}</h2>
              <div style={{
                width: '100%',
                height: '20px',
                backgroundColor: '#e0e0e0',
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '1rem'
              }}>
                <div 
                  style={{ 
                    width: `${progress}%`,
                    height: '100%',
                    background: 'linear-gradient(135deg, #5677fc, #4a90e2)',
                    transition: 'width 0.3s ease'
                  }}
                ></div>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>{progress}%</div>
            </div>

            {/* Analysis Phase Descriptions */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '2rem',
              borderRadius: '15px',
              marginBottom: '2rem',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(74, 144, 226, 0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', gap: '1rem' }}>
                <div style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  background: currentPhase === "flask-a-analysis" ? 'linear-gradient(135deg, #5677fc, #4a90e2)' : '#f0f0f0',
                  color: currentPhase === "flask-a-analysis" ? 'white' : '#666',
                  textAlign: 'center',
                  flex: 1,
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '0.5rem' }}>1</div>
                  <div>Static Analysis (Flask-A)</div>
                  <div style={{ fontSize: '12px', marginTop: '0.5rem' }}>
                    {currentPhase === "flask-a-analysis" ? "In Progress..." : "Pending"}
                  </div>
                </div>
                <div style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  background: currentPhase === "flask-b-analysis" ? 'linear-gradient(135deg, #5677fc, #4a90e2)' : '#f0f0f0',
                  color: currentPhase === "flask-b-analysis" ? 'white' : '#666',
                  textAlign: 'center',
                  flex: 1,
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '0.5rem' }}>2</div>
                  <div>LLM Analysis (Flask-B)</div>
                  <div style={{ fontSize: '12px', marginTop: '0.5rem' }}>
                    {currentPhase === "flask-b-analysis" ? "In Progress..." : "Pending"}
                  </div>
                </div>
                <div style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  background: currentPhase === "pdf-generation" ? 'linear-gradient(135deg, #5677fc, #4a90e2)' : '#f0f0f0',
                  color: currentPhase === "pdf-generation" ? 'white' : '#666',
                  textAlign: 'center',
                  flex: 1,
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '0.5rem' }}>3</div>
                  <div>PDF Generation</div>
                  <div style={{ fontSize: '12px', marginTop: '0.5rem' }}>
                    {currentPhase === "pdf-generation" ? "In Progress..." : "Pending"}
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Logs Display */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '2rem',
              borderRadius: '15px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(74, 144, 226, 0.2)'
            }}>
              <h3 style={{ color: '#1a4a8a', marginBottom: '1.5rem', textAlign: 'center' }}>📋 Analysis Logs</h3>
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                background: '#f8f9fa',
                borderRadius: '10px',
                padding: '1rem',
                border: '1px solid #e9ecef'
              }}>
                {logs.map((log, index) => (
                  <div key={index} style={{
                    padding: '0.5rem',
                    borderBottom: index < logs.length - 1 ? '1px solid #e9ecef' : 'none',
                    color: '#333',
                    fontSize: '14px',
                    fontFamily: 'monospace'
                  }}>
                    {log}
                  </div>
                ))}
              </div>
            </div>

            {/* Manual Retry Button on Error */}
            {currentPhase === "error" && (
              <div style={{ 
                textAlign: 'center', 
                marginTop: '2rem',
                padding: '1.5rem',
                background: 'rgba(255, 255, 255, 0.9)',
                borderRadius: '15px',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                border: '1px solid rgba(255, 68, 68, 0.3)'
              }}>
                <h3 style={{ color: '#ff4444', marginBottom: '1rem' }}>
                  ⚠️ Error Occurred During Analysis
                </h3>
                <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                  An error occurred during analysis. You can retry by clicking the button below or return to home.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleRetry}
                    style={{
                      background: 'linear-gradient(135deg, #5677fc, #4a90e2)',
                      color: 'white',
                      padding: '12px 24px',
                      borderRadius: '25px',
                      fontSize: '16px',
                      fontWeight: '600',
                      border: 'none',
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
                    🔄 Retry Analysis
                  </button>
                  <button
                    onClick={() => navigate("/", { replace: true })}
                    style={{
                      background: 'linear-gradient(135deg, #ff6b6b, #ee5a52)',
                      color: 'white',
                      padding: '12px 24px',
                      borderRadius: '25px',
                      fontSize: '16px',
                      fontWeight: '600',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.3)';
                    }}
                  >
                    🏠 Return to Home
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}