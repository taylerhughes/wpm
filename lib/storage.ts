import { Issue, IssueCategory, Account } from '@/types/issue';

const STORAGE_KEY = 'wpm-issues';
const COUNTER_KEY = 'wpm-issue-counter';
const VERSION_KEY = 'wpm-data-version';
const ACCOUNTS_KEY = 'wpm-accounts';
const CURRENT_ACCOUNT_KEY = 'wpm-current-account';
const CURRENT_VERSION = '3'; // Increment this to force data refresh

// Generate issue number like "WPM-123"
const generateIssueNumber = (accountId: string): string => {
  if (typeof window === 'undefined') return 'WPM-1';

  const accounts = getAccounts();
  const account = accounts.find(a => a.id === accountId);
  if (!account) return 'WPM-1';

  const nextNumber = account.issueCounter + 1;

  // Update account counter
  const updatedAccounts = accounts.map(a =>
    a.id === accountId ? { ...a, issueCounter: nextNumber } : a
  );
  saveAccounts(updatedAccounts);

  return `WPM-${nextNumber}`;
};

// Get all accounts
const getAccounts = (): Account[] => {
  if (typeof window === 'undefined') return [];

  const stored = localStorage.getItem(ACCOUNTS_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

// Save accounts
const saveAccounts = (accounts: Account[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
};

// Get current account ID
const getCurrentAccountId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CURRENT_ACCOUNT_KEY);
};

// Set current account ID
const setCurrentAccountId = (accountId: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_ACCOUNT_KEY, accountId);
};

// Check if data needs to be migrated to accounts
const checkVersion = (): void => {
  if (typeof window === 'undefined') return;

  const storedVersion = localStorage.getItem(VERSION_KEY);

  // Migrate from version 2 to version 3 (account-based storage)
  if (storedVersion === '2' && CURRENT_VERSION === '3') {
    const oldIssues = localStorage.getItem(STORAGE_KEY);
    const oldCounter = localStorage.getItem(COUNTER_KEY);

    if (oldIssues) {
      // Create Willard account with existing issues
      const willardAccount: Account = {
        id: 'willard',
        name: 'Willard',
        issueCounter: oldCounter ? parseInt(oldCounter, 10) : 8,
        currentFocus: '',
        createdAt: new Date().toISOString(),
      };

      // Save account
      saveAccounts([willardAccount]);
      setCurrentAccountId('willard');

      // Move issues to account-scoped storage
      localStorage.setItem(`${STORAGE_KEY}-willard`, oldIssues);

      // Clean up old keys
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(COUNTER_KEY);
    }

    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
  } else if (storedVersion !== CURRENT_VERSION) {
    // For other version changes, just clear and update
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(COUNTER_KEY);
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
  }
};

