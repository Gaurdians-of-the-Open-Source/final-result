// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/home/Home";
import Upload from "./pages/upload/Upload";
import Loading from "./pages/loading/loading";
import Download from "./pages/download/download";
import "./App.css";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/upload" element={<Upload />} />
      <Route path="/loading" element={<Loading />} />
      <Route path="/download" element={<Download />} />
      {/* 존재하지 않는 경로는 홈으로 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
