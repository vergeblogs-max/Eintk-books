
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Target, User, LayoutDashboard, Gamepad2, Users, FileQuestion } from 'lucide-react';

interface BottomNavProps {
  isAdmin: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ isAdmin }) => {
  const navItems = [
    { path: '/', icon: Target, label: 'Missions' },
    { path: '/exams', icon: FileQuestion, label: 'Test Prep' },
    { path: '/community', icon: Users, label: 'Community' },
    { path: '/arcade', icon: Gamepad2, label: 'Arcade' },
    { path: '/profile', icon: User, label: 'Profile' },
    ...(isAdmin ? [{ path: '/admin', icon: LayoutDashboard, label: 'Admin' }] : []),
  ];

  const activeLinkClass = 'text-orange-500';
  const inactiveLinkClass = 'text-gray-400';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 shadow-lg z-30 pb-3 sm:pb-0 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 max-w-xl mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'} // Ensure exact match for root path
            className={({ isActive }) => 
              `flex flex-col items-center justify-center transition-colors duration-200 w-1/5 ${isActive ? activeLinkClass : inactiveLinkClass} hover:text-orange-400`
            }
          >
            <item.icon size={24} />
            <span className="text-[10px] mt-1">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
