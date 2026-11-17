import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { ProtectedRoute } from '../components/common/ProtectedRoute';

// Auth & Public Pages
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';

// CRM Pages
import { DashboardPage } from '../pages/DashboardPage';
import { TravelAgenciesPage } from '../pages/TravelAgenciesPage';
import { MarketsPage } from '../pages/MarketsPage';
import { MembersPage } from '../pages/MembersPage';
import { HotelsPage } from '../pages/HotelsPage';
import { HotelDetailPage } from '../pages/HotelDetailPage';
import { HotelSeasonsPage } from '../pages/HotelSeasonsPage';
import { RateManagementPage } from '../pages/RateManagementPage';
import { RateCalculatorPage } from '../pages/RateCalculatorPage';
import { ShareRatesPage } from '../pages/ShareRatesPage';
import { SalesActivitiesPage } from '../pages/SalesActivitiesPage';
import { TeamActivitiesPage } from '../pages/TeamActivitiesPage';
import { TeamChatPage } from '../pages/TeamChatPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { AdminActivityLogPage } from '../pages/AdminActivityLogPage';
import { BulkImportPage } from '../pages/BulkImportPage';
import { EmployeesPage } from '../pages/EmployeesPage';
import { TasksPage } from '../pages/TasksPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/404" element={<NotFoundPage />} />

      {/* Protected CRM Console Routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Core Overview */}
        <Route path="/" element={<DashboardPage />} />

        {/* Agencies Hierarchy */}
        <Route path="/agencies" element={<TravelAgenciesPage />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/members" element={<MembersPage />} />

        {/* Hotel & Rate Management (Main Module) */}
        <Route path="/hotels" element={<HotelsPage />} />
        <Route path="/hotels/:hotelId" element={<HotelDetailPage />} />
        <Route path="/seasons" element={<HotelSeasonsPage />} />
        <Route path="/rates" element={<RateManagementPage />} />
        <Route path="/calculator" element={<RateCalculatorPage />} />

        {/* Rate Sharing & History */}
        <Route path="/share-rates" element={<ShareRatesPage />} />
        <Route path="/sales-activities" element={<SalesActivitiesPage />} />
        <Route path="/team-activities" element={<TeamActivitiesPage />} />
        <Route path="/tasks" element={<TasksPage />} />

        {/* Communication & Realtime */}
        <Route path="/team-chat" element={<TeamChatPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* Intelligence & Administration */}
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/bulk-import" element={<BulkImportPage />} />
        <Route
          path="/employees"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/activity-log"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminActivityLogPage />
            </ProtectedRoute>
          }
        />

        {/* Settings */}
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all redirect to 404 */}
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};
