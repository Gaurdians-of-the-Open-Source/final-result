import logo from "../../assets/logo.png";
import { FiDownload, FiUpload } from "react-icons/fi";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

type DownloadState = {
  pdfBlob: Blob;
  fileName: string;
  jobId: string;
};

export default function Download() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const downloadState: DownloadState | undefined = (state as any);
  
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!downloadState?.pdfBlob) {
      console.error("PDF Blob이 전달되지 않았습니다.");
      navigate("/", { replace: true });
      return;
    }

    // Blob을 URL로 변환하여 PDF 미리보기 가능하게 함
    const url = URL.createObjectURL(downloadState.pdfBlob);
    setPdfUrl(url);
    setIsLoading(false);

    // 컴포넌트 언마운트 시 URL 해제
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [downloadState, navigate]);

  const handleDownload = () => {
    if (!downloadState?.pdfBlob) return;
    
    // Blob을 다운로드
    const url = URL.createObjectURL(downloadState.pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadState.fileName || 'vulnerability-report.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleNewAnalysis = () => {
    navigate("/upload", { replace: true });
  };

  if (!downloadState?.pdfBlob) {
    return (
      <div className="wrapper">
        <div className="ratio-box">
          <header className="header">
            <div className="left-box">
              <img src={logo} alt="LV.0 Logo" className="logo" />
              <nav className="folder-nav">
                <Link to="/" className="folder-tab active">home</Link>
                <a href="#about" className="folder-tab">about</a>
                <a href="#how" className="folder-tab">how it works</a>
                <a href="#project" className="folder-tab">project</a>
              </nav>
            </div>
            <div className="right-buttons">
              <select className="lang-select" aria-label="Select language">
                <option>English</option>
                <option>한국어</option>
              </select>
              <button className="contact-btn" type="button">Contact us</button>
            </div>
          </header>
          <div className="content-box">
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <h2>PDF 파일을 찾을 수 없습니다</h2>
              <p>분석을 다시 시작해주세요.</p>
              <button onClick={handleNewAnalysis} style={{
                background: 'linear-gradient(135deg, #5677fc, #4a90e2)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '25px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                marginTop: '1rem'
              }}>
                새 분석 시작
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <div className="ratio-box">
        <header className="header">
          <div className="left-box">
            <img src={logo} alt="LV.0 Logo" className="logo" />
            <nav className="folder-nav">
              <Link to="/" className="folder-tab active">home</Link>
              <a href="#about" className="folder-tab">about</a>
              <a href="#how" className="folder-tab">how it works</a>
              <a href="#project" className="folder-tab">project</a>
            </nav>
          </div>
          <div className="right-buttons">
            <select className="lang-select" aria-label="Select language">
              <option>English</option>
              <option>한국어</option>
            </select>
            <button className="contact-btn" type="button">Contact us</button>
          </div>
        </header>

        <div className="content-box">
          <div style={{ 
            display: 'flex', 
            flexDirection: 'row', 
            gap: '2rem',
            minHeight: '600px',
            padding: '2rem'
          }}>
            {/* Left Column - PDF Preview */}
            <div style={{ 
              flex: '2',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '20px',
                border: '2px solid #e0e0e0',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                marginBottom: '2rem'
              }}>
                <div style={{
                  textAlign: 'center',
                  marginBottom: '1.5rem',
                  paddingBottom: '1rem',
                  borderBottom: '2px solid #e0e0e0'
                }}>
                  <h1 style={{ 
                    fontSize: '2rem', 
                    fontWeight: '600', 
                    color: '#000033',
                    margin: 0
                  }}>
                    LV.0 Vulnerability Report
                  </h1>
                  <p style={{ 
                    fontSize: '1rem', 
                    color: '#666',
                    margin: '0.5rem 0 0 0'
                  }}>
                    {downloadState.fileName}
                  </p>
                </div>
                
                {/* PDF Preview Area */}
                <div style={{
                  width: '100%',
                  height: '500px',
                  background: '#f8f9fa',
                  border: '2px solid #4a90e2',
                  borderRadius: '15px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {isLoading ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%',
                      fontSize: '1.2rem',
                      color: '#666'
                    }}>
                      PDF 로딩 중...
                    </div>
                  ) : pdfUrl ? (
                    <iframe
                      src={pdfUrl}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        borderRadius: '15px'
                      }}
                      title="PDF Preview"
                    />
                  ) : (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%',
                      fontSize: '1.2rem',
                      color: '#666'
                    }}>
                      PDF를 불러올 수 없습니다
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Download Controls */}
            <div style={{ 
              flex: '1',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              {/* Download Button */}
              <div style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '20px',
                border: '2px solid #e0e0e0',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                textAlign: 'center'
              }}>
                <h3 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '600', 
                  color: '#000033',
                  marginBottom: '1rem'
                }}>
                  📄 Download Report
                </h3>
                <p style={{ 
                  color: '#666',
                  marginBottom: '1.5rem',
                  lineHeight: '1.6'
                }}>
                  분석이 완료된 취약점 리포트를 다운로드하세요.
                </p>
                <button
                  onClick={handleDownload}
                  style={{
                    background: 'linear-gradient(135deg, #5677fc, #4a90e2)',
                    color: 'white',
                    padding: '15px 30px',
                    borderRadius: '25px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    margin: '0 auto',
                    transition: 'all 0.3s ease'
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
                  <FiDownload size={20} />
                  Download PDF
                </button>
              </div>

              {/* New Analysis Button */}
              <div style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '20px',
                border: '2px solid #e0e0e0',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                textAlign: 'center'
              }}>
                <h3 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '600', 
                  color: '#000033',
                  marginBottom: '1rem'
                }}>
                  🔄 New Analysis
                </h3>
                <p style={{ 
                  color: '#666',
                  marginBottom: '1.5rem',
                  lineHeight: '1.6'
                }}>
                  다른 파일로 새로운 분석을 시작하세요.
                </p>
                <button
                  onClick={handleNewAnalysis}
                  style={{
                    background: 'linear-gradient(135deg, #28a745, #20c997)',
                    color: 'white',
                    padding: '15px 30px',
                    borderRadius: '25px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    margin: '0 auto',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(40, 167, 69, 0.3)';
                  }}
                >
                  <FiUpload size={20} />
                  Start New Analysis
                </button>
              </div>

              {/* Analysis Info */}
              <div style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '20px',
                border: '2px solid #e0e0e0',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
              }}>
                <h3 style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '600', 
                  color: '#000033',
                  marginBottom: '1rem'
                }}>
                  📊 Analysis Information
                </h3>
                <div style={{ color: '#666', lineHeight: '1.8' }}>
                  <p><strong>File Name:</strong> {downloadState.fileName}</p>
                  <p><strong>Job ID:</strong> {downloadState.jobId}</p>
                  <p><strong>Analysis Type:</strong> Static + LLM Analysis</p>
                  <p><strong>Status:</strong> Completed ✅</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
