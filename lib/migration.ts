import { supabase } from './supabase';
import { Account, Issue } from '@/types/issue';

const STORAGE_KEY = 'wpm-issues';
const ACCOUNTS_KEY = 'wpm-accounts';
const CURRENT_ACCOUNT_KEY = 'wpm-current-account';
const MIGRATION_KEY = 'wpm-migrated-to-supabase';

/**
 * Migrate localStorage data to Supabase
 * This should be run once to transfer all local data to the cloud
 */
export const migrateToSupabase = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  // Check if already migrated
  const alreadyMigrated = localStorage.getItem(MIGRATION_KEY);
  if (alreadyMigrated === 'true') {
    console.log('Already migrated to Supabase');
    return true;
  }

  try {
    // Get accounts from localStorage
    const accountsStr = localStorage.getItem(ACCOUNTS_KEY);
    if (!accountsStr) {
      console.log('No accounts to migrate');
      localStorage.setItem(MIGRATION_KEY, 'true');
      return true;
    }

    const accounts: Account[] = JSON.parse(accountsStr);

    // Migrate each account
    for (const account of accounts) {
      // Insert account
      const { error: accountError } = await supabase
        .from('accounts')
        .upsert({
          id: account.id,
          name: account.name,
          issue_counter: account.issueCounter,
          current_focus: account.currentFocus || '',
          created_at: account.createdAt,
        });

      if (accountError) {
        console.error('Error migrating account:', accountError);
        continue;
      }

      // Get issues for this account
      const issuesStr = localStorage.getItem(`${STORAGE_KEY}-${account.id}`);
      if (issuesStr) {
        const issues: Issue[] = JSON.parse(issuesStr);

        // Transform and insert issues
        const issuesData = issues.map(issue => ({
          id: issue.id,
          account_id: account.id,
          issue_number: issue.issueNumber,
          title: issue.title,
          description: issue.description,
          category: issue.category,
          priority: issue.priority,
          tags: issue.tags,
          comment_count: issue.commentCount,
          due_date: issue.dueDate,
          created_at: issue.createdAt,
          updated_at: issue.updatedAt,
        }));

        const { error: issuesError } = await supabase
          .from('issues')
          .upsert(issuesData);

        if (issuesError) {
          console.error('Error migrating issues:', issuesError);
        }
      }
    }

    // Mark as migrated
    localStorage.setItem(MIGRATION_KEY, 'true');
    console.log('Successfully migrated to Supabase');
    return true;
  } catch (error) {
    console.error('Migration error:', error);
    return false;
  }
};

/**
 * Check if migration is needed and prompt user
 */
export const checkMigrationStatus = (): boolean => {
  if (typeof window === 'undefined') return false;

  const alreadyMigrated = localStorage.getItem(MIGRATION_KEY);
  const hasLocalData = localStorage.getItem(ACCOUNTS_KEY);

  return alreadyMigrated !== 'true' && hasLocalData !== null;
};
