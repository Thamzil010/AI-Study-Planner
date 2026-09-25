import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { FiLogIn } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
  } = useForm({
    mode: 'onChange',
  });

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setApiError('');
    try {
      const res = await api.post('/auth/login', { email: data.email.toLowerCase(), password: data.password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err: any) {
      setApiError(err.response?.data?.error || 'Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FC] p-4 font-sans relative overflow-hidden">
      {/* Exact Background Blobs */}
      <div className="absolute top-0 left-[-10%] w-[500px] h-[500px] rounded-full bg-[#E8F0FA] blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-[#E5ECF6] blur-[100px] pointer-events-none"></div>

      <div className="bg-white rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-10 w-full max-w-[480px] relative z-10">
        
        {/* Branding Header */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            {/* Custom SVG Logo matching the reference exactly */}
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2L2 9L16 16L30 9L16 2Z" fill="#5454E5"/>
              <path d="M2 9V23L16 30V16L2 9Z" fill="#4646CF"/>
              <path d="M30 9V23L16 30V16L30 9Z" fill="#3B3BA8"/>
              <path d="M16 7L11 9.5L16 12L21 9.5L16 7Z" fill="white"/>
            </svg>
            <h1 className="text-[20px] font-bold font-sans tracking-tight">
              <span className="text-[#1a1f36]">AI Study </span>
              <span className="text-[#5454E5]">Planner</span>
            </h1>
          </div>
          <p className="text-[11px] text-gray-500 font-medium tracking-wide">
            Plan Smarter &nbsp;•&nbsp; Study Better &nbsp;•&nbsp; Achieve More
          </p>
        </div>

        {/* Welcome Text */}
        <div className="mb-6">
          <h2 className="text-[24px] font-bold text-[#1a1f36] font-sans leading-tight">Welcome Back</h2>
          <p className="text-[13px] text-gray-500 mt-1">Sign in to your account to continue your learning journey.</p>
        </div>

        {apiError && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 text-center">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          <div className="flex flex-col">
            <label className="text-[13px] font-bold text-[#1a1f36] mb-2 font-sans">
              Email Address
            </label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <FiMail size={16} />
              </div>
              <input
                type="email"
                placeholder="Enter your email address"
                className={`w-full rounded-[8px] border border-gray-200 bg-white pl-10 pr-4 py-3 text-[14px] text-gray-900 transition-all outline-none focus:border-[#5454E5] focus:ring-1 focus:ring-[#5454E5] placeholder-gray-400 ${errors.email ? 'border-red-500' : ''}`}
                {...register('email', { 
                  required: 'Email is required',
                  pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                })}
              />
            </div>
            {errors.email && <span className="text-[12px] text-red-500 mt-1 font-sans">{errors.email.message as string}</span>}
          </div>
          
          <div className="flex flex-col">
            <label className="text-[13px] font-bold text-[#1a1f36] mb-2 font-sans">
              Password
            </label>
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <FiLock size={16} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className={`w-full rounded-[8px] border border-gray-200 bg-white pl-10 pr-10 py-3 text-[14px] text-gray-900 transition-all outline-none focus:border-[#5454E5] focus:ring-1 focus:ring-[#5454E5] placeholder-gray-400 ${errors.password ? 'border-red-500' : ''}`}
                {...register('password', { 
                  required: 'Password is required',
                  minLength: { value: 6, message: 'Minimum 6 characters' }
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {errors.password && <span className="text-[12px] text-red-500 mt-1 font-sans">{errors.password.message as string}</span>}
          </div>

          <div className="flex items-center justify-between pt-1 pb-4">
            <label className="flex items-center cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input type="checkbox" className="peer sr-only" {...register('rememberMe')} />
                <div className="w-4 h-4 rounded-[4px] border border-gray-300 bg-white peer-checked:bg-[#5454E5] peer-checked:border-[#5454E5] transition-all"></div>
                <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 14 14" fill="none">
                  <path d="M3 8L6 11L11 3.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" />
                </svg>
              </div>
              <span className="ml-2 text-[13px] text-gray-600 font-medium font-sans select-none">
                Remember me
              </span>
            </label>
            <a href="#" className="text-[13px] font-medium text-[#5454E5] hover:text-[#4646CF] transition-colors">
              Forgot password?
            </a>
          </div>

          <button 
            type="submit" 
            disabled={!isValid || !isDirty || isLoading}
            className="relative flex items-center justify-center w-full rounded-[8px] bg-[#5454E5] hover:bg-[#4646CF] text-white px-4 py-3 text-[14px] font-medium transition-all outline-none disabled:opacity-70 disabled:cursor-not-allowed gap-2 shadow-sm"
          >
            {isLoading ? (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <FiLogIn size={18} />
            )}
            Login
          </button>
        </form>



        <p className="mt-8 text-center text-[13px] text-gray-500 font-medium">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-[#5454E5] hover:text-[#4646CF] transition-colors">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
