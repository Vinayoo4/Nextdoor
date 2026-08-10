import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { useOnline } from '@/hooks/useOnline'
import Layout from '@/components/Layout'
import OfflineBanner from '@/components/OfflineBanner'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Home from '@/pages/Home'
import Explore from '@/pages/Explore'
import Feed from '@/pages/Feed'
import Businesses from '@/pages/Businesses'
import BusinessCreate from '@/pages/BusinessCreate'
import BusinessDetail from '@/pages/BusinessDetail'
import Circles from '@/pages/Circles'
import CircleCreate from '@/pages/CircleCreate'
import CircleDetail from '@/pages/CircleDetail'
import Emergency from '@/pages/Emergency'
import Profile from '@/pages/Profile'
import Offline from '@/pages/Offline'
import OwnerDashboard from '@/pages/OwnerDashboard'
import AuthorityPortal from '@/pages/AuthorityPortal'
import NavigatePage from '@/pages/Navigate'
import NotFound from '@/pages/NotFound'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  if (token) {
    return <Navigate to="/home" replace />
  }
  return <>{children}</>
}

export default function App() {
  const online = useOnline()

  return (
    <>
      <ScrollToTop />
      <OfflineBanner online={online} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <GuestOnly>
              <Login />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <Register />
            </GuestOnly>
          }
        />
        {/* Public Routes under Layout */}
        <Route element={<Layout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/businesses" element={<Businesses />} />
          <Route path="/businesses/:slug" element={<BusinessDetail />} />
          <Route path="/circles" element={<Circles />} />
          <Route path="/circles/:id" element={<CircleDetail />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/navigate" element={<NavigatePage />} />
        </Route>

        {/* Authenticated Routes under Layout */}
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/businesses/new" element={<BusinessCreate />} />
          <Route path="/circles/new" element={<CircleCreate />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/owner" element={<OwnerDashboard />} />
          <Route path="/authority" element={<AuthorityPortal />} />
        </Route>
        <Route path="/offline" element={<Offline />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
