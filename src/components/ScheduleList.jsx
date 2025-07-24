import React, { useMemo } from 'react';
import { mentors, rotation } from '../data/mentors';
import { formatDateRO, isSameDay } from '../utils/dates';

// Scoatem React.memo temporar să fie sigur rerender-ul la schimbare
function ScheduleList({ dates, webinarData = [] }) {
  const today = useMemo(() => new Date(), []);
  const rotationLength = rotation.length;

  // Funcția care decide ce label afișează pentru o dată: din DB dacă există, altfel fallback
  const getMentorsLabel = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const doc = webinarData.find(d => d.date === dateStr);
    if (doc && doc.mentori) {
      return doc.mentori;
    }

    // fallback după rotație
    const i = dates.findIndex(d => d.toISOString().split('T')[0] === dateStr);
    const [m1, m2] = rotation[i % rotationLength] || [];
    return (mentors[m1] && mentors[m2]) ? `${mentors[m1]} & ${mentors[m2]}` : 'Mentori indisponibili';
  };

  return (
    <ul className="space-y-3">
      {dates.map((date, i) => {
        const label = getMentorsLabel(date);
        const isToday = isSameDay(date, today);

        return (
          <li
            key={i}
            className={`p-4 border border-gray-700 rounded-md ${
              isToday ? 'bg-green-900 border-green-600' : 'bg-gray-800'
            } transition-colors hover:bg-gray-700`}
          >
            <strong>
              <time dateTime={date.toISOString()} className="text-gray-200">
                {formatDateRO(date)}
              </time>
            </strong>
            <span className="text-gray-400"> – {label}</span>
            {isToday && (
              <span className="ml-2 text-green-400 font-medium"> (AZI!) 🎯</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default ScheduleList;
