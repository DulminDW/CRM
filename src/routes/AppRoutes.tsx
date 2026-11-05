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
import { HotelSeasonsPage } from '../pages/HotelSeasonsPage';
import { RateManagementPage } from '../pages/RateManagementPage';
import { SpecialRatesPage } from '../pages/SpecialRatesPage';
import { RateCalculatorPage } from '../pages/RateCalculatorPage';
import { ShareRatesPage } from '../pages/ShareRatesPage';
import { SalesActivitiesPage } from '../pages/SalesActivitiesPage';
import { TeamChatPage } from '../pages/TeamChatPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { SettingsPage } from '../pages/SettingsPage';

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

        {/* Hotels & Pricing */}
        <Route path="/hotels" element={<HotelsPage />} />
        <Route path="/seasons" element={<HotelSeasonsPage />} />

        {/* Rate Management (Requires CAN_MANAGE_RATES permission or ADMIN) */}
        <Route
          path="/rates"
          element={
            <ProtectedRoute requiredPermission="CAN_MANAGE_RATES">
              <RateManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/special-rates"
          element={
            <ProtectedRoute requiredPermission="CAN_MANAGE_RATES">
              <SpecialRatesPage />
            </ProtectedRoute>
          }
        />
        <Route path="/calculator" element={<RateCalculatorPage />} />

        {/* Sales & Distribution */}
        <Route path="/share-rates" element={<ShareRatesPage />} />
        <Route path="/sales-activities" element={<SalesActivitiesPage />} />

        {/* Communication & Realtime */}
        <Route path="/team-chat" element={<TeamChatPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* Intelligence & Administration */}
        <Route path="/analytics" element={<AnalyticsPage />} />

        {/* Settings (Requires ADMIN role) */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all redirect to 404 */}
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};
