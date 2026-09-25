import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, Calendar, LayoutDashboard, LogOut, CheckSquare, Settings, User, Sparkles } from 'lucide-react';

const MainLayout = () => {
  const { logout, user } = useAuth();

  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;
  
  const navItemClass = (path: string) => 
    `flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${
      isActive(path) 
        ? 'bg-blue-600 text-white shadow-md' 
        : 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 p-6 flex flex-col h-screen sticky top-0">
        <div className="mb-10">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            AI Study Planner
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Welcome back, {user?.name}</p>
        </div>
        
        <nav className="space-y-2 flex-1">
          <Link to="/" className={navItemClass('/')}>
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>
          <Link to="/todays-plan" className={navItemClass('/todays-plan')}>
            <CheckSquare size={20} />
            <span className="font-medium">Today's Plan</span>
          </Link>
          <Link to="/subjects" className={navItemClass('/subjects')}>
            <BookOpen size={20} />
            <span className="font-medium">Subjects</span>
          </Link>
          <Link to="/history" className={navItemClass('/history')}>
            <Calendar size={20} />
            <span className="font-medium">History</span>
          </Link>
          <Link to="/quizzes" className={navItemClass('/quizzes')}>
            <Sparkles size={20} />
            <span className="font-medium">Quizzes</span>
          </Link>
          <Link to="/reports" className={navItemClass('/reports')}>
            <CheckSquare size={20} />
            <span className="font-medium">Reports</span>
          </Link>
          <Link to="/profile" className={navItemClass('/profile')}>
            <User size={20} />
            <span className="font-medium">Profile</span>
          </Link>
          <Link to="/settings" className={navItemClass('/settings')}>
            <Settings size={20} />
            <span className="font-medium">Settings</span>
          </Link>
        </nav>

        <div className="mt-auto border-t border-gray-200 pt-6">
          <button onClick={logout} className="flex items-center space-x-3 p-3 w-full text-left text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition">
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
      
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
