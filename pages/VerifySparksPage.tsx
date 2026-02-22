
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { verifyAndAddSparks } from '../services/firestoreService';
import LoadingSpinner from '../components/LoadingSpinner';
import { CheckCircle, XCircle } from 'lucide-react';

interface VerifySparksPageProps {
  user: User | null;
}

const VerifySparksPage: React.FC<VerifySparksPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Verifying payment...');
  const [amountAdded, setAmountAdded] = useState(0);

  useEffect(() => {
    const process = async () => {
        const tokenId = localStorage.getItem('sparksPaymentToken');
        
        if (!user) {
            navigate('/auth'); // Should redirect back here after login if configured
            return;
        }

        if (!tokenId) {
            setStatus('error');
            setMessage("No transaction token found.");
            return;
        }

        try {
            const result = await verifyAndAddSparks(user.uid, tokenId);
            if (result.success) {
                setStatus('success');
                setMessage('Sparks added to your wallet!');
                setAmountAdded(result.amount || 0);
                localStorage.removeItem('sparksPaymentToken');
                setTimeout(() => navigate('/profile'), 3000);
            } else {
                throw new Error("Verification failed");
            }
        } catch (e) {
            setStatus('error');
            setMessage("Failed to verify payment. Please contact support.");
        }
    };

    setTimeout(process, 1000);
  }, [user, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-4 text-center">
        {status === 'processing' && <LoadingSpinner />}
        {status === 'success' && <CheckCircle size={64} className="text-green-500 mb-4" />}
        {status === 'error' && <XCircle size={64} className="text-red-500 mb-4" />}
        
        <h2 className="text-2xl font-bold mb-2">
            {status === 'processing' ? 'Processing...' : status === 'success' ? 'Payment Successful!' : 'Error'}
        </h2>
        <p className="text-gray-400">{message}</p>
        
        {status === 'success' && (
            <p className="text-yellow-400 font-bold mt-4 text-xl">+{amountAdded} Sparks</p>
        )}
        
        {status === 'error' && (
            <button onClick={() => navigate('/profile')} className="mt-6 bg-gray-700 px-6 py-2 rounded-lg">Back to Profile</button>
        )}
    </div>
  );
};

export default VerifySparksPage;
