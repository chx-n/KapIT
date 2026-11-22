import React from 'react';
import { BadgeCheck, Brain, Check, CheckCircle2, CreditCard, Crown, Image as ImageIcon, MessageCircle, Sparkles, X } from 'lucide-react';
import {
  getUserPremiumPaymentProviders,
  createUserPremiumCheckoutSession,
  captureUserPremiumPayPalCheckout,
  cancelUserPremiumCheckout,
  completeUserPremiumLocalBypass,
} from '@sharedServices/authService';
import { resolveCheckoutUrls } from '@sharedUtils/checkoutUrlResolver';
import { getPaymentErrorMessageForUser } from '@sharedUtils/paymentErrorMessages';

const USER_PREMIUM_PAYMENT_PATH = '/premium/payment';
const USER_PREMIUM_PAYMENT_SUCCESS = 'user-premium-payment-success';
const USER_PREMIUM_PAYMENT_STORAGE_KEY = 'kapit:user-premium-payment-success';

const PREMIUM_PLAN = {
  id: 'premium',
  name: 'Premium',
  amount: 449,
  unit: '/ month',
  subtitle: 'For faster, smarter job matching and better visibility. Everything in Free, plus:',
  cta: 'Upgrade to Premium',
  highlighted: true,
  features: [
    { icon: Sparkles, text: 'Priority access to new job postings' },
    { icon: Brain, text: 'Advanced job matching and filter' },
    { icon: Check, text: 'ATS-optimized resume formatting' },
    { icon: Crown, text: 'Access to pre-assessment tools' },
    { icon: BadgeCheck, text: 'Skill match percentage' },
    { icon: CheckCircle2, text: 'Application tracking updates via email' },
    { icon: MessageCircle, text: 'Ghost job prevention features to detect inactive or outdated job posts' },
  ],
};

const plans = [
  {
    id: 'free',
    name: 'Free',
    amount: '0',
    unit: '/ month',
    subtitle: 'For getting started with your job search.',
    cta: 'Your current plan',
    features: [
      { icon: Sparkles, text: 'Access to IT job listings' },
      { icon: Brain, text: 'Basic search and filtering tools' },
      { icon: Check, text: 'Create and manage your profile' },
      { icon: ImageIcon, text: 'Upload your resume' },
      { icon: MessageCircle, text: 'View company profiles' },
      { icon: CheckCircle2, text: 'Email job alerts' },
    ],
  },
  PREMIUM_PLAN,
];

const PAYMENT_PROVIDERS = [
  {
    id: 'paypal',
    label: 'PayPal',
    merchantName: 'KapIT PayPal Merchant',
    merchantCode: 'KAPIT-PAYPAL-314',
    accountHint: 'merchant checkout via PayPal',
    description: 'Accept PayPal wallet and supported guest checkout payments.',
    icon: CreditCard,
  },
];

