'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Issue, IssueCategory, Account } from '@/types/issue';
import { storageUtils } from '@/lib/storage';
import { migrateToSupabase, checkMigrationStatus } from '@/lib/migration';
import SortableIssueCard from './SortableIssueCard';
import IssueModal from './IssueModal';
import EmptyCategory from './EmptyCategory';
import { getTagColor } from './TagInput';
import RichTextEditor from './RichTextEditor';

export default function Backlog() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [categoryAddForm, setCategoryAddForm] = useState<{ category: IssueCategory; title: string; position: 'top' | 'bottom' } | null>(null);
  const [currentFocus, setCurrentFocus] = useState('');
  const [showCurrentFocus, setShowCurrentFocus] = useState(true);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before dragging starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load accounts and issues on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Check if migration is needed
      if (checkMigrationStatus()) {
        const migrated = await migrateToSupabase();
        if (migrated) {
          console.log('Data migrated from localStorage to Supabase');
        }
      }

      const loadedAccounts = await storageUtils.getAccounts();
      const currentAcc = await storageUtils.getCurrentAccount();

      if (loadedAccounts.length === 0 || !currentAcc) {
        await storageUtils.initializeAccounts();
        setAccounts(await storageUtils.getAccounts());
        setCurrentAccount(await storageUtils.getCurrentAccount());
      } else {
        setAccounts(loadedAccounts);
        setCurrentAccount(currentAcc);
      }

      const loadedIssues = await storageUtils.seedDummyData();
      const sorted = loadedIssues.sort((a, b) => a.priority - b.priority);
      setIssues(sorted);
      setLoading(false);
    };

    loadData();
  }, []);

  // Reload issues when account changes
  useEffect(() => {
    const loadIssues = async () => {
      if (currentAccount) {
        const loadedIssues = await storageUtils.getIssues();
        const sorted = loadedIssues.sort((a, b) => a.priority - b.priority);
        setIssues(sorted);
        setCurrentFocus(currentAccount.currentFocus || '');
      }
    };

    loadIssues();
  }, [currentAccount]);

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    setActiveId(id);
    const issue = issues.find(i => i.id === id);
    setActiveIssue(issue || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    setActiveIssue(null);
    const { active, over } = event;

    if (!over) return;

    // Check if dropped on an empty category
    if (typeof over.id === 'string' && over.id.startsWith('empty-')) {
      const targetCategory = over.id.replace('empty-', '') as IssueCategory;

      setIssues((items) => {
        const updatedItems = items.map((issue) => {
          if (issue.id === active.id) {
            return { ...issue, category: targetCategory };
          }
          return issue;
        });

        storageUtils.reorderIssues(updatedItems);
        return updatedItems;
      });
      return;
    }

    if (active.id === over.id) return;

    setIssues((items) => {
      const draggedIssue = items.find((item) => item.id === active.id);
      const overIssue = items.find((item) => item.id === over.id);

      if (!draggedIssue || !overIssue) return items;

      // Check if moving within the same category or between categories
      const sameCategory = draggedIssue.category === overIssue.category;

      if (sameCategory) {
        // Same category: just reorder
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        storageUtils.reorderIssues(newOrder);
        return newOrder;
      } else {
        // Different category: change category and insert at drop position
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const overIndex = items.findIndex((item) => item.id === over.id);

        // Create new array without the dragged item
        const withoutDragged = items.filter((item) => item.id !== active.id);

        // Update the dragged item's category
        const updatedDraggedItem = { ...draggedIssue, category: overIssue.category };

        // Insert at the target position
        const newItems = [...withoutDragged];
        const adjustedIndex = oldIndex < overIndex ? overIndex - 1 : overIndex;
        newItems.splice(adjustedIndex, 0, updatedDraggedItem);

        storageUtils.reorderIssues(newItems);
        return newItems;
      }
    });
  };

  const handleAddIssue = async () => {
    if (!newIssueTitle.trim()) return;

    const newIssue = await storageUtils.addIssue(newIssueTitle, '', 'planned');
    setIssues([...issues, newIssue]);
    setNewIssueTitle('');
  };

  const handleAddIssueToCategory = async (category: IssueCategory, title: string, position: 'top' | 'bottom') => {
    if (!title.trim()) return;

    const newIssue = await storageUtils.addIssue(title, '', category);

    // Update priorities based on position
    const categoryIssues = issues.filter(i => i.category === category);
    const otherIssues = issues.filter(i => i.category !== category);

    let updatedIssues: Issue[];
    if (position === 'top') {
      // Add to top of category
      const firstCategoryPriority = categoryIssues.length > 0
        ? Math.min(...categoryIssues.map(i => i.priority))
        : 0;

      newIssue.priority = firstCategoryPriority - 0.5;
      updatedIssues = [...issues, newIssue];
    } else {
      // Add to bottom of category
      const lastCategoryPriority = categoryIssues.length > 0
        ? Math.max(...categoryIssues.map(i => i.priority))
        : -1;

      newIssue.priority = lastCategoryPriority + 1;
      updatedIssues = [...issues, newIssue];
    }

    // Reorder to fix priorities
    const sorted = updatedIssues.sort((a, b) => a.priority - b.priority);
    await storageUtils.reorderIssues(sorted);
    setIssues(sorted);
    setCategoryAddForm(null);
  };

  const handleSubmitCategoryAdd = () => {
    if (!categoryAddForm) return;
    handleAddIssueToCategory(categoryAddForm.category, categoryAddForm.title, categoryAddForm.position);
  };

  const handleUpdateCurrentFocus = async (newFocus: string) => {
    setCurrentFocus(newFocus);
    if (currentAccount) {
      await storageUtils.updateAccountFocus(currentAccount.id, newFocus);
      // Update local state
      setCurrentAccount({ ...currentAccount, currentFocus: newFocus });
    }
  };

  const handleUpdateIssue = async (id: string, updates: Partial<Issue>) => {
    const updated = await storageUtils.updateIssue(id, updates);
    if (updated) {
      setIssues(issues.map(issue => issue.id === id ? updated : issue));
    }
  };

  const handleDeleteIssue = async (id: string) => {
    await storageUtils.deleteIssue(id);
    setIssues(issues.filter(issue => issue.id !== id));
  };

  const handleImportIssues = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);

        // Check if it's an array
        const issuesArray = Array.isArray(importedData) ? importedData : [importedData];

        // Import the issues
        const allIssues = await storageUtils.importIssues(issuesArray);
        setIssues(allIssues.sort((a, b) => a.priority - b.priority));

        alert(`Successfully imported ${issuesArray.length} issue(s)`);
      } catch (error) {
        alert('Failed to import: Invalid JSON file');
        console.error('Import error:', error);
      }
    };

    reader.readAsText(file);
    // Reset input so the same file can be imported again
    event.target.value = '';
  };

  const handleExportIssues = () => {
    const exportData = {
      issues: issues,
      currentFocus: currentFocus
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wpm-issues-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSwitchAccount = async (accountId: string) => {
    storageUtils.setCurrentAccount(accountId);
    setCurrentAccount(await storageUtils.getCurrentAccount());
    setShowAccountDropdown(false);
  };

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) return;

    const newAccount = await storageUtils.createAccount(newAccountName);
    setAccounts(await storageUtils.getAccounts());
    storageUtils.setCurrentAccount(newAccount.id);
    setCurrentAccount(newAccount);
    setNewAccountName('');
    setShowAccountDropdown(false);
  };

  const openIssueModal = (issue: Issue) => {
    setSelectedIssue(issue);
    setIsModalOpen(true);
  };

  const getCategoryLabel = (category: IssueCategory) => {
    switch (category) {
      case 'planned':
        return 'Planned';
      case 'in-progress':
        return 'In Progress';
      case 'in-review':
        return 'In Review';
      case 'done':
        return 'Done';
    }
  };

  // Extract all unique tags from all issues (excluding done tasks)
  const allTags = issues
    .filter(issue => showDone || issue.category !== 'done')
    .flatMap(issue => issue.tags || []);

  // Filter issues by selected tags and done visibility
  let filteredIssues = selectedTags.length > 0
    ? issues.filter(issue =>
        issue.tags && selectedTags.some(tag => issue.tags.includes(tag))
      )
    : issues;

  // Hide done tasks unless showDone is true
  if (!showDone) {
    filteredIssues = filteredIssues.filter(issue => issue.category !== 'done');
  }

  // Group issues by category in the correct order
  // During drag, display issues in their original positions
  const categories: IssueCategory[] = showDone
    ? ['done', 'in-review', 'in-progress', 'planned']
    : ['in-review', 'in-progress', 'planned'];
  const displayIssues = activeId && activeIssue
    ? filteredIssues.map(issue => issue.id === activeId ? activeIssue : issue)
    : filteredIssues;

  const issuesByCategory = categories.map(category => ({
    category,
    issues: displayIssues.filter(issue => issue.category === category),
  }));

  // Get unique tags with counts
  const uniqueTags = Array.from(new Set(allTags))
    .map(tag => ({
      tag,
      count: allTags.filter(t => t === tag).length,
    }))
    .sort((a, b) => b.count - a.count);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Count done issues
  const doneCount = issues.filter(issue => issue.category === 'done').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`max-w-4xl mx-auto p-6 transition-all duration-300 ${
        isModalOpen ? 'mr-[600px]' : ''
      }`}>
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Backlog</h1>
            <div className="flex items-center gap-3">
              <p className="text-gray-600">Manage your work items by priority</p>
              {currentAccount && (
                <div className="relative">
                  <button
                    onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {currentAccount.name}
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showAccountDropdown && (
                    <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px] z-50">
                      <div className="p-2 border-b border-gray-100">
                        <div className="text-xs text-gray-500 px-2 py-1">Switch Account</div>
                      </div>
                      <div className="p-1 max-h-60 overflow-y-auto">
                        {accounts.map((account) => (
                          <button
                            key={account.id}
                            onClick={() => handleSwitchAccount(account.id)}
                            className={`w-full px-3 py-2 text-left rounded hover:bg-gray-50 transition-colors flex items-center justify-between ${
                              account.id === currentAccount.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                            }`}
                          >
                            <span className="font-medium">{account.name}</span>
                            {account.id === currentAccount.id && (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="p-2 border-t border-gray-100">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newAccountName}
                            onChange={(e) => setNewAccountName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleCreateAccount()}
                            placeholder="New account..."
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={handleCreateAccount}
                            disabled={!newAccountName.trim()}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowDone(!showDone)}
            className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
              showDone
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {showDone ? 'Hide Done' : 'Show Done'}
            {doneCount > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                showDone ? 'bg-gray-700' : 'bg-gray-300'
              }`}>
                {doneCount}
              </span>
            )}
          </button>
        </div>

        {/* Current Focus */}
        {currentAccount && (
          <div className="mb-6 bg-white rounded-lg shadow-sm">
            <button
              onClick={() => setShowCurrentFocus(!showCurrentFocus)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors rounded-t-lg"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900">Current Focus</h3>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${showCurrentFocus ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showCurrentFocus && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <RichTextEditor
                  content={currentFocus}
                  onChange={handleUpdateCurrentFocus}
                  placeholder="What are you focusing on right now? Add notes, priorities, or your current goals..."
                />
              </div>
            )}
          </div>
        )}

        {/* Tag filter */}
        {uniqueTags.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Filter by tags:</span>
              {uniqueTags.map(({ tag, count }) => {
                const colors = getTagColor(tag);
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-all ${
                      isSelected
                        ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-offset-1 ring-${colors.border.split('-')[1]}-300`
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {tag}
                    <span className={`text-xs ${isSelected ? 'opacity-80' : 'text-gray-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium ml-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Add new issue */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={newIssueTitle}
              onChange={(e) => setNewIssueTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddIssue()}
              placeholder="Add a new issue..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddIssue}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
            <label className="px-6 py-2 bg-gray-100 text-gray-900 rounded-md hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImportIssues}
                className="hidden"
              />
            </label>
            <button
              onClick={handleExportIssues}
              className="px-6 py-2 bg-gray-100 text-gray-900 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Export
            </button>
          </div>
        </div>

        {/* Issues list - one continuous list with all categories */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={issues.map(i => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="bg-white rounded-lg shadow-sm p-4">
              {issuesByCategory.map(({ category, issues: categoryIssues }, categoryIndex) => (
                <div key={category} className={categoryIndex > 0 ? 'mt-6' : ''}>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-700">
                      {getCategoryLabel(category)}
                    </h2>
                    <button
                      onClick={() => setCategoryAddForm({ category, title: '', position: 'top' })}
                      className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2 py-1 rounded transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add
                    </button>
                  </div>

                  {/* Quick add form */}
                  {categoryAddForm?.category === category && (
                    <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <input
                        type="text"
                        value={categoryAddForm.title}
                        onChange={(e) => setCategoryAddForm({ ...categoryAddForm, title: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmitCategoryAdd()}
                        placeholder="Issue title..."
                        autoFocus
                        className="w-full px-3 py-2 mb-2 text-gray-900 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCategoryAddForm({ ...categoryAddForm, position: 'top' })}
                            className={`px-3 py-1 text-sm rounded transition-colors ${
                              categoryAddForm.position === 'top'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            Add to Top
                          </button>
                          <button
                            onClick={() => setCategoryAddForm({ ...categoryAddForm, position: 'bottom' })}
                            className={`px-3 py-1 text-sm rounded transition-colors ${
                              categoryAddForm.position === 'bottom'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            Add to Bottom
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCategoryAddForm(null)}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSubmitCategoryAdd}
                            disabled={!categoryAddForm.title.trim()}
                            className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add Issue
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {categoryIssues.length === 0 ? (
                    <EmptyCategory category={category} />
                  ) : (
                    <div>
                      {categoryIssues.map((issue) => (
                        <SortableIssueCard
                          key={issue.id}
                          issue={issue}
                          onClick={() => openIssueModal(issue)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </SortableContext>

          <DragOverlay
            dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: {
                  active: {
                    opacity: '0.4',
                  },
                },
              }),
            }}
          >
            {activeId ? (() => {
              const issue = issues.find(i => i.id === activeId);
              if (!issue) return null;

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

              return (
                <div className="bg-white border-2 border-blue-400 rounded-lg px-3 py-2.5 shadow-xl cursor-grabbing">
                  <div className="flex items-center gap-3">
                    {/* Drag handle */}
                    <div className="flex-shrink-0 text-gray-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>

                    {/* Issue number */}
                    <span className="text-xs text-gray-500 font-medium flex-shrink-0">{issue.issueNumber}</span>

                    {/* Status icon */}
                    {getCategoryIcon(issue.category)}

                    {/* Title */}
                    <h3 className="text-sm text-gray-900 flex-1 min-w-0 truncate">{issue.title}</h3>

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
              );
            })() : null}
          </DragOverlay>
        </DndContext>

        {/* Issue detail panel */}
        <IssueModal
          issue={selectedIssue}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleUpdateIssue}
          onDelete={handleDeleteIssue}
          allTags={allTags}
        />
      </div>
    </div>
  );
}
