import React from 'react';
import { useCountdown } from '../hooks/useCountdown';
import { formatDateRO } from '../utils/dates';

const NextWebinarCard = React.memo(({ date, mentorsPair }) => {
  const { days, hrs, mins, secs, isExpired } = useCountdown(date.getTime());

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-md p-6 mb-6 max-w-md mx-auto sm:mx-0 transition-transform hover:scale-105">
      <h2 className="text-xl font-semibold text-gray-200 mb-3">Următorul Webinar</h2>
      <p className="text-lg text-gray-400 mb-2">
        <strong>
          <time dateTime={date.toISOString()}>{formatDateRO(date)}</time>
        </strong>
      </p>
      <p className="text-gray-400 mb-3">{mentorsPair}</p>
      <p className="text-gray-300" aria-live="polite">
        {!isExpired ? (
          <span className="font-medium text-blue-400">
            Începe în: {days}z {hrs}h {mins}m {secs}s
          </span>
        ) : (
          <span className="text-red-400">În desfășurare sau încheiat.</span>
        )}
      </p>
    </div>
  );
});

export default NextWebinarCard;