import { Issue } from '@/types/issue';

interface IssueCardProps {
  issue: Issue;
  onClick: () => void;
}

export default function IssueCard({ issue, onClick }: IssueCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-4 mb-2 cursor-pointer hover:shadow-md transition-shadow"
    >
      <h3 className="font-medium text-gray-900 mb-1">{issue.title}</h3>
      {issue.description && (
        <p className="text-sm text-gray-600 line-clamp-2">{issue.description}</p>
      )}
    </div>
  );
}