export const storageUtils = {
  // Get all accounts
  getAccounts: (): Account[] => {
    return getAccounts();
  },

  // Get current account
  getCurrentAccount: (): Account | null => {
    const accountId = getCurrentAccountId();
    if (!accountId) return null;

    const accounts = getAccounts();
    return accounts.find(a => a.id === accountId) || null;
  },

  // Set current account
  setCurrentAccount: (accountId: string): void => {
    setCurrentAccountId(accountId);
  },

  // Create new account
  createAccount: (name: string): Account => {
    const accounts = getAccounts();
    const newAccount: Account = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      issueCounter: 0,
      currentFocus: '',
      createdAt: new Date().toISOString(),
    };

    accounts.push(newAccount);
    saveAccounts(accounts);

    return newAccount;
  },

  // Update account current focus
  updateAccountFocus: (accountId: string, currentFocus: string): void => {
    const accounts = getAccounts();
    const updatedAccounts = accounts.map(a =>
      a.id === accountId ? { ...a, currentFocus } : a
    );
    saveAccounts(updatedAccounts);
  },

  // Get all issues from localStorage for current account
  getIssues: (): Issue[] => {
    if (typeof window === 'undefined') return [];

    const accountId = getCurrentAccountId();
    if (!accountId) return [];

    const stored = localStorage.getItem(`${STORAGE_KEY}-${accountId}`);
    if (!stored) return [];

    try {
      const issues = JSON.parse(stored);
      // Migrate old issues to new format
      return issues.map((issue: any, index: number) => ({
        ...issue,
        issueNumber: issue.issueNumber || `WPM-${index + 1}`,
        tags: issue.tags || [],
        commentCount: issue.commentCount || 0,
      }));
    } catch {
      return [];
    }
  },

  // Save all issues to localStorage for current account
  saveIssues: (issues: Issue[]): void => {
    if (typeof window === 'undefined') return;

    const accountId = getCurrentAccountId();
    if (!accountId) return;

    localStorage.setItem(`${STORAGE_KEY}-${accountId}`, JSON.stringify(issues));
  },

  // Add a new issue
  addIssue: (title: string, description: string, category: IssueCategory): Issue => {
    const accountId = getCurrentAccountId();
    if (!accountId) throw new Error('No account selected');

    const issues = storageUtils.getIssues();
    const newIssue: Issue = {
      id: crypto.randomUUID(),
      issueNumber: generateIssueNumber(accountId),
      title,
      description,
      category,
      priority: issues.length, // Add to end by default
      tags: [],
      commentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    issues.push(newIssue);
    storageUtils.saveIssues(issues);
    return newIssue;
  },

  // Update an existing issue
  updateIssue: (id: string, updates: Partial<Issue>): Issue | null => {
    const issues = storageUtils.getIssues();
    const index = issues.findIndex(issue => issue.id === id);

    if (index === -1) return null;

    issues[index] = {
      ...issues[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    storageUtils.saveIssues(issues);
    return issues[index];
  },

  // Delete an issue
  deleteIssue: (id: string): boolean => {
    const issues = storageUtils.getIssues();
    const filtered = issues.filter(issue => issue.id !== id);

    if (filtered.length === issues.length) return false;

    storageUtils.saveIssues(filtered);
    return true;
  },

  // Reorder issues (used after drag and drop)
  reorderIssues: (reorderedIssues: Issue[]): void => {
    // Update priority based on new order
    const withUpdatedPriority = reorderedIssues.map((issue, index) => ({
      ...issue,
      priority: index,
      updatedAt: new Date().toISOString(),
    }));

    storageUtils.saveIssues(withUpdatedPriority);
  },

  // Import issues from JSON
  importIssues: (importedIssues: Partial<Issue>[]): Issue[] => {
    const accountId = getCurrentAccountId();
    if (!accountId) throw new Error('No account selected');

    const existingIssues = storageUtils.getIssues();

    // Transform imported issues to match our Issue type
    const newIssues = importedIssues.map((imported) => {
      const now = new Date().toISOString();

      return {
        id: imported.id || crypto.randomUUID(),
        issueNumber: imported.issueNumber || generateIssueNumber(accountId),
        title: imported.title || 'Untitled Issue',
        description: imported.description || '',
        category: (imported.category as IssueCategory) || 'planned',
        priority: imported.priority ?? (existingIssues.length + importedIssues.indexOf(imported)),
        tags: imported.tags || [],
        commentCount: imported.commentCount ?? 0,
        dueDate: imported.dueDate,
        createdAt: imported.createdAt || now,
        updatedAt: imported.updatedAt || now,
      } as Issue;
    });

    // Combine with existing issues
    const allIssues = [...existingIssues, ...newIssues];
    storageUtils.saveIssues(allIssues);

    return allIssues;
  },

  // Initialize accounts if needed
  initializeAccounts: (): void => {
    checkVersion(); // Migrate old data if needed

    const accounts = getAccounts();
    if (accounts.length === 0) {
      // Create Willard account by default
      const willardAccount: Account = {
        id: 'willard',
        name: 'Willard',
        issueCounter: 0,
        currentFocus: '',
        createdAt: new Date().toISOString(),
      };

      saveAccounts([willardAccount]);
      setCurrentAccountId('willard');
    } else if (!getCurrentAccountId()) {
      // Set first account as current if none is set
      setCurrentAccountId(accounts[0].id);
    }
  },

  // Seed dummy data if no issues exist
  seedDummyData: (): Issue[] => {
    storageUtils.initializeAccounts();

    const existing = storageUtils.getIssues();
    if (existing.length > 0) return existing;

    const now = new Date();
    const dummyIssues: Issue[] = [
      {
        id: crypto.randomUUID(),
        issueNumber: 'WPM-1',
        title: 'Fix login page UI bugs',
        description: 'The login button is misaligned on mobile devices and the password field validation message is not showing correctly.',
        category: 'in-review',
        priority: 0,
        tags: ['Bug', 'UI'],
        commentCount: 3,
        dueDate: 'Jan 18',
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        issueNumber: 'WPM-2',
        title: 'Implement user profile page',
        description: 'Create a dedicated profile page where users can view and edit their information, upload profile pictures, and manage account settings.',
        category: 'in-progress',
        priority: 1,
        tags: ['Feature'],
        commentCount: 7,
        dueDate: 'Jan 20',
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        issueNumber: 'WPM-3',
        title: 'Add dark mode support',
        description: 'Implement a dark mode theme with a toggle switch in the settings. Should respect system preferences and persist user choice.',
        category: 'in-progress',
        priority: 2,
        tags: ['Feature', 'UI'],
        commentCount: 2,
        dueDate: 'Jan 25',
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        issueNumber: 'WPM-4',
        title: 'Optimize database queries',
        description: 'Several dashboard queries are slow. Need to add proper indexing and optimize the N+1 query problems in the user activity feed.',
        category: 'planned',
        priority: 3,
        tags: ['Performance'],
        commentCount: 5,
        dueDate: 'Feb 1',
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        issueNumber: 'WPM-5',
        title: 'Write API documentation',
        description: 'Document all REST API endpoints with request/response examples, authentication requirements, and error codes.',
        category: 'planned',
        priority: 4,
        tags: ['Documentation'],
        commentCount: 1,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        issueNumber: 'WPM-6',
        title: 'Set up automated testing pipeline',
        description: 'Configure CI/CD to run unit tests, integration tests, and E2E tests on every pull request. Set up test coverage reporting.',
        category: 'planned',
        priority: 5,
        tags: ['DevOps', 'Testing'],
        commentCount: 4,
        dueDate: 'Jan 30',
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        issueNumber: 'WPM-7',
        title: 'Add email notifications',
        description: 'Send email notifications for important events: password resets, account changes, weekly activity summaries.',
        category: 'planned',
        priority: 6,
        tags: ['Feature'],
        commentCount: 0,
        createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        issueNumber: 'WPM-8',
        title: 'Improve mobile responsiveness',
        description: 'Several pages need better mobile layouts. Focus on the dashboard, settings, and data tables.',
        category: 'planned',
        priority: 7,
        tags: ['UI', 'Mobile'],
        commentCount: 6,
        dueDate: 'Feb 5',
        createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      },
    ];

    storageUtils.saveIssues(dummyIssues);
    return dummyIssues;
  },
};
