import { Issue, IssueCategory } from '@/types/issue';
import { useState, useEffect } from 'react';
import RichTextEditor from './RichTextEditor';
import TagInput from './TagInput';

interface IssueModalProps {
  issue: Issue | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Issue>) => void;
  onDelete: (id: string) => void;
  allTags: string[];
}

export default function IssueModal({ issue, isOpen, onClose, onSave, onDelete, allTags }: IssueModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IssueCategory>('planned');
  const [tags, setTags] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (issue) {
      setTitle(issue.title);
      setDescription(issue.description);
      setCategory(issue.category);
      setTags(issue.tags || []);
      setDueDate(issue.dueDate || '');
    }
  }, [issue]);

  if (!issue) return null;

  const handleSave = () => {
    onSave(issue.id, { title, description, category, tags, dueDate });
  };

  const handleAddTag = (tag: string) => {
    setTags([...tags, tag]);
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this issue?')) {
      onDelete(issue.id);
      onClose();
    }
  };

  return (
    <div className={`fixed top-0 right-0 h-full w-[600px] bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 ease-in-out z-40 flex flex-col ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">{issue.issueNumber}</div>
              <h2 className="text-2xl font-bold text-gray-900">Edit Issue</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-2">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-900 mb-2">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as IssueCategory)}
                className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="planned">Planned</option>
                <option value="in-progress">In Progress</option>
                <option value="in-review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-900 mb-2">
                Due Date
              </label>
              <input
                id="dueDate"
                type="text"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="e.g., Jan 20"
                className="w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
              />
            </div>

            <div>
              <TagInput
                tags={tags}
                allTags={allTags}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Description
              </label>
              <RichTextEditor
                content={description}
                onChange={setDescription}
                placeholder="Add a detailed description..."
              />
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 text-xs text-gray-500 space-y-1">
              <p>Created: {new Date(issue.createdAt).toLocaleString()}</p>
              <p>Updated: {new Date(issue.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer with action buttons */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white p-6">
        <div className="flex justify-between">
          <button
            onClick={handleDelete}
            className="px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
          <div className="space-x-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
