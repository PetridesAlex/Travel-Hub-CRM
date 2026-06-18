import { Plus, Trash2 } from 'lucide-react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import QuestionEditor from './QuestionEditor'
import { QUESTION_TYPES } from '../../constants/formFields'

export default function FormBuilderCanvas({
  sections,
  questions,
  onSectionsChange,
  onQuestionsChange,
  onAddSection,
  onAddQuestion,
}) {
  const sectionQuestions = (sectionId) =>
    questions.filter((q) => q.section_id === sectionId).sort((a, b) => a.sort_order - b.sort_order)

  const unsectioned = questions.filter((q) => !q.section_id).sort((a, b) => a.sort_order - b.sort_order)

  const moveQuestion = (qId, direction) => {
    const list = [...questions].sort((a, b) => a.sort_order - b.sort_order)
    const idx = list.findIndex((q) => q.id === qId)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= list.length) return
    const next = [...list]
    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
    onQuestionsChange(next.map((q, i) => ({ ...q, sort_order: i })))
  }

  const renderQuestionList = (list) =>
    list.map((q, i) => (
      <QuestionEditor
        key={q.id}
        question={q}
        canMoveUp={i > 0}
        canMoveDown={i < list.length - 1}
        onMoveUp={() => moveQuestion(q.id, -1)}
        onMoveDown={() => moveQuestion(q.id, 1)}
        onChange={(updated) => onQuestionsChange(questions.map((item) => (item.id === q.id ? updated : item)))}
        onDelete={() => onQuestionsChange(questions.filter((item) => item.id !== q.id))}
      />
    ))

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.id} className="rounded-2xl border border-slate-200/60 bg-slate-50/50 p-4">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex-1 space-y-2">
              <Input
                label="Section title"
                value={section.title}
                onChange={(e) =>
                  onSectionsChange(sections.map((s) => (s.id === section.id ? { ...s, title: e.target.value } : s)))
                }
              />
              <Input
                label="Section description"
                value={section.description || ''}
                onChange={(e) =>
                  onSectionsChange(sections.map((s) => (s.id === section.id ? { ...s, description: e.target.value } : s)))
                }
              />
            </div>
            <button
              type="button"
              onClick={() => onSectionsChange(sections.filter((s) => s.id !== section.id))}
              className="rounded-lg p-2 text-rose-400 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">{renderQuestionList(sectionQuestions(section.id))}</div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => onAddQuestion(section.id)}
          >
            <Plus className="h-4 w-4" /> Add question
          </Button>
        </div>
      ))}

      {unsectioned.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-600">Questions</h3>
          {renderQuestionList(unsectioned)}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={onAddSection}>
          <Plus className="h-4 w-4" /> Add section
        </Button>
        <Button type="button" variant="secondary" onClick={() => onAddQuestion(null)}>
          <Plus className="h-4 w-4" /> Add question
        </Button>
      </div>

      <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Quick add</p>
        <div className="flex flex-wrap gap-2">
          {QUESTION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onAddQuestion(null, t.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-200 hover:text-teal-700"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
