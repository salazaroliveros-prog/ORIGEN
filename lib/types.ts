export interface CompanySettings {
  companyId?: string;
  ownerId?: string;
  legalName: string;
  commercialName: string;
  companyName: string;
  nit: string;
  architectName: string;
  architectColNumber: string;
  address: string;
  phone: string;
  email: string;
  exchangeRate: number; // e.g. 7.85 GTQ per USD
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  logoSmallUrl?: string;
  logoSquareUrl?: string;
  bannerUrl?: string;
  payrollEstimateRates?: {
    employeeDeductionPercent: number;
    employerCostPercent: number;
    incentiveBonusGTQ: number;
  };
}

export type CompanyRole =
  'owner' | 'admin' | 'project_manager' | 'finance' | 'field_worker' | 'viewer';

export interface CompanyWorkspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  dataSchemaVersion?: number;
}

export interface CompanyWorkspaceOption {
  workspace: CompanyWorkspace;
  membership: CompanyMembership;
}

export interface CompanyMembership {
  companyId: string;
  uid: string;
  email: string;
  role: CompanyRole;
  joinedAt: string;
  invitationId?: string;
}

export interface CompanyInvitation {
  id: string;
  companyId: string;
  email: string;
  role: Exclude<CompanyRole, 'owner'>;
  status: 'pending' | 'accepted';
  createdBy: string;
  createdAt: { toDate: () => Date };
  expiresAt: { toDate: () => Date };
  acceptedBy?: string;
}

export type ProjectStatus =
  'En Ejecución' | 'Planificación' | 'Finalizado' | 'Suspendido' | 'Archivado';

export interface Project {
  id: string;
  companyId?: string;
  code: string;
  name: string;
  client: string;
  location: string;
  municipality: string;
  department: string;
  budgetTotal: number;
  spentTotal: number;
  progressPercent: number;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  archivedAt?: string | null;
  archivedFromStatus?: Exclude<ProjectStatus, 'Archivado'>;
  lat: number;
  lng: number;
  ownerId?: string;
  createdBy?: string;
  expectedProfitMarginPercent?: number | null;
  scheduleTasks?: ScheduleTask[];
  scheduleMilestones?: Milestone[];
  taskReminders?: TaskReminder[];
}

export interface FieldPhoto {
  id: string;
  url: string;
  caption: string;
  date: string;
  timestamp: string;
  coords?: { lat: number; lng: number };
  takenBy?: string;
}

export interface FieldVisit {
  id: string;
  companyId?: string;
  projectId: string;
  projectName: string;
  date: string;
  foremanName: string;
  notes: string;
  weather: 'Soleado' | 'Lluvia Moderada' | 'Tormenta Fuerte' | 'Nublado';
  workersCount: number;
  signatureDataUrl?: string;
  signerDpi?: string;
  signerRole?: string;
  gpsCoords?: { lat: number; lng: number };
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  geofenceValid?: boolean;
  geofenceDistanceMeters?: number;
  gpsTimestamp?: string;
  status: 'Autorizado' | 'Pendiente' | 'Revisión';
  photos?: FieldPhoto[];
}

export interface Machinery {
  id: string;
  companyId?: string;
  createdBy?: string;
  name: string;
  model: string;
  plateOrCode: string;
  hourlyRateGTQ: number;
  currentHorometer: number;
  status: 'Disponible' | 'En Obra' | 'Mantenimiento';
  currentProjectId?: string;
}

export interface MachineryLog {
  id: string;
  companyId?: string;
  createdBy?: string;
  expenseId?: string;
  machineryId: string;
  machineryName: string;
  projectId: string;
  date: string;
  hoursWorked: number;
  operatorName: string;
  fuelGallons: number;
  costGTQ: number;
  signatureDataUrl?: string;
  signerName?: string;
}

export type EmployeeRole =
  'Capataz' | 'Albañil' | 'Ayudante' | 'Arquitecto Residente' | 'Bodeguero' | 'Electricista';

export interface EmployeeDirectoryEntry {
  id: string;
  companyId: string;
  name: string;
  role: EmployeeRole;
}

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  dailyRateGTQ: number;
  igssAffiliated: boolean;
  phone: string;
  dpi?: string;
  igssNumber?: string;
  hireDate?: string;
  customBonoIncentivo?: number;
  overriddenIgssLaboral?: number;
  overriddenBono14?: number;
  overriddenAguinaldo?: number;
}

