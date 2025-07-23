import React, { useMemo } from 'react';
import { mentors, rotation } from '../data/mentors';
import { formatDateRO, isSameDay } from '../utils/dates';

const ScheduleList = React.memo(({ dates }) => {
  const today = useMemo(() => new Date(), []);
  const rotationLength = rotation.length;

  return (
    <ul className="space-y-3">
      {dates.map((date, i) => {
        const cycleIndex = i % rotationLength;
        const [m1, m2] = rotation[cycleIndex] || [];
        const label = m1 && m2 && mentors[m1] && mentors[m2]
          ? `${mentors[m1]} & ${mentors[m2]}`
          : 'Mentori indisponibili';
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
});

export default ScheduleList;