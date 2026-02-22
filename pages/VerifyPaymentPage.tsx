
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { verifyAndUpgradeUser } from '../services/firestoreService';
import LoadingSpinner from '../components/LoadingSpinner';
import { CircleCheck, CircleX } from 'lucide-react';

interface VerifyPaymentPageProps {
  user: User | null;
}

const VerifyPaymentPage: React.FC<VerifyPaymentPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Verifying your subscription...');

  useEffect(() => {
    const processVerification = async () => {
      // Get the token and plan from local storage
      const token = localStorage.getItem('paymentToken');
      const plan = localStorage.getItem('paymentPlan') as 'monthly' | 'termly' | null;

      if (!user) {
        setMessage('Please log in to complete your subscription.');
        // Redirect to login, but keep the token in storage for after login
        navigate('/auth', { state: { from: '/u2s2e0r4i1s0p2r7o10' } });
        return;
      }
      
      if (!token || !plan) {
        setMessage('No payment token found. If you have paid, please contact support.');
        setStatus('error');
        return;
      }

      try {
        const success = await verifyAndUpgradeUser(user.uid, token, plan);
        
        if (success) {
          setMessage('Subscription activated! Welcome to Pro.');
          setStatus('success');
          // Clean up local storage
          localStorage.removeItem('paymentToken');
          localStorage.removeItem('paymentPlan');
          setTimeout(() => navigate('/'), 3000);
        } else {
          throw new Error('Invalid token or verification failed.');
        }

      } catch (error) {
        console.error("Failed to verify subscription:", error);
        setMessage('There was an error verifying your subscription. Please contact support.');
        setStatus('error');
        localStorage.removeItem('paymentToken');
        localStorage.removeItem('paymentPlan');
      }
    };
    
    // A small delay to allow Firebase auth state to settle
    const timer = setTimeout(processVerification, 1000);

    return () => clearTimeout(timer);
  }, [user, navigate]);

  const renderStatus = () => {
    switch(status) {
        case 'processing':
            return <LoadingSpinner />;
        case 'success':
            return <CircleCheck size={64} className="text-green-500" />;
        case 'error':
             return <CircleX size={64} className="text-red-500" />;
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
        <div className="mb-6">
          {renderStatus()}
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
            {status === 'processing' && 'Finalizing...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Verification Failed'}
        </h1>
        <p className="text-gray-300 max-w-sm">{message}</p>
        {status === 'error' && (
             <button onClick={() => navigate('/contact-us')} className="mt-6 px-4 py-2 bg-orange-600 rounded-lg">Contact Support</button>
        )}
    </div>
  );
};

export default VerifyPaymentPage;