export interface AttendanceRecord {
  id: string;
  projectId: string;
  projectName?: string;
  date: string;
  employeeId: string;
  employeeName: string;
  role?: Employee['role'];
  status: 'Presente' | 'Ausente' | 'Permiso' | 'Incapacidad IGSS';
  overtimeHours: number;
  gpsCoords?: { lat: number; lng: number };
  gpsVerified?: boolean;
  distanceMeters?: number;
  gpsTimestamp?: string;
  overrideReason?: string;
  checkInTime?: string;
  checkInLat?: number;
  checkInLng?: number;
  gpsAccuracy?: number;
  isGeofenceViolation?: boolean;
  distanceFromSiteMeters?: number;
  geofenceOverrideReason?: string;
}

export interface ExpenseRecord {
  id: string;
  projectId: string;
  date: string;
  category:
    | 'Materiales (Cementos, Hierro)'
    | 'Mano de Obra'
    | 'Maquinaria y Combustible'
    | 'Permisos & Licencias'
    | 'Imprevistos';
  description: string;
  supplier: string;
  nitSupplier: string;
  facturaNumber: string;
  amount: number; // in GTQ
  currency: 'GTQ' | 'USD';
  paymentMethod: 'Pendiente' | 'Efectivo' | 'Cheque' | 'Transferencia BI' | 'Tarjeta';
  receiptPhotoUrl?: string;
  receiptPhotoDate?: string;
  receiptCoords?: { lat: number; lng: number };
  assignedApuId?: string;
  assignedApuDescription?: string;
  approvalStatus?: 'Pendiente' | 'Aprobado' | 'Rechazado';
  approvedBy?: string;
  approvedAt?: string;
  auditTrail?: ExpenseAuditEntry[];
}

export interface QuoteRecord {
  id: string;
  companyId?: string;
  projectId: string;
  clientName: string;
  clientNit: string;
  clientPhone?: string;
  clientEmail?: string;
  clientAddress?: string;
  date: string;
  validUntil: string;
  items: { description: string; qty: number; unit: string; unitPriceGTQ: number }[];
  totalGTQ: number;
  status: 'Aceptada' | 'Enviada' | 'Borrador' | 'Rechazada';
  notes?: string;
  estimatedDuration?: string;
  subtotalGTQ?: number;
  discountPercent?: number;
  taxPercent?: number;
  taxGTQ?: number;
}

export interface APUItem {
  id: string;
  companyId?: string;
  projectId?: string;
  createdBy?: string;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  materialUnitCostGTQ: number;
  laborUnitCostGTQ: number;
  equipmentUnitCostGTQ: number;
  totalUnitCostGTQ: number;
  totalPriceGTQ: number;
  department?: string;
  breakdown?: {
    materials?: {
      name: string;
      quantity: number;
      unit: string;
      unitPriceGTQ: number;
      subtotalGTQ: number;
    }[];
    labor?: { role: string; yieldHours: number; unitPriceGTQ: number; subtotalGTQ: number }[];
    equipment?: { name: string; subtotalGTQ: number }[];
    notes?: string;
    technicalNorm?: string;
  };
}

export interface ScheduleTask {
  id: string;
  projectId: string;
  name: string;
  phase: string;
  startDate: string;
  endDate: string;
  progress: number;
  criticalPath: boolean;
  predecessors: string[];
  completed?: boolean;
  completedAt?: string;
  assignedTo?: string;
  weightPercent?: number;
  notes?: string;
  milestoneId?: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  phase: string;
  targetDate: string;
  completed: boolean;
  completedAt?: string;
  progress: number; // 0 to 100
  weightPercent: number; // contribution to final goal (sum = 100%)
  description?: string;
  deliverable?: string;
}

export type ReminderAdvanceOption =
  'same_day' | '1_day_before' | '2_days_before' | '3_days_before' | '1_week_before' | 'custom';

export interface TaskReminder {
  id: string;
  projectId: string;
  taskId?: string;
  taskName: string;
  milestoneId?: string;
  title: string;
  description: string;
  targetDate: string; // YYYY-MM-DD
  targetTime?: string; // HH:mm
  advanceOption: ReminderAdvanceOption;
  priority: 'Alta' | 'Media' | 'Baja';
  channel: 'in_app' | 'sound' | 'email';
  enabled: boolean;
  createdAt: string;
  triggered?: boolean;
  followFlowRequirement?: boolean; // Ensure preceding milestones are met
}

export interface AttendancePayload {
  projectId: string;
  employeeId: string;
  date: string;
  hoursWorked: number;
  task: string;
}

export interface ProgressPayload {
  projectId: string;
  milestoneId: string;
  progressPercent: number;
  notes?: string;
}

export interface FieldVisitPayload {
  projectId: string;
  date: string;
  foreman: string;
  notes: string;
  weather?: string;
  workersCount?: number;
}

export type OfflineQueuePayload = AttendancePayload | ProgressPayload | FieldVisitPayload;

export interface OfflineQueueItem {
  id: string;
  type: 'attendance' | 'progress' | 'fieldVisit';
  timestamp: string;
  description: string;
  payload: OfflineQueuePayload;
  synced: boolean;
}

