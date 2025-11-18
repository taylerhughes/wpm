-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  issue_counter INTEGER DEFAULT 0,
  current_focus TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create issues table
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  issue_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('planned', 'in-progress', 'in-review', 'done')),
  priority INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  comment_count INTEGER DEFAULT 0,
  due_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_issues_account_id ON issues(account_id);
CREATE INDEX IF NOT EXISTS idx_issues_category ON issues(category);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority);

-- Enable Row Level Security (RLS)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public access (since we're not using auth yet)
-- Note: You may want to add authentication later and update these policies
CREATE POLICY "Allow public access to accounts" ON accounts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to issues" ON issues
  FOR ALL USING (true) WITH CHECK (true);
