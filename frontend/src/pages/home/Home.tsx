import "./home.css";
import logo from "../../assets/logo.png";
import badge from "../../assets/벡터.png";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Home() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');

  const handleTabClick = (tabName: string) => {
    setActiveTab(tabName);
  };

  return (
    <div className="wrapper">
      <div className="ratio-box">
        <header className="header">
          <div className="left-box">
            <img src={logo} alt="LV.0 Logo" className="logo" />
            {/* 파일철 스타일 네비게이션 - 로고 옆에 위치 */}
            <div className="folder-nav">
              <div 
                className={`folder-tab ${activeTab === 'home' ? 'active' : ''}`}
                onClick={() => handleTabClick('home')}
              >
                Home
              </div>
              <div 
                className={`folder-tab ${activeTab === 'about' ? 'active' : ''}`}
                onClick={() => handleTabClick('about')}
              >
                About
              </div>
              <div 
                className={`folder-tab ${activeTab === 'how' ? 'active' : ''}`}
                onClick={() => handleTabClick('how')}
              >
                How it Works
              </div>
              <div 
                className={`folder-tab ${activeTab === 'project' ? 'active' : ''}`}
                onClick={() => handleTabClick('project')}
              >
                Project
              </div>
            </div>
          </div>

          <div className="right-buttons">
            <select className="lang-select">
              <option>English</option>
              <option>한국어</option>
            </select>
            <button className="contact-btn">Contact us</button>
          </div>
        </header>

        {/* 하얀색 내용 박스 */}
        <div className="content-box">
          {/* Home 탭 내용 */}
          {activeTab === 'home' && (
            <div style={{ 
              position: 'absolute',
              left: '2rem',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: 'calc(100% - 4rem)',
              height: '70%'
            }}>
              <div style={{
                flex: '1',
                maxWidth: '500px',
                textAlign: 'left',
                marginLeft: 'auto',
                marginRight: '1rem',
                transform: 'translateX(3rem)'
              }}>
                <h1 style={{
                  fontSize: '2.2rem',
                  fontWeight: '600',
                  lineHeight: '1.3',
                  letterSpacing: '-0.02em',
                  marginBottom: '1rem',
                  color: '#000033'
                }}>
                  LLM-powered <br />
                  Vulnerability Reporter <br />
                  for your Open Source
                </h1>
                <p style={{
                  fontSize: '0.9rem',
                  color: '#4169E1',
                  lineHeight: '1.6',
                  marginBottom: '2.5rem'
                }}>
                  Protect vulnerabilities in your codebase with the power of LLMs and static analysis<br />
                  - No more vulnerabilities: LV.0
                </p>
                <button
                  style={{
                    background: '#4169E1',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #4169E1',
                    borderRadius: '40px',
                    color: '#ffffff',
                    padding: '15px 35px',
                    fontSize: '18px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => navigate("/upload")}
                >
                  Get Started ↗
                </button>
              </div>

              <div style={{
                flex: '1',
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center'
              }}>
                <img 
                  src={badge} 
                  alt="Security badge" 
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxWidth: '600px',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 8px 18px rgba(0, 0, 0, 0.12))'
                  }}
                />
              </div>
            </div>
          )}

          {/* About 탭 내용 */}
          {activeTab === 'about' && (
            <div className="folder-content active">
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h2 style={{ color: '#1a4a8a', marginBottom: '1rem' }}>About LV.0</h2>
                <p style={{ color: '#333', lineHeight: '1.6' }}>
                  LV.0 is an advanced security analysis platform that combines the power of Large Language Models 
                  with static code analysis to identify and report vulnerabilities in your open source projects.
                </p>
                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <div style={{ background: '#f0f8ff', padding: '1rem', borderRadius: '10px', minWidth: '150px' }}>
                    <h3 style={{ color: '#2c5aa0', marginBottom: '0.5rem' }}>AI-Powered</h3>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Advanced LLM analysis</p>
                  </div>
                  <div style={{ background: '#f0f8ff', padding: '1rem', borderRadius: '10px', minWidth: '150px' }}>
                    <h3 style={{ color: '#2c5aa0', marginBottom: '0.5rem' }}>Secure</h3>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Enterprise-grade security</p>
                  </div>
                  <div style={{ background: '#f0f8ff', padding: '1rem', borderRadius: '10px', minWidth: '150px' }}>
                    <h3 style={{ color: '#2c5aa0', marginBottom: '0.5rem' }}>Fast</h3>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Real-time analysis</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* How it Works 탭 내용 */}
          {activeTab === 'how' && (
            <div className="folder-content active">
              <div style={{ padding: '2rem' }}>
                <h2 style={{ color: '#1a4a8a', marginBottom: '2rem', textAlign: 'center' }}>How It Works</h2>
                <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <div style={{ background: '#f8f9ff', padding: '1.5rem', borderRadius: '15px', minWidth: '200px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📁</div>
                    <h3 style={{ color: '#2c5aa0', marginBottom: '0.5rem' }}>1. Upload</h3>
                    <p style={{ color: '#666' }}>Upload your source code or ZIP file</p>
                  </div>
                  <div style={{ background: '#f8f9ff', padding: '1.5rem', borderRadius: '15px', minWidth: '200px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
                    <h3 style={{ color: '#2c5aa0', marginBottom: '0.5rem' }}>2. Analyze</h3>
                    <p style={{ color: '#666' }}>AI-powered vulnerability scanning</p>
                  </div>
                  <div style={{ background: '#f8f9ff', padding: '1.5rem', borderRadius: '15px', minWidth: '200px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</div>
                    <h3 style={{ color: '#2c5aa0', marginBottom: '0.5rem' }}>3. Report</h3>
                    <p style={{ color: '#666' }}>Detailed PDF security report</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Project 탭 내용 */}
          {activeTab === 'project' && (
            <div className="folder-content active">
              <div style={{ padding: '2rem' }}>
                <h2 style={{ color: '#1a4a8a', marginBottom: '2rem', textAlign: 'center' }}>Our Projects</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  <div style={{ background: '#f8f9ff', padding: '1.5rem', borderRadius: '15px', border: '1px solid #e1e8ff' }}>
                    <h3 style={{ color: '#2c5aa0', marginBottom: '0.5rem' }}>WebGoat Analysis</h3>
                    <p style={{ color: '#666', marginBottom: '1rem' }}>Comprehensive security analysis of the WebGoat project</p>
                    <div style={{ background: '#e8f4fd', padding: '0.5rem', borderRadius: '8px', fontSize: '0.9rem', color: '#2c5aa0' }}>
                      Status: Completed
                    </div>
                  </div>
                  <div style={{ background: '#f8f9ff', padding: '1.5rem', borderRadius: '15px', border: '1px solid #e1e8ff' }}>
                    <h3 style={{ color: '#2c5aa0', marginBottom: '0.5rem' }}>Security Framework</h3>
                    <p style={{ color: '#666', marginBottom: '1rem' }}>Development of enterprise security analysis framework</p>
                    <div style={{ background: '#e8f4fd', padding: '0.5rem', borderRadius: '8px', fontSize: '0.9rem', color: '#2c5aa0' }}>
                      Status: In Progress
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
