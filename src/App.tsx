import { useMemo, useState } from 'react';
import { VideoPlayer } from './components/VideoPlayer';
import { courses } from './data/mockCourses';
import type { Lecture } from './types';

export default function App() {
  const [courseIndex, setCourseIndex] = useState(0);
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);

  const activeCourse = useMemo(() => courses[courseIndex], [courseIndex]);

  return (
    <div className="app-shell">
      {!activeLecture && (
        <>
          <aside className="sidebar">
            <h2>Al-Hashimi</h2>
            <p>Lightweight by design</p>
            <nav>
              {courses.map((course, index) => (
                <button
                  key={course.id}
                  type="button"
                  className={courseIndex === index ? 'is-active' : ''}
                  onClick={() => setCourseIndex(index)}
                >
                  {course.name}
                </button>
              ))}
            </nav>
          </aside>

          <main className="content">
            <header>
              <h1>{activeCourse.name}</h1>
              <p>No modal playback. Dedicated theater route architecture.</p>
            </header>

            <section className="lecture-grid">
              {activeCourse.lectures.map((lecture) => (
                <article key={lecture.id}>
                  <h3>{lecture.title}</h3>
                  <p>{lecture.duration}</p>
                  <button type="button" onClick={() => setActiveLecture(lecture)}>
                    Watch
                  </button>
                </article>
              ))}
            </section>
          </main>
        </>
      )}

      {activeLecture && <VideoPlayer lecture={activeLecture} onExit={() => setActiveLecture(null)} />}
    </div>
  );
}
