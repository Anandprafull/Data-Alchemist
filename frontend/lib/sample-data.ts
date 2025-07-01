// Sample data for testing the application
export const sampleClientsCSV = `ClientID,ClientName,PriorityLevel,RequestedTaskIDs,GroupTag,AttributesJSON
C001,Acme Corp,5,"T001,T003,T005",Enterprise,"{""budget"": 50000, ""deadline"": ""2024-03-15""}"
C002,Beta Inc,3,"T002,T004",SMB,"{""budget"": 25000, ""deadline"": ""2024-04-01""}"
C003,Gamma LLC,4,"T001,T006",Enterprise,"{""budget"": 75000, ""deadline"": ""2024-02-28""}"
C004,Delta Co,2,"T007,T008",Startup,"{""budget"": 15000, ""deadline"": ""2024-05-15""}"
C005,Epsilon Ltd,5,"T003,T009,T010",Enterprise,"{""budget"": 100000, ""deadline"": ""2024-03-01""}"
C006,Zeta Corp,1,"T011",Startup,"{""budget"": 8000, ""deadline"": ""2024-06-01""}"
C007,Eta Systems,4,"T002,T005,T012",SMB,"{""budget"": 35000, ""deadline"": ""2024-04-15""}"
C008,Theta Inc,3,"T013,T014",SMB,"{""budget"": 28000, ""deadline"": ""2024-05-01""}"`

export const sampleWorkersCSV = `WorkerID,WorkerName,Skills,AvailableSlots,MaxLoadPerPhase,WorkerGroup,QualificationLevel
W001,John Doe,"React,TypeScript,Node.js","[1,2,3,4,5]",3,Frontend,Senior
W002,Jane Smith,"Python,Machine Learning,Data Science","[1,3,5]",2,Backend,Expert
W003,Bob Wilson,"UI/UX,Figma,Design Systems","[2,4,5]",2,Design,Mid
W004,Alice Brown,"DevOps,AWS,Docker,Kubernetes","[1,2,3]",4,Infrastructure,Senior
W005,Charlie Davis,"Java,Spring,Microservices","[1,4,5]",3,Backend,Senior
W006,Diana Lee,"React Native,Flutter,Mobile","[2,3,4]",2,Mobile,Mid
W007,Frank Miller,"QA,Automation,Selenium","[3,4,5]",3,QA,Senior
W008,Grace Chen,"Product Management,Agile,Scrum","[1,2,3,4,5]",2,Management,Expert
W009,Henry Taylor,"Security,Penetration Testing","[1,3]",2,Security,Expert
W010,Ivy Johnson,"Data Engineering,ETL,SQL","[2,4,5]",3,Data,Senior`

export const sampleTasksCSV = `TaskID,TaskName,Category,Duration,RequiredSkills,PreferredPhases,MaxConcurrent
T001,Frontend Dashboard,Development,2,"React,TypeScript","[1,2]",2
T002,API Development,Development,3,"Python,Node.js","[1,2,3]",1
T003,Mobile App,Development,4,"React Native,Mobile","[2,3,4]",1
T004,Database Design,Development,1,"SQL,Database Design","[1]",2
T005,UI/UX Design,Design,2,"UI/UX,Figma","[1,2]",1
T006,Cloud Infrastructure,Infrastructure,3,"AWS,DevOps,Docker","[1,2,3]",1
T007,Testing Suite,QA,2,"QA,Automation","[3,4]",2
T008,Security Audit,Security,1,"Security,Penetration Testing","[1]",1
T009,Data Pipeline,Data,3,"Data Engineering,ETL","[2,3,4]",1
T010,Performance Optimization,Development,2,"React,Node.js,Performance","[4,5]",1
T011,Documentation,Management,1,"Technical Writing","[5]",3
T012,Code Review,Development,1,"React,TypeScript,Code Review","[2,3]",2
T013,Integration Testing,QA,2,"QA,Integration Testing","[4,5]",1
T014,Deployment Pipeline,Infrastructure,2,"DevOps,CI/CD","[3,4]",1`
