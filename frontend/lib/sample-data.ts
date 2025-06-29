export interface ClientData {
  ClientID: string;
  ClientName: string;
  PriorityLevel: number;
  RequestedTaskIDs: string;
  GroupTag: string;
  AttributesJSON: string;
}

export interface WorkerData {
  WorkerID: string;
  WorkerName: string;
  Skills: string;
  AvailableSlots: string;
  MaxLoadPerPhase: number;
  WorkerGroup: string;
  QualificationLevel: number;
}

export interface TaskData {
  TaskID: string;
  TaskName: string;
  Category: string;
  Duration: number;
  RequiredSkills: string;
  PreferredPhases: string;
  MaxConcurrent: number;
}

export interface ValidationError {
  type: string;
  message: string;
  file?: string;
  row?: number;
  column?: string;
  metadata?: any;
}

export interface ProcessedData {
  clients: ClientData[];
  workers: WorkerData[];
  tasks: TaskData[];
  validationErrors: ValidationError[];
  metadata?: {
    uploadedAt: string;
    totalRecords: number;
    errorRows: number;
    qualityScore: number;
  };
}

export interface SearchResult {
  type: 'client' | 'worker' | 'task';
  id: string;
  name: string;
  relevantFields: string[];
  score: number;
}

export interface DataModificationRequest {
  type: 'modify' | 'correct' | 'query';
  instruction: string;
  dataType?: 'clients' | 'workers' | 'tasks' | 'all';
  targetFields?: string[];
}

export interface DataModificationResult {
  success: boolean;
  modifiedData?: ProcessedData;
  changes?: ModificationChange[];
  errors?: string[];
  summary?: {
    total_changes: number;
    errors_fixed: number;
    records_modified: number;
  };
}

export interface ModificationChange {
  type: 'update' | 'insert' | 'delete' | 'transform';
  table: string;
  row: number;
  field: string;
  oldValue: any;
  newValue: any;
  reason: string;
}

export type FileStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export interface FileUploadStatus {
  clients: FileStatus;
  workers: FileStatus;
  tasks: FileStatus;
}

export interface UploadResult {
  success: boolean;
  data?: ProcessedData;
  errors?: ValidationError[];
  message?: string;
}