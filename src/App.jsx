import React, { useMemo } from 'react';
import { mentors, rotation } from './data/mentors';
import { getNextTuesday, getConsecutiveTuesdays } from './utils/dates';
import NextWebinarCard from './components/NextWebinarCard';
import ScheduleList from './components/ScheduleList';

export default function App() {
  const today = new Date();
  const firstTuesday = getNextTuesday(today, false); // Prima marți viitoare, excluzând azi dacă a trecut 23:59

  // Generează 10 webinarii viitoare
  const futureDates = useMemo(() => {
    const allTuesdays = getConsecutiveTuesdays(firstTuesday, 100); // Generează mai multe pentru a acoperi viitorul
    return allTuesdays.filter((date) => date >= today).slice(0, 10); // Ia doar următoarele 10 date viitoare
  }, [today, firstTuesday]);

  // Calculează perechile de mentori ciclic
  const getMentorPair = (index) => {
    const rotationLength = rotation.length;
    const cycleIndex = index % rotationLength;
    const [m1, m2] = rotation[cycleIndex] || [];
    return m1 && m2 && mentors[m1] && mentors[m2]
      ? `${mentors[m1]} & ${mentors[m2]}`
      : 'Mentori indisponibili';
  };

  const nextWebinar = useMemo(() => {
    const now = new Date();
    const nextIndex = futureDates.findIndex((d) => d >= now);
    const fallbackIndex = nextIndex === -1 ? futureDates.length - 1 : nextIndex;
    const label = getMentorPair(fallbackIndex);
    return { date: futureDates[fallbackIndex], mentorsPair: label };
  }, [futureDates]);

  return (
    <main className="min-h-screen w-full bg-gray-900 flex flex-col items-center justify-start p-6 sm:p-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-200 mb-6 flex items-center gap-2">
        <span>📅</span> Program Mentori ProFX
      </h1>
      {nextWebinar.date ? (
        <div className="flex justify-center w-full">
          <NextWebinarCard date={nextWebinar.date} mentorsPair={nextWebinar.mentorsPair} />
        </div>
      ) : (
        <p className="text-lg text-gray-400">Nu există webinarii programate.</p>
      )}
      <h2 className="text-2xl font-semibold text-gray-300 mt-8 mb-4 text-center">Toată rotația</h2>
      <ScheduleList dates={futureDates} />
    </main>
  );
}