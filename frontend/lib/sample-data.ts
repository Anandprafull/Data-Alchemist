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

// Sample CSV data for testing and demonstration
export const sampleClientsCSV = `ClientID,ClientName,PriorityLevel,RequestedTaskIDs,GroupTag,AttributesJSON
C001,Acme Corp,5,"T001,T003,T005",Enterprise,"{""budget"": 50000, ""deadline"": ""2024-12-31""}"
C002,Beta Solutions,3,"T002,T004",SMB,"{""budget"": 20000, ""region"": ""North""}"
C003,Gamma Industries,4,"T001,T002,T006",Enterprise,"{""budget"": 75000, ""priority"": ""urgent""}"
C004,Delta Services,2,"T003,T007",Startup,"{""budget"": 10000, ""flexible"": true}"
C005,Epsilon Tech,5,"T004,T005,T008",Enterprise,"{""budget"": 100000, ""multi_phase"": true}"
C006,Zeta Labs,1,"T006,T009",Research,"{""budget"": 5000, ""academic"": true}"
C007,Eta Systems,3,"T007,T010",SMB,"{""budget"": 30000, ""integration"": ""legacy""}"
C008,Theta Corp,4,"T008,T001",Enterprise,"{""budget"": 60000, ""compliance"": ""required""}"`;

export const sampleWorkersCSV = `WorkerID,WorkerName,Skills,AvailableSlots,MaxLoadPerPhase,WorkerGroup,QualificationLevel
W001,Alice Johnson,"Python,React,AWS","[1,2,3,4,5]",3,Senior,Expert
W002,Bob Smith,"Java,Spring,Docker","[2,3,4,6]",2,Mid,Advanced
W003,Carol Davis,"JavaScript,Node.js,MongoDB","[1,3,5,7]",4,Senior,Expert
W004,David Wilson,"C++,Qt,Linux","[1,2,4,5,6]",2,Senior,Expert
W005,Eva Brown,"Python,Django,PostgreSQL","[2,3,4,5]",3,Mid,Intermediate
W006,Frank Miller,"React,TypeScript,GraphQL","[1,2,3,6,7]",2,Junior,Beginner
W007,Grace Lee,"DevOps,Kubernetes,CI/CD","[3,4,5,6]",3,Senior,Expert
W008,Henry Taylor,"UI/UX,Figma,CSS","[1,2,5,6,7]",2,Mid,Advanced
W009,Iris Chen,"Data Science,Python,ML","[2,4,5,7]",2,Senior,Expert
W010,Jack Anderson,"QA,Selenium,Testing","[1,3,4,5,6,7]",4,Mid,Intermediate`;

export const sampleTasksCSV = `TaskID,TaskName,Category,Duration,RequiredSkills,PreferredPhases,MaxConcurrent
T001,User Authentication,Backend,2,"Python,Security","[1,2]",2
T002,Payment Integration,Backend,3,"Java,APIs,Security","[2,3,4]",1
T003,Dashboard UI,Frontend,2,"React,JavaScript,CSS","[1,2,3]",3
T004,Database Setup,Infrastructure,1,"PostgreSQL,DevOps","[1]",1
T005,API Development,Backend,4,"Node.js,Express,MongoDB","[2,3,4,5]",2
T006,Mobile App,Mobile,5,"React Native,iOS,Android","[3,4,5,6,7]",1
T007,Testing Suite,QA,2,"Testing,Selenium,Automation","[5,6]",2
T008,Analytics Dashboard,Frontend,3,"React,D3.js,Data Visualization","[4,5,6]",1
T009,Machine Learning Model,AI/ML,4,"Python,TensorFlow,Data Science","[3,4,5,6]",1
T010,DevOps Pipeline,Infrastructure,2,"Docker,Kubernetes,CI/CD","[1,2]",1`;