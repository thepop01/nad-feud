import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { supaclient } from '../services/supabase';
import { Question, SuggestionWithUser, CategorizedSuggestionGroup, HighlightSuggestionWithUser, CommunityHighlight, TwitterDataExport } from '../types';
import {
  PlusCircle, Trash2, Play, User as UserIcon, UploadCloud, X, StopCircle, Edit,
  AlertTriangle, Layers, List, Search, Download, Filter, Star, Image as ImageIcon,
  Twitter, ExternalLink, CheckCircle, Clock, Link, BarChart3, Settings, Users,
  MessageSquare, Eye, EyeOff, Calendar, TrendingUp, Database, FileText, Activity,
  ChevronDown, ChevronRight, Home, HelpCircle, Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CommunityHighlightsManager from '../components/CommunityHighlightsManager';
import TwitterPreview from '../components/TwitterPreview';
import BulkLinkManager from '../components/BulkLinkManager';
import LinkAnalytics from '../components/LinkAnalytics';

const AdminPage: React.FC = () => {
  const { isAdmin, user, isLoading } = useAuth();
  const [view, setView] = useState<'manage-questions' | 'community-questions' | 'featured-highlights' | 'alltime-highlights' | 'question-suggestions' | 'highlight-suggestions' | 'question-datasheet' | 'twitter-datasheet'>('manage-questions');
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    'community': true,
    'highlights': false,
    'suggestions': false,
    'datasheet': false
  });
  
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([]);
  const [liveQuestions, setLiveQuestions] = useState<(Question & { answered: boolean })[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionWithUser[]>([]);
  const [highlightSuggestions, setHighlightSuggestions] = useState<HighlightSuggestionWithUser[]>([]);
  const [twitterData, setTwitterData] = useState<TwitterDataExport[]>([]);
  const [allAnswers, setAllAnswers] = useState<{
    id: string;
    answer_text: string;
    created_at: string;
    question_id: string;
    question_text: string;
    question_status: string;
    user_id: string;
    username: string;
    avatar_url: string | null;
    discord_role: string | null;
  }[]>([]);
  
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionImage, setNewQuestionImage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [endingQuestionId, setEndingQuestionId] = useState<string | null>(null);
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editForm, setEditForm] = useState({ text: '', imageUrl: '' });

  // Authentication check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const debugAuth = () => {
    console.log('Auth Debug:', { isAdmin, user, isLoading });
    alert(`Admin: ${isAdmin}, User: ${user?.username || 'None'}, Loading: ${isLoading}`);
  };

  // Data fetching functions
  const fetchData = useCallback(async () => {
    try {
      const [pendingRes, liveRes, suggestionsRes, highlightSuggestionsRes, answersRes, twitterRes] = await Promise.all([
        supaclient.getPendingQuestions(),
        supaclient.getLiveQuestions(),
        supaclient.getSuggestions(),
        supaclient.getHighlightSuggestions(),
        supaclient.getAllAnswers(),
        supaclient.getTwitterDataExport()
      ]);

      setPendingQuestions(pendingRes || []);
      setLiveQuestions(liveRes || []);
      setSuggestions(suggestionsRes || []);
      setHighlightSuggestions(highlightSuggestionsRes || []);
      setAllAnswers(answersRes || []);
      setTwitterData(twitterRes || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (editingQuestion) {
      setEditForm({
        text: editingQuestion.question_text,
        imageUrl: editingQuestion.image_url || ''
      });
    }
  }, [editingQuestion]);

  // Question management functions
  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    setIsSubmitting(true);
    try {
      let imageUrl = newQuestionImage;
      
      if (selectedFile) {
        const uploadResult = await supaclient.uploadImage(selectedFile);
        if (uploadResult) {
          imageUrl = uploadResult;
        }
      }

      await supaclient.createQuestion(newQuestionText.trim(), imageUrl || null);
      setNewQuestionText('');
      setNewQuestionImage('');
      setSelectedFile(null);
      setImagePreview(null);
      await fetchData();
    } catch (error) {
      console.error('Failed to create question:', error);
      alert('Failed to create question');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setNewQuestionImage('');
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setNewQuestionImage('');
  };

  const handleStartQuestion = async (questionId: string) => {
    try {
      await supaclient.startQuestion(questionId);
      await fetchData();
    } catch (error) {
      console.error('Failed to start question:', error);
      alert('Failed to start question');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    
    try {
      await supaclient.deleteQuestion(questionId);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete question:', error);
      alert('Failed to delete question');
    }
  };

  const handleEndQuestion = async (questionId: string) => {
    setEndingQuestionId(questionId);
    try {
      await supaclient.endQuestion(questionId);
      await fetchData();
    } catch (error) {
      console.error('Failed to end question:', error);
      alert('Failed to end question');
    } finally {
      setEndingQuestionId(null);
    }
  };

  const handleDeleteLiveQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this live question? This will also delete all answers.')) return;
    
    setDeletingQuestionId(questionId);
    try {
      await supaclient.deleteLiveQuestion(questionId);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete live question:', error);
      alert('Failed to delete live question');
    } finally {
      setDeletingQuestionId(null);
    }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !editForm.text.trim()) return;

    setIsSubmitting(true);
    try {
      await supaclient.updateQuestion(editingQuestion.id, editForm.text.trim(), editForm.imageUrl || null);
      setEditingQuestion(null);
      setEditForm({ text: '', imageUrl: '' });
      await fetchData();
    } catch (error) {
      console.error('Failed to update question:', error);
      alert('Failed to update question');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenManualAnswers = (questionId: string, questionText: string) => {
    const url = `#/admin?manual_answers=${questionId}&question=${encodeURIComponent(questionText)}`;
    window.open(url, '_blank');
  };

  // Export function
  const exportToCSV = () => {
    const headers = ['Date/Time', 'User', 'Role', 'Question', 'Answer', 'Status'];
    const csvContent = [
      headers.join(','),
      ...allAnswers.map(answer => [
        new Date(answer.created_at).toLocaleString(),
        answer.username,
        answer.discord_role || 'No Role',
        `"${answer.question_text.replace(/"/g, '""')}"`,
        `"${answer.answer_text.replace(/"/g, '""')}"`,
        answer.question_status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `question-answers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const convertToHighlight = async (suggestion: HighlightSuggestionWithUser) => {
    try {
      await supaclient.convertHighlightSuggestionToHighlight(suggestion.id);
      await fetchData();
    } catch (error) {
      console.error('Failed to convert suggestion to highlight:', error);
      alert('Failed to convert suggestion to highlight');
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const sidebarItems = [
    {
      id: 'community',
      label: 'Community',
      icon: Users,
      children: [
        { id: 'community-questions', label: 'Community Questions', icon: MessageSquare },
        { id: 'manage-questions', label: 'Manage Questions', icon: Settings }
      ]
    },
    {
      id: 'highlights',
      label: 'Highlights',
      icon: Star,
      children: [
        { id: 'featured-highlights', label: 'Featured Highlights', icon: ImageIcon },
        { id: 'alltime-highlights', label: 'All Time Highlights', icon: TrendingUp }
      ]
    },
    {
      id: 'suggestions',
      label: 'Suggestions',
      icon: Lightbulb,
      children: [
        { id: 'question-suggestions', label: 'Question Suggestions', icon: HelpCircle },
        { id: 'highlight-suggestions', label: 'Highlight Suggestions', icon: Twitter }
      ]
    },
    {
      id: 'datasheet',
      label: 'Data Sheet',
      icon: Database,
      children: [
        { id: 'question-datasheet', label: 'Question Answer Data', icon: FileText },
        { id: 'twitter-datasheet', label: 'Community Suggestion Highlights', icon: BarChart3 }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar */}
      <div className="w-80 bg-slate-800/50 backdrop-blur-sm border-r border-slate-700/50 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
              <Settings className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Admin Panel</h1>
              <p className="text-slate-400 text-sm">Management Dashboard</p>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isExpanded = expandedSections[item.id];
            
            return (
              <div key={item.id} className="space-y-1">
                {/* Parent Item */}
                <button
                  onClick={() => toggleSection(item.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className="text-slate-400 group-hover:text-white transition-colors" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-slate-400 transition-transform" />
                  ) : (
                    <ChevronRight size={16} className="text-slate-400 transition-transform" />
                  )}
                </button>

                {/* Children Items */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="ml-6 space-y-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isActive = view === child.id;
                          
                          return (
                            <button
                              key={child.id}
                              onClick={() => setView(child.id as any)}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                                isActive
                                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                                  : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                              }`}
                            >
                              <ChildIcon size={16} />
                              <span>{child.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={debugAuth}
            className="w-full px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-xs rounded-lg transition-colors border border-slate-600/50"
            title="Debug authentication info"
          >
            <div className="flex items-center justify-center gap-2">
              <Activity size={12} />
              <span>Debug Auth</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Content Header */}
        <div className="bg-slate-800/30 backdrop-blur-sm border-b border-slate-700/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white capitalize">
                {view.replace('-', ' ')}
              </h2>
              <p className="text-slate-400 text-sm">
                {view === 'manage-questions' && 'Create and manage pending questions'}
                {view === 'community-questions' && 'View live community questions'}
                {view === 'featured-highlights' && 'Manage homepage featured highlights'}
                {view === 'alltime-highlights' && 'Manage all-time community highlights'}
                {view === 'question-suggestions' && 'Review user question suggestions'}
                {view === 'highlight-suggestions' && 'Review community highlight suggestions'}
                {view === 'question-datasheet' && 'Export question and answer data'}
                {view === 'twitter-datasheet' && 'Export Twitter and community data'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Activity size={16} />
              <span>Online</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {isLoading ? (
                <div className="flex justify-center p-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : (
                <>
                  {/* Manage Questions */}
                  {view === 'manage-questions' && (
                    <div className="space-y-6">
                      {/* Create Question Card */}
                      <Card>
                        <h2 className="text-2xl font-bold mb-4">Create New Question</h2>
                        <form onSubmit={handleCreateQuestion} className="space-y-4">
                          <input
                            type="text"
                            value={newQuestionText}
                            onChange={(e) => setNewQuestionText(e.target.value)}
                            placeholder="Question text..."
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500 focus:border-purple-500"
                            required
                          />

                          <div className="space-y-4">
                            {imagePreview ? (
                              <div className="relative group w-fit">
                                <img src={imagePreview} alt="Selected preview" className="max-h-48 rounded-lg shadow-md"/>
                                <Button type="button" variant="danger" onClick={removeImage} className="absolute top-2 right-2 !p-2 h-auto opacity-50 group-hover:opacity-100 transition-opacity">
                                  <X size={16}/>
                                </Button>
                              </div>
                            ) : (
                              <label htmlFor="image-upload-input" className="w-full cursor-pointer bg-slate-800/60 hover:bg-slate-700/60 border-2 border-dashed border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center text-slate-400 transition-colors">
                                <UploadCloud size={32} />
                                <span className="mt-2 font-semibold">Upload an image</span>
                                <span className="text-xs">PNG, JPG, GIF up to 10MB</span>
                              </label>
                            )}
                            <input id="image-upload-input" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, image/gif" />

                            <div className="flex items-center gap-4">
                              <hr className="flex-grow border-slate-600"/>
                              <span className="text-slate-400 font-semibold">OR</span>
                              <hr className="flex-grow border-slate-600"/>
                            </div>

                            <input
                              type="text"
                              value={newQuestionImage}
                              onChange={(e) => {
                                setNewQuestionImage(e.target.value);
                                removeImage();
                              }}
                              placeholder="Paste an image URL..."
                              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500 focus:border-purple-500"
                              disabled={!!selectedFile}
                            />
                          </div>

                          <Button type="submit" disabled={isSubmitting}>
                            <PlusCircle size={20}/>
                            {isSubmitting ? 'Creating...' : 'Create Question'}
                          </Button>
                        </form>
                      </Card>

                      {/* Pending Questions */}
                      <Card>
                        <h2 className="text-2xl font-bold mb-4">Pending Questions</h2>
                        <ul className="space-y-3">
                          {pendingQuestions.map(q => (
                            <li key={q.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg gap-2">
                              <span className="text-slate-200 flex-grow">{q.question_text}</span>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button onClick={() => setEditingQuestion(q)} variant='secondary' className='px-3 py-2'>
                                  <Edit size={16}/>
                                </Button>
                                <Button onClick={() => handleDeleteQuestion(q.id)} variant='danger' className='px-3 py-2'>
                                  <Trash2 size={16}/>
                                </Button>
                                <Button onClick={() => handleStartQuestion(q.id)} variant='secondary' className='bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'>
                                  <Play size={16}/> Start
                                </Button>
                              </div>
                            </li>
                          ))}
                          {pendingQuestions.length === 0 && <p className='text-slate-400'>No pending questions.</p>}
                        </ul>
                      </Card>
                    </div>
                  )}

                  {/* Community Questions */}
                  {view === 'community-questions' && (
                    <Card>
                      <h2 className="text-2xl font-bold mb-4">Live Question Management</h2>
                      {liveQuestions.length > 0 ? (
                        <ul className="space-y-3">
                          {liveQuestions.map(q => (
                            <li key={q.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg gap-2">
                              <p className="font-medium text-slate-200 flex-grow">{q.question_text}</p>
                              <div className="flex gap-2 flex-shrink-0">
                                <Button
                                  onClick={() => handleOpenManualAnswers(q.id, q.question_text)}
                                  variant='secondary'
                                  className='px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
                                >
                                  <Edit size={16}/> Manual Answers
                                </Button>
                                <Button
                                  onClick={() => handleEndQuestion(q.id)}
                                  variant='secondary'
                                  className='px-3 py-2 bg-green-600 hover:bg-green-700 text-white focus:ring-green-500'
                                  disabled={endingQuestionId === q.id}
                                >
                                  {endingQuestionId === q.id ? 'Ending...' : <><StopCircle size={16}/> Auto End</>}
                                </Button>
                                <Button
                                  onClick={() => handleDeleteLiveQuestion(q.id)}
                                  variant='danger'
                                  className='px-3 py-2'
                                  disabled={deletingQuestionId === q.id}
                                >
                                  {deletingQuestionId === q.id ? 'Deleting...' : <><Trash2 size={16}/> Delete</>}
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className='text-slate-400'>No questions are currently live. Start one from the "Manage Questions" section.</p>
                      )}
                    </Card>
                  )}

                  {/* Featured Highlights */}
                  {view === 'featured-highlights' && (
                    <CommunityHighlightsManager showAllHighlights={false} />
                  )}

                  {/* All Time Highlights */}
                  {view === 'alltime-highlights' && (
                    <CommunityHighlightsManager showAllHighlights={true} />
                  )}

                  {/* Question Suggestions */}
                  {view === 'question-suggestions' && (
                    <Card>
                      <h2 className="text-2xl font-bold mb-4">Question Suggestions</h2>
                      {suggestions.length > 0 ? (
                        <div className="space-y-4">
                          {suggestions.map(suggestion => (
                            <div key={suggestion.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-white font-medium mb-2">{suggestion.suggestion_text}</p>
                                  <div className="flex items-center gap-4 text-sm text-slate-400">
                                    <span>By: {suggestion.users?.username || 'Unknown'}</span>
                                    <span>{new Date(suggestion.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="secondary" size="sm">
                                    <CheckCircle size={14} />
                                    Approve
                                  </Button>
                                  <Button variant="danger" size="sm">
                                    <X size={14} />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400">No question suggestions available.</p>
                      )}
                    </Card>
                  )}

                  {/* Highlight Suggestions */}
                  {view === 'highlight-suggestions' && (
                    <Card>
                      <h2 className="text-2xl font-bold mb-4">Highlight Suggestions</h2>
                      {highlightSuggestions.length > 0 ? (
                        <div className="space-y-4">
                          {highlightSuggestions.map(suggestion => (
                            <div key={suggestion.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Twitter size={16} className="text-blue-400" />
                                    <a
                                      href={suggestion.twitter_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300 font-medium"
                                    >
                                      View Tweet
                                    </a>
                                  </div>
                                  {suggestion.description && (
                                    <p className="text-slate-300 mb-2">{suggestion.description}</p>
                                  )}
                                  <div className="flex items-center gap-4 text-sm text-slate-400">
                                    <span>By: {suggestion.users?.username || 'Unknown'}</span>
                                    <span>{new Date(suggestion.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => convertToHighlight(suggestion)}
                                    variant="secondary"
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle size={14} />
                                    Convert
                                  </Button>
                                  <Button
                                    onClick={() => supaclient.deleteHighlightSuggestion(suggestion.id).then(fetchData)}
                                    variant="danger"
                                    size="sm"
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400">No highlight suggestions available.</p>
                      )}
                    </Card>
                  )}

                  {/* Question Datasheet */}
                  {view === 'question-datasheet' && (
                    <Card>
                      <h2 className="text-2xl font-bold mb-4">Question Answer Data Sheet</h2>
                      <div className="mb-4">
                        <Button
                          onClick={exportToCSV}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Download size={16} />
                          Export to CSV
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-700">
                              <th className="text-left py-2 px-4">Question</th>
                              <th className="text-left py-2 px-4">Answer</th>
                              <th className="text-left py-2 px-4">User</th>
                              <th className="text-left py-2 px-4">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allAnswers.slice(0, 50).map(answer => (
                              <tr key={answer.id} className="border-b border-slate-800">
                                <td className="py-2 px-4 text-slate-300">{answer.question_text}</td>
                                <td className="py-2 px-4 text-slate-300">{answer.answer_text}</td>
                                <td className="py-2 px-4 text-slate-400">{answer.username}</td>
                                <td className="py-2 px-4 text-slate-400">{new Date(answer.created_at).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}

                  {/* Twitter Datasheet */}
                  {view === 'twitter-datasheet' && (
                    <Card>
                      <h2 className="text-2xl font-bold mb-4">Community Suggestion Highlights Data</h2>
                      <div className="mb-4 flex gap-4">
                        <Button
                          onClick={async () => {
                            try {
                              const csvData = await supaclient.exportTwitterDataAsCSV();
                              const blob = new Blob([csvData], { type: 'text/csv' });
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `twitter-data-export-${new Date().toISOString().split('T')[0]}.csv`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                            } catch (error) {
                              console.error('Failed to export Twitter data:', error);
                              alert('Failed to export Twitter data');
                            }
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Download size={16} />
                          Export Twitter Data CSV
                        </Button>
                        <Button
                          onClick={() => {
                            supaclient.getTwitterDataExport().then(setTwitterData);
                          }}
                          variant="secondary"
                        >
                          <Activity size={16} />
                          Refresh Data
                        </Button>
                      </div>
                      {twitterData.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-700">
                                <th className="text-left py-2 px-4">Type</th>
                                <th className="text-left py-2 px-4">Suggester</th>
                                <th className="text-left py-2 px-4">Twitter User</th>
                                <th className="text-left py-2 px-4">Description</th>
                                <th className="text-left py-2 px-4">Status</th>
                                <th className="text-left py-2 px-4">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {twitterData.slice(0, 50).map(item => (
                                <tr key={item.id} className="border-b border-slate-800">
                                  <td className="py-2 px-4 text-slate-300 capitalize">{item.type.replace('_', ' ')}</td>
                                  <td className="py-2 px-4 text-slate-300">{item.suggester_name}</td>
                                  <td className="py-2 px-4 text-blue-400">@{item.twitter_username}</td>
                                  <td className="py-2 px-4 text-slate-400 max-w-xs truncate">{item.description || 'No description'}</td>
                                  <td className="py-2 px-4">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      item.status === 'approved' ? 'bg-green-600/20 text-green-300' : 'bg-yellow-600/20 text-yellow-300'
                                    }`}>
                                      {item.status}
                                    </span>
                                  </td>
                                  <td className="py-2 px-4 text-slate-400">{new Date(item.created_at).toLocaleDateString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-slate-400">No Twitter data available.</p>
                      )}
                    </Card>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Edit Question Modal */}
      <AnimatePresence>
        {editingQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setEditingQuestion(null)}
          >
            <Card className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-4">Edit Question</h2>
              <form onSubmit={handleUpdateQuestion} className="space-y-4">
                <input
                  type="text"
                  value={editForm.text}
                  onChange={(e) => setEditForm({...editForm, text: e.target.value})}
                  placeholder="Question text..."
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500 focus:border-purple-500"
                  required
                />
                <input
                  type="text"
                  value={editForm.imageUrl}
                  onChange={(e) => setEditForm({...editForm, imageUrl: e.target.value})}
                  placeholder="Image URL (optional)..."
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500 focus:border-purple-500"
                />
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="secondary" onClick={() => setEditingQuestion(null)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPage;
