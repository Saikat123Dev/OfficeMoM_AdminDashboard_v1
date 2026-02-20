import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DatabaseModeProvider } from './context/DatabaseModeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Contacts from './pages/Contacts';
import IntentKeywords from './pages/IntentKeywords';
import FAQs from './pages/FAQs';
import OfficemomDetails from './pages/OfficemomDetails';
import Features from './pages/Features';
import RechargePackages from './pages/RechargePackages';
import Pricing from './pages/Pricing';
import Blogs from './pages/Blogs';
import BlogEditor from './pages/BlogEditor';
import BlogPreview from './pages/BlogPreview';
import Notifications from './pages/Notifications';
import SubscriptionCancellations from './pages/SubscriptionCancellations';
import ProfileSettings from './pages/ProfileSettings';
import AccountSettings from './pages/AccountSettings';
import Layout from './components/Layout';
import './index.css'
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <DatabaseModeProvider>
        <Router>
          <div className="min-h-screen bg-slate-950">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/users" element={
                <ProtectedRoute>
                  <Layout>
                    <Users />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/users/:id" element={
                <ProtectedRoute>
                  <Layout>
                    <UserDetail />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/contacts" element={
                <ProtectedRoute>
                  <Layout>
                    <Contacts />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/intent-keywords" element={
                <ProtectedRoute>
                  <Layout>
                    <IntentKeywords />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/faqs" element={
                <ProtectedRoute>
                  <Layout>
                    <FAQs />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/officemom-details" element={
                <ProtectedRoute>
                  <Layout>
                    <OfficemomDetails />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/features" element={
                <ProtectedRoute>
                  <Layout>
                    <Features />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/recharge-packages" element={
                <ProtectedRoute>
                  <Layout>
                    <RechargePackages />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/pricing" element={
                <ProtectedRoute>
                  <Layout>
                    <Pricing />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/blogs" element={
                <ProtectedRoute>
                  <Layout>
                    <Blogs />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/blogs/new" element={
                <ProtectedRoute>
                  <Layout>
                    <BlogEditor />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/blogs/edit/:id" element={
                <ProtectedRoute>
                  <Layout>
                    <BlogEditor />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/blogs/preview/:id" element={
                <ProtectedRoute>
                  <Layout>
                    <BlogPreview />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <Layout>
                    <Notifications />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/subscription-cancellations" element={
                <ProtectedRoute>
                  <Layout>
                    <SubscriptionCancellations />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/settings/profile" element={
                <ProtectedRoute>
                  <Layout>
                    <ProfileSettings />
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/settings/account" element={
                <ProtectedRoute>
                  <Layout>
                    <AccountSettings />
                  </Layout>
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </Router>
      </DatabaseModeProvider>
    </AuthProvider>
  );
}

export default App;
