// lib/analytics.ts
// Google Analytics 4 integration with custom events

import { useEffect } from 'react';

// Initialize GA4
export function initializeAnalytics(measurementId: string) {
  if (typeof window === 'undefined') return;

  // Load GA4 script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize gtag
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(arguments);
  }
  gtag('js', new Date());
  gtag('config', measurementId, {
    page_path: window.location.pathname,
    anonymize_ip: true,
    cookie_flags: 'SameSite=None;Secure',
  });

  window.gtag = gtag;
}

// Track page views
export function trackPageView(pagePath: string, pageTitle: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID, {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }
}

// Track custom events
export function trackEvent(eventName: string, eventData: Record<string, any> = {}) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, {
      ...eventData,
      timestamp: new Date().toISOString(),
    });
  }
}

// CRUD Operations tracking
export const CRUDEvents = {
  projectCreated: (projectId: string, projectName: string) => {
    trackEvent('project_created', {
      project_id: projectId,
      project_name: projectName,
      event_category: 'engagement',
      event_label: 'CRUD',
    });
  },

  projectUpdated: (projectId: string, fieldsChanged: number) => {
    trackEvent('project_updated', {
      project_id: projectId,
      fields_changed: fieldsChanged,
      event_category: 'engagement',
      event_label: 'CRUD',
    });
  },

  projectDeleted: (projectId: string) => {
    trackEvent('project_deleted', {
      project_id: projectId,
      event_category: 'engagement',
      event_label: 'CRUD',
    });
  },

  apuCreated: (apuId: string, projectId: string) => {
    trackEvent('apu_created', {
      apu_id: apuId,
      project_id: projectId,
      event_category: 'engagement',
      event_label: 'CRUD',
    });
  },

  quotationCreated: (quoteId: string, amount: number) => {
    trackEvent('quotation_created', {
      quote_id: quoteId,
      amount: amount,
      event_category: 'conversion',
      event_label: 'CRUD',
      value: amount,
      currency: 'GTQ',
    });
  },

  expenseRecorded: (expenseId: string, amount: number, category: string) => {
    trackEvent('expense_recorded', {
      expense_id: expenseId,
      amount: amount,
      category: category,
      event_category: 'engagement',
      event_label: 'CRUD',
      value: amount,
    });
  },
};

// User engagement tracking
export const EngagementEvents = {
  userSignup: (userId: string, source: string) => {
    trackEvent('sign_up', {
      user_id: userId,
      source: source,
      event_category: 'conversion',
      value: 1,
    });
  },

  userLogin: (userId: string) => {
    trackEvent('login', {
      user_id: userId,
      event_category: 'engagement',
      method: 'email',
    });
  },

  userLogout: (userId: string) => {
    trackEvent('logout', {
      user_id: userId,
      event_category: 'engagement',
    });
  },

  pageScroll: (scrollDepth: number, pagePath: string) => {
    trackEvent('scroll_depth', {
      scroll_depth: scrollDepth,
      page_path: pagePath,
      event_category: 'engagement',
    });
  },

  timeOnPage: (pagePath: string, timeSeconds: number) => {
    trackEvent('page_duration', {
      page_path: pagePath,
      duration_seconds: timeSeconds,
      event_category: 'engagement',
    });
  },

  buttonClick: (buttonName: string, pagePath: string) => {
    trackEvent('button_click', {
      button_name: buttonName,
      page_path: pagePath,
      event_category: 'engagement',
    });
  },

  formSubmitted: (formName: string, formFields: number, success: boolean) => {
    trackEvent('form_submitted', {
      form_name: formName,
      form_fields: formFields,
      success: success,
      event_category: success ? 'conversion' : 'engagement',
    });
  },
};

// Performance tracking
export const PerformanceEvents = {
  pageLoadTime: (pagePath: string, loadTimeMs: number) => {
    trackEvent('page_load_time', {
      page_path: pagePath,
      load_time_ms: loadTimeMs,
      event_category: 'technical',
      event_label: 'performance',
      value: loadTimeMs,
    });
  },

  apiResponseTime: (endpoint: string, responseTimeMs: number, statusCode: number) => {
    trackEvent('api_response_time', {
      endpoint: endpoint,
      response_time_ms: responseTimeMs,
      status_code: statusCode,
      event_category: 'technical',
      event_label: 'api_performance',
      value: responseTimeMs,
    });
  },

  errorOccurred: (errorType: string, errorMessage: string, pagePath: string) => {
    trackEvent('error', {
      error_type: errorType,
      error_message: errorMessage,
      page_path: pagePath,
      event_category: 'technical',
      event_label: 'error',
    });
  },

  coreWebVitals: (lcp: number, fid: number, cls: number) => {
    trackEvent('core_web_vitals', {
      lcp_ms: lcp,
      fid_ms: fid,
      cls_value: cls,
      event_category: 'technical',
      event_label: 'performance',
    });
  },
};

// Funnels tracking
export const FunnelEvents = {
  signupInitiated: () => {
    trackEvent('signup_initiated', {
      event_category: 'conversion',
      event_label: 'signup_funnel',
      step: 1,
    });
  },

  signupEmailEntered: () => {
    trackEvent('signup_email_entered', {
      event_category: 'conversion',
      event_label: 'signup_funnel',
      step: 2,
    });
  },

  signupCompleted: (userId: string) => {
    trackEvent('signup_completed', {
      user_id: userId,
      event_category: 'conversion',
      event_label: 'signup_funnel',
      step: 3,
    });
  },

  firstProjectCreated: (userId: string, projectId: string) => {
    trackEvent('first_project_created', {
      user_id: userId,
      project_id: projectId,
      event_category: 'conversion',
      event_label: 'activation_funnel',
    });
  },

  firstQuotationCreated: (userId: string, quoteId: string) => {
    trackEvent('first_quotation_created', {
      user_id: userId,
      quote_id: quoteId,
      event_category: 'conversion',
      event_label: 'activation_funnel',
    });
  },
};

// Retention tracking
export const RetentionEvents = {
  dailyActiveUser: (userId: string) => {
    trackEvent('daily_active_user', {
      user_id: userId,
      event_category: 'engagement',
      event_label: 'retention',
    });
  },

  weeklyActiveUser: (userId: string) => {
    trackEvent('weekly_active_user', {
      user_id: userId,
      event_category: 'engagement',
      event_label: 'retention',
    });
  },

  monthlyActiveUser: (userId: string) => {
    trackEvent('monthly_active_user', {
      user_id: userId,
      event_category: 'engagement',
      event_label: 'retention',
    });
  },

  userChurned: (userId: string, daysSinceLastActive: number) => {
    trackEvent('user_churned', {
      user_id: userId,
      days_inactive: daysSinceLastActive,
      event_category: 'engagement',
      event_label: 'retention',
    });
  },
};

// Hook for automatic tracking
export function useAnalytics() {
  useEffect(() => {
    // Initialize on client side
    if (process.env.NEXT_PUBLIC_GA_ID) {
      initializeAnalytics(process.env.NEXT_PUBLIC_GA_ID);
    }

    // Track page view on route change
    const handleRouteChange = (url: string) => {
      trackPageView(url, document.title);
    };

    // Note: This would need to be integrated with your router
    return () => {
      // Cleanup
    };
  }, []);

  return {
    trackEvent,
    trackPageView,
    CRUDEvents,
    EngagementEvents,
    PerformanceEvents,
    FunnelEvents,
    RetentionEvents,
  };
}

// Global type augmentation
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}
