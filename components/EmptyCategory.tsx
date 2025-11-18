import { useDroppable } from '@dnd-kit/core';
import { IssueCategory } from '@/types/issue';

interface EmptyCategoryProps {
  category: IssueCategory;
}

export default function EmptyCategory({ category }: EmptyCategoryProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `empty-${category}`,
    data: { category },
  });

  const isDragging = active !== null;

  return (
    <div
      ref={setNodeRef}
      className={`py-8 text-center text-sm border-2 border-dashed rounded-md mb-2 transition-all duration-200 ${
        isOver
          ? 'border-blue-500 bg-blue-50 text-blue-600 scale-105'
          : isDragging
          ? 'border-gray-300 bg-gray-50 text-gray-500'
          : 'border-gray-200 text-gray-400'
      }`}
    >
      {isOver ? (
        <div className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <span className="font-medium">Drop here</span>
        </div>
      ) : (
        <span>Drop issues here</span>
      )}
    </div>
  );
}
