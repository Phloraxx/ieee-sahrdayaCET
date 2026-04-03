'use client';

import React, { useState, useCallback } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { v4 as uuidv4 } from 'uuid';
import {
    Plus,
    GripVertical,
    Trash2,
    Copy,
    ChevronDown,
    ChevronUp,
    Type,
    Mail,
    Phone,
    List,
    CheckSquare,
    AlignLeft,
    Save,
    Eye,
    EyeOff,
    X,
    Loader2,
    HelpCircle,
} from 'lucide-react';
import { databases, DATABASE_ID } from '@/lib/appwrite';
import { ID } from 'appwrite';

// Types
export type FieldType = 'text' | 'email' | 'phone' | 'select' | 'checkbox' | 'textarea';

export interface Question {
    id: string;
    question: string;
    field_type: FieldType;
    required: boolean;
    options?: string[];
    placeholder?: string;
    help_text?: string;
    order: number;
}

export interface IncludeFields {
    food_preference: boolean;
    t_shirt_size: boolean;
    section: boolean;
    roll_number: boolean;
    college_id: boolean;
}

export interface FormTemplate {
    event_id: string;
    title: string;
    description: string;
    questions: Question[];
    include_fields: IncludeFields;
}

interface EventFormBuilderProps {
    eventId: string;
    initialData?: FormTemplate;
    collectionId?: string;
    onSave?: (template: FormTemplate) => void;
}

// Question type metadata
const QUESTION_TYPES: { type: FieldType; label: string; icon: React.ReactNode }[] = [
    { type: 'text', label: 'Text Input', icon: <Type size={16} /> },
    { type: 'email', label: 'Email', icon: <Mail size={16} /> },
    { type: 'phone', label: 'Phone', icon: <Phone size={16} /> },
    { type: 'select', label: 'Dropdown', icon: <List size={16} /> },
    { type: 'checkbox', label: 'Multiple Choice', icon: <CheckSquare size={16} /> },
    { type: 'textarea', label: 'Long Text', icon: <AlignLeft size={16} /> },
];

// Standard fields config
const STANDARD_FIELDS = [
    { key: 'food_preference' as const, label: 'Food Preference' },
    { key: 't_shirt_size' as const, label: 'T-Shirt Size' },
    { key: 'section' as const, label: 'Section' },
    { key: 'roll_number' as const, label: 'Roll Number' },
    { key: 'college_id' as const, label: 'College ID' },
];

// Default include fields
const DEFAULT_INCLUDE_FIELDS: IncludeFields = {
    food_preference: false,
    t_shirt_size: false,
    section: false,
    roll_number: false,
    college_id: false,
};

// Sortable Question Card Component
interface SortableQuestionCardProps {
    question: Question;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onUpdate: (updates: Partial<Question>) => void;
    onDelete: () => void;
    onDuplicate: () => void;
}

