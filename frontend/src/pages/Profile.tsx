import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Mail, Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user } = useAuth();
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put('/users/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
          <User size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-800">My Profile</h2>
          <p className="text-gray-500 mt-1">Manage your account settings and preferences.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Account Details */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6"
        >
          <h3 className="text-lg font-bold text-gray-800 border-b pb-4">Account Details</h3>
          
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2 block">Name</label>
            <div className="flex items-center gap-3 text-gray-800 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
              <User size={18} className="text-gray-400" />
              {user?.name}
            </div>
          </div>
          
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2 block">Email Address</label>
            <div className="flex items-center gap-3 text-gray-800 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
              <Mail size={18} className="text-gray-400" />
              {user?.email}
            </div>
          </div>

          <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex items-start gap-3 mt-4">
            <Shield size={20} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">
              Your account is secured with standard encryption. We recommend changing your password every 3 months.
            </p>
          </div>
        </motion.div>

        {/* Security Settings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          <h3 className="text-lg font-bold text-gray-800 border-b pb-4 mb-6">Security Settings</h3>
          
          <form onSubmit={handlePasswordChange} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input 
                  type="password" 
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  className="pl-10 w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50" 
                  placeholder="Enter current password"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <input 
                    type="password" 
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="pl-10 w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50" 
                    placeholder="Enter new password"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CheckCircle size={18} className="text-gray-400" />
                  </div>
                  <input 
                    type="password" 
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="pl-10 w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50" 
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Updating...
                  </>
                ) : 'Update Password'}
              </button>
            </div>
          </form>
        </motion.div>

      </div>
    </div>
  );
};

export default Profile;
