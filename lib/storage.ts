import { Issue, IssueCategory, Account } from '@/types/issue';
import { supabase } from './supabase';

const CURRENT_ACCOUNT_KEY = 'wpm-current-account';

// Get current account ID from localStorage (still used for client-side state)
const getCurrentAccountId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CURRENT_ACCOUNT_KEY);
};

// Set current account ID in localStorage
const setCurrentAccountId = (accountId: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_ACCOUNT_KEY, accountId);
};

export const storageUtils = {
  // Get all accounts
  getAccounts: async (): Promise<Account[]> => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching accounts:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      issueCounter: row.issue_counter,
      currentFocus: row.current_focus,
      createdAt: row.created_at,
    }));
  },

  // Get current account
  getCurrentAccount: async (): Promise<Account | null> => {
    const accountId = getCurrentAccountId();
    if (!accountId) return null;

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error) {
      console.error('Error fetching current account:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      issueCounter: data.issue_counter,
      currentFocus: data.current_focus,
      createdAt: data.created_at,
    };
  },

  // Set current account
  setCurrentAccount: (accountId: string): void => {
    setCurrentAccountId(accountId);
  },

  // Create new account
  createAccount: async (name: string): Promise<Account> => {
    const newAccount = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      issue_counter: 0,
      current_focus: '',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('accounts')
      .insert(newAccount)
      .select()
      .single();

    if (error) {
      console.error('Error creating account:', error);
      throw new Error('Failed to create account');
    }

    return {
      id: data.id,
      name: data.name,
      issueCounter: data.issue_counter,
      currentFocus: data.current_focus,
      createdAt: data.created_at,
    };
  },

  // Update account current focus
  updateAccountFocus: async (accountId: string, currentFocus: string): Promise<void> => {
    const { error } = await supabase
      .from('accounts')
      .update({ current_focus: currentFocus })
      .eq('id', accountId);

    if (error) {
      console.error('Error updating account focus:', error);
      throw new Error('Failed to update focus');
    }
  },

  // Get all issues from database for current account
  getIssues: async (): Promise<Issue[]> => {
    const accountId = getCurrentAccountId();
    if (!accountId) return [];

    const { data, error } = await supabase
      .from('issues')
      .select('*')
      .eq('account_id', accountId)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error fetching issues:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      issueNumber: row.issue_number,
      title: row.title,
      description: row.description,
      category: row.category as IssueCategory,
      priority: row.priority,
      tags: row.tags || [],
      commentCount: row.comment_count,
      dueDate: row.due_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  // Generate issue number like "WPM-123"
  generateIssueNumber: async (accountId: string): Promise<string> => {
    // Get current counter
    const { data, error } = await supabase
      .from('accounts')
      .select('issue_counter')
      .eq('id', accountId)
      .single();

    if (error || !data) {
      console.error('Error fetching issue counter:', error);
      return 'WPM-1';
    }

    const nextNumber = data.issue_counter + 1;

    // Update counter
    await supabase
      .from('accounts')
      .update({ issue_counter: nextNumber })
      .eq('id', accountId);

    return `WPM-${nextNumber}`;
  },

  // Add a new issue
  addIssue: async (title: string, description: string, category: IssueCategory): Promise<Issue> => {
    const accountId = getCurrentAccountId();
    if (!accountId) throw new Error('No account selected');

    const issueNumber = await storageUtils.generateIssueNumber(accountId);

    // Get current max priority
    const { data: existingIssues } = await supabase
      .from('issues')
      .select('priority')
      .eq('account_id', accountId)
      .order('priority', { ascending: false })
      .limit(1);

    const maxPriority = existingIssues && existingIssues.length > 0 ? existingIssues[0].priority : -1;

    const newIssue = {
      account_id: accountId,
      issue_number: issueNumber,
      title,
      description,
      category,
      priority: maxPriority + 1,
      tags: [],
      comment_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('issues')
      .insert(newIssue)
      .select()
      .single();

    if (error) {
      console.error('Error adding issue:', error);
      throw new Error('Failed to add issue');
    }

    return {
      id: data.id,
      issueNumber: data.issue_number,
      title: data.title,
      description: data.description,
      category: data.category as IssueCategory,
      priority: data.priority,
      tags: data.tags || [],
      commentCount: data.comment_count,
      dueDate: data.due_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  // Update an existing issue
  updateIssue: async (id: string, updates: Partial<Issue>): Promise<Issue | null> => {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.commentCount !== undefined) updateData.comment_count = updates.commentCount;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;

    const { data, error } = await supabase
      .from('issues')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating issue:', error);
      return null;
    }

    return {
      id: data.id,
      issueNumber: data.issue_number,
      title: data.title,
      description: data.description,
      category: data.category as IssueCategory,
      priority: data.priority,
      tags: data.tags || [],
      commentCount: data.comment_count,
      dueDate: data.due_date,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  // Delete an issue
  deleteIssue: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('issues')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting issue:', error);
      return false;
    }

    return true;
  },

  // Reorder issues (used after drag and drop)
  reorderIssues: async (reorderedIssues: Issue[]): Promise<void> => {
    // Update priority for each issue
    const updates = reorderedIssues.map((issue, index) => ({
      id: issue.id,
      priority: index,
      updated_at: new Date().toISOString(),
    }));

    // Batch update
    for (const update of updates) {
      await supabase
        .from('issues')
        .update({ priority: update.priority, updated_at: update.updated_at })
        .eq('id', update.id);
    }
  },

  // Import issues from JSON
  importIssues: async (importedIssues: Partial<Issue>[]): Promise<Issue[]> => {
    const accountId = getCurrentAccountId();
    if (!accountId) throw new Error('No account selected');

    const issuesData = [];

    for (const imported of importedIssues) {
      const issueNumber = imported.issueNumber || await storageUtils.generateIssueNumber(accountId);
      const now = new Date().toISOString();

      issuesData.push({
        id: imported.id || undefined, // Let Supabase generate if not provided
        account_id: accountId,
        issue_number: issueNumber,
        title: imported.title || 'Untitled Issue',
        description: imported.description || '',
        category: (imported.category as IssueCategory) || 'planned',
        priority: imported.priority ?? 0,
        tags: imported.tags || [],
        comment_count: imported.commentCount ?? 0,
        due_date: imported.dueDate,
        created_at: imported.createdAt || now,
        updated_at: imported.updatedAt || now,
      });
    }

    const { data, error } = await supabase
      .from('issues')
      .insert(issuesData)
      .select();

    if (error) {
      console.error('Error importing issues:', error);
      throw new Error('Failed to import issues');
    }

    // Return all issues for current account
    return await storageUtils.getIssues();
  },

  // Initialize accounts if needed
  initializeAccounts: async (): Promise<void> => {
    const accounts = await storageUtils.getAccounts();

    if (accounts.length === 0) {
      // Create Willard account by default
      const willardAccount = await storageUtils.createAccount('Willard');
      setCurrentAccountId(willardAccount.id);
    } else if (!getCurrentAccountId()) {
      // Set first account as current if none is set
      setCurrentAccountId(accounts[0].id);
    }
  },

  // Seed dummy data if no issues exist
  seedDummyData: async (): Promise<Issue[]> => {
    await storageUtils.initializeAccounts();

    const existing = await storageUtils.getIssues();
    if (existing.length > 0) return existing;

    const accountId = getCurrentAccountId();
    if (!accountId) return [];

    const now = new Date();
    const dummyIssues = [
      {
        account_id: accountId,
        issue_number: 'WPM-1',
        title: 'Fix login page UI bugs',
        description: 'The login button is misaligned on mobile devices and the password field validation message is not showing correctly.',
        category: 'in-review' as IssueCategory,
        priority: 0,
        tags: ['Bug', 'UI'],
        comment_count: 3,
        due_date: 'Jan 18',
        created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        account_id: accountId,
        issue_number: 'WPM-2',
        title: 'Implement user profile page',
        description: 'Create a dedicated profile page where users can view and edit their information, upload profile pictures, and manage account settings.',
        category: 'in-progress' as IssueCategory,
        priority: 1,
        tags: ['Feature'],
        comment_count: 7,
        due_date: 'Jan 20',
        created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        account_id: accountId,
        issue_number: 'WPM-3',
        title: 'Add dark mode support',
        description: 'Implement a dark mode theme with a toggle switch in the settings. Should respect system preferences and persist user choice.',
        category: 'in-progress' as IssueCategory,
        priority: 2,
        tags: ['Feature', 'UI'],
        comment_count: 2,
        due_date: 'Jan 25',
        created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        account_id: accountId,
        issue_number: 'WPM-4',
        title: 'Optimize database queries',
        description: 'Several dashboard queries are slow. Need to add proper indexing and optimize the N+1 query problems in the user activity feed.',
        category: 'planned' as IssueCategory,
        priority: 3,
        tags: ['Performance'],
        comment_count: 5,
        due_date: 'Feb 1',
        created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        account_id: accountId,
        issue_number: 'WPM-5',
        title: 'Write API documentation',
        description: 'Document all REST API endpoints with request/response examples, authentication requirements, and error codes.',
        category: 'planned' as IssueCategory,
        priority: 4,
        tags: ['Documentation'],
        comment_count: 1,
        created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        account_id: accountId,
        issue_number: 'WPM-6',
        title: 'Set up automated testing pipeline',
        description: 'Configure CI/CD to run unit tests, integration tests, and E2E tests on every pull request. Set up test coverage reporting.',
        category: 'planned' as IssueCategory,
        priority: 5,
        tags: ['DevOps', 'Testing'],
        comment_count: 4,
        due_date: 'Jan 30',
        created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        account_id: accountId,
        issue_number: 'WPM-7',
        title: 'Add email notifications',
        description: 'Send email notifications for important events: password resets, account changes, weekly activity summaries.',
        category: 'planned' as IssueCategory,
        priority: 6,
        tags: ['Feature'],
        comment_count: 0,
        created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      },
      {
        account_id: accountId,
        issue_number: 'WPM-8',
        title: 'Improve mobile responsiveness',
        description: 'Several pages need better mobile layouts. Focus on the dashboard, settings, and data tables.',
        category: 'planned' as IssueCategory,
        priority: 7,
        tags: ['UI', 'Mobile'],
        comment_count: 6,
        due_date: 'Feb 5',
        created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      },
    ];

    // Insert dummy data
    const { data, error } = await supabase
      .from('issues')
      .insert(dummyIssues)
      .select();

    if (error) {
      console.error('Error seeding dummy data:', error);
      return [];
    }

    // Update issue counter
    await supabase
      .from('accounts')
      .update({ issue_counter: 8 })
      .eq('id', accountId);

    return await storageUtils.getIssues();
  },
};
