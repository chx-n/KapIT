export interface IntentDefinition {
  intent_id: string;
  group: string;
  keywords: readonly string[];
  responses: readonly string[];
}

export interface NavigationAction {
  type: 'navigate';
  label: string;
  href: string;
}

export const TYPO_REPLACEMENTS: Record<string, string> = {
  ehy: 'hey',
  helo: 'hello',
  hiii: 'hi',
  hii: 'hi',
  heyy: 'hey',
  suport: 'support',
  suppot: 'support',
  hlp: 'help',
  gud: 'good',
  gudmorning: 'good morning',
  gudafternoon: 'good afternoon',
  gudevening: 'good evening',
  whatsup: 'whats up',
};

export const PHRASE_REPLACEMENTS: Record<string, string> = {
  'gud morning': 'good morning',
  'gud afternoon': 'good afternoon',
  'gud evening': 'good evening',
};

export const FALLBACK_RESPONSES: readonly string[] = [
  "I'm not fully sure what you mean yet, but I'd still love to help.",
  'Could you rephrase that slightly? I can help with jobs, accounts, resumes, pricing, and support.',
  "I'm not sure I understood that yet. Try asking about accounts, resumes, applications, pricing, or support.",
];

export const NONSENSE_RESPONSES: readonly string[] = [
  "I'm not sure I understood that yet. Try asking about accounts, resumes, applications, pricing, or support.",
  'That looks unclear on my side, but I can help with account access, job applications, resumes, and pricing.',
];

export const FOLLOW_UP_NAVIGATION_PHRASES: readonly string[] = [
  'where is that',
  'where is it',
  'where can i find',
  'where do i find',
  'where to find',
  'which page',
  'send link',
];

export const NAVIGATION_ACTIONS_BY_INTENT: Record<string, readonly NavigationAction[]> = {
  help: [
    { type: 'navigate', label: 'Browse Jobs', href: '/jobs' },
    { type: 'navigate', label: 'Create Account', href: '/auth/register' },
    { type: 'navigate', label: 'View Pricing', href: '/pricing' },
  ],
  account: [
    { type: 'navigate', label: 'Open Register', href: '/auth/register' },
  ],
  auth: [
    { type: 'navigate', label: 'Open Login', href: '/auth/login' },
    { type: 'navigate', label: 'Forgot Password', href: '/forgot-password' },
  ],
  job: [
    { type: 'navigate', label: 'Open Jobs', href: '/jobs' },
  ],
  resume: [
    { type: 'navigate', label: 'Resume Setup', href: '/onboarding/developer-profile' },
  ],
  company: [
    { type: 'navigate', label: 'Company Dashboard', href: '/company/dashboard' },
  ],
  pricing: [
    { type: 'navigate', label: 'Open Pricing', href: '/pricing' },
  ],
  support: [
    { type: 'navigate', label: 'Support Center', href: '/company/help' },
  ],
};

export const EMPLOYER_FALLBACK_RESPONSES: readonly string[] = [
  'I can help with company accounts, IT job posts, candidate search, applicant review, pricing, and support.',
  'Try asking about employer tools, job posts, candidates, applicants, or pricing.',
];

export const EMPLOYER_NONSENSE_RESPONSES: readonly string[] = [
  'I am not sure I understood that yet. You can ask about company accounts, job posts, candidates, or applicants.',
];

export const EMPLOYER_NAVIGATION_ACTIONS_BY_INTENT: Record<string, readonly NavigationAction[]> = {
  'create-company-account': [
    { type: 'navigate', label: 'Create company account', href: '/auth/register?type=company' },
  ],
  'post-job': [
    { type: 'navigate', label: 'Create company account', href: '/auth/register?type=company' },
  ],
  'search-candidates': [
    { type: 'navigate', label: 'Open employer account', href: '/auth/register?type=company' },
  ],
  'review-applicants': [
    { type: 'navigate', label: 'Open employer account', href: '/auth/register?type=company' },
  ],
  'company-features': [
    { type: 'navigate', label: 'See how it works', href: '/for-employers#how-it-works' },
  ],
  pricing: [
    { type: 'navigate', label: 'View employer pricing', href: '/for-employers/pricing' },
  ],
};

