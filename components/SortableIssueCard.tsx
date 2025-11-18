import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Issue } from '@/types/issue';
import { getTagColor } from './TagInput';

interface SortableIssueCardProps {
  issue: Issue;
  onClick: () => void;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'in-review':
      return (
        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    case 'in-progress':
      return (
        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-blue-600"></div>
        </div>
      );
    case 'planned':
      return (
        <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0"></div>
      );
    case 'done':
      return (
        <div className="w-5 h-5 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
  }
};

export default function SortableIssueCard({ issue, onClick }: SortableIssueCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative"
    >
      <div
        onClick={onClick}
        className={`bg-white border rounded-lg px-3 py-2.5 mb-2 transition-all cursor-grab active:cursor-grabbing ${
          isDragging
            ? 'opacity-40 scale-95 border-gray-300'
            : isOver
            ? 'border-blue-400 shadow-sm'
            : 'border-gray-200 hover:shadow-sm hover:border-gray-300'
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Drag handle */}
          <div className="flex-shrink-0 text-gray-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>

          {/* Content area */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Issue number */}
            <span className="text-xs text-gray-500 font-medium flex-shrink-0">{issue.issueNumber}</span>

            {/* Status icon */}
            {getCategoryIcon(issue.category)}

            {/* Title */}
            <h3 className="text-sm text-gray-900 flex-1 min-w-0 truncate">{issue.title}</h3>
          </div>

          {/* Right side metadata */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Tags */}
            {issue.tags && issue.tags.length > 0 && (() => {
              const tagColors = getTagColor(issue.tags[0]);
              return (
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${tagColors.bg}`}>
                  <svg className={`w-3.5 h-3.5 ${tagColors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className={`text-xs font-medium ${tagColors.text}`}>{issue.tags[0]}</span>
                </div>
              );
            })()}

            {/* Comment count */}
            {issue.commentCount != null && issue.commentCount > 0 && (
              <div className="flex items-center gap-1 text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-xs font-medium">{issue.commentCount}</span>
              </div>
            )}

            {/* Due date */}
            {issue.dueDate && (
              <span className="text-xs text-gray-500 font-medium">{issue.dueDate}</span>
            )}

            {/* Avatar placeholder */}
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-gray-600">
                {issue.issueNumber ? issue.issueNumber.split('-')[1]?.slice(0, 1) || '?' : '?'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
