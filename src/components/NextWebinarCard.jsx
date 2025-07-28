/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useCountdown } from '../hooks/useCountdown';
import { formatDateRO } from '../utils/dates';
import { db } from '../firebase';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { mentors } from '../data/mentors';

// Construiește Date cu ora 20:00 pentru un string "YYYY-MM-DD"
function getDateWithEightPM(dateStr) {
  return new Date(dateStr + "T20:00:00");
}

const MAX_CHANGES = 2;

const NextWebinarCard = ({ date, mentorsPair, webinarId, afterSaveReload }) => {
  const { days, hrs, mins, secs, isExpired } = useCountdown(date.getTime());
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMentor1, setSelectedMentor1] = useState('');
  const [selectedMentor2, setSelectedMentor2] = useState('');
  const [saving, setSaving] = useState(false);

  // Pentru afișarea schimbărilor rămase
  const [currentChangeCount, setCurrentChangeCount] = useState(0);

  // Citește change_count curent la mount și când mentors se schimbă
  useEffect(() => {
    async function fetchCount() {
      const webinarRef = doc(db, 'webinarii', webinarId);
      const snap = await getDoc(webinarRef);
      if (snap.exists() && typeof snap.data().change_count === 'number') {
        setCurrentChangeCount(snap.data().change_count);
      } else {
        setCurrentChangeCount(0);
      }
    }
    fetchCount();
  }, [webinarId, mentorsPair]);

  const handleChangeMentor = async () => {
    if (!selectedMentor1 || !selectedMentor2 || selectedMentor1 === selectedMentor2) {
      alert('Te rog alege doi mentori diferiți!');
      return;
    }
    setSaving(true);

    const webinarRef = doc(db, 'webinarii', webinarId);

    // Recitește change_count înainte de salvare (extra safe la concurență)
    let change_count = 0;
    try {
      const docSnap = await getDoc(webinarRef);
      if (docSnap.exists() && typeof docSnap.data().change_count === 'number') {
        change_count = docSnap.data().change_count;
      }
    } catch (err) {
      // dacă nu există, lăsăm 0 implicit
    }

    if (change_count >= MAX_CHANGES) {
      setSaving(false);
      alert(`Ai ajuns la limita de ${MAX_CHANGES} schimbări de mentori pentru acest webinar!`);
      setIsEditing(false);
      return;
    }

    const newMentorsPair = `${selectedMentor1} & ${selectedMentor2}`;
    const dateAtEight = getDateWithEightPM(webinarId);

    try {
      await setDoc(webinarRef, {
        mentori: newMentorsPair,
        date: dateAtEight.toISOString(),
        change_count: change_count + 1,
      }, { merge: true });
      setIsEditing(false);
      setSaving(false);
      setSelectedMentor1('');
      setSelectedMentor2('');
      setCurrentChangeCount(change_count + 1);
      if (afterSaveReload) {
        await afterSaveReload();
      }
    } catch (error) {
      setSaving(false);
      alert('Eroare la salvare. Încearcă iar.');
    }
  };

  const mentorOptions = Object.values(mentors);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-md p-6 mb-6 max-w-md w-full mx-auto sm:mx-0 transition-transform hover:scale-105">
      <h2 className="text-xl font-semibold text-gray-200 mb-3">Următorul Webinar</h2>
      <p className="text-lg text-gray-400 mb-2">
        <strong>
          <time dateTime={date.toISOString()}>{formatDateRO(date)}</time>
        </strong>
      </p>
      <p className="text-gray-400 mb-1">{mentorsPair}</p>
      <p className="text-sm text-gray-400 mb-2">
        Schimbări rămase: {Math.max(MAX_CHANGES - currentChangeCount, 0)}
      </p>
      <p className="text-gray-300 mb-4" aria-live="polite">
        {!isExpired
          ? <span className="font-medium text-blue-400">
              Începe în: {days}z {hrs}h {mins}m {secs}s
            </span>
          : <span className="text-red-400">În desfășurare sau încheiat.</span>}
      </p>
      <button
        className="mb-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold"
        onClick={() => {
          setIsEditing(!isEditing);
          if (isEditing) {
            setSelectedMentor1('');
            setSelectedMentor2('');
          }
        }}
        disabled={saving}
      >
        {isEditing ? 'Renunță' : 'Schimbă Mentori'}
      </button>
      {isEditing && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch w-full gap-2 mt-2">
          <select
            className="bg-gray-700 text-gray-200 p-2 rounded-md flex-1 min-w-[130px] w-full"
            value={selectedMentor1}
            onChange={e => setSelectedMentor1(e.target.value)}
            disabled={saving}
          >
            <option value="">Alege primul mentor</option>
            {mentorOptions.map(mentor => (
              <option key={mentor} value={mentor}>{mentor}</option>
            ))}
          </select>
          <select
            className="bg-gray-700 text-gray-200 p-2 rounded-md flex-1 min-w-[130px] w-full"
            value={selectedMentor2}
            onChange={e => setSelectedMentor2(e.target.value)}
            disabled={saving}
          >
            <option value="">Alege al doilea mentor</option>
            {mentorOptions.map(mentor => (
              <option key={mentor} value={mentor}>{mentor}</option>
            ))}
          </select>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-semibold min-w-[90px]"
            onClick={handleChangeMentor}
            disabled={saving}
          >
            {saving ? "Se salvează..." : "Confirmă"}
          </button>
        </div>
      )}
    </div>
  );
};

export default NextWebinarCard;
