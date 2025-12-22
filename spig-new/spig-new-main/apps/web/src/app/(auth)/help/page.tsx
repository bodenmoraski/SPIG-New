'use client';

import Link from 'next/link';

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-4xl font-bold text-text">Help & Documentation</h1>
        <p className="text-lg text-text-muted">
          Learn how to use SPIG for peer-assessment grading
        </p>
      </div>

      {/* Table of Contents */}
      <div className="card bg-background border-2 border-border-subtle">
        <h2 className="text-lg font-semibold mb-4 text-text">Contents</h2>
        <nav className="space-y-2">
          <a href="#overview" className="block text-sm text-text-muted hover:text-accent transition-colors">
            1. Overview
          </a>
          <a href="#for-teachers" className="block text-sm text-text-muted hover:text-accent transition-colors">
            2. For Teachers
          </a>
          <a href="#for-students" className="block text-sm text-text-muted hover:text-accent transition-colors">
            3. For Students
          </a>
          <a href="#workflow" className="block text-sm text-text-muted hover:text-accent transition-colors">
            4. Grading Workflow
          </a>
        </nav>
      </div>

      {/* Overview */}
      <section id="overview" className="space-y-4">
        <h2 className="text-2xl font-semibold text-text">Overview</h2>
        <div className="card space-y-4">
          <p className="text-text leading-relaxed">
            SPIG (Student Peer Interactive Grading) is a platform designed for peer-assessment grading in computer science courses. 
            It facilitates collaborative learning through structured peer review and group consensus grading.
          </p>
          <p className="text-text leading-relaxed">
            The platform guides students through multiple phases: writing code submissions, individually grading peers, 
            and reaching group consensus on grades. This process helps students learn from reviewing others' work while 
            receiving diverse feedback on their own submissions.
          </p>
        </div>
      </section>

      {/* For Teachers */}
      <section id="for-teachers" className="space-y-4">
        <h2 className="text-2xl font-semibold text-text">For Teachers</h2>
        
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-text mb-3">Creating Courses</h3>
            <p className="text-text-muted mb-4">
              Start by creating a course from your dashboard. Courses organize your sections, rubrics, and assignments.
            </p>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-text mb-3">Setting Up Rubrics</h3>
            <p className="text-text-muted mb-3">
              Create rubrics with criteria that define how submissions will be graded. Each criterion can have:
            </p>
            <ul className="list-disc list-inside space-y-1 text-text-muted ml-4">
              <li>Positive points for meeting requirements</li>
              <li>Negative points (deductions) for errors or missing elements</li>
              <li>Optional descriptions to clarify expectations</li>
            </ul>
            <p className="text-text-muted mt-4">
              Edit rubrics anytime by clicking on them from your course page.
            </p>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-text mb-3">Creating Assignments</h3>
            <p className="text-text-muted mb-3">
              Create assignments and optionally:
            </p>
            <ul className="list-disc list-inside space-y-1 text-text-muted ml-4">
              <li>Attach a rubric for grading</li>
              <li>Upload a PDF with instructions</li>
            </ul>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-text mb-3">Managing Sections</h3>
            <p className="text-text-muted mb-3">
              Create sections within your courses and:
            </p>
            <ul className="list-disc list-inside space-y-1 text-text-muted ml-4">
              <li>Generate an invite link for students to join</li>
              <li>Activate or deactivate the join link as needed</li>
              <li>Assign an assignment to the section</li>
              <li>Control the activity flow through status buttons</li>
            </ul>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-text mb-3">Running Activities</h3>
            <p className="text-text-muted mb-3">
              The activity flows through these stages:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-text-muted ml-4">
              <li><strong className="text-text">Waiting:</strong> Section is ready, waiting to start</li>
              <li><strong className="text-text">Writing:</strong> Students are writing and submitting code</li>
              <li><strong className="text-text">Grading Individually:</strong> Students grade peers one-on-one</li>
              <li><strong className="text-text">Grading in Groups:</strong> Small groups reach consensus on grades</li>
              <li><strong className="text-text">Viewing Results:</strong> Students see their calculated grades</li>
            </ol>
            <p className="text-text-muted mt-4">
              Use the "Next Activity" button to progress through stages, and "End Activity" to reset.
            </p>
          </div>
        </div>
      </section>

      {/* For Students */}
      <section id="for-students" className="space-y-4">
        <h2 className="text-2xl font-semibold text-text">For Students</h2>
        
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-text mb-3">Joining a Section</h3>
            <p className="text-text-muted">
              Get the invite link from your teacher and visit it to join their section. Once joined, 
              you'll see the section in "My Sections" when activities are active.
            </p>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-text mb-3">Writing Phase</h3>
            <p className="text-text-muted mb-3">
              When your teacher starts an activity:
            </p>
            <ul className="list-disc list-inside space-y-1 text-text-muted ml-4">
              <li>View assignment instructions (PDF if provided)</li>
              <li>Write your code in the Monaco editor</li>
              <li>Submit when ready (you cannot edit after submitting)</li>
            </ul>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-text mb-3">Individual Grading</h3>
            <p className="text-text-muted mb-3">
              You'll be shown peer submissions one at a time:
            </p>
            <ul className="list-disc list-inside space-y-1 text-text-muted ml-4">
              <li>Review the code in the right panel</li>
              <li>Use the rubric on the left to check off criteria</li>
              <li>See your running point total as you select criteria</li>
              <li>Submit and move to the next submission</li>
            </ul>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-text mb-3">Group Grading</h3>
            <p className="text-text-muted mb-3">
              You'll work in a small group to reach consensus:
            </p>
            <ul className="list-disc list-inside space-y-1 text-text-muted ml-4">
              <li>See who else is in your group</li>
              <li>Changes to the rubric are synced in real-time with group members</li>
              <li>When everyone agrees, click "Lock in score"</li>
              <li>Once all group members lock in, the score is finalized</li>
            </ul>
            <p className="text-text-muted mt-3">
              Note: If anyone changes the rubric selections, all signatures are cleared and everyone must agree again.
            </p>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-text mb-3">Viewing Results</h3>
            <p className="text-text-muted">
              After grading is complete, you'll see your calculated grades including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-text-muted ml-4 mt-3">
              <li>Teacher-only score</li>
              <li>Peer average (individual grading scores)</li>
              <li>Group average (group consensus scores)</li>
              <li>Weighted average (combination of all three)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="space-y-4">
        <h2 className="text-2xl font-semibold text-text">Grading Workflow</h2>
        <div className="card">
          <p className="text-text-muted mb-4">
            The SPIG grading process follows this structured workflow:
          </p>
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-sm font-semibold text-accent">1</span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-text mb-1">Submission</h4>
                <p className="text-sm text-text-muted">
                  Students write and submit their code solutions during the writing phase.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-sm font-semibold text-accent">2</span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-text mb-1">Individual Review</h4>
                <p className="text-sm text-text-muted">
                  Each student grades multiple peer submissions individually using the rubric criteria.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-sm font-semibold text-accent">3</span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-text mb-1">Group Consensus</h4>
                <p className="text-sm text-text-muted">
                  Small groups collaborate to reach agreement on grades, with real-time synchronization of rubric selections.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-sm font-semibold text-accent">4</span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-text mb-1">Final Grades</h4>
                <p className="text-sm text-text-muted">
                  Grades are calculated using a weighted combination of teacher scores, individual peer scores, and group consensus scores.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="pt-8 border-t border-border-subtle">
        <p className="text-sm text-text-muted text-center">
          Need more help? <Link href="/about" className="text-accent hover:text-accent-hover transition-colors">Contact us</Link>
        </p>
      </div>
    </div>
  );
}

