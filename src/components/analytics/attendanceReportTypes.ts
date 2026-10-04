export interface AttendanceReportEntry {
  id: string;
  user: any;
  userName: string;
  userEmail: string;
  date: string;
  clockIn: string;
  clockOut: string;
  totalHours: string;
  durationFormatted: string;
  description: string;
  attendanceMode?: 'onsite' | 'remote';
  clockInSource?: 'web' | 'desktop' | 'mobile';
  clockOutSource?: 'web' | 'desktop' | 'mobile' | null;
  clockInLocation?: { areaName?: string; latitude?: number; longitude?: number; accuracyMeters?: number } | null;
  clockInVerificationMethod?: 'gps' | 'network_confirmed' | null;
  clockOutLocation?: { latitude?: number; longitude?: number; distanceFromClockInMeters?: number; withinRange?: boolean } | null;
  locationReviewReason?: string | null;
}
