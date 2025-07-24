
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { supaclient } from '../services/supabase';
import { Question, SuggestionWithUser, CategorizedSuggestionGroup, GroupedAnswer, AdminAnswerLogItem } from '../types';
import { PlusCircle, Trash2, Play, User as UserIcon, UploadCloud, X, StopCircle, Edit, AlertTriangle, Layers, List, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ReviewQuestion = Question & { grouped_answers: GroupedAnswer[] };

const AdminPage: React.FC = () => {
  const { isAdmin, user } = useAuth();
  const [view, setView] = useState<'manage' | 'suggestions' | 'log'>('manage');
  
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([]);
  const [liveQuestions, setLiveQuestions] = useState<(Question & { answered: boolean })[]>([]);
  const [reviewingQuestions, setReviewingQuestions] = useState<ReviewQuestion[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionWithUser[]>([]);
  const [answerLog, setAnswerLog] = useState<AdminAnswerLogItem[]>([]);
  
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionImage, setNewQuestionImage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [endingQuestionId, setEndingQuestionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State for editing questions
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editForm, setEditForm] = useState({ text: '', imageUrl: '' });
  
  // State for editing grouped answers
  const [editingGroup, setEditingGroup] = useState<GroupedAnswer | null>(null);
  const [editGroupForm, setEditGroupForm] = useState({ group_text: '', count: 0 });
  
  // State for reset functionality
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  // State for suggestion categorization
  const [categorizedSuggestions, setCategorizedSuggestions] = useState<CategorizedSuggestionGroup[] | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  
  const [approvingQuestionId, setApprovingQuestionId] = useState<string | null>(null);


  useEffect(() => {
    if (editingQuestion) {
      setEditForm({
        text: editingQuestion.question_text,
        imageUrl: editingQuestion.image_url || '',
      });
    }
  }, [editingQuestion]);
  
  useEffect(() => {
    if (editingGroup) {
      setEditGroupForm({
        group_text: editingGroup.group_text,
        count: editingGroup.count,
      });
    }
  }, [editingGroup]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
        const [pQuestions, suggs, liveQs, revQuestions, ansLog] = await Promise.all([
          supaclient.getPendingQuestions(),
          supaclient.getSuggestions(),
          supaclient.getLiveQuestions(),
          supaclient.getReviewingQuestions(),
          supaclient.getAllAnswersForAdmin(),
        ]);
        setPendingQuestions(pQuestions);
        setSuggestions(suggs);
        setLiveQuestions(liveQs);
        setReviewingQuestions(revQuestions as ReviewQuestion[]);
        setAnswerLog(ansLog);
        setCategorizedSuggestions(null); // Reset categories on fresh data load
    } catch(error) {
        console.error("Failed to fetch admin data:", error);
        alert("Could not load admin data.");
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, fetchData]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setNewQuestionImage(''); // Clear URL input if file is selected
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    const fileInput = document.getElementById('image-upload-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim() || !user) return;
    setIsSubmitting(true);
    
    try {
      let finalImageUrl: string | null = newQuestionImage || null;

      if (selectedFile) {
        // The user ID is needed for associating storage uploads securely.
        finalImageUrl = await supaclient.uploadQuestionImage(selectedFile, user.id);
      }

      await supaclient.createQuestion(newQuestionText, finalImageUrl);
      
      setNewQuestionText('');
      setNewQuestionImage('');
      removeImage();
      fetchData();
    } catch (error: any) {
      console.error("Failed to create question:", error);
      alert(`Failed to create question: ${error.message || 'Please check console for details.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartQuestion = async (id: string) => {
    await supaclient.startQuestion(id);
    alert('Question is now live!');
    fetchData();
  };
  
  const handleEndQuestion = async (id: string) => {
    if (endingQuestionId) return;
    setEndingQuestionId(id);
    try {
        await supaclient.endQuestion(id);
        await fetchData();
    } catch (error) {
        console.error("Failed to end question:", error);
        alert("An error occurred while ending the question. Please check the console for details.");
    } finally {
        setEndingQuestionId(null);
    }
  };

  const handleDeleteSuggestion = async (id:string) => {
    await supaclient.deleteSuggestion(id);
    fetchData();
  }
  
  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    setIsSubmitting(true);

    try {
      await supaclient.updateQuestion(editingQuestion.id, editForm.text, editForm.imageUrl || null);
      setEditingQuestion(null);
      fetchData();
    } catch (error: any) {
      console.error("Failed to update question:", error);
      alert(`Failed to update question: ${error.message || 'Please check console for details.'}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDeleteQuestion = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this question? This action cannot be undone.")) {
      await supaclient.deleteQuestion(id);
      fetchData();
    }
  }
  
  const handleCategorizeSuggestions = async () => {
      if (suggestions.length === 0 || isCategorizing) return;
      setIsCategorizing(true);
      setCategorizedSuggestions(null);

      try {
        const simpleSuggestions = suggestions.map(s => ({ id: s.id, text: s.text }));
        const categories: { id: string; category: string; }[] = await supaclient.categorizeSuggestions(simpleSuggestions);
        
        const categoryMap = new Map<string, SuggestionWithUser[]>();
        categories.forEach(catResult => {
            const suggestion = suggestions.find(s => s.id === catResult.id);
            if (suggestion) {
                if (!categoryMap.has(catResult.category)) {
                    categoryMap.set(catResult.category, []);
                }
                categoryMap.get(catResult.category)!.push(suggestion);
            }
        });

        const grouped = Array.from(categoryMap.entries()).map(([category, suggestions]) => ({
            category,
            suggestions
        })).sort((a, b) => a.category.localeCompare(b.category));

        setCategorizedSuggestions(grouped);

      } catch (error) {
        console.error("Failed to categorize suggestions:", error);
        alert("An error occurred while categorizing suggestions. Please check the console.");
      } finally {
        setIsCategorizing(false);
      }
  };

  const handleResetData = async () => {
    if (resetConfirmText !== 'RESET') {
        alert("Confirmation text does not match. Please type 'RESET' to confirm.");
        return;
    }
    setIsResetting(true);
    try {
        await supaclient.resetAllData();
        alert("Game data has been successfully reset. All answers, groups, and scores have been cleared.");
        setShowResetConfirm(false);
        setResetConfirmText('');
        fetchData();
    } catch (error) {
        console.error("Failed to reset data:", error);
        alert("An error occurred while resetting the data. Check the console for more details.");
    } finally {
        setIsResetting(false);
    }
  };

  const handleDeleteGroupedAnswer = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this answer group? This might affect final scores.")) {
      await supaclient.deleteGroupedAnswer(id);
      fetchData();
    }
  };

  const handleUpdateGroupedAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    setIsSubmitting(true);
    try {
      await supaclient.updateGroupedAnswer(editingGroup.id, editGroupForm);
      setEditingGroup(null);
      fetchData();
    } catch(error) {
      console.error('Failed to update group:', error);
      alert('Failed to update group.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleApproveQuestion = async (id: string) => {
    if (approvingQuestionId) return;
    if (window.confirm("Are you sure you want to approve these results? This will finalize scores and publish the question. This action cannot be undone.")) {
      setApprovingQuestionId(id);
      try {
        await supaclient.approveQuestion(id);
        fetchData();
      } catch (error) {
        console.error('Failed to approve question:', error);
        alert('An error occurred during approval.');
      } finally {
        setApprovingQuestionId(null);
      }
    }
  };

  const handleExportToCsv = () => {
    if (answerLog.length === 0) return;
    const headers = ['Timestamp', 'UserID', 'Username', 'Nickname', 'Question', 'Answer'];
    const rows = answerLog.map(log => [
        `"${new Date(log.created_at).toLocaleString()}"`,
        `"${log.users?.id || 'N/A'}"`,
        `"${log.users?.username || 'N/A'}"`,
        `"${log.users?.nickname || ''}"`,
        `"${(log.questions?.question_text || 'N/A').replace(/"/g, '""')}"`,
        `"${(log.answer_text || '').replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nad_feud_answer_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const TabButton: React.FC<{currentView: string; viewName: string; setView: (view: any) => void; children: React.ReactNode}> = ({currentView, viewName, setView, children}) => (
    <button onClick={() => setView(viewName)} className={`px-4 py-2 text-lg font-semibold rounded-t-lg transition-colors ${currentView === viewName ? 'text-white bg-slate-700/50' : 'text-slate-400 hover:text-white'}`}>
        {children}
    </button>
  );

  const renderSuggestions = () => {
    if (isCategorizing) {
        return <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div><p className="ml-4 text-slate-300">Categorizing...</p></div>;
    }

    if (categorizedSuggestions) {
      return (
        <div className="space-y-6">
          {categorizedSuggestions.map(group => (
            <div key={group.category}>
              <h3 className="text-xl font-semibold text-purple-300 mb-3 border-b-2 border-purple-500/20 pb-1">{group.category}</h3>
              <ul className="space-y-3">
                {group.suggestions.map(s => <SuggestionItem key={s.id} suggestion={s} onDelete={handleDeleteSuggestion} />)}
              </ul>
            </div>
          ))}
        </div>
      );
    }

    if (suggestions.length === 0) {
      return <p className='text-slate-400'>No user suggestions.</p>;
    }

    return (
      <ul className="space-y-3">
        {suggestions.map(s => <SuggestionItem key={s.id} suggestion={s} onDelete={handleDeleteSuggestion} />)}
      </ul>
    );
  };
  
  const SuggestionItem: React.FC<{suggestion: SuggestionWithUser, onDelete: (id: string) => void}> = ({suggestion, onDelete}) => (
     <li className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
        <div className="flex items-center gap-3">
            {suggestion.users?.avatar_url ? (
              <img src={suggestion.users.avatar_url} alt={suggestion.users.username || 'user avatar'} className="w-8 h-8 rounded-full"/>
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                  <UserIcon size={16} className="text-slate-400" />
              </div>
            )}
            <div>
                <p className="text-slate-200">{suggestion.text}</p>
                <p className="text-xs text-slate-400">by {suggestion.users?.username || 'Anonymous'}</p>
            </div>
        </div>
        <Button onClick={() => onDelete(suggestion.id)} variant="danger" className='px-3 py-2'>
            <Trash2 size={16}/>
        </Button>
    </li>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-center">Admin Panel</h1>
      
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

      <Card>
        <h2 className="text-2xl font-bold mb-4">Live Question Management</h2>
        {isLoading ? (
          <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div></div>
        ) : liveQuestions.length > 0 ? (
          <ul className="space-y-3">
            {liveQuestions.map(q => (
              <li key={q.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg gap-2 flex-wrap">
                <p className="font-medium text-slate-200 flex-grow">{q.question_text}</p>
                 <div className="flex gap-2 flex-shrink-0">
                    <Button onClick={() => handleDeleteQuestion(q.id)} variant='danger' className="!p-2">
                        <Trash2 size={16}/>
                    </Button>
                    <Button onClick={() => handleEndQuestion(q.id)} variant='secondary' className="bg-orange-600 hover:bg-orange-700 text-white focus:ring-orange-500" disabled={endingQuestionId === q.id}>
                        {endingQuestionId === q.id ? 'Ending...' : <><StopCircle size={16}/> End & Review</>}
                    </Button>
                 </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-slate-400'>No questions are currently live. Start one from the "Manage Questions" tab below.</p>
        )}
      </Card>
      
      <Card>
        <h2 className="text-2xl font-bold mb-4">Questions for Review ({reviewingQuestions.length})</h2>
        {isLoading ? (
            <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div></div>
        ) : reviewingQuestions.length > 0 ? (
            <div className="space-y-6">
                {reviewingQuestions.map(q => (
                    <div key={q.id} className="bg-slate-800/40 p-4 rounded-lg">
                        <h3 className="text-xl font-semibold text-white mb-3">{q.question_text}</h3>
                        <ul className="space-y-2 mb-4">
                            {q.grouped_answers.map(g => (
                                <li key={g.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-md gap-2 flex-wrap">
                                    <div className="flex-grow">
                                        <p className="font-medium text-slate-200">{g.group_text}</p>
                                        <p className="text-xs text-slate-400">Count: {g.count} | Percentage: {g.percentage}%</p>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <Button variant="secondary" className="!p-2" onClick={() => setEditingGroup(g)}><Edit size={16}/></Button>
                                        <Button variant="danger" className="!p-2" onClick={() => handleDeleteGroupedAnswer(g.id)}><Trash2 size={16}/></Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        <Button 
                            className="w-full bg-green-600 hover:bg-green-700 focus:ring-green-500"
                            onClick={() => handleApproveQuestion(q.id)}
                            disabled={approvingQuestionId === q.id}
                        >
                            {approvingQuestionId === q.id ? 'Finalizing...' : <><CheckCircle size={16}/> Approve & Finalize Scores</>}
                        </Button>
                    </div>
                ))}
            </div>
        ) : (
            <p className='text-slate-400'>No questions are awaiting review.</p>
        )}
      </Card>

      <div className="flex border-b border-slate-700">
          <TabButton currentView={view} viewName="manage" setView={setView}>Manage Questions</TabButton>
          <TabButton currentView={view} viewName="suggestions" setView={setView}>Suggestions ({suggestions.length})</TabButton>
          <TabButton currentView={view} viewName="log" setView={setView}>Answer Log ({answerLog.length})</TabButton>
      </div>

      <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -10, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {isLoading ? <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div> : (
            view === 'manage' ? (
                <Card>
                    <h2 className="text-2xl font-bold mb-4">Pending Questions</h2>
                    <ul className="space-y-3">
                        {pendingQuestions.map(q => (
                            <li key={q.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg gap-2 flex-wrap">
                                <span className="text-slate-200 flex-grow">{q.question_text}</span>
                                <div className="flex gap-2 flex-shrink-0">
                                    <Button onClick={() => setEditingQuestion(q)} variant='secondary' className='!p-2'>
                                        <Edit size={16}/>
                                    </Button>
                                    <Button onClick={() => handleDeleteQuestion(q.id)} variant='danger' className='!p-2'>
                                        <Trash2 size={16}/>
                                    </Button>
                                    <Button onClick={() => handleStartQuestion(q.id)} variant='secondary' className='bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'>
                                        <Play size={16}/> Start
                                    </Button>
                                </div>
                            </li>
                        ))}
                        {pendingQuestions.length === 0 && <p className='text-slate-400'>No pending questions.</p>}
                    </ul>
                </Card>
            ) : view === 'suggestions' ? (
                <Card>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h2 className="text-2xl font-bold">User Suggestions</h2>
                        <div className="flex gap-2">
                            <Button 
                                variant="secondary" 
                                onClick={handleCategorizeSuggestions}
                                disabled={suggestions.length === 0 || isCategorizing || !!categorizedSuggestions}
                            >
                                <Layers size={16} /> Auto-Categorize
                            </Button>
                            {categorizedSuggestions && (
                                <Button 
                                    variant="secondary" 
                                    onClick={() => setCategorizedSuggestions(null)}
                                >
                                    <List size={16} /> Show All
                                </Button>
                            )}
                        </div>
                    </div>
                    {renderSuggestions()}
                </Card>
            ) : (
                <Card>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <h2 className="text-2xl font-bold">Full Answer Log</h2>
                        <Button variant="secondary" onClick={handleExportToCsv} disabled={answerLog.length === 0}>
                            <UploadCloud size={16} /> Export as CSV
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-700/50 text-xs text-slate-300 uppercase">
                                <tr>
                                    <th scope="col" className="px-4 py-3">Timestamp</th>
                                    <th scope="col" className="px-4 py-3">User</th>
                                    <th scope="col" className="px-4 py-3">Question</th>
                                    <th scope="col" className="px-4 py-3">Answer</th>
                                </tr>
                            </thead>
                            <tbody>
                                {answerLog.map((log, index) => (
                                    <tr key={index} className="border-b border-slate-700 hover:bg-slate-800/40">
                                        <td className="px-4 py-3 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-white">{log.users?.nickname || log.users?.username}</div>
                                            <div className="text-xs text-slate-400 font-mono">{log.users?.id}</div>
                                        </td>
                                        <td className="px-4 py-3">{log.questions?.question_text || "N/A"}</td>
                                        <td className="px-4 py-3 font-medium text-slate-100">{log.answer_text}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {answerLog.length === 0 && <p className="text-center text-slate-400 py-8">No answers have been recorded yet.</p>}
                </Card>
            )
        )}
      </motion.div>
      </AnimatePresence>
      
      <Card>
          <h2 className="text-2xl font-bold mb-2 text-red-400">Danger Zone</h2>
          <div className="border border-red-500/30 bg-red-900/20 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white">Reset All Game Data</h3>
            <p className="text-slate-300 mb-4">This will permanently delete all answers and grouped results, and reset all user scores to 0. This action cannot be undone.</p>
            <Button variant="danger" onClick={() => setShowResetConfirm(true)}>Reset All Data</Button>
          </div>
      </Card>
      
      {/* Modals */}
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
        
        {editingGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setEditingGroup(null)}
          >
            <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-4">Edit Answer Group</h2>
              <form onSubmit={handleUpdateGroupedAnswer} className="space-y-4">
                  <div>
                    <label htmlFor="group_text" className="block text-sm font-medium text-slate-300 mb-1">Group Text</label>
                    <input
                      id="group_text"
                      type="text"
                      value={editGroupForm.group_text}
                      onChange={(e) => setEditGroupForm({...editGroupForm, group_text: e.target.value})}
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                  </div>
                   <div>
                    <label htmlFor="group_count" className="block text-sm font-medium text-slate-300 mb-1">Answer Count</label>
                    <input
                      id="group_count"
                      type="number"
                      value={editGroupForm.count}
                      onChange={(e) => setEditGroupForm({...editGroupForm, count: parseInt(e.target.value, 10) || 0})}
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-purple-500 focus:border-purple-500"
                      required
                    />
                     <p className="text-xs text-slate-400 mt-1">Changing this count will affect the final scores. Percentages will be recalculated upon approval.</p>
                  </div>
                  <div className="flex justify-end gap-3">
                      <Button type="button" variant="secondary" onClick={() => setEditingGroup(null)}>Cancel</Button>
                      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Changes"}</Button>
                  </div>
              </form>
            </Card>
          </motion.div>
        )}

        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowResetConfirm(false)}
          >
            <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-4">
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Reset Game Data</h2>
                        <p className="text-slate-300 mt-2">
                            Are you absolutely sure? This will permanently delete all answers, groups, and reset all user scores. This cannot be undone.
                        </p>
                         <p className="text-slate-300 mt-2 font-semibold">
                            To confirm, please type <strong className="text-red-400">RESET</strong> in the box below.
                        </p>
                    </div>
                </div>
                <div className="mt-4 space-y-3">
                    <input
                        type="text"
                        value={resetConfirmText}
                        onChange={(e) => setResetConfirmText(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-red-500 focus:border-red-500"
                        placeholder="RESET"
                    />
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setShowResetConfirm(false)}>Cancel</Button>
                        <Button
                            type="button"
                            variant="danger"
                            onClick={handleResetData}
                            disabled={resetConfirmText !== 'RESET' || isResetting}
                        >
                            {isResetting ? "Resetting..." : "Confirm Reset"}
                        </Button>
                    </div>
                </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AdminPage;