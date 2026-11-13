// ==============================================================================
// WINDOW COMPANIES CRM — DAILY TASK ASSIGNMENT SERVICE
// Manages internal daily work assignments, progress updates, and comments.
// Enforces that tasks are assigned strictly to registered internal employees.
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DailyTaskRecord, CreateTaskInput, UpdateTaskStatusInput, TaskCommentRecord } from '../types/task';

/**
 * Fetches tasks. If userId is provided and not admin, filters to user's assigned tasks.
 */
export async function fetchTasks(
  assignedToUserId?: string,
  isAdmin: boolean = false
): Promise<{ data: DailyTaskRecord[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Supabase client is not configured' };
  }

  try {
    let query = supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        assigned_to,
        assigned_by,
        start_date,
        due_date,
        priority,
        status,
        category,
        instructions,
        related_agency_id,
        related_hotel_id,
        related_contract_id,
        related_quote_id,
        completed_at,
        created_at,
        updated_at,
        assignee:assigned_to (id, full_name, department),
        creator:assigned_by (id, full_name)
      `)
      .order('due_date', { ascending: true });

    if (!isAdmin && assignedToUserId) {
      query = query.or(`assigned_to.eq.${assignedToUserId},assigned_by.eq.${assignedToUserId}`);
    }

    const { data, error } = await query;

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data || []) as unknown as DailyTaskRecord[], error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error fetching tasks';
    return { data: [], error: message };
  }
}

/**
 * Creates and assigns a new daily task to an employee (Admin only).
 */
export async function createTask(
  input: CreateTaskInput,
  creatorUserId: string
): Promise<{ data: DailyTaskRecord | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: null, error: 'Supabase client is not configured' };
  }

  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    return { data: null, error: 'Task title is required.' };
  }
  if (!input.assigned_to) {
    return { data: null, error: 'Please assign the task to an internal employee.' };
  }
  if (!input.due_date) {
    return { data: null, error: 'Due date is required.' };
  }

  try {
    const { data: newTask, error: insertErr } = await supabase
      .from('tasks')
      .insert({
        title: trimmedTitle,
        description: input.description?.trim() || null,
        assigned_to: input.assigned_to,
        assigned_by: creatorUserId,
        start_date: input.start_date || new Date().toISOString().split('T')[0],
        due_date: input.due_date,
        priority: input.priority || 'MEDIUM',
        status: 'PENDING',
        category: input.category || 'GENERAL',
        instructions: input.instructions?.trim() || null,
        related_agency_id: input.related_agency_id || null,
        related_hotel_id: input.related_hotel_id || null,
        related_contract_id: input.related_contract_id || null,
        related_quote_id: input.related_quote_id || null
      })
      .select()
      .single();

    if (insertErr) {
      return { data: null, error: insertErr.message };
    }

    // Log creation activity
    await supabase.from('task_activities').insert({
      task_id: newTask.id,
      actor_id: creatorUserId,
      action: 'CREATED',
      new_value: 'PENDING',
      note: `Task assigned to employee.`
    });

    return { data: newTask as unknown as DailyTaskRecord, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error creating task';
    return { data: null, error: message };
  }
}

/**
 * Updates a task's status and logs progress or blockers.
 */
export async function updateTaskStatus(
  taskId: string,
  input: UpdateTaskStatusInput,
  actorUserId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase client is not configured' };
  }

  try {
    const isCompleted = input.status === 'COMPLETED';
    const updatePayload: Record<string, unknown> = {
      status: input.status,
      updated_at: new Date().toISOString(),
      completed_at: isCompleted ? new Date().toISOString() : null
    };

    const { error: updateErr } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // Add progress comment if provided
    if (input.comment?.trim()) {
      await supabase.from('task_comments').insert({
        task_id: taskId,
        author_id: actorUserId,
        comment_text: input.comment.trim(),
        is_blocker: Boolean(input.is_blocker)
      });
    }

    // Log activity
    await supabase.from('task_activities').insert({
      task_id: taskId,
      actor_id: actorUserId,
      action: 'STATUS_CHANGED',
      new_value: input.status,
      note: input.comment?.trim() || undefined
    });

    return { success: true, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error updating task';
    return { success: false, error: message };
  }
}

/**
 * Fetches comments for a specific task.
 */
export async function fetchTaskComments(taskId: string): Promise<{ data: TaskCommentRecord[]; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { data: [], error: 'Supabase client is not configured' };
  }

  try {
    const { data, error } = await supabase
      .from('task_comments')
      .select(`
        id,
        task_id,
        author_id,
        comment_text,
        is_blocker,
        created_at,
        author:author_id (full_name, role)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: (data || []) as unknown as TaskCommentRecord[], error: null };
  } catch (err: unknown) {
    return { data: [], error: err instanceof Error ? err.message : 'Error fetching comments' };
  }
}

