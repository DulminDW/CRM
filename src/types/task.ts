// ==============================================================================
// WINDOW COMPANIES CRM — DAILY TASK ASSIGNMENT DATA CONTRACTS
// ==============================================================================

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type TaskCategory = 'GENERAL' | 'RATE_DISTRIBUTION' | 'CONTRACT_FOLLOWUP' | 'AGENCY_VISIT' | 'SPECIAL_DEAL';

export interface DailyTaskRecord {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_by: string;
  start_date: string; // YYYY-MM-DD
  due_date: string;   // YYYY-MM-DD
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  instructions: string | null;
  
  related_agency_id?: string | null;
  related_hotel_id?: string | null;
  related_contract_id?: string | null;
  related_quote_id?: string | null;

  completed_at?: string | null;
  created_at: string;
  updated_at: string;

  // Joined user fields
  assignee?: {
    id: string;
    full_name: string;
    department: string | null;
  };
  creator?: {
    id: string;
    full_name: string;
  };
  comments_count?: number;
}

export interface TaskCommentRecord {
  id: string;
  task_id: string;
  author_id: string;
  comment_text: string;
  is_blocker: boolean;
  created_at: string;
  author?: {
    full_name: string;
    role: string;
  };
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assigned_to: string;
  start_date?: string;
  due_date: string;
  priority?: TaskPriority;
  category?: TaskCategory;
  instructions?: string;
  related_agency_id?: string;
  related_hotel_id?: string;
  related_contract_id?: string;
  related_quote_id?: string;
}

export interface UpdateTaskStatusInput {
  status: TaskStatus;
  comment?: string;
  is_blocker?: boolean;
}

