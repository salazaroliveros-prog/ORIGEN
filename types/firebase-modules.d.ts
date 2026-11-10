// firebase@12 no publica las declaraciones de los submódulos
// `firebase/firestore`, `firebase/storage` y `firebase/messaging`:
// los paquetes stub `firebase/<modulo>` apuntan (campo `exports`,
// condición `types`) a un `index.d.ts` que no existe en el paquete
// publicado, por lo que TypeScript resuelve el import al `.js` y lo
// trata como `any` (TS7016), ocultando cualquier error de tipos
// real en `lib/firebaseService.ts`, `lib/fcmService.ts`,
// `lib/companyWorkspace.ts`, `lib/companyInvitations.ts`,
// `lib/types.ts`, `lib/firestore-emulator.test.ts` y
// `app/api/upload-project-photo/route.ts`.
//
// Las declaraciones reales viven dentro de los paquetes `@firebase/*`
// y se reexportan aquí con nombres explícitos (no `export *`, que
// TypeScript no expande a través de un `declare module` cuando el
// módulo reexportado se resuelve por ruta absoluta). Los nombres
// se generan a partir de la API pública de cada paquete; si
// `firebase` se actualiza, hay que regenerarlos.
declare module 'firebase/firestore' {
  export { aggregateFieldEqual, aggregateQuerySnapshotEqual, average, count, getAggregateFromServer, getCountFromServer, sum } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/aggregate';
  export { AggregateField, AggregateFieldType, AggregateQuerySnapshot, AggregateSpec, AggregateSpecData, AggregateType } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/lite-api/aggregate_types';
  export { FirestoreLocalCache, MemoryCacheSettings, MemoryEagerGarbageCollector, memoryEagerGarbageCollector, MemoryGarbageCollector, MemoryLocalCache, memoryLocalCache, MemoryLruGarbageCollector, memoryLruGarbageCollector, PersistentCacheSettings, PersistentLocalCache, persistentLocalCache, PersistentMultipleTabManager, persistentMultipleTabManager, PersistentSingleTabManager, persistentSingleTabManager, PersistentSingleTabManagerSettings, PersistentTabManager } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/cache_config';
  export { documentId, FieldPath } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/field_path';
  export { clearIndexedDbPersistence, connectFirestoreEmulator, disableNetwork, EmulatorMockTokenOptions, enableIndexedDbPersistence, enableMultiTabIndexedDbPersistence, enableNetwork, ensureFirestoreConfigured, Firestore, getFirestore, initializeFirestore, loadBundle, namedQuery, terminate, waitForPendingWrites } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/database';
  export { LoadBundleTask, LoadBundleTaskProgress, TaskState } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/bundle';
  export { FirestoreSettings, PersistenceSettings } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/settings';
  export { ExperimentalLongPollingOptions } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/long_polling_options';
  export { DocumentChange, DocumentChangeType, DocumentSnapshot, documentSnapshotFromJSON, FirestoreDataConverter, QueryDocumentSnapshot, QuerySnapshot, querySnapshotFromJSON, snapshotEqual, SnapshotMetadata, SnapshotOptions } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/snapshot';
  export { collection, collectionGroup, CollectionReference, doc, DocumentData, DocumentReference, PartialWithFieldValue, Query, queryEqual, refEqual, SetOptions, UpdateData, WithFieldValue } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/reference';
  export { and, endAt, endBefore, limit, limitToLast, or, orderBy, OrderByDirection, query, QueryCompositeFilterConstraint, QueryConstraint, QueryConstraintType, QueryEndAtConstraint, QueryFieldFilterConstraint, QueryFilterConstraint, QueryLimitConstraint, QueryNonFilterConstraint, QueryOrderByConstraint, QueryStartAtConstraint, startAfter, startAt, where, WhereFilterOp } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/filter';
  export { ListenSource, SnapshotListenOptions, Unsubscribe } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/reference_impl';
  export { TransactionOptions } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/transaction_options';
  export { runTransaction, Transaction } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/transaction';
  export { addDoc, deleteDoc, executeWrite, getDoc, getDocFromCache, getDocFromServer, getDocs, getDocsFromCache, getDocsFromServer, onSnapshot, onSnapshotsInSync, onSnapshotResume, setDoc, updateDoc } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/reference_impl';
  export { FieldValue } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/field_value';
  export { arrayRemove, arrayUnion, deleteField, increment, serverTimestamp, vector, minimum, maximum } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/field_value_impl';
  export { VectorValue } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/lite-api/vector_value';
  export { LogLevelString as LogLevel, setLogLevel } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/util/log';
  export { Bytes } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/bytes';
  export { WriteBatch, writeBatch } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/write_batch';
  export { GeoPoint } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/geo_point';
  export { Timestamp } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/timestamp';
  export { CACHE_SIZE_UNLIMITED } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/database';
  export { FirestoreError, FirestoreErrorCode } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/util/error';
  export { AbstractUserDataWriter } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/lite-api/user_data_writer';
  export { AddPrefixToKeys, ChildUpdateFields, NestedUpdateFields, Primitive, UnionToIntersection } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/src/lite-api/types';
  export { Index, IndexConfiguration, IndexField, setIndexConfiguration } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/index_configuration';
  export { PersistentCacheIndexManager, getPersistentCacheIndexManager, deleteAllPersistentCacheIndexes, enablePersistentCacheIndexAutoCreation, disablePersistentCacheIndexAutoCreation } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/persistent_cache_index_manager';
  export { isBase64Available as _isBase64Available } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/platform/base64';
  export { DatabaseId as _DatabaseId } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/core/database_info';
  export { _internalQueryToProtoQueryTarget, _internalAggregationQueryToProtoRunAggregationQueryRequest } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/remote/internal_serializer';
  export { cast as _cast, validateIsNotUsedTogether as _validateIsNotUsedTogether } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/util/input_validation';
  export { DocumentKey as _DocumentKey } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/model/document_key';
  export { debugAssert as _debugAssert } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/util/assert';
  export { FieldPath as _FieldPath } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/model/path';
  export { ByteString as _ByteString } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/util/byte_string';
  export { logWarn as _logWarn } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/util/log';
  export { AutoId as _AutoId } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/util/misc';
  export { EmptyAuthCredentialsProvider as _EmptyAuthCredentialsProvider } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/credentials';
  export { EmptyAppCheckTokenProvider as _EmptyAppCheckTokenProvider } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/api/credentials';
  export { ExistenceFilterMismatchCallback as _TestingHooksExistenceFilterMismatchCallback, TestingHooks as _TestingHooks } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/util/testing_hooks';
  export { ExistenceFilterMismatchInfo as _TestingHooksExistenceFilterMismatchInfo } from '/workspace/node_modules/@firebase/firestore/dist/intermediate/firestore/src/util/testing_hooks_spi';
}declare module 'firebase/storage' {
  export { connectStorageEmulator, deleteObject, FirebaseStorage, FullMetadata, getBlob, getBytes, getDownloadURL, getMetadata, getStorage, getStream, list, listAll, ListOptions, ListResult, ref, SettableMetadata, StorageError, StorageErrorCode, StorageObserver, StorageReference, StringFormat, TaskEvent, TaskState, updateMetadata, uploadBytes, uploadBytesResumable, UploadMetadata, UploadResult, uploadString, UploadTask, UploadTaskSnapshot } from '/workspace/node_modules/@firebase/storage/dist/storage-public';
}

declare module 'firebase/messaging' {
  export { deleteToken, FcmOptions, getMessaging, getToken, GetTokenOptions, isSupported, MessagePayload, Messaging, NotificationPayload, onMessage, onRegistered, onUnregistered, register, RegisterOptions, unregister } from '/workspace/node_modules/@firebase/messaging/dist/index-public';
}
