export type IssueCategory = 'planned' | 'in-progress' | 'in-review' | 'done';

export interface Issue {
  id: string;
  issueNumber: string; // e.g., "RIDE-315"
  title: string;
  description: string;
  category: IssueCategory;
  priority: number; // Lower number = higher priority
  tags: string[];
  commentCount: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueFormData {
  title: string;
  description: string;
  category: IssueCategory;
}

export interface Account {
  id: string;
  name: string;
  issueCounter: number;
  currentFocus?: string;
  createdAt: string;
}
