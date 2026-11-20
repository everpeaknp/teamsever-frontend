import { api } from '@/lib/axios';
export type HrSetupStepId = 'members'|'employment'|'leave_and_schedules'|'compensation_and_private'|'history';
export interface HrSetupStep { id: HrSetupStepId; status:'complete'|'attention'|'optional'|'unavailable'; requiredForCore:boolean; title:string; summary:string; counts:Record<string,number|null> }
export interface HrSetupReadiness { generatedAt:string; readiness:{core:'ready'|'attention';operations:'ready'|'attention'|'not_configured';payroll:'ready'|'attention'|'unavailable'}; members:{total:number;enrolled:number;unenrolled:number;unreviewed:number;orphaned:number}; steps:HrSetupStep[]; configuration:{activeLeavePolicies:number;leaveWarningLimitsConfigured:boolean;activeSchedules:number;activeScheduleAssignments:number;activeEmployeesWithoutSchedules:number}; preferences:Record<string,{mode?:'tasko'|'external';reason?:string}>; history:{mode:'reused'|'unavailable';timeEntries:number|null;leaveRequests:number|null;remoteRequests:number|null;siteVisitRequests:number|null;tasks:number|null;fieldVisits:number|null} }
export interface HrSetupEmployeeGap { employeeId:string|null;userId:string;displayName:string;employeeNumber:string|null;setupSource:string|null;reviewState:'unenrolled'|'unreviewed'|'reviewed';missingCore:string[];missingRecommended:string[];missingCompensation:boolean|null;missingPrivate:Record<string,boolean>|null }
export interface HrSetupGapPage { data:HrSetupEmployeeGap[];pagination:{page:number;limit:number;total:number;pages:number} }
const root=(id:string)=>`/workspaces/${id}/hr`;
export const getHrSetupReadiness=async(id:string):Promise<HrSetupReadiness>=>(await api.get(`${root(id)}/setup-readiness`)).data.data;
export const getHrSetupGaps=async(id:string,params:Record<string,unknown>={}):Promise<HrSetupGapPage>=>{const r=await api.get(`${root(id)}/setup-readiness/employees`,{params});return{data:r.data.data||[],pagination:r.data.pagination};};
export const syncHrMembers=async(id:string)=>(await api.post(`${root(id)}/employees/sync-members`)).data;
export const confirmHrEmployee=async(id:string,employeeId:string)=>(await api.patch(`${root(id)}/employees/${employeeId}/setup-review`,{confirmed:true})).data;
export const updateHrSetupPreference=async(id:string,domain:string,mode:'tasko'|'external',reason?:string)=>(await api.patch(`${root(id)}/setup-preferences`,{domain,mode,reason})).data;