export const EMPLOYER_INTENT_DEFINITIONS: readonly IntentDefinition[] = [
  {
    intent_id: 'greeting',
    group: 'greeting',
    keywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'],
    responses: ['Hi. How can I help with your hiring questions?'],
  },
  {
    intent_id: 'help',
    group: 'help',
    keywords: ['help', 'support', 'what can you do', 'how does this work', 'hiring help'],
    responses: ['I can help with company setup, IT job posts, candidate search, applicant review, pricing, and support.'],
  },
  {
    intent_id: 'create-company-account',
    group: 'employer',
    keywords: ['create company account', 'company account', 'employer account', 'company signup', 'sign up as a company', 'register company'],
    responses: ['Open Register, choose Company, submit your details, then finish your company profile to access employer tools.'],
  },
  {
    intent_id: 'post-job',
    group: 'employer',
    keywords: ['post a job', 'post job', 'post an it role', 'create job', 'publish role', 'job listing'],
    responses: ['Create a company account, open your employer workspace, and choose the option to create a job post. Add the role details and publish when ready.'],
  },
  {
    intent_id: 'search-candidates',
    group: 'employer',
    keywords: ['find developers', 'search candidates', 'search developers', 'find candidates', 'candidate search', 'talent search', 'hire developers'],
    responses: ['Use Talent Search to look through focused Filipino IT profiles. Filter by role, skills, experience, and location.'],
  },
  {
    intent_id: 'review-applicants',
    group: 'employer',
    keywords: ['review applicants', 'manage applicants', 'applicant review', 'rank applicants', 'compare applicants', 'applicant pipeline'],
    responses: ['Open a job listing to review applicants, compare role-fit details, update decisions, and keep the hiring pipeline organized.'],
  },
  {
    intent_id: 'company-features',
    group: 'employer',
    keywords: ['hiring tools', 'employer features', 'company tools', 'what can employers do', 'what can company accounts do'],
    responses: ['Employer tools include focused talent search, IT job posts, applicant review, role-fit signals, and candidate messaging.'],
  },
  {
    intent_id: 'pricing',
    group: 'employer',
    keywords: ['pricing', 'hiring plans', 'employer pricing', 'job post pricing', 'billing', 'payment', 'plans'],
    responses: ['Open Employer Pricing to compare current posting options and see what each plan includes.'],
  },
  {
    intent_id: 'support',
    group: 'support',
    keywords: ['contact support', 'human support', 'customer support', 'support team', 'employer support'],
    responses: ['For company-account help, contact support through KapIT and include your company or job-post details.'],
  },
  {
    intent_id: 'edit-job',
    group: 'employer',
    keywords: ['edit job', 'edit a role', 'change job post', 'update job listing', 'close job', 'reopen job', 'archive job'],
    responses: ['Open your job listing from the employer workspace to review its available management actions, including updates and status changes.'],
  },
  {
    intent_id: 'search-before-posting',
    group: 'employer',
    keywords: ['search before posting', 'search without posting', 'find candidates before posting', 'look for developers first'],
    responses: ['Yes. Company accounts can search developer profiles before publishing a job listing.'],
  },
  {
    intent_id: 'role-types',
    group: 'employer',
    keywords: ['remote roles', 'remote job', 'full time role', 'part time role', 'what roles can i post', 'non technical role'],
    responses: ['KapIT focuses on Philippine IT hiring. Use your listing details to describe work preference, role type, and requirements.'],
  },
  {
    intent_id: 'pre-assessment',
    group: 'employer',
    keywords: ['pre assessment', 'pre-assessment', 'screening questions', 'assessment questions', 'test applicants'],
    responses: ['You can attach role-specific pre-assessment questions so applicants see the requirements before entering review.'],
  },
  {
    intent_id: 'match-score',
    group: 'trust',
    keywords: ['match score', 'matching score', 'role fit', 'fit score', 'how are candidates ranked', 'ranking applicants'],
    responses: ['Match and ranking signals help your team compare role fit. They support review; your team controls every hiring decision.'],
  },
  {
    intent_id: 'ai-decision',
    group: 'trust',
    keywords: ['does ai choose', 'ai make hiring decision', 'automated hiring decision', 'does kapit decide', 'who makes final decision'],
    responses: ['No. Match signals support review. Your hiring team controls every shortlist, message, and final decision.'],
  },
  {
    intent_id: 'candidate-privacy',
    group: 'trust',
    keywords: ['candidate privacy', 'see candidate contact', 'candidate data', 'private profiles', 'data privacy'],
    responses: ['Use candidate information only for the hiring process and follow KapIT privacy terms. For account-specific privacy questions, contact support.'],
  },
  {
    intent_id: 'multiple-recruiters',
    group: 'employer',
    keywords: ['multiple recruiters', 'team access', 'invite teammate', 'more than one recruiter', 'company team'],
    responses: ['Company access and team permissions depend on the current workspace setup. Contact support if you need help with additional recruiters.'],
  },
  {
    intent_id: 'what-is-kapit',
    group: 'about',
    keywords: ['what is kapit', 'what does kapit do', 'is kapit a job board', 'tell me about kapit'],
    responses: ['KapIT is a focused platform for connecting Philippine IT employers with job-ready technical talent and organized hiring tools.'],
  },
  {
    intent_id: 'who-is-kapit-for',
    group: 'about',
    keywords: ['who is kapit for', 'who can use kapit', 'is kapit for companies', 'is kapit for recruiters'],
    responses: ['KapIT is for recruiters, founders, hiring managers, and authorized company representatives hiring for IT roles.'],
  },
  {
    intent_id: 'kapit-direct-hiring',
    group: 'about',
    keywords: ['does kapit hire', 'does kapit hire developers', 'is kapit an agency', 'does kapit employ candidates'],
    responses: ['KapIT provides the hiring platform. Your company reviews candidates and makes its own hiring decisions.'],
  },
  {
    intent_id: 'company-location',
    group: 'about',
    keywords: ['only philippines companies', 'foreign company', 'overseas company', 'outside philippines', 'international company'],
    responses: ['KapIT focuses on Philippine IT talent. Company eligibility and hiring setup can depend on your use case; contact support if unsure.'],
  },
  {
    intent_id: 'after-signup',
    group: 'onboarding',
    keywords: ['what happens after signup', 'after creating company account', 'next after registration', 'company onboarding'],
    responses: ['After signup, complete your company profile, then use the employer workspace to search talent or create a role.'],
  },
  {
    intent_id: 'mobile-access',
    group: 'platform',
    keywords: ['mobile app', 'use kapit on phone', 'mobile access', 'phone hiring', 'tablet access'],
    responses: ['The employer landing page works on desktop and mobile. Open KapIT in your browser to access the available workspace.'],
  },
];

