import React, { useState } from 'react';
import { useCountdown } from '../hooks/useCountdown';
import { formatDateRO } from '../utils/dates';
import { db } from '../firebase';
import { setDoc, doc } from 'firebase/firestore';
import { mentors } from '../data/mentors';

const NextWebinarCard = ({ date, mentorsPair, webinarId, afterSaveReload }) => {
  const { days, hrs, mins, secs, isExpired } = useCountdown(date.getTime());
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMentor1, setSelectedMentor1] = useState('');
  const [selectedMentor2, setSelectedMentor2] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangeMentor = async () => {
    if (!selectedMentor1 || !selectedMentor2 || selectedMentor1 === selectedMentor2) {
      alert('Te rog alege doi mentori diferiți!');
      return;
    }
    setSaving(true);
    const newMentorsPair = `${selectedMentor1} & ${selectedMentor2}`;
    const webinarRef = doc(db, 'webinarii', webinarId);

    try {
      await setDoc(webinarRef, {
        mentori: newMentorsPair,
        date: webinarId,
      }, { merge: true });
      setIsEditing(false);
      setSaving(false);
      setSelectedMentor1('');
      setSelectedMentor2('');
      if (afterSaveReload) {
        await afterSaveReload();
      }
    // eslint-disable-next-line no-unused-vars
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
      <p className="text-gray-400 mb-3">{mentorsPair}</p>
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
