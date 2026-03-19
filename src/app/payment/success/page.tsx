'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/axios';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const [planDetails, setPlanDetails] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        console.log('[Payment Success] Starting verification...');
        console.log('[Payment Success] Current URL:', window.location.href);
        
        // Get encoded data from URL
        const encodedData = searchParams.get('data');
        console.log('[Payment Success] Encoded data:', encodedData ? 'Present' : 'Missing');
        console.log('[Payment Success] Encoded data length:', encodedData?.length);
        
        if (!encodedData) {
          setStatus('failed');
          setMessage('Payment data not found. Please contact support.');
          return;
        }

        // Check if user is logged in - try both token keys
        let token = localStorage.getItem('token');
        if (!token || token === 'undefined' || token === 'null') {
          token = localStorage.getItem('authToken');
        }
        
        console.log('[Payment Success] Token:', token ? 'Present' : 'Missing');
        console.log('[Payment Success] Token length:', token?.length);
        
        if (!token || token === 'undefined' || token === 'null') {
          setStatus('failed');
          setMessage('Session expired. Please login and try again.');
          setTimeout(() => {
            // Store the payment data in sessionStorage so user can retry after login
            sessionStorage.setItem('pendingPaymentData', encodedData);
            router.push('/login?redirect=/payment/success');
          }, 3000);
          return;
        }

        console.log('[Payment Success] Calling verify API...');
        console.log('[Payment Success] API URL:', '/payment/verify');
        console.log('[Payment Success] Request payload:', { data: encodedData.substring(0, 50) + '...' });
        
        // Add timeout to the request (30 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        try {
          // Call backend to verify payment using api instance (has token interceptor)
          const response = await api.post('/payment/verify', {
            data: encodedData
          }, {
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          console.log('[Payment Success] Verify response received');
          console.log('[Payment Success] Response status:', response.status);
          console.log('[Payment Success] Response data:', response.data);

          if (response.data.success) {
            setStatus('success');
            setMessage('Payment verified successfully! Your plan has been activated.');
            setPlanDetails(response.data.data.subscription);

            // Clear any pending payment data
            sessionStorage.removeItem('pendingPaymentData');

            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
              router.push('/dashboard');
            }, 3000);
          } else {
            setStatus('failed');
            setMessage(response.data.message || 'Payment verification failed.');
          }
        } catch (apiError: any) {
          clearTimeout(timeoutId);
          
          if (apiError.name === 'AbortError' || apiError.code === 'ECONNABORTED') {
            console.error('[Payment Success] Request timeout');
            setStatus('failed');
            setMessage('Verification is taking too long. Please check your transaction status or contact support.');
            return;
          }
          
          throw apiError; // Re-throw to be caught by outer catch
        }
      } catch (error: any) {
        console.error('[Payment Success] Verification error:', error);
        console.error('[Payment Success] Error name:', error.name);
        console.error('[Payment Success] Error message:', error.message);
        console.error('[Payment Success] Error response:', error.response?.data);
        console.error('[Payment Success] Error status:', error.response?.status);
        
        setStatus('failed');
        
        if (error.response?.data?.message) {
          setMessage(error.response.data.message);
        } else if (error.response?.status === 401) {
          setMessage('Session expired. Please login again to complete verification.');
          // Store payment data for retry after login
          const encodedData = searchParams.get('data');
          if (encodedData) {
            sessionStorage.setItem('pendingPaymentData', encodedData);
          }
          setTimeout(() => {
            router.push('/login?redirect=/payment/success');
          }, 3000);
        } else if (error.message === 'Network Error') {
          setMessage('Cannot connect to server. Please check if backend is running.');
        } else if (error.message === 'No valid authentication token') {
          setMessage('Session expired. Please login again.');
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        } else if (error.code === 'ERR_NETWORK') {
          setMessage('Network error. Please check your connection and backend server.');
        } else {
          setMessage(`Failed to verify payment: ${error.message || 'Unknown error'}. Please contact support.`);
        }
      }
    };

    verifyPayment();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="text-center">
          {/* Status Icon */}
          <div className="mb-6 flex justify-center">
            {status === 'verifying' && (
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-16 h-16 text-green-500" />
            )}
            {status === 'failed' && (
              <XCircle className="w-16 h-16 text-red-500" />
            )}
          </div>

          {/* Status Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {status === 'verifying' && 'Verifying Payment'}
            {status === 'success' && 'Payment Successful!'}
            {status === 'failed' && 'Payment Failed'}
          </h1>

          {/* Status Message */}
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {message}
          </p>

          {/* Plan Details (on success) */}
          {status === 'success' && planDetails && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Plan Activated
              </h3>
              <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                <p>
                  <span className="font-medium">Plan:</span> {planDetails.planName}
                </p>
                <p>
                  <span className="font-medium">Status:</span>{' '}
                  <span className="capitalize">{planDetails.status}</span>
                </p>
                <p>
                  <span className="font-medium">Expires:</span>{' '}
                  {new Date(planDetails.expiresAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {status === 'success' && (
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
            )}

            {status === 'failed' && (
              <>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={() => router.push('/plans')}
                  className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  View Plans
                </button>
              </>
            )}

            {status === 'verifying' && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Please wait while we confirm your payment with eSewa...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
