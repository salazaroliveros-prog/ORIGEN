# 📋 Operations & Maintenance Guide - ORIGEN ERP

## Overview

This guide provides operational procedures, monitoring, and maintenance tasks for the ORIGEN ERP production system.

---

## 🔍 Daily Operations

### Morning Checklist (Daily 9:00 AM)

```bash
# 1. Check Application Status
curl -s https://origen-one-kohl.vercel.app/health | jq .

# 2. Check Error Tracking (Sentry)
# → https://sentry.io/projects/origen-erp/

# 3. Verify Database Connectivity
# Firebase Console → Firestore → Check data operations

# 4. Check Recent Deployments
# Vercel Dashboard → Deployments tab
```

### Health Check Commands

```bash
# Full health check
./scripts/health-check.sh

# or manual:
curl -I https://origen-one-kohl.vercel.app
# Expected: HTTP/2 200

# API endpoint check
curl https://origen-one-kohl.vercel.app/api/health
# Expected: {"status": "ok"}
```

### Production Monitoring

#### Vercel Dashboard

- **URL:** https://vercel.com/proyectoswm/origen
- **Check:** Deployments, Analytics, Functions
- **Alert threshold:** Response time > 2000ms

#### Sentry Dashboard

- **URL:** https://sentry.io/organizations/origen
- **Check:** Error rate, New issues, Performance
- **Alert threshold:** Error rate > 5%

#### Firebase Console

- **URL:** https://console.firebase.google.com/u/0/project/origen-erp
- **Check:** Realtime Database usage, Firestore quotas, Storage
- **Alert threshold:** 80% of daily quota used

---

## 🚀 Deployment Procedures

### Standard Deployment (via GitHub Actions)

```bash
# 1. Create feature branch
git checkout -b feature/your-feature

# 2. Make changes and test locally
npm run dev
npm run build
npm run lint

# 3. Commit with conventional format
git commit -m "feat: add new feature"

# 4. Push to GitHub
git push origin feature/your-feature

# 5. Create Pull Request
# → GitHub will automatically run checks

# 6. Once approved and merged to main
# → GitHub Actions automatically deploys to Vercel
# → Monitor at: https://github.com/salazaroliveros-prog/ORIGEN/actions
```

### Manual Deployment (if needed)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to staging
vercel --scope=proyectoswm

# Deploy to production
vercel --scope=proyectoswm --prod

# Monitor deployment
vercel ls
```

### Hotfix Deployment

```bash
# For critical production issues:

# 1. Create hotfix branch from main
git checkout main
git pull
git checkout -b hotfix/critical-issue

# 2. Fix the issue
# (make minimal changes)

# 3. Test thoroughly
npm run build
npm run test

# 4. Commit and push
git commit -m "fix: critical production issue"
git push origin hotfix/critical-issue

# 5. Merge directly to main (expedited PR review)
# 6. Vercel deploys automatically
```

---

## 🔧 Maintenance Tasks

### Weekly Maintenance (Every Monday)

```bash
# 1. Update dependencies (check for updates)
npm outdated

# 2. Run security audit
npm audit

# 3. Review Sentry errors
# Check if there are recurring error patterns

# 4. Database cleanup
# Firebase Console → Firestore → Delete old test data

# 5. Check log files
# Vercel Function Logs → Look for warnings/errors
```

### Monthly Maintenance (First of month)

```bash
# 1. Full security audit
npm audit fix
git commit -m "chore: security updates"

# 2. Performance review
# Vercel Analytics → Check Core Web Vitals
# Target: LCP < 2.5s, FID < 100ms, CLS < 0.1

# 3. Dependency updates (minor versions)
npm update
npm run build
npm run test
git commit -m "chore: update dependencies"

# 4. Certificate renewal check
# SSL auto-renews via Vercel, but verify:
# https://origen-one-kohl.vercel.app → Check cert valid date

# 5. Database backup (Firebase auto-backups)
# Verify backups are running in Firebase Console
```

### Quarterly Maintenance (Every 3 months)

```bash
# 1. Major dependency updates
# Carefully test each update:
npm install @package/name@latest
npm run build
npm run test

# 2. Security audit with professional review
npm audit fix --audit-level=high

# 3. Performance optimization review
# - Review bundle size
# - Check for unused dependencies
# - Optimize images

# 4. Infrastructure review
# - Vercel scaling settings
# - Firebase quotas
# - Database indexes

# 5. Documentation updates
# - Update README
# - Verify runbooks
# - Update Architecture docs
```

---

## 🚨 Incident Response

### High Error Rate (> 5%)

```bash
# 1. Check Sentry immediately
# → Identify error pattern
# → Determine affected users

# 2. Check application logs
vercel logs --tail

# 3. Check Firebase status
# → Firestore: Operations tab
# → Realtime: Check listeners

# 4. If Firebase is down
# → Apply circuit breaker
# → Show maintenance message
# → Escalate to Firebase support

# 5. If application error
# → Rollback if necessary
# → Or deploy hotfix

