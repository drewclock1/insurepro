'use client'

import { useState } from 'react'
import { GraduationCap, Play, BookOpen, FileText, CheckCircle, Lock, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const MODULES = [
  {
    id: 'foundations',
    category: '🏗 Foundations',
    modules: [
      { id: 'm1', title: 'Welcome & Platform Overview', duration: '18 min', lessons: 3, status: 'complete', desc: 'Learn the platform, set your goals, and prepare for your first week.' },
      { id: 'm2', title: 'Insurance 101', duration: '42 min', lessons: 5, status: 'complete', desc: 'Types of coverage, terminology, how policies work, and what clients care about.' },
      { id: 'm3', title: 'Your Daily Workbench', duration: '12 min', lessons: 2, status: 'complete', desc: 'How to use the activity tracker, tap buttons, and read your ratios.' },
    ],
  },
  {
    id: 'sales',
    category: '💼 Sales Skills',
    modules: [
      { id: 'm4', title: 'Cold Call Mastery', duration: '55 min', lessons: 6, status: 'in_progress', progress: 60, desc: 'Opening lines, objection handling, and getting past gatekeepers.' },
      { id: 'm5', title: 'Appointment Setting', duration: '38 min', lessons: 4, status: 'not_started', desc: 'How to get them off the phone and onto a scheduled call every time.' },
      { id: 'm6', title: 'Closing Techniques', duration: '45 min', lessons: 5, status: 'not_started', desc: 'Trial closes, assumptive close, handling the final objection.' },
      { id: 'm7', title: 'Overcoming Objections', duration: '30 min', lessons: 4, status: 'not_started', desc: '"I need to think about it", "I can\'t afford it", and 8 more.' },
    ],
  },
  {
    id: 'products',
    category: '📋 Products',
    modules: [
      { id: 'm8', title: 'Life Insurance Products', duration: '50 min', lessons: 6, status: 'in_progress', progress: 40, desc: 'Term, whole life, IUL, final expense — features, benefits, and when to pitch each.' },
      { id: 'm9', title: 'Final Expense Mastery', duration: '35 min', lessons: 4, status: 'not_started', desc: 'The easiest product to sell. Learn the market, the pitch, and the close.' },
      { id: 'm10', title: 'Mortgage Protection', duration: '28 min', lessons: 3, status: 'not_started', desc: 'Why homeowners need it and how to find them.' },
    ],
  },
  {
    id: 'scripts',
    category: '📝 Script Library',
    modules: [
      { id: 'm11', title: 'Opening Scripts', duration: 'Reference', lessons: 8, status: 'complete', isScripts: true, desc: 'Word-for-word openers for cold calls, warm follow-ups, and referrals.' },
      { id: 'm12', title: 'Objection Scripts', duration: 'Reference', lessons: 12, status: 'complete', isScripts: true, desc: 'Every objection with a proven response. Print and keep at your desk.' },
      { id: 'm13', title: 'Voicemail Scripts', duration: 'Reference', lessons: 4, status: 'complete', isScripts: true, desc: 'Voicemails that actually get callbacks.' },
      { id: 'm14', title: 'Text Message Templates', duration: 'Reference', lessons: 6, status: 'complete', isScripts: true, desc: 'AI-ready templates for follow-up, re-engagement, and appointment confirmation.' },
    ],
  },
  {
    id: 'compliance',
    category: '⚖️ Compliance',
    modules: [
      { id: 'm15', title: 'State Licensing Basics', duration: '20 min', lessons: 3, status: 'not_started', desc: 'What you need to know to stay compliant in every state you write.' },
      { id: 'm16', title: 'Do Not Call + TCPA', duration: '15 min', lessons: 2, status: 'not_started', desc: 'Texting and calling rules that protect you and your agency.' },
    ],
  },
]

const SCRIPTS = [
  { title: 'Cold Call Opener', tag: 'Opening', script: `Hi, is this {{first_name}}? Hey {{first_name}}, my name is {{agent_name}}, I'm calling because you recently requested information about life insurance coverage online — do you have just a couple minutes?` },
  { title: 'Warm Follow-Up', tag: 'Opening', script: `Hi {{first_name}}, this is {{agent_name}} following up from our conversation last week. I wanted to circle back and see if you had a chance to think about the coverage options we discussed?` },
  { title: '"I Need to Think About It"', tag: 'Objection', script: `I totally understand, {{first_name}}. Can I ask — what specifically would you need to think about? Is it the price, the coverage amount, or something else? Because if I can answer that right now, would you be ready to move forward?` },
  { title: '"I Can\'t Afford It"', tag: 'Objection', script: `I hear you, {{first_name}}, and that\'s exactly why I\'m calling. Most people are surprised to find out they can get $250,000 in coverage for less than a cup of coffee a day. Can I take 2 minutes to show you what your options look like at different price points?` },
  { title: '"Send Me Information"', tag: 'Objection', script: `Absolutely, I\'d love to do that. To make sure I send you the right information, can I ask — are you more concerned about protecting your family\'s income, or paying for final expenses? That way I\'m not sending you a 20-page packet that doesn\'t apply to your situation.` },
  { title: 'Setting the Appointment', tag: 'Closing', script: `Great, {{first_name}}! Based on everything you\'ve told me, I think I can find you a really solid option. I have time tomorrow at 2pm or Thursday at 10am — which works better for you? It\'ll just be about 15 minutes on the phone.` },
  { title: 'Voicemail Script', tag: 'Voicemail', script: `Hi {{first_name}}, this is {{agent_name}} calling about the life insurance request you submitted. I have some options I think would be a great fit for your family. Give me a call back at {{agent_phone}} — again, that\'s {{agent_phone}}. Talk soon!` },
]

export default function TrainingPage() {
  const [expandedCat, setExpandedCat] = useState<string>('foundations')
  const [activeScript, setActiveScript] = useState<number | null>(null)
  const [scriptFilter, setScriptFilter] = useState('All')
  const [tab, setTab] = useState('Training')

  const completedCount = MODULES.flatMap(c => c.modules).filter(m => m.status === 'complete').length
  const totalCount = MODULES.flatMap(c => c.modules).length
  const pct = Math.round((completedCount / totalCount) * 100)

  const scriptTags = ['All', ...Array.from(new Set(SCRIPTS.map(s => s.tag)))]
  const filteredScripts = scriptFilter === 'All' ? SCRIPTS : SCRIPTS.filter(s => s.tag === scriptFilter)

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap size={22} className="text-indigo-600" />Training Hub
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Level up your skills and close more deals</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {['Training', 'Script Library'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-2 rounded-md text-sm font-medium transition-all',
                tab === t ? 'bg-white text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700')}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Training' && (
        <>
          {/* Progress bar */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-5">
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#4f46e5" strokeWidth="3"
                  strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-indigo-600">{pct}%</span>
            </div>
            <div className="flex-1">
              <p className="text-base font-bold text-gray-900">{completedCount} of {totalCount} modules complete</p>
              <p className="text-sm text-gray-500 mt-0.5">Keep going — your close rate improves with every module you finish</p>
              <div className="flex gap-3 mt-2 text-xs">
                <span className="flex items-center gap-1 text-emerald-600"><CheckCircle size={11} />{completedCount} done</span>
                <span className="flex items-center gap-1 text-indigo-600"><Play size={11} />{MODULES.flatMap(c=>c.modules).filter(m=>m.status==='in_progress').length} in progress</span>
                <span className="flex items-center gap-1 text-gray-400"><Lock size={11} />{MODULES.flatMap(c=>c.modules).filter(m=>m.status==='not_started').length} remaining</span>
              </div>
            </div>
            <button className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2 flex-shrink-0">
              <Play size={13} />Resume Training
            </button>
          </div>

          {/* Module categories */}
          {MODULES.map(cat => (
            <div key={cat.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpandedCat(expandedCat === cat.id ? '' : cat.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <span className="text-sm font-bold text-gray-800">{cat.category}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {cat.modules.filter(m => m.status === 'complete').length}/{cat.modules.length} complete
                  </span>
                  {expandedCat === cat.id ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                </div>
              </button>
              {expandedCat === cat.id && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {cat.modules.map(mod => (
                    <div key={mod.id}
                      className={cn('flex items-start gap-4 px-5 py-4 cursor-pointer transition-colors hover:bg-gray-50',
                        mod.status === 'in_progress' && 'bg-indigo-50/40')}>
                      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5',
                        mod.status === 'complete' ? 'bg-emerald-100' :
                        mod.status === 'in_progress' ? 'bg-indigo-100' : 'bg-gray-100')}>
                        {mod.isScripts
                          ? <FileText size={16} className="text-gray-600" />
                          : mod.status === 'complete'
                          ? <CheckCircle size={16} className="text-emerald-600" />
                          : mod.status === 'in_progress'
                          ? <Play size={16} className="text-indigo-600" />
                          : <Lock size={16} className="text-gray-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-gray-800">{mod.title}</p>
                          {mod.status === 'in_progress' && (
                            <span className="text-xs bg-indigo-100 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">In Progress</span>
                          )}
                          {mod.status === 'complete' && (
                            <span className="text-xs bg-emerald-100 text-emerald-600 font-semibold px-2 py-0.5 rounded-full">✓ Done</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{mod.desc}</p>
                        {'progress' in mod && mod.status === 'in_progress' && (
                          <div className="mt-2 h-1.5 bg-gray-200 rounded-full w-48 overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${mod.progress}%` }} />
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-400">{mod.duration}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{mod.lessons} {mod.isScripts ? 'scripts' : 'lessons'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {tab === 'Script Library' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2">
            {scriptTags.map(tag => (
              <button key={tag} onClick={() => setScriptFilter(tag)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  scriptFilter === tag ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50')}>
                {tag}
              </button>
            ))}
          </div>

          {/* Scripts */}
          <div className="space-y-3">
            {filteredScripts.map((script, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setActiveScript(activeScript === i ? null : i)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors">
                  <div className={cn('px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0',
                    script.tag === 'Opening' ? 'bg-blue-100 text-blue-700' :
                    script.tag === 'Objection' ? 'bg-amber-100 text-amber-700' :
                    script.tag === 'Closing' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-gray-100 text-gray-600')}>
                    {script.tag}
                  </div>
                  <span className="flex-1 text-sm font-semibold text-gray-800">{script.title}</span>
                  {activeScript === i ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                </button>
                {activeScript === i && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4 font-mono">
                      {script.script}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => { navigator.clipboard.writeText(script.script); }}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold hover:bg-indigo-100">
                        📋 Copy Script
                      </button>
                      <p className="text-xs text-gray-400 flex items-center">
                        Replace {'{{agent_name}}'} with your name, {'{{first_name}}'} with lead name
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
