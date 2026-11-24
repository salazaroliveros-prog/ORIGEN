/**
 * Firebase initialization
 * Re-exports the initialized Firebase instances
 */

import { db, auth, storage } from './firebaseService';

export { db, auth, storage, app } from './firebaseService';
