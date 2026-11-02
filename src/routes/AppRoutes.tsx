import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';

// Pages
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
      <Route element={<MainLayout />}>
        {/* Core Overview */}
        <Route path="/" element={<DashboardPage />} />

        {/* Agencies Hierarchy */}
        <Route path="/agencies" element={<TravelAgenciesPage />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/members" element={<MembersPage />} />

        {/* Hotels & Pricing */}
        <Route path="/hotels" element={<HotelsPage />} />
        <Route path="/seasons" element={<HotelSeasonsPage />} />
        <Route path="/rates" element={<RateManagementPage />} />
        <Route path="/special-rates" element={<SpecialRatesPage />} />
        <Route path="/calculator" element={<RateCalculatorPage />} />

        {/* Sales & Distribution */}
        <Route path="/share-rates" element={<ShareRatesPage />} />
        <Route path="/sales-activities" element={<SalesActivitiesPage />} />

        {/* Communication & Realtime */}
        <Route path="/team-chat" element={<TeamChatPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* Intelligence & Administration */}
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* Catch-all redirect to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};
