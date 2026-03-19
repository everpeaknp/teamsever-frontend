'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/axios';
import { Loader2, CheckCircle2, XCircle, Mail, Users, Shield, Layers, ArrowRight } from 'lucide-react';

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      setVerifying(false);
      return;
    }

    // Check if user is logged in first
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      // Redirect to login with the join page as redirect
      router.push(`/login?redirect=${encodeURIComponent(`/join?token=${token}`)}`);
      return;
    }

    // User is logged in, verify the invitation
    verifyInvitation();
  }, [token, router]);

  const verifyInvitation = async () => {
    try {
      setVerifying(true);
      setError(null);

      console.log('[Join Page] Verifying invitation token:', token?.substring(0, 20) + '...');
      const response = await api.get(`/invites/verify/${token}`);
      console.log('[Join Page] Invitation verified successfully:', response.data);
      
      setInvitation(response.data.data);
      setVerifying(false);
      setLoading(false);
    } catch (err: any) {
      console.error('[Join Page] Failed to verify invitation:', err);
      console.error('[Join Page] Error response:', err.response?.data);
      
      const errorMessage = err.response?.data?.message || 'Invalid or expired invitation';
      setError(errorMessage);
      setVerifying(false);
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!token) return;

    try {
      setAccepting(true);
      setError(null);

      const response = await api.post(`/invites/accept/${token}`);
      const data = response.data.data;

      setSuccess(true);

      setTimeout(() => {
        router.push(`/workspace/${data.workspace._id}`);
      }, 2000);
    } catch (err: any) {
      console.error('Failed to accept invitation:', err);
      setError(err.response?.data?.message || 'Failed to accept invitation');
      setAccepting(false);
    }
  };

  if (loading || verifying) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 font-sans bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center">
          <div className="inline-flex items-center justify-center size-12 bg-[#135bec]/10 rounded-full mb-2">
            <Loader2 className="size-6 text-[#135bec] animate-spin" />
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 font-sans bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center">
          <div className="inline-flex items-center justify-center size-12 bg-green-100 dark:bg-green-900/20 rounded-full mb-3">
            <CheckCircle2 className="size-7 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5">Welcome Aboard! 🎉</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Redirecting you now...</p>
          <Loader2 className="size-5 animate-spin text-[#135bec] mx-auto" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 font-sans bg-black/50 backdrop-blur-sm">
        <div className="w-full max-w-[380px]">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center">
            <div className="inline-flex items-center justify-center size-12 bg-red-100 dark:bg-red-900/20 rounded-full mb-3">
              <XCircle className="size-7 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1.5">Invalid Invitation</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{error}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 h-9 px-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-semibold text-sm"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/login')}
                className="flex-1 h-9 bg-[#135bec] hover:bg-[#135bec]/90 text-white px-3 rounded-lg transition-all font-semibold shadow-lg shadow-[#135bec]/20 text-sm"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 font-sans bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-[420px] animate-in fade-in zoom-in duration-200">
        {/* Invitation Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#135bec] to-[#0d47a1] p-5 text-center">
            <div className="flex items-center justify-center gap-2 text-white mb-2">
              <div className="size-7 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Layers className="size-4" />
              </div>
              <h2 className="text-base font-bold">Teamsever</h2>
            </div>
            <div className="inline-flex items-center justify-center size-11 bg-white/20 backdrop-blur-sm rounded-full mb-2">
              <Mail className="size-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white mb-0.5">You're Invited!</h1>
            <p className="text-xs text-blue-100">Join your team</p>
          </div>

          {/* Content */}
          <div className="p-5">
            <div className="space-y-2.5 mb-4">
              <div className="flex items-center gap-2.5 p-2.5 bg-[#135bec]/5 dark:bg-[#135bec]/10 rounded-lg border border-[#135bec]/10 dark:border-[#135bec]/20">
                <div className="flex-shrink-0 size-8 bg-[#135bec]/10 dark:bg-[#135bec]/20 rounded-lg flex items-center justify-center">
                  <Users className="size-4 text-[#135bec]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Workspace</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{invitation.workspaceName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex-shrink-0 size-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                  <Mail className="size-4 text-slate-600 dark:text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Invited by</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{invitation.inviterName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex-shrink-0 size-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <Shield className="size-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Your Role</p>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400 capitalize">{invitation.role}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 h-10 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptInvitation}
                disabled={accepting}
                className="flex-1 h-10 bg-[#135bec] hover:bg-[#135bec]/90 text-white px-4 rounded-lg transition-all font-bold shadow-lg shadow-[#135bec]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {accepting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Joining...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    <span>Accept & Join</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-3">
              By accepting, you'll become a member of this workspace
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center size-12 bg-[#135bec]/10 rounded-full mb-2">
            <Loader2 className="size-6 text-[#135bec] animate-spin" />
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  );
}