function PlanCard({ plan, onUpgrade, buttonLabel, disabled = false }) {
  const highlighted = Boolean(plan.highlighted);

  return (
    <div
      className={`flex min-h-0 flex-col rounded-xl border p-5 sm:p-6 xl:rounded-lg ${
        highlighted
          ? 'border-[#8cac91] bg-[#eef6ee] dark:border-[#5a8465] dark:bg-[#243b2b] xl:border-[var(--user-primary)] xl:bg-[var(--user-surface-selected)]'
          : 'border-[#dce3df] bg-white dark:border-[#3f3f46] dark:bg-[#22272b] xl:border-[var(--user-border)] xl:bg-[var(--user-surface)]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-xl font-semibold text-[var(--user-text-strong)]">
          {highlighted ? <Crown className="h-5 w-5 text-[#9a700c] dark:text-[#e8c24d]" aria-hidden="true" /> : null}
          {plan.name}
        </h3>
      </div>
      <div className="mt-5 flex items-baseline gap-1.5 text-[var(--user-text-strong)]">
        <span className="text-sm font-medium text-[var(--user-text-muted)]">PHP</span>
        <span className="text-4xl font-semibold leading-none tabular-nums">{plan.amount}</span>
        <span className="text-sm text-[var(--user-text-muted)]">{plan.unit}</span>
      </div>
      <p className="mt-4 min-h-[44px] text-sm leading-5 text-[var(--user-text)]">{plan.subtitle}</p>

      <div className="mt-5">
        {highlighted ? (
          <button
            type="button"
            onClick={disabled ? undefined : onUpgrade}
            disabled={disabled}
            className="flex min-h-10 w-full items-center justify-center rounded-md bg-[var(--user-premium)] px-4 py-2 text-sm font-semibold text-[var(--user-premium-ink)] transition-[filter,transform] duration-150 hover:brightness-105 active:scale-[0.98] disabled:cursor-default disabled:opacity-60 disabled:hover:brightness-100 disabled:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--user-primary)]"
          >
            {buttonLabel || plan.cta}
          </button>
        ) : (
          <div className="flex min-h-10 items-center justify-center rounded-md border border-[var(--user-border)] bg-[var(--user-surface-subtle)] px-4 py-2 text-sm font-medium text-[var(--user-text-muted)]">
            {buttonLabel || plan.cta}
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-[var(--user-border)] pt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--user-text-muted)]">What you get</p>
        <ul className="space-y-3">
          {plan.features.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2.5 text-sm leading-5 text-[var(--user-text)]">
              <Icon className="mt-0.5 h-4 w-4 flex-none text-[var(--user-primary)]" aria-hidden="true" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const notifyOpener = (payload) => {
  try {
    const snapshot = {
      type: USER_PREMIUM_PAYMENT_SUCCESS,
      ...payload,
      timestamp: Date.now(),
    };
    window.localStorage.setItem(USER_PREMIUM_PAYMENT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Best effort only; postMessage remains the primary sync channel.
  }

  if (window.opener && !window.opener.closed) {
    window.opener.postMessage({ type: USER_PREMIUM_PAYMENT_SUCCESS, ...payload }, window.location.origin);
  }
};

function MerchantCheckout({ user: _user, onBack, onClose, onConfirmUpgrade, standalone = false }) {
  const [paymentMethod, setPaymentMethod] = React.useState('paypal');
  const [providerAvailability, setProviderAvailability] = React.useState({
    paypal: { enabled: true, label: 'PayPal', reason: '' },
  });
  const [currentPaymentId, setCurrentPaymentId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [error, setError] = React.useState('');
  const [_success, setSuccess] = React.useState('');
  const [demoPricing, setDemoPricing] = React.useState(null);
  const [localPaymentBypass, setLocalPaymentBypass] = React.useState({ available: false, reason: '' });
  const [checkoutFallbackUrls, setCheckoutFallbackUrls] = React.useState([]);
  const [completedCheckout, setCompletedCheckout] = React.useState(null);
  const handledReturnRef = React.useRef(false);

  const [wizardStep, setWizardStep] = React.useState(1);
  const [isFeaturesExpanded, setIsFeaturesExpanded] = React.useState(false);

  const selectedProvider = PAYMENT_PROVIDERS.find((provider) => provider.id === paymentMethod) || PAYMENT_PROVIDERS[0];
  const selectedProviderState = providerAvailability?.[selectedProvider.id] || { enabled: true, reason: '' };
  const isLocalhostBypassAvailable = Boolean(localPaymentBypass?.available);
  const demoChargeAmountLabel = demoPricing?.active && demoPricing?.demoAmountValue
    ? demoPricing.demoAmountValue
    : PREMIUM_PLAN.amount.toLocaleString();
    
  const completedAmount = Number(completedCheckout?.amount || 0);
  const completedPlanName = completedCheckout?.planName || PREMIUM_PLAN.name;
  const completedBillingCycle = completedCheckout?.billingCycle || 'monthly';

  React.useEffect(() => {
    let cancelled = false;
    const loadPaymentMeta = async () => {
      try {
        const data = await getUserPremiumPaymentProviders();
        if (!cancelled && data?.providers) {
          setProviderAvailability(data.providers);
          setDemoPricing(data?.demoPricing || null);
          setLocalPaymentBypass(data?.localPaymentBypass || { available: false, reason: '' });
          const firstEnabled = PAYMENT_PROVIDERS.find((provider) => data.providers?.[provider.id]?.enabled);
          if (firstEnabled) {
            setPaymentMethod((current) => (data.providers?.[current]?.enabled ? current : firstEnabled.id));
          }
        }
      } catch {
        // Keep local fallback
      }
    };
    loadPaymentMeta();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (handledReturnRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    const paymentId = params.get('payment_id') || '';

    if (!checkout) return;
    handledReturnRef.current = true;
    setCurrentPaymentId(paymentId);

    const cleanupUrl = () => {
      window.history.replaceState({}, document.title, USER_PREMIUM_PAYMENT_PATH);
    };

    const handleProviderReturn = async () => {
      if (checkout === 'cancelled') {
        if (paymentId) {
          try { await cancelUserPremiumCheckout(paymentId); } catch {
            // Best-effort cancellation; the user-facing state is already cancelled.
          }
        }
        setError('Payment was cancelled.');
        setWizardStep(2);
        setVerifying(false);
        cleanupUrl();
        return;
      }

      setVerifying(true);
      setError('');
      setWizardStep(3);

      try {
        if (checkout === 'paypal-success') {
          const orderId = params.get('token');
          if (!orderId || !paymentId) throw new Error('Missing PayPal details.');

          const data = await captureUserPremiumPayPalCheckout({ paymentId, orderId });
          if (data?.user) {
            await onConfirmUpgrade?.(data.user);
            notifyOpener({ updates: { isPremium: Boolean(data.user?.isPremium) } });
          }
          setCompletedCheckout({
            providerId: 'paypal',
            amount: Number(data?.payment?.amount || PREMIUM_PLAN.amount),
            planName: data?.payment?.plan_label || PREMIUM_PLAN.name,
            billingCycle: data?.payment?.plan_duration || 'monthly',
            paymentMethod: 'PayPal',
            reference: data?.payment?.provider_payment_id || data?.payment?.provider_checkout_id || paymentId,
            accountHint: PAYMENT_PROVIDERS.find((provider) => provider.id === 'paypal')?.accountHint || '',
            paymentId: data?.payment?.id || paymentId,
            providerReference: data?.payment?.provider_payment_id || data?.payment?.provider_checkout_id || paymentId,
            paidAt: data?.payment?.paid_at || '',
          });
          setSuccess('Payment verified.');
          cleanupUrl();
          return;
        }
        throw new Error('Unknown return state.');
      } catch (verificationError) {
        setError(getPaymentErrorMessageForUser(verificationError, 'Payment verification failed.'));
        cleanupUrl();
      } finally {
        setVerifying(false);
      }
    };
    handleProviderReturn();
  }, [onConfirmUpgrade]);

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setCheckoutFallbackUrls([]);

    try {
      if (!selectedProviderState.enabled) throw new Error('Provider not available.');

      const data = await createUserPremiumCheckoutSession({ provider: paymentMethod });
      const checkoutUrls = resolveCheckoutUrls(data);
      if (!checkoutUrls.length) throw new Error('No checkout URL returned.');

      const primaryCheckoutUrl = checkoutUrls[0];
      setCurrentPaymentId(data.paymentId || '');
      setCheckoutFallbackUrls(checkoutUrls.slice(1));

      const checkoutWindow = window.open(primaryCheckoutUrl, 'kapit-paypal-checkout');
      if (checkoutWindow && !checkoutWindow.closed) {
        setLoading(false);
        setWizardStep(3);
        return;
      }
      window.location.assign(primaryCheckoutUrl);
    } catch (checkoutError) {
      setLoading(false);
      setError(getPaymentErrorMessageForUser(checkoutError, 'Unable to start payment.'));
    }
  };

  const handleSampleSuccess = async () => {
    if (!isLocalhostBypassAvailable) return;
    setLoading(true);
    setError('');
    try {
      const data = await completeUserPremiumLocalBypass({ provider: paymentMethod });
      if (data?.user) {
        await onConfirmUpgrade?.(data.user);
        notifyOpener({ updates: { isPremium: Boolean(data.user?.isPremium) } });
      }
      setCompletedCheckout({
        providerId: paymentMethod,
        amount: Number(data?.payment?.amount || PREMIUM_PLAN.amount),
        planName: PREMIUM_PLAN.name,
        billingCycle: 'monthly',
        paymentMethod: selectedProvider.label,
        reference: data?.payment?.provider_payment_id || `sample-${Date.now()}`,
        accountHint: selectedProvider.accountHint,
        paymentId: data?.payment?.id || '',
        providerReference: data?.payment?.provider_payment_id || `sample-${Date.now()}`,
        paidAt: data?.payment?.paid_at || '',
      });
      setSuccess('Sample payment completed.');
    } catch (err) {
      setError(getPaymentErrorMessageForUser(err, 'Sample payment failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (currentPaymentId) {
      try { await cancelUserPremiumCheckout(currentPaymentId); } catch {
        // Best-effort cancellation; closing the popup should not be blocked.
      }
    }
    if (standalone) {
      onClose?.();
      return;
    }
    onBack?.();
  };

  if (completedCheckout) {
    return (
      <div className="px-6 py-10 sm:px-10 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-[#588157]/10 dark:bg-[#82ad86]/10 flex items-center justify-center mb-4">
               <CheckCircle2 className="h-6 w-6 text-[#2f6b4f] dark:text-[#82ad86]" />
            </div>
            <h2 className="text-2xl font-semibold text-[#102a1b] dark:text-white">Payment Successful</h2>
            <p className="mt-2 text-sm text-[#5f6f52] dark:text-[#c0c8d0]">Your premium subscription is now active.</p>
          </div>
          
          <div className="rounded-2xl bg-white/70 dark:bg-[#22272b]/70 backdrop-blur-xl p-6 space-y-4 shadow-[0_20px_40px_rgba(0,0,0,0.06)]">
            <div className="flex justify-between">
              <span className="text-sm text-[#5f6f52] dark:text-[#b3bcc5]">Plan</span>
              <span className="text-sm font-medium text-[#102a1b] dark:text-white">{completedPlanName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[#5f6f52] dark:text-[#b3bcc5]">Amount</span>
              <span className="text-sm font-medium text-[#102a1b] dark:text-white">PHP {completedAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[#5f6f52] dark:text-[#b3bcc5]">Billed</span>
              <span className="text-sm font-medium text-[#102a1b] dark:text-white capitalize">{completedBillingCycle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[#5f6f52] dark:text-[#b3bcc5]">Provider</span>
              <span className="text-sm font-medium text-[#102a1b] dark:text-white">{completedCheckout.paymentMethod}</span>
            </div>
          </div>
          
          <button onClick={handleCancel} className="w-full rounded-full bg-[#3a5a40] text-white hover:bg-[#344e41] dark:bg-[#6f9b74] dark:text-[#121416] dark:hover:bg-[#82ad86] py-3 font-medium transition-colors">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 sm:px-10">
      <div className="mx-auto max-w-xl">
        
        {wizardStep === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="rounded-3xl bg-white/70 dark:bg-[#22272b]/70 backdrop-blur-xl p-6 space-y-4 shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Crown className="h-5 w-5 text-[#588157] dark:text-[#f0c766]" />
                    <span className="font-medium text-[#2d4632] dark:text-white">{PREMIUM_PLAN.name}</span>
                 </div>
                 <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3a5a40]/70 dark:text-[#82ad86]/70">Monthly</span>
               </div>
               <div className="pt-2">
                 <p className="text-4xl font-semibold tracking-tight text-[#2d4632] dark:text-white">PHP {PREMIUM_PLAN.amount.toLocaleString()}</p>
                 <p className="mt-1 text-[13px] text-[#4a6b57] dark:text-[#a8b1ba] leading-relaxed">{PREMIUM_PLAN.subtitle}</p>
               </div>
            </div>

            <div className="rounded-3xl bg-white/70 dark:bg-[#22272b]/70 backdrop-blur-xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.06)]">
              <button 
                onClick={() => setIsFeaturesExpanded(!isFeaturesExpanded)}
                className="w-full flex items-center justify-between p-4 text-sm font-medium text-[#2d4632] dark:text-white hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
              >
                <span>View what's included</span>
                <span className="text-[#588157] dark:text-[#82ad86]">{isFeaturesExpanded ? '−' : '+'}</span>
              </button>
              {isFeaturesExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-black/5 dark:border-white/5 pt-4">
                  {PREMIUM_PLAN.features.map(({ text }) => (
                    <div key={text} className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-[#588157] dark:text-[#82ad86] mt-0.5 shrink-0" />
                      <span className="text-[13px] text-[#344e41] dark:text-[#d0d7dd] leading-relaxed">{text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex gap-3">
               <button onClick={handleCancel} className="px-6 py-3 rounded-full text-[#344e41] dark:text-white font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors">
                 Cancel
               </button>
               <button onClick={() => setWizardStep(2)} className="flex-1 bg-[#3a5a40] hover:bg-[#344e41] dark:bg-[#6f9b74] dark:hover:bg-[#82ad86] text-white dark:text-[#121416] py-3 rounded-full font-medium transition-colors">
                 Continue to Payment
               </button>
            </div>
          </div>
        )}

        {wizardStep === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="flex items-center gap-3">
                <button onClick={() => setWizardStep(1)} className="p-2 -ml-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors text-[#5f6f52] dark:text-[#a8b1ba]">
                   <span className="sr-only">Back</span>
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <div>
                  <h2 className="text-xl font-medium text-[#2d4632] dark:text-white tracking-tight">Payment Method</h2>
                </div>
             </div>

             <div className="space-y-3">
                {PAYMENT_PROVIDERS.map((provider) => {
                  const Icon = provider.icon;
                  const selected = paymentMethod === provider.id;
                  return (
                    <button
                      key={provider.id}
                      onClick={() => setPaymentMethod(provider.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-3xl transition-all duration-300 ${selected ? 'bg-white/70 dark:bg-[#22272b]/70 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.08)]' : 'bg-white/40 dark:bg-[#22272b]/40 hover:bg-white/60 dark:hover:bg-[#22272b]/60 hover:shadow-[0_12px_30px_rgba(0,0,0,0.06)]'}`}
                    >
                       <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-[#588157]/10 dark:bg-[#82ad86]/10 rounded-2xl">
                            <Icon className="h-5 w-5 text-[#3a5a40] dark:text-[#82ad86]" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-[#2d4632] dark:text-white">{provider.label}</p>
                            <p className="text-xs text-[#4a6b57] dark:text-[#a8b1ba]">{provider.description}</p>
                          </div>
                       </div>
                       <div className={`h-5 w-5 rounded-full flex items-center justify-center transition-colors ${selected ? 'bg-[#588157] dark:bg-[#82ad86]' : 'bg-black/10 dark:bg-white/10'}`}>
                          {selected && <div className="h-2 w-2 rounded-full bg-white dark:bg-[#121416]" />}
                       </div>
                    </button>
                  );
                })}
             </div>

             {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
             {demoPricing?.active ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  Demo pricing is active. PayPal will charge PHP {demoPricing.demoAmountValue} for this local checkout while the Premium plan stays PHP {PREMIUM_PLAN.amount.toLocaleString()} in internal records.
                </div>
             ) : null}
             
             {checkoutFallbackUrls.length > 0 && (
                <div className="p-4 bg-white/50 dark:bg-[#22272b]/50 backdrop-blur-xl rounded-2xl text-sm">
                  <p className="text-[#344e41] dark:text-[#d0d7dd]">If the checkout doesn't open automatically:</p>
                  <a href={checkoutFallbackUrls[0]} target="_blank" rel="noreferrer" className="inline-block mt-2 font-medium underline text-[#2f6b4f] dark:text-[#9fd7a6]">
                    Click here to open checkout
                  </a>
                </div>
             )}

             <div className="pt-4 space-y-3">
               <button 
                 onClick={handleConfirm}
                 disabled={loading || verifying}
                 className="w-full bg-[#3a5a40] hover:bg-[#344e41] dark:bg-[#6f9b74] dark:hover:bg-[#82ad86] text-white dark:text-[#121416] py-4 rounded-full font-semibold transition-colors disabled:opacity-50"
               >
                 {verifying ? 'Verifying...' : loading ? 'Processing...' : `Pay PHP ${demoChargeAmountLabel}`}
               </button>
               {isLocalhostBypassAvailable && (
                 <button 
                   onClick={handleSampleSuccess}
                   disabled={loading || verifying}
                   className="w-full bg-black/[0.03] dark:bg-white/[0.05] text-[#3a5a40] dark:text-[#d0d7dd] py-3 rounded-full font-medium hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors disabled:opacity-50"
                 >
                   Sample success (Local Only)
                 </button>
               )}
             </div>

          </div>
        )}

        {wizardStep === 3 && (
          <div className="flex flex-col items-center justify-center min-h-[360px] animate-in fade-in duration-500">
            <div className="relative mb-8">
              <div className="h-16 w-16 rounded-full bg-[#588157]/10 dark:bg-[#82ad86]/10 flex items-center justify-center">
                <div className="h-16 w-16 rounded-full border-2 border-[#588157]/20 dark:border-[#82ad86]/20 border-t-[#588157] dark:border-t-[#82ad86] animate-spin absolute inset-0" />
                <CreditCard className="h-6 w-6 text-[#588157] dark:text-[#82ad86]" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-[#2d4632] dark:text-white tracking-tight">
              {verifying ? 'Verifying payment' : 'Waiting for payment'}
            </h2>
            <p className="mt-2 text-[13px] text-[#4a6b57] dark:text-[#a8b1ba] text-center max-w-xs leading-relaxed">
              {verifying
                ? 'We\'re confirming your payment with the provider. This will only take a moment.'
                : 'Complete the payment in the PayPal window. This page will update automatically.'}
            </p>

            <div className="mt-8 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[#588157] dark:bg-[#82ad86] animate-pulse" />
              <div className="h-1.5 w-1.5 rounded-full bg-[#588157]/60 dark:bg-[#82ad86]/60 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="h-1.5 w-1.5 rounded-full bg-[#588157]/30 dark:bg-[#82ad86]/30 animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>

            {!verifying && (
              <button
                onClick={() => setWizardStep(2)}
                className="mt-8 text-sm text-[#5f6f52] dark:text-[#a8b1ba] hover:text-[#2d4632] dark:hover:text-white transition-colors"
              >
                Back to payment methods
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}



export default function UserPremiumPopup({ isOpen, onClose, user, onOpenMerchantWindow }) {
  const dialogRef = React.useRef(null);
  const closeButtonRef = React.useRef(null);
  const onCloseRef = React.useRef(onClose);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const buttons = dialogRef.current?.querySelectorAll('button:not([disabled])');
      if (!buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (!dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isPremium = !!user?.isPremium;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/45">
      <div className="flex min-h-full items-end justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-5">
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="user-premium-title" className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[880px] flex-col overflow-hidden rounded-xl border border-[var(--user-border)] bg-[#f8fbf6] shadow-[0_20px_60px_rgba(0,0,0,0.18)] dark:bg-[#121416] sm:max-h-[min(90dvh,820px)] xl:rounded-lg xl:bg-[var(--user-surface)] xl:shadow-[var(--user-elevated-shadow)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--user-border)] px-5 py-4 sm:px-6 sm:py-5">
            <div>
              <h2 id="user-premium-title" className="flex items-center gap-2 text-xl font-semibold text-[var(--user-text-strong)] sm:text-2xl">
                <Crown className="h-5 w-5 text-[#9a700c] dark:text-[#e8c24d]" aria-hidden="true" />
                Premium Plans
              </h2>
              <p className="mt-1 text-sm text-[var(--user-text-muted)]">Choose the plan that fits your job application needs.</p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="-mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[var(--user-text-muted)] transition-[background-color,color,transform] duration-150 hover:bg-[var(--user-surface-selected)] hover:text-[var(--user-text-strong)] active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--user-primary)] sm:h-9 sm:w-9"
              aria-label="Close premium popup"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="overflow-y-auto p-4 sm:p-5">
            {isPremium ? (
              <div className="mb-4 rounded-md border border-[var(--user-border)] bg-[var(--user-surface-selected)] px-4 py-3 text-sm text-[var(--user-text)]">
                You're already on the Premium plan.
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onUpgrade={onOpenMerchantWindow}
                  disabled={Boolean(isPremium && plan.highlighted)}
                  buttonLabel={isPremium ? (plan.highlighted ? "You're on this plan" : 'Free plan') : plan.cta}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UserPremiumPaymentWindow({ user, onUpgrade }) {
  React.useEffect(() => {
    const handleNestedCheckoutMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event?.data?.type !== USER_PREMIUM_PAYMENT_SUCCESS) return;
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(event.data, window.location.origin);
      }
    };
    window.addEventListener('message', handleNestedCheckoutMessage);
    return () => window.removeEventListener('message', handleNestedCheckoutMessage);
  }, []);

  const handleClose = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
      return;
    }
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-[#dad7cd] dark:bg-[#121416] px-4 py-6 sm:p-8 flex items-center justify-center transition-colors duration-300">
      <div className="w-full max-w-2xl bg-white/70 dark:bg-[#22272b]/70 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.3)] border border-white/40 dark:border-white/10">
        <div className="px-6 py-6 sm:px-10 sm:pt-10 flex items-start justify-between">
           <div>
             <h1 className="text-2xl font-bold tracking-tight text-[#2d4632] dark:text-white">Complete Premium Payment</h1>
           </div>
           <button 
             onClick={handleClose}
             className="p-2 -mr-2 text-[#5f6f52] dark:text-[#a8b1ba] hover:text-[#2d4632] dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05] rounded-xl transition-colors"
           >
             <X className="h-5 w-5" />
           </button>
        </div>
        <MerchantCheckout
          user={user}
          onBack={handleClose}
          onClose={handleClose}
          onConfirmUpgrade={onUpgrade}
          standalone
        />
      </div>
    </div>
  );
}



export { USER_PREMIUM_PAYMENT_PATH, USER_PREMIUM_PAYMENT_SUCCESS, USER_PREMIUM_PAYMENT_STORAGE_KEY };
