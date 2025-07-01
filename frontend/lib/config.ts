// API Configuration
export const API_CONFIG = {
  // Backend API URL - Railway deployment
  BASE_URL: 'https://data-alchemist-production.up.railway.app',
  
  // Alternative for development
  // BASE_URL: 'http://localhost:8000',
  
  // API endpoints
  ENDPOINTS: {
    UPLOAD: '/upload',
    NATURAL_LANGUAGE_SEARCH: '/nl_search',
    NATURAL_LANGUAGE_MODIFY: '/nl_modify',
    AI_RULE_RECOMMENDATIONS: '/ai_rule_recommendations',
    AI_GENERATE_RULE: '/ai_generate_rule',
    APPLY_RULES: '/apply_rules',
    APPLY_CORRECTIONS: '/apply_corrections',
    SUGGEST_CORRECTIONS: '/suggest_corrections',
    EXPORT_DOWNLOAD: '/export_download',
    DOWNLOAD: '/download',
    DOCS: '/docs'
  }
} as const;

// Helper function to get full API URL
export const getApiUrl = (endpoint: keyof typeof API_CONFIG.ENDPOINTS): string => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS[endpoint]}`;
};

// Helper function to get full URL with custom path
export const getFullApiUrl = (path: string): string => {
  return `${API_CONFIG.BASE_URL}${path}`;
};