export interface ExpenseAuditEntry {
  id: string;
  action: string;
  userId?: string;
  user: string;
  role: string;
  timestamp: string;
  note?: string;
}

export interface AiRecommendation {
  id: string;
  title: string;
  category: 'Clima & Programación' | 'Auditoría Financiera' | 'Planilla & IGSS' | 'Suministros';
  description: string;
  impact: 'Alto' | 'Medio' | 'Bajo';
  actionPrompt?: string;
}

// APU AI Generated Types
export interface AIGeneratedMaterial {
  name: string;
  quantity: number;
  unit: string;
  unitPriceGTQ: number;
  subtotalGTQ: number;
}

export interface AIGeneratedLabor {
  role: string;
  yieldHours: number;
  unitPriceGTQ: number;
  subtotalGTQ: number;
}

export interface AIGeneratedEquipment {
  name: string;
  subtotalGTQ: number;
}

export interface AIGeneratedAPUItem {
  code: string;
  title: string;
  unit: string;
  quantity: number;
  materialUnitCostGTQ: number;
  laborUnitCostGTQ: number;
  equipmentUnitCostGTQ: number;
  totalUnitCostGTQ: number;
  totalPriceGTQ: number;
  materialsBreakdown: AIGeneratedMaterial[];
  laborBreakdown: AIGeneratedLabor[];
  equipmentBreakdown: AIGeneratedEquipment[];
  regionalAdjustmentNote: string;
  technicalNorm: string;
}

// Gemini Audit Types
export interface AuditAlert {
  type: 'sobrecosto' | 'subestimado' | 'omision';
  itemCode: string;
  description: string;
  recommendation: string;
}

export interface AuditData {
  riskLevel: 'Bajo' | 'Medio' | 'Alto';
  estimatedVariancePercent: number;
  summary: string;
  alerts: AuditAlert[];
  recommendations: string[];
  regionalConsiderations: string;
}

// Gemini Logbook Types
export interface LogbookContext {
  notes?: string;
  weather?: string;
  workersCount?: number;
  status?: string;
}

export interface LogbookRequest {
  image: string;
  mimeType?: string;
  date?: string;
  visitId?: string;
  foremanName?: string;
  question?: string;
  visitContext?: LogbookContext;
  projectName?: string;
  department?: string;
}

// GPS Error Type
export interface GPSError {
  code: number;
  message?: string;
}

// React Event Types
export interface ReactChangeEvent extends React.ChangeEvent<HTMLSelectElement | HTMLInputElement> {
  target: EventTarget & (HTMLSelectElement | HTMLInputElement);
}

// Recharts Tooltip Types
export interface RechartsTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: any;
    dataKey: string;
    name: string;
    value: number;
    color?: string;
  }>;
  label?: string;
}

// Speech Recognition Types
export interface SpeechRecognitionEvent {
  resultIndex: number;
  results: Array<{
    [0]: {
      transcript: string;
      confidence: number;
    };
  }>;
}

export interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

// API Error Types
export interface APIError {
  message?: string;
  code?: string | number;
  status?: number;
}

// Budget Item Type for APU Audit
export interface BudgetItem {
  code: string;
  description: string;
  quantity: number;
  unit: string;
  totalUnitCostGTQ: number;
  totalPriceGTQ: number;
}

// Smart Bitacora Types
export interface SmartBitacoraEntry {
  id: string;
  folioNumber: string;
  projectName: string;
  date: string;
  capatazName: string;
  climaYCondiciones: string;
  resumenEjecutivo: string;
  personalEnCampo: {
    cuadrillas: string;
    totalOperarios: number;
    detalles: string;
  };
  trabajosEjecutados: Array<{
    item: string;
    descripcion: string;
    cantidadUnidad: string;
    renglonApu?: string;
  }>;
  materialesRecibidos: Array<{
    material: string;
    cantidad: string;
    proveedor?: string;
  }>;
  incidentesYObservaciones: string;
  cumplimientoNormativoAgies: string;
  planificacionManana: string;
  projectId?: string;
  createdAt?: string;
}

// Receipt Analysis Result
export interface ReceiptAnalysisResult {
  supplier: string;
  nitSupplier: string;
  facturaNumber: string;
  amount: number;
  category:
    | 'Materiales (Cementos, Hierro)'
    | 'Mano de Obra'
    | 'Maquinaria y Combustible'
    | 'Permisos & Licencias'
    | 'Imprevistos';
  description: string;
}

// Cash Flow Month Type
export interface CashFlowMonth {
  fullMonthName: string;
  mes: string;
  año: number;
  ingresosProyectados: number;
  gastosProyectados: number;
  flujoNeto: number;
  acumulado: number;
  hitosCount: number;
}
