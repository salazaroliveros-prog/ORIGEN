# ORIGEN ERP - COMPONENT LIBRARY & BEST PRACTICES

**Documentación Completa** - Professional Grade

---

## 📚 COMPONENT LIBRARY

### Core Components

#### 1. ProjectsList
```
Purpose: Display and manage project listings
Features:
  - Sticky create button
  - Sort by: name, budget, date, status
  - Delete confirmation
  - Responsive table/card views
  - Pagination support
  
Usage:
<ProjectsList />

Props: None (uses useProjectData hook)

Best Practices:
  - Use for project management views
  - Ensure proper project data loaded
  - Handle large datasets with pagination
```

#### 2. DashboardOverview
```
Purpose: Display KPI and financial overview
Features:
  - KPI cards with memoization
  - Trend charts (6-month)
  - Project status distribution
  - Budget utilization report
  
Usage:
<DashboardOverview />

Best Practices:
  - Load on main dashboard
  - Memoize expensive calculations
  - Use for executive summary
```

#### 3. ExpensesView
```
Purpose: Expense tracking and categorization
Features:
  - 6 category colors (centralized)
  - CSV export
  - Duplicate detection
  - Photo receipt upload
  
Usage:
<ExpensesView projectId={projectId} />

Best Practices:
  - Category colors use COLORS.expenseCategories
  - Validate amounts before submit
  - Show duplicate warnings
```

#### 4. PersonnelView
```
Purpose: Attendance and personnel management
Features:
  - Calendar/List toggle views
  - Overtime validation (max 12h)
  - ISR 2024 calculations
  - Touch targets 48x48px+
  
Usage:
<PersonnelView projectId={projectId} />

Best Practices:
  - Validate overtime limits
  - Show clear attendance indicators
  - Use calendar for intuitive UX
```

#### 5. PayrollView
```
Purpose: Payroll processing
Features:
  - Sticky net pay column
  - Bono 14 preview
  - ISR 2024 automatic calculation
  - IGSS export validation
  
Usage:
<PayrollView projectId={projectId} />

Best Practices:
  - Auto-calculate taxes
  - Validate before export
  - Show clear net pay
```

#### 6. QuotationsView
```
Purpose: Quotation management
Features:
  - Line items management
  - Discount validation (max 50%)
  - Expiry warnings
  - PDF export with logo
  
Usage:
<QuotationsView projectId={projectId} />

Best Practices:
  - Validate discount limits
  - Show expiry warnings early
  - Include logo in exports
```

#### 7. ReportsView
```
Purpose: Financial reporting
Features:
  - Filter persistence (localStorage)
  - Multiple report types
  - CSV export with formatting
  - Date range filtering
  
Usage:
<ReportsView projectId={projectId} />

Best Practices:
  - Use localStorage for filter state
  - Support multiple export formats
  - Show clear summaries
```

#### 8. SettingsView
```
Purpose: Configuration management
Features:
  - Logo upload with optimization
  - Company settings
  - User preferences
  - Exchange rate API integration
  
Usage:
<SettingsView projectId={projectId} />

Best Practices:
  - Optimize images before upload
  - Save settings to backend
  - Provide API key management
```

#### 9. APUItemsList
```
Purpose: Budget and APU items management
Features:
  - Line item management
  - Cost calculations
  - Bulk operations
  
Usage:
<APUItemsList projectId={projectId} />

Best Practices:
  - Validate costs
  - Calculate totals efficiently
  - Support bulk actions
```

---

## 🎨 DESIGN SYSTEM

### Colors (COLORS constants)
```typescript
// All colors centralized in lib/design/constants.ts

COLORS.status          // Project status colors
COLORS.attendance      // Attendance colors
COLORS.financial       // Payroll colors
COLORS.expenseCategories // Expense category colors
COLORS.kpi             // Dashboard KPI colors
```

### Spacing Standards
```
Gap:      gap-6 (main grids)
Margin:   mb-6 (section headers)
Padding:  p-6 (cards/forms)
Small:    gap-3, mb-3, p-3
```

### Transitions
```
Standard:  transition-all duration-200
Colors:    transition-colors duration-200
Hover:     hover:shadow-md hover:border-slate-300
```

---

## ✅ QUALITY CHECKLIST

### Before Deployment
- [ ] All 300+ tests passing (96%+)
- [ ] TypeScript compilation clean
- [ ] No console errors
- [ ] Accessibility audit passed
- [ ] Mobile tested on 3+ devices
- [ ] Cross-browser tested (Chrome, Safari, Firefox, Edge)
- [ ] Performance metrics verified
- [ ] Security audit completed

### Accessibility (WCAG AA+)
- [ ] Color contrast >= 4.5:1
- [ ] Touch targets >= 44x44px
- [ ] ARIA labels complete
- [ ] Keyboard navigation working
- [ ] Screen reader compatible
- [ ] Focus visible on all interactive elements

### Performance
- [ ] Lighthouse score >= 90
- [ ] First contentful paint < 2s
- [ ] Time to interactive < 5s
- [ ] Images optimized
- [ ] Bundle size tracked

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] All features implemented
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Accessibility verified
- [ ] Performance optimized
- [ ] Security checked
- [ ] Staging environment tested
- [ ] Production ready

---

## 📖 USAGE EXAMPLES

### Dark Mode Ready (Future)
```typescript
// CSS variables prepared in constants
// Components ready for dark mode
// No changes needed to components
```

### API Integration
```typescript
// All components ready for API integration
// Mock data can be replaced with real API calls
// No UI changes needed
```

### State Management
```typescript
// Currently using React hooks
// Ready for Redux/Zustand if needed
// Easily scalable architecture
```

---

## 🎯 BEST PRACTICES

### Component Development
1. Always use COLORS from constants
2. Use consistent spacing (gap-6, mb-6, p-6)
3. Add transition-all for smooth interactions
4. Include ARIA labels for accessibility
5. Test on mobile before desktop
6. Validate user inputs
7. Show loading states
8. Handle errors gracefully

### Performance
1. Memoize expensive calculations
2. Use pagination for large datasets
3. Lazy load images
4. Optimize bundle size
5. Monitor performance metrics

### Accessibility
1. Ensure 4.5:1 color contrast
2. Touch targets >= 44x44px
3. Keyboard navigation support
4. ARIA labels on interactive elements
5. Screen reader compatible

### Testing
1. Unit tests for utilities
2. Component tests for UI
3. E2E tests for workflows
4. Accessibility testing
5. Performance testing

---

## 📞 SUPPORT

For questions about components or implementation:
1. Check component documentation
2. Review usage examples
3. Verify accessibility requirements
4. Test on real devices
5. Check performance metrics

---

**This document is version 1.0**
**Last updated: 2024-01-15**
**Status: Production Ready**
