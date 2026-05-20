import React, { useState } from 'react';
import { NavLink, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // ... (navItems definition)
  const role = profile?.role || 'midwife';

  let navItems = [
    { name: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
    { name: 'Patients', icon: 'groups', path: '/patients' },
    { name: 'Reminders', icon: 'notifications_active', path: '/reminders' },
    { name: 'Profile', icon: 'person', path: '/profile' },
  ];

  if (role === 'admin') {
    navItems = [
      { name: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
      { name: 'Patients', icon: 'groups', path: '/patients' },
      { name: 'Profile', icon: 'person', path: '/profile' },
    ];
  } else if (role === 'patient') {
    navItems = [
      { name: 'Dashboard', icon: 'dashboard', path: '/dashboard' },
      { name: 'Profile', icon: 'person', path: '/profile' },
    ];
  }

  return (
    <div className="min-h-screen bg-background text-on-surface font-sans flex flex-col max-w-md mx-auto relative overflow-x-hidden">
      {/* Sidebar Overlay (existing) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] w-full max-w-md mx-auto"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-3/4 max-w-[300px] bg-surface-container-high z-[70] shadow-2xl p-6 flex flex-col"
            >
              <div className="flex items-center gap-4 mb-10 border-b border-outline-variant/30 pb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-3xl">child_care</span>
                </div>
                <div>
                  <h2 className="font-bold text-lg text-primary leading-tight">MamaTrack</h2>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Maternal Precision</p>
                </div>
              </div>

              <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-4 p-4 rounded-2xl transition-all duration-200",
                      isActive ? "bg-primary/10 text-primary font-bold shadow-sm" : "hover:bg-surface-container-highest text-on-surface-variant"
                    )}
                  >
                    <span className={cn("material-symbols-outlined", location.pathname === item.path && "font-variation-settings: 'FILL' 1")}>
                      {item.icon}
                    </span>
                    <span className="text-sm font-medium">{item.name}</span>
                  </NavLink>
                ))}
              </nav>

              <div className="mt-auto pt-6 border-t border-outline-variant/30">
                <button 
                  onClick={() => {
                    logout();
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-error font-bold hover:bg-error/10 transition-colors"
                >
                  <span className="material-symbols-outlined">logout</span>
                  <span className="text-sm">Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Notifications Modal */}
      <AnimatePresence>
        {isNotificationsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNotificationsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] w-full max-w-md mx-auto"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface-container-high rounded-t-[2.5rem] z-[100] h-[80vh] flex flex-col p-6 shadow-2xl border-t border-outline-variant/30"
            >
              <div className="w-12 h-1.5 bg-outline-variant/30 rounded-full mx-auto mb-8" />
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Notifications</h2>
                {unreadCount > 0 && (
                   <span className="px-3 py-1 bg-primary text-background rounded-full text-[10px] font-bold uppercase tracking-widest">
                     {unreadCount} New
                   </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-10">
                {notifications.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <span className="material-symbols-outlined text-6xl opacity-10">notifications_off</span>
                    <p className="text-on-surface-variant font-medium">All caught up here.</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={cn(
                        "p-4 rounded-3xl border transition-all duration-300 relative overflow-hidden",
                        notif.read ? "bg-surface-container border-outline-variant/20 opacity-60" : "bg-surface-container-high border-primary/30 shadow-lg"
                      )}
                    >
                      <div className="flex gap-4 items-start relative z-10">
                        <div className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                          notif.type === 'alert' ? "bg-error/10 text-error" : 
                          notif.type === 'success' ? "bg-primary/10 text-primary" : 
                          "bg-tertiary/10 text-tertiary"
                        )}>
                          <span className="material-symbols-outlined text-xl">
                            {notif.type === 'alert' ? 'warning' : notif.type === 'success' ? 'check_circle' : 'info'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm leading-tight text-on-surface">{notif.title}</div>
                          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{notif.message}</p>
                          <div className="text-[10px] uppercase font-bold text-on-surface-variant/40 mt-2 tracking-widest">
                            {notif.createdAt?.seconds ? format(new Date(notif.createdAt.seconds * 1000), 'MMM d, h:mm a') : 'Just now'}
                          </div>
                        </div>
                      </div>
                      {!notif.read && <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse" />}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <header className="fixed top-0 w-full max-w-md bg-background/80 backdrop-blur-md z-50 px-5 h-16 flex items-center justify-between border-b border-outline-variant/30">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-highest transition-colors active:scale-90"
          >
            <span className="material-symbols-outlined text-primary text-2xl">menu</span>
          </button>
          <h1 className="text-xl font-bold text-primary tracking-tight">MamaTrack</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsNotificationsOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-highest transition-colors active:scale-90 relative"
          >
            <span className={cn("material-symbols-outlined text-2xl", unreadCount > 0 ? "text-primary" : "text-on-surface-variant")}>
              {unreadCount > 0 ? 'notifications_active' : 'notifications'}
            </span>
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          <Link 
            to="/profile"
            className="w-9 h-9 rounded-full overflow-hidden border border-outline-variant bg-surface-container active:scale-95 transition-transform"
          >
            {profile?.avatar ? (
              <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant uppercase font-bold text-xs">
                {profile?.fullName?.substring(0, 2) || 'MA'}
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-16 pb-24 px-5">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-surface-container-low/90 backdrop-blur-lg border-t border-outline-variant/30 h-20 flex justify-around items-center px-4 z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors duration-200",
                isActive ? "text-primary font-bold" : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              <span className={cn(
                "material-symbols-outlined text-2xl",
                isActive && "fill-1"
              )} style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                {item.icon}
              </span>
              <span className="text-[10px] uppercase tracking-wider">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
