import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import AppLayout from '@/components/layouts/AppLayout';
import { FilePreviewPage } from '@/components/html-preview/FilePreviewPage';
import { HtmlPreviewPage } from '@/components/html-preview/HtmlPreviewPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AppLayout />} />
          <Route path="/html-preview/:previewId" element={<HtmlPreviewPage />} />
          <Route path="/file-preview/:previewId" element={<FilePreviewPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </Router>
    </AuthProvider>
  );
};

export default App;
