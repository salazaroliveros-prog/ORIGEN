import { db } from '@/lib/firebaseService';
import type { CompanyMembership, CompanyWorkspace, CompanyWorkspaceOption } from '@/lib/types';
import { notifySyncEnd } from './hooks/useFirebaseSyncStatus';
