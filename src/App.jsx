import React, { useMemo, useEffect, useState, useRef } from 'react';
import { db } from './firebase';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { mentors, rotation } from './data/mentors';
import { getNextTuesday, getConsecutiveTuesdays } from './utils/dates';
import NextWebinarCard from './components/NextWebinarCard';
import ScheduleList from './components/ScheduleList';

// Construiește Date cu ora 20:00 (local)
function getDateWithEightPM(dateStr) {
  // dateStr = "YYYY-MM-DD"
  return new Date(dateStr + "T20:00:00");
}

// Populează doar dacă baza e goală, și scrie ORA 20:00 la fiecare webinar!
async function populateMissingTuesdaysIfEmpty(db, dates, rotation, mentors) {
  const col = collection(db, 'webinarii');
  const snapshot = await getDocs(col);
  if (!snapshot.empty) return false; // STOP dacă există deja date!

  for (let i = 0; i < dates.length; i++) {
    // Atenție: aici dateStr nu are oră!
    const dateStr = dates[i].toISOString().split('T')[0];
    const rotaIndex = i % rotation.length;
    const [m1, m2] = rotation[rotaIndex];
    const mentorsPair =
      (mentors[m1] && mentors[m2])
        ? `${mentors[m1]} & ${mentors[m2]}`
        : "Mentori indisponibili";

    const docRef = doc(db, 'webinarii', dateStr);
    // Construim Date cu ora 20:00
    const dateAtEight = getDateWithEightPM(dateStr);

    // SCRIEM ÎN DB CA ISO complet cu ora!
    await setDoc(docRef, {
      date: dateAtEight.toISOString(),
      mentori: mentorsPair,
    }, { merge: true });
  }
  return true;
}

export default function App() {
  const today = new Date();
  const firstTuesday = getNextTuesday(today, false);

  const futureDates = useMemo(() => {
    const allTuesdays = getConsecutiveTuesdays(firstTuesday, 100);
    return allTuesdays.filter(date => date >= today).slice(0, 10);
  }, [today, firstTuesday]);

  const [webinarData, setWebinarData] = useState([]);
  const [loading, setLoading] = useState(true);
  const populatedOnce = useRef(false);

  useEffect(() => {
    // NUMAI la prima montare!
    if (populatedOnce.current) return;
    populatedOnce.current = true;

    const init = async () => {
      setLoading(true);
      await populateMissingTuesdaysIfEmpty(db, futureDates, rotation, mentors);

      // La CITIRE, avem deja ora 20:00 la fiecare date!
      const querySnapshot = await getDocs(collection(db, 'webinarii'));
      const data = querySnapshot.docs
        .map(docu => ({
          id: docu.id,
          ...docu.data(),
          // Citim ca Date cu ora corectă
          date: docu.data().date ? new Date(docu.data().date) : null
        }))
        .filter(item =>
          futureDates.some(date =>
            date.toISOString().split('T')[0] === item.id
          )
        );
      setWebinarData(data);
      setLoading(false);
    };
    init();
  }, [db, futureDates, rotation, mentors]);

  const nextWebinar = useMemo(() => {
    const now = new Date();
    const sorted = webinarData
      .filter(item => item.date)
      .sort((a, b) => a.date - b.date);
    const closest = sorted.find(item => item.date >= now);

    if (closest) {
      return {
        date: closest.date,
        mentorsPair: closest.mentori,
        webinarId: closest.id,
      };
    }
    // fallback
    const nextIndex = futureDates.findIndex(d => d >= now);
    const fallbackIndex = nextIndex === -1 ? futureDates.length - 1 : nextIndex;
    const [m1, m2] = rotation[fallbackIndex % rotation.length] || [];
    const label = m1 && m2 && mentors[m1] && mentors[m2]
      ? `${mentors[m1]} & ${mentors[m2]}`
      : 'Mentori indisponibili';
    return {
      date: futureDates[fallbackIndex],
      mentorsPair: label,
      webinarId: futureDates[fallbackIndex].toISOString().split('T')[0],
    };
  }, [webinarData, futureDates]);

  return (
    <main className="min-h-screen w-full bg-gray-900 flex flex-col items-center justify-start p-6 sm:p-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-200 mb-6 flex items-center gap-2">
        <span role="img" aria-label="calendar">📅</span> Program Webinarii ProFX
      </h1>
      {loading ? (
        <p className="text-gray-300">Se încarcă datele...</p>
      ) : nextWebinar.date ? (
        <div className="flex justify-center w-full">
          <NextWebinarCard
            date={nextWebinar.date}
            mentorsPair={nextWebinar.mentorsPair}
            webinarId={nextWebinar.webinarId}
            afterSaveReload={async () => {
              setLoading(true);
              const querySnapshot = await getDocs(collection(db, 'webinarii'));
              const data = querySnapshot.docs
                .map(docu => ({
                  id: docu.id,
                  ...docu.data(),
                  date: docu.data().date ? new Date(docu.data().date) : null
                }))
                .filter(item =>
                  futureDates.some(date =>
                    date.toISOString().split('T')[0] === item.id
                  )
                );
              setWebinarData(data);
              setLoading(false);
            }}
          />
        </div>
      ) : (
        <p className="text-lg text-gray-400">Nu există webinarii programate.</p>
      )}
      <h2 className="text-2xl font-semibold text-gray-300 mt-8 mb-4 text-center">Toată rotația / programul</h2>
      <ScheduleList
        dates={futureDates}
        webinarData={webinarData}
      />
    </main>
  );
}