export const INTENT_DEFINITIONS: readonly IntentDefinition[] = [
  {
    intent_id: 'greeting',
    group: 'greeting',
    keywords: [
      'hi',
      'hello',
      'hey',
      'yo',
      'sup',
      'whats up',
      'morning',
      'afternoon',
      'evening',
      'good morning',
      'good afternoon',
      'good evening',
      'gm',
    ],
    responses: [
      'Hi! How can I help you today?',
      'Hello. What can I assist you with today?',
      'Good to see you. How may I help?',
    ],
  },
  {
    intent_id: 'help',
    group: 'help',
    keywords: ['help', 'support', 'guide me', 'can you help me', 'i need help', 'what can you do', 'how does this work'],
    responses: [
      'I can help with account setup, login, applications, resume uploads, onboarding, and pricing.',
      'Happy to help. Ask me about jobs, accounts, resumes, subscriptions, or support workflows.',
    ],
  },
  {
    intent_id: 'account',
    group: 'account',
    keywords: ['create account', 'create an account', 'how do i create an account', 'sign up', 'signup', 'register', 'new account'],
    responses: [
      'To create an account, open Register, choose Developer or Company, then submit your details.',
      'Use the Register page, complete signup, then finish onboarding to unlock your dashboard.',
    ],
  },
  {
    intent_id: 'auth',
    group: 'auth',
    keywords: [
      'login',
      'log in',
      'sign in',
      'forgot password',
      'reset password',
      'reset my password',
      'how do i reset my password',
      'verification issue',
      'verification code',
    ],
    responses: [
      'For login or verification issues, confirm your credentials, then use password reset if needed.',
      'Use Login for access, or Forgot Password to reset credentials if you cannot sign in.',
    ],
  },
  {
    intent_id: 'job',
    group: 'job',
    keywords: ['how to apply', 'how do i apply for a job', 'apply for a job', 'apply job', 'job application', 'submit application', 'applications'],
    responses: [
      'Open Jobs, select a role, review requirements, and submit your application.',
      'To apply, go to Jobs, choose a listing, and complete any required pre-assessment before submitting.',
    ],
  },
  {
    intent_id: 'resume',
    group: 'resume',
    keywords: ['resume', 'upload resume', 'resume upload', 'cv', 'upload cv'],
    responses: [
      'You can upload your resume from onboarding or your profile settings, then save changes.',
      'Open your profile or onboarding resume step, upload the file, and confirm save.',
    ],
  },
  {
    intent_id: 'company',
    group: 'company',
    keywords: [
      'company features',
      'company account',
      'company accounts',
      'what can company accounts do',
      'employer account',
      'post jobs',
      'hire developers',
      'company dashboard',
    ],
    responses: [
      'Company accounts can manage job posts, applicants, and candidate messaging from one dashboard.',
      'Employer features include hiring profile setup, job posting, applicant review, and messaging tools.',
    ],
  },
  {
    intent_id: 'pricing',
    group: 'pricing',
    keywords: ['pricing', 'subscription', 'plans', 'billing', 'premium', 'payment'],
    responses: [
      'You can check Pricing for plan options, billing details, and feature differences.',
      'Open the Pricing page to compare subscriptions and included capabilities.',
    ],
  },
  {
    intent_id: 'support',
    group: 'support',
    keywords: ['contact support', 'human support', 'customer support', 'support team'],
    responses: [
      'For account-specific issues, contact support through the app so the team can review your case securely.',
      'If you need direct assistance, use the support channel in KapIT and include your issue details.',
    ],
  },
  {
    intent_id: 'what-is-kapit',
    group: 'about',
    keywords: ['what is kapit', 'what does kapit do', 'is kapit a job board', 'tell me about kapit'],
    responses: ['KapIT connects Philippine IT professionals with relevant opportunities and gives employers focused hiring tools.'],
  },
  {
    intent_id: 'how-matching-works',
    group: 'platform',
    keywords: ['how does matching work', 'how does ai matching work', 'match score', 'matching score', 'recommendations'],
    responses: ['KapIT uses profile, skills, preferences, and role details to highlight relevant matches. Signals support your decision; they do not replace it.'],
  },
  {
    intent_id: 'profile-visibility',
    group: 'platform',
    keywords: ['who can see my profile', 'profile visibility', 'employer see my profile', 'make profile private', 'profile privacy'],
    responses: ['Profile visibility depends on your account and profile settings. Review those settings or contact support for account-specific help.'],
  },
  {
    intent_id: 'application-status',
    group: 'platform',
    keywords: ['application status', 'where is my application', 'check application', 'track application', 'did employer see application'],
    responses: ['Open My Applications to review application activity and the latest status available for each role.'],
  },
  {
    intent_id: 'pre-assessment',
    group: 'platform',
    keywords: ['pre assessment', 'pre-assessment', 'assessment before applying', 'test before applying', 'application questions'],
    responses: ['Some roles may include a pre-assessment. Review the listing requirements and complete any required questions before submitting.'],
  },
  {
    intent_id: 'remote-work',
    group: 'platform',
    keywords: ['remote jobs', 'work from home', 'fully remote', 'hybrid jobs', 'location options'],
    responses: ['Use job location and work-preference details to find roles that match how you want to work.'],
  },
  {
    intent_id: 'who-is-kapit-for',
    group: 'about',
    keywords: ['who is kapit for', 'who can use kapit', 'is kapit for developers', 'is kapit for employers'],
    responses: ['KapIT is built for Philippine IT professionals and the companies hiring technical talent.'],
  },
  {
    intent_id: 'mobile-access',
    group: 'platform',
    keywords: ['mobile app', 'use kapit on phone', 'mobile access', 'phone application'],
    responses: ['You can open KapIT in a mobile browser to review the available job, profile, and application flows.'],
  },
  {
    intent_id: 'thanks',
    group: 'thanks',
    keywords: ['thank you', 'thanks', 'cool', 'nice'],
    responses: [
      "You're welcome. If you want, I can also help with applications, resumes, and account questions.",
    ],
  },
  {
    intent_id: 'goodbye',
    group: 'goodbye',
    keywords: ['bye', 'goodbye', 'cya', 'see you', 'thanks bye'],
    responses: [
      'Have a great day!',
      'Thanks for visiting KapIT.',
      'Feel free to chat again anytime.',
    ],
  },
];
