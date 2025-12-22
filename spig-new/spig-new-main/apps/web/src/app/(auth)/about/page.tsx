'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-4xl font-bold text-text">About SPIG</h1>
        <p className="text-lg text-text-muted">
          Student Peer Interactive Grading Platform
        </p>
      </div>

      {/* Story */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-text">Our Story</h2>
        <div className="card space-y-4">
          <p className="text-text leading-relaxed">
            SPIG was created by <strong className="text-text">Boden Moraski</strong>, <strong className="text-text">Lawson Cale</strong>, 
            and <strong className="text-text">Ryan P. Baber</strong>. They met as students and teacher in an AP Computer Science class, 
            where the collaborative peer-assessment process was first developed and refined.
          </p>
          <p className="text-text leading-relaxed">
            The SPIG grading process was designed by <strong className="text-text">Mr. Baber</strong>, drawing on years of teaching 
            experience to create an effective framework for peer learning. <strong className="text-text">Boden</strong> and 
            <strong className="text-text"> Lawson</strong> developed the platform, building the tools needed to make this 
            collaborative grading process practical and engaging for students.
          </p>
          <p className="text-text leading-relaxed">
            SPIG represents a collaborative effort between educators and students to improve how computer science assignments 
            are graded and how students learn from reviewing each other's work.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-text">Mission</h2>
        <div className="card">
          <p className="text-text leading-relaxed">
            SPIG aims to enhance computer science education through structured peer assessment. By having students review 
            and grade each other's code, they gain valuable experience reading code, understanding different approaches to 
            problem-solving, and providing constructive feedback—all while receiving diverse perspectives on their own work.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-text">How It Works</h2>
        <div className="card">
          <p className="text-text-muted mb-4">
            SPIG guides students through a multi-stage peer-assessment process:
          </p>
          <ul className="space-y-2 text-text-muted">
            <li className="flex items-start gap-3">
              <span className="text-accent mt-0.5">•</span>
              <span>Students submit code solutions to programming assignments</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent mt-0.5">•</span>
              <span>Each student grades multiple peer submissions using rubric-based criteria</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent mt-0.5">•</span>
              <span>Small groups collaborate to reach consensus on final grades</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-accent mt-0.5">•</span>
              <span>Final grades combine teacher evaluation, individual peer scores, and group consensus</span>
            </li>
          </ul>
          <p className="text-text-muted mt-6">
            This process helps students develop critical thinking skills, learn from diverse coding styles, 
            and gain confidence in code review—an essential skill for software development.
          </p>
        </div>
      </section>

      {/* Contact & Support */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-text">Contact & Support</h2>
        <div className="card space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-text mb-3">Development Team</h3>
            <div className="space-y-3 text-text-muted">
              <div>
                <p className="font-medium text-text">Boden Moraski</p>
                <a 
                  href="mailto:bodenmoraski@gmail.com" 
                  className="text-accent hover:text-accent-hover transition-colors text-sm"
                >
                  bodenmoraski@gmail.com
                </a>
              </div>
              <div>
                <p className="font-medium text-text">Lawson Cale</p>
                <a 
                  href="mailto:lawson.b.cale@gmail.com" 
                  className="text-accent hover:text-accent-hover transition-colors text-sm"
                >
                  lawson.b.cale@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border-subtle">
            <p className="text-sm text-text-muted">
              Have questions or need help? Feel free to reach out to the development team. 
              For usage instructions, check out our <Link href="/help" className="text-accent hover:text-accent-hover transition-colors">Help & Documentation</Link> page.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