# 6. Notify users if critical
# → Status page update
# → Slack notification
# → Email to administrators
```

### High Latency (Response > 2000ms)

```bash
# 1. Check Vercel function logs
vercel logs --tail

# 2. Identify slow endpoint
# → Check in Sentry Performance

# 3. Common causes and fixes:
# - Database query too slow
#   → Add database index
#   → Optimize query
#
# - Cold start (serverless)
#   → This is normal after deployment
#   → Should resolve after 1-2 hours
#
# - Resource limits
#   → Check memory usage
#   → Check execution time
#   → Consider upgrading plan
#
# - Third-party API delay
#   → Check API status
#   → Add timeout
#   → Implement caching

# 4. Monitor after fix
# → Watch Vercel Analytics
# → Verify latency returned to normal
```

### Database Quota Exceeded

```bash
# 1. Check Firebase Console
# → Firestore → Data → Check collection sizes

# 2. Identify large collections
# → Find why data is growing unexpectedly
# → Check for data duplication
# → Look for undeleted test data

# 3. Clean up data
# → Delete old records
# → Archive historical data
# → Optimize data structure

# 4. Upgrade quotas if needed
# → Firestore → Pricing → Upgrade to Blaze plan
# → This allows automatic scaling

# 5. Implement data retention policy
# → Delete records older than 90 days
# → Implement automatic cleanup
# → Monitor ongoing usage
```

---

## 📊 Performance Monitoring

### Key Metrics to Track

| Metric                        | Target      | Frequency |
| ----------------------------- | ----------- | --------- |
| Response Time                 | < 500ms     | Real-time |
| Error Rate                    | < 1%        | Hourly    |
| Uptime                        | > 99.9%     | Daily     |
| Page Load (LCP)               | < 2.5s      | Daily     |
| First Input Delay (FID)       | < 100ms     | Daily     |
| Cumulative Layout Shift (CLS) | < 0.1       | Daily     |
| Database Ops/min              | < 80% quota | Daily     |
| Storage Usage                 | < 80% quota | Weekly    |

### Monitoring Tools

**Vercel Analytics**

- URL: https://vercel.com/proyectoswm/origen/analytics
- Tracks: Response time, Function execution, Edge caching

**Sentry**

- URL: https://sentry.io/organizations/origen
- Tracks: Errors, Performance, Releases

**Firebase Console**

- URL: https://console.firebase.google.com
- Tracks: Usage, Quotas, Realtime database metrics

---

## 🔄 Rollback Procedures

### Quick Rollback

```bash
# If deployment introduces critical issues:

# 1. Identify previous good commit
git log --oneline | head -20

# 2. Revert to previous version
git revert <commit-hash>
git push origin main

# 3. Vercel automatically redeploys
# → Monitor: https://vercel.com/proyectoswm/origen

# 4. Verify production
curl https://origen-one-kohl.vercel.app

# 5. Investigate the issue
# → Review what was deployed
# → Check error logs
# → Plan fix for next deployment
```

### Manual Rollback via Vercel CLI

```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-id>

# Verify rollback
vercel status
```

---

## 📚 Documentation

### Keep Updated

- `/docs/README.md` - Architecture overview
- `/docs/DEPLOYMENT.md` - Deployment guide
- `/docs/API_REFERENCE.md` - API documentation
- `/.github/RUNBOOKS.md` - Quick incident responses

### Update When

- Major version updates
- Architecture changes
- New API endpoints added
- Operational procedures change

---

## 🛡️ Security Checklist (Quarterly)

```bash
# 1. Dependency audit
npm audit
npm audit fix

# 2. OWASP top 10 review
# - Verify no hardcoded secrets
# - Check CORS configuration
# - Review authentication flows
# - Test XSS protection
# - Check CSRF tokens

# 3. Database security
# - Verify Firestore rules
# - Check data encryption
# - Review access logs
# - Test auth boundaries

# 4. Infrastructure security
# - Verify SSL/TLS configuration
# - Check security headers
# - Review Vercel settings
# - Verify backup encryption

# 5. Access control review
# - Review GitHub access
# - Check service account permissions
# - Verify SSH keys
# - Review secret access logs
```

---

## 📞 Escalation Procedure

### Level 1: Automated Response

- Sentry alerts triggered
- Vercel monitoring alerts
- Automatic error notifications

### Level 2: Manual Investigation

- On-call developer checks
- Review Sentry details
- Check application logs
- Determine if hotfix needed

### Level 3: Escalation

- If unable to resolve in 30 mins
- Escalate to team lead
- Consider rollback
- Notify stakeholders

### Level 4: Critical Incident

- If affecting > 50% of users
- Full team mobilization
- Executive notification
- Status page update

---

## ✅ Operational Checklist Template

**Date:** _______________

- [ ] Morning health checks passed
- [ ] No critical errors in Sentry
- [ ] Database quotas < 80%
- [ ] Response time normal
- [ ] All deployments successful
- [ ] Backups verified
- [ ] Security scan passed
- [ ] Documentation current

**Notes:**

---

---

**Last Updated:** November 24, 2026
**Next Review:** December 1, 2026