function SortableQuestionCard({
    question,
    isExpanded,
    onToggleExpand,
    onUpdate,
    onDelete,
    onDuplicate,
}: SortableQuestionCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: question.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const typeInfo = QUESTION_TYPES.find(t => t.type === question.field_type);
    const hasOptions = question.field_type === 'select' || question.field_type === 'checkbox';

    const addOption = () => {
        const newOptions = [...(question.options || []), ''];
        onUpdate({ options: newOptions });
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...(question.options || [])];
        newOptions[index] = value;
        onUpdate({ options: newOptions });
    };

    const removeOption = (index: number) => {
        const newOptions = (question.options || []).filter((_, i) => i !== index);
        onUpdate({ options: newOptions });
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`bg-gray-800 border border-gray-700 rounded-lg transition-all ${
                isDragging ? 'opacity-50 shadow-2xl scale-[1.02]' : ''
            }`}
        >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-700">
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-300 touch-none"
                >
                    <GripVertical size={20} />
                </button>

                <div className="flex items-center gap-2 px-2 py-1 bg-gray-700/50 rounded text-sm text-gray-300">
                    {typeInfo?.icon}
                    <span>{typeInfo?.label}</span>
                </div>

                <div className="flex-1 text-white font-medium truncate">
                    {question.question || 'Untitled Question'}
                </div>

                {question.required && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">
                        Required
                    </span>
                )}

                <div className="flex items-center gap-1">
                    <button
                        onClick={onDuplicate}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors"
                        title="Duplicate"
                    >
                        <Copy size={16} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                    <button
                        onClick={onToggleExpand}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-4 space-y-4">
                    {/* Question Text */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            Question Text <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={question.question}
                            onChange={(e) => onUpdate({ question: e.target.value })}
                            placeholder="Enter your question"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    {/* Field Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            Field Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {QUESTION_TYPES.map((t) => (
                                <button
                                    key={t.type}
                                    onClick={() => onUpdate({ field_type: t.type })}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                                        question.field_type === t.type
                                            ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                                            : 'border-gray-600 bg-gray-900 text-gray-400 hover:border-gray-500'
                                    }`}
                                >
                                    {t.icon}
                                    <span className="text-sm">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Required Toggle */}
                    <div className="flex items-center justify-between py-2">
                        <label className="text-sm font-medium text-gray-300">
                            Required Field
                        </label>
                        <button
                            onClick={() => onUpdate({ required: !question.required })}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                                question.required ? 'bg-blue-500' : 'bg-gray-600'
                            }`}
                        >
                            <span
                                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                    question.required ? 'left-7' : 'left-1'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Placeholder */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            Placeholder Text
                        </label>
                        <input
                            type="text"
                            value={question.placeholder || ''}
                            onChange={(e) => onUpdate({ placeholder: e.target.value })}
                            placeholder="Enter placeholder text"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    {/* Help Text */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            Help Text / Instructions
                        </label>
                        <input
                            type="text"
                            value={question.help_text || ''}
                            onChange={(e) => onUpdate({ help_text: e.target.value })}
                            placeholder="Additional instructions for this field"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>

                    {/* Options (for select/checkbox) */}
                    {hasOptions && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                Options
                            </label>
                            <div className="space-y-2">
                                {(question.options || []).map((option, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <span className="text-gray-500 text-sm w-6">{index + 1}.</span>
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => updateOption(index, e.target.value)}
                                            placeholder={`Option ${index + 1}`}
                                            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                        <button
                                            onClick={() => removeOption(index)}
                                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={addOption}
                                    className="flex items-center gap-2 px-3 py-2 text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <Plus size={16} />
                                    <span>Add Option</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Preview Component
interface FormPreviewProps {
    questions: Question[];
    includeFields: IncludeFields;
}

function FormPreview({ questions, includeFields }: FormPreviewProps) {
    const renderField = (question: Question) => {
        const baseInputClass = "w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors";
        
        switch (question.field_type) {
            case 'text':
            case 'email':
            case 'phone':
                return (
                    <input
                        type={question.field_type === 'phone' ? 'tel' : question.field_type}
                        placeholder={question.placeholder || ''}
                        className={baseInputClass}
                        disabled
                    />
                );
            case 'textarea':
                return (
                    <textarea
                        placeholder={question.placeholder || ''}
                        rows={3}
                        className={`${baseInputClass} resize-none`}
                        disabled
                    />
                );
            case 'select':
                return (
                    <select className={baseInputClass} disabled>
                        <option value="">{question.placeholder || 'Select an option'}</option>
                        {(question.options || []).map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            case 'checkbox':
                return (
                    <div className="space-y-2">
                        {(question.options || []).map((opt, i) => (
                            <label key={i} className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                                    disabled
                                />
                                <span className="text-gray-700">{opt}</span>
                            </label>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <div className="text-center pb-4 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Form Preview</h3>
                <p className="text-sm text-gray-500 mt-1">This is how your form will appear to students</p>
            </div>

            {/* Standard Fields Preview */}
            {Object.entries(includeFields).some(([, v]) => v) && (
                <div className="space-y-4 pb-4 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Standard Fields</h4>
                    {includeFields.food_preference && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Food Preference
                            </label>
                            <select className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900" disabled>
                                <option>Veg</option>
                                <option>Non-Veg</option>
                            </select>
                        </div>
                    )}
                    {includeFields.t_shirt_size && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                T-Shirt Size
                            </label>
                            <select className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900" disabled>
                                <option>XS</option>
                                <option>S</option>
                                <option>M</option>
                                <option>L</option>
                                <option>XL</option>
                                <option>XXL</option>
                            </select>
                        </div>
                    )}
                    {includeFields.section && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Section
                            </label>
                            <input type="text" placeholder="e.g. A" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5" disabled />
                        </div>
                    )}
                    {includeFields.roll_number && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Roll Number
                            </label>
                            <input type="text" placeholder="e.g. 42" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5" disabled />
                        </div>
                    )}
                    {includeFields.college_id && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                College ID
                            </label>
                            <input type="text" placeholder="e.g. SCET2023CS001" className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5" disabled />
                        </div>
                    )}
                </div>
            )}

            {/* Custom Questions Preview */}
            {questions.length > 0 ? (
                <div className="space-y-5">
                    {questions
                        .sort((a, b) => a.order - b.order)
                        .map((q) => (
                            <div key={q.id}>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    {q.question || 'Untitled Question'}
                                    {q.required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                {q.help_text && (
                                    <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                                        <HelpCircle size={12} />
                                        {q.help_text}
                                    </p>
                                )}
                                {renderField(q)}
                            </div>
                        ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-400">
                    <AlignLeft size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No custom questions added yet</p>
                </div>
            )}
        </div>
    );
}

// Main Component
export default function EventFormBuilder({
    eventId,
    initialData,
    collectionId = 'event_form_templates',
    onSave,
}: EventFormBuilderProps) {
    // State
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [questions, setQuestions] = useState<Question[]>(initialData?.questions || []);
    const [includeFields, setIncludeFields] = useState<IncludeFields>(
        initialData?.include_fields || DEFAULT_INCLUDE_FIELDS
    );
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Handlers
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setQuestions((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);
                return newItems.map((item, index) => ({ ...item, order: index }));
            });
        }
    }, []);

    const addQuestion = useCallback(() => {
        const newQuestion: Question = {
            id: uuidv4(),
            question: '',
            field_type: 'text',
            required: false,
            options: [],
            placeholder: '',
            help_text: '',
            order: questions.length,
        };
        setQuestions([...questions, newQuestion]);
        setExpandedId(newQuestion.id);
    }, [questions]);

    const updateQuestion = useCallback((id: string, updates: Partial<Question>) => {
        setQuestions((prev) =>
            prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
        );
    }, []);

    const deleteQuestion = useCallback((id: string) => {
        setQuestions((prev) =>
            prev
                .filter((q) => q.id !== id)
                .map((q, index) => ({ ...q, order: index }))
        );
        if (expandedId === id) {
            setExpandedId(null);
        }
    }, [expandedId]);

    const duplicateQuestion = useCallback((id: string) => {
        const questionToDuplicate = questions.find((q) => q.id === id);
        if (questionToDuplicate) {
            const newQuestion: Question = {
                ...questionToDuplicate,
                id: uuidv4(),
                question: `${questionToDuplicate.question} (Copy)`,
                order: questions.length,
            };
            setQuestions([...questions, newQuestion]);
            setExpandedId(newQuestion.id);
        }
    }, [questions]);

    const toggleIncludeField = useCallback((key: keyof IncludeFields) => {
        setIncludeFields((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    }, []);

    const validateForm = (): boolean => {
        // Validate that all questions have text
        for (const q of questions) {
            if (!q.question.trim()) {
                setError('All questions must have question text');
                return false;
            }
            // Validate options for select/checkbox
            if ((q.field_type === 'select' || q.field_type === 'checkbox') &&
                (!q.options || q.options.length === 0 || q.options.some(o => !o.trim()))) {
                setError(`Question "${q.question}" needs at least one valid option`);
                return false;
            }
        }
        return true;
    };

    const handleSave = async () => {
        setError(null);
        setSuccess(false);

        if (!validateForm()) {
            return;
        }

        setSaving(true);

        try {
            const formTemplate: FormTemplate = {
                event_id: eventId,
                title,
                description,
                questions: questions.map((q, index) => ({ ...q, order: index })),
                include_fields: includeFields,
            };

            // Save to Appwrite
            if (initialData) {
                // Update existing - we'd need the document ID
                // For now, we'll create a new one (in real app, you'd track the doc ID)
                await databases.createDocument(
                    DATABASE_ID,
                    collectionId,
                    ID.unique(),
                    {
                        event_id: formTemplate.event_id,
                        title: formTemplate.title,
                        description: formTemplate.description,
                        questions: JSON.stringify(formTemplate.questions),
                        include_fields: JSON.stringify(formTemplate.include_fields),
                    }
                );
            } else {
                await databases.createDocument(
                    DATABASE_ID,
                    collectionId,
                    ID.unique(),
                    {
                        event_id: formTemplate.event_id,
                        title: formTemplate.title,
                        description: formTemplate.description,
                        questions: JSON.stringify(formTemplate.questions),
                        include_fields: JSON.stringify(formTemplate.include_fields),
                    }
                );
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            
            if (onSave) {
                onSave(formTemplate);
            }
        } catch (err) {
            console.error('Failed to save form template:', err);
            setError(err instanceof Error ? err.message : 'Failed to save form template');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900">
            {/* Header */}
            <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-white">Form Builder</h1>
                            <p className="text-sm text-gray-400 mt-0.5">
                                Create custom registration questions for your event
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                                    showPreview
                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
                                <span className="hidden sm:inline">{showPreview ? 'Hide Preview' : 'Preview'}</span>
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Save size={18} />
                                )}
                                <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save Form'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success/Error Messages */}
            {(error || success) && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                    {error && (
                        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 flex items-center gap-2">
                            <X size={18} />
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400">
                            ✓ Form template saved successfully!
                        </div>
                    )}
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
                    {/* Builder Panel */}
                    <div className="space-y-6">
                        {/* Form Meta */}
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
                            <h2 className="text-lg font-semibold text-white">Form Details</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Form Title
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Workshop Registration"
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                                    Description
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief description of the form"
                                    rows={2}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                                />
                            </div>
                        </div>

                        {/* Standard Fields */}
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
                            <h2 className="text-lg font-semibold text-white">Standard Fields</h2>
                            <p className="text-sm text-gray-400">
                                Include these pre-defined fields in your registration form
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {STANDARD_FIELDS.map((field) => (
                                    <label
                                        key={field.key}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                            includeFields[field.key]
                                                ? 'border-blue-500 bg-blue-500/10'
                                                : 'border-gray-600 bg-gray-900 hover:border-gray-500'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={includeFields[field.key]}
                                            onChange={() => toggleIncludeField(field.key)}
                                            className="w-4 h-4 text-blue-500 rounded border-gray-500 bg-gray-800 focus:ring-blue-500"
                                        />
                                        <span className={`text-sm ${includeFields[field.key] ? 'text-blue-400' : 'text-gray-300'}`}>
                                            {field.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Custom Questions */}
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-white">Custom Questions</h2>
                                <span className="text-sm text-gray-400">
                                    {questions.length} question{questions.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {questions.length > 0 ? (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={questions.map((q) => q.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-3">
                                            {questions
                                                .sort((a, b) => a.order - b.order)
                                                .map((question) => (
                                                    <SortableQuestionCard
                                                        key={question.id}
                                                        question={question}
                                                        isExpanded={expandedId === question.id}
                                                        onToggleExpand={() =>
                                                            setExpandedId(
                                                                expandedId === question.id ? null : question.id
                                                            )
                                                        }
                                                        onUpdate={(updates) =>
                                                            updateQuestion(question.id, updates)
                                                        }
                                                        onDelete={() => deleteQuestion(question.id)}
                                                        onDuplicate={() => duplicateQuestion(question.id)}
                                                    />
                                                ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            ) : (
                                <div className="text-center py-8 border-2 border-dashed border-gray-600 rounded-lg">
                                    <AlignLeft size={32} className="mx-auto mb-2 text-gray-500" />
                                    <p className="text-gray-400">No custom questions yet</p>
                                    <p className="text-sm text-gray-500">Click the button below to add your first question</p>
                                </div>
                            )}

                            <button
                                onClick={addQuestion}
                                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:border-blue-500 hover:text-blue-400 transition-colors"
                            >
                                <Plus size={20} />
                                <span>Add Question</span>
                            </button>
                        </div>
                    </div>

                    {/* Preview Panel */}
                    {showPreview && (
                        <div className="lg:sticky lg:top-24 lg:h-fit">
                            <FormPreview questions={questions} includeFields={includeFields} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
