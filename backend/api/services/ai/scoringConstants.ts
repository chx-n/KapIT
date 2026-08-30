export const TOKEN_PATTERN = /[A-Za-z0-9\+\#\.\-]{2,}/g;
export const YEARS_PATTERN = /(\d{1,2})\s*\+?\s*(?:years?|yrs?)/i;

export const EXPERIENCE_TARGETS: Record<string, number> = {
  intern: 0,
  entry: 1,
  junior: 2,
  mid: 4,
  intermediate: 4,
  senior: 7,
  lead: 8,
  principal: 10,
  staff: 9,
};

export const ROLE_GROUPS: Record<string, ReadonlySet<string>> = {
  software_engineering: new Set([
    'software', 'engineer', 'developer', 'web', 'frontend', 'backend', 'fullstack',
    'react', 'next', 'javascript', 'typescript', 'node', 'api', 'application',
  ]),
  cybersecurity: new Set([
    'cybersecurity', 'security', 'soc', 'siem', 'threat', 'incident', 'forensics',
    'vulnerability', 'penetration', 'pentest', 'iam', 'zero', 'trust',
  ]),
  ai_ml: new Set([
    'ai', 'ml', 'machine', 'learning', 'llm', 'nlp', 'deep', 'neural', 'model',
    'data', 'scientist', 'computer', 'vision', 'prompt',
  ]),
  devops_cloud: new Set([
    'devops', 'sre', 'cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'docker',
    'terraform', 'ci', 'cd', 'infrastructure', 'platform',
  ]),
  networking: new Set([
    'network', 'networking', 'routing', 'switching', 'firewall', 'lan', 'wan',
    'cisco', 'juniper', 'nac', 'wireless',
  ]),
  data_analytics: new Set([
    'data', 'analytics', 'bi', 'warehouse', 'etl', 'sql', 'tableau', 'powerbi',
    'insight', 'reporting',
  ]),
  finance_accounting: new Set([
    'finance', 'financial', 'accounting', 'bookkeeping', 'audit', 'tax', 'payroll',
    'controller', 'accounts', 'fp&a',
  ]),
  hr_people: new Set([
    'hr', 'human', 'recruiter', 'recruitment', 'talent', 'people', 'benefits',
    'compensation', 'onboarding',
  ]),
  ui_ux_design: new Set([
    'ui', 'ux', 'designer', 'design', 'figma', 'wireframe', 'prototype', 'usability',
    'interaction', 'visual',
  ]),
  marketing_growth: new Set([
    'marketing', 'seo', 'sem', 'content', 'copywriting', 'campaign', 'brand',
    'social', 'growth', 'email',
  ]),
  healthcare_it: new Set([
    'healthcare', 'ehr', 'emr', 'clinical', 'patient', 'hipaa', 'medical', 'hospital',
  ]),
  product_management: new Set([
    'product', 'roadmap', 'prioritization', 'stakeholder', 'requirements', 'agile',
    'scrum', 'backlog', 'owner',
  ]),
};

export const SKILL_ALIASES: Record<string, ReadonlySet<string>> = {
  react: new Set(['reactjs', 'next', 'next.js', 'frontend', 'javascript', 'typescript']),
  'next.js': new Set(['next', 'react', 'javascript', 'typescript', 'frontend']),
  javascript: new Set(['js', 'typescript', 'react', 'node', 'node.js']),
  typescript: new Set(['ts', 'javascript', 'react', 'node', 'next.js']),
  'node.js': new Set(['node', 'javascript', 'express', 'backend']),
  node: new Set(['node.js', 'javascript', 'express', 'backend']),
  python: new Set(['django', 'flask', 'fastapi', 'data']),
  aws: new Set(['cloud', 'devops']),
  kubernetes: new Set(['k8s', 'devops', 'docker', 'cloud']),
  ui: new Set(['ux', 'figma', 'design']),
  ux: new Set(['ui', 'research', 'design']),
};

export const STOP_WORDS = new Set([
  'with', 'from', 'this', 'that', 'your', 'have', 'will', 'must', 'able', 'into', 'role',
  'team', 'work', 'year', 'years', 'using', 'experience', 'developer', 'engineer', 'company',
  'candidate', 'skills', 'skill', 'required', 'preferred', 'strong', 'good', 'plus',
]);

export const SPECIALIZATION_FOCUS: Record<string, ReadonlySet<string>> = {
  software_general: new Set(['software', 'engineer', 'developer', 'web', 'application', 'fullstack', 'frontend', 'backend']),
  frontend: new Set(['frontend', 'ui', 'ux', 'react', 'next', 'next.js', 'javascript', 'typescript', 'css', 'tailwind']),
  backend: new Set(['backend', 'api', 'node', 'node.js', 'express', 'fastapi', 'django', 'spring', 'golang', 'java', 'python']),
  security: new Set(['security', 'cybersecurity', 'soc', 'siem', 'threat', 'incident', 'forensics', 'penetration', 'pentest', 'iam']),
  devops: new Set(['devops', 'sre', 'kubernetes', 'docker', 'terraform', 'ci', 'cd', 'cloud', 'aws', 'azure', 'gcp']),
  data: new Set(['data', 'analytics', 'etl', 'warehouse', 'sql', 'tableau', 'powerbi', 'bi', 'scientist']),
  ml_ai: new Set(['ml', 'ai', 'machine', 'learning', 'nlp', 'llm', 'deep', 'neural', 'vision', 'model']),
  ui_ux: new Set(['ui', 'ux', 'design', 'figma', 'wireframe', 'prototype', 'interaction', 'usability']),
  networking: new Set(['network', 'networking', 'routing', 'switching', 'firewall', 'lan', 'wan', 'cisco', 'juniper']),
};

export const CRITICAL_HINT_PATTERN = /\b(must|required|mandatory|essential|core)\b/i;

export const PROGRAMMING_MARKERS = new Set([
  'javascript', 'typescript', 'python', 'java', 'c#', 'golang', 'go', 'php', 'ruby', 'node', 'node.js',
  'react', 'next', 'next.js', 'api', 'apis', 'sql', 'postgresql', 'mysql', 'mongodb', 'git', 'express',
]);
