import { useEffect, useState } from "react";

const calc = (target) => {
  const diff = Math.max(0, new Date(target).getTime() - Date.now());
  return {
    done: diff === 0,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
};

const Countdown = ({ target }) => {
  const [t, setT] = useState(() => calc(target));

  useEffect(() => {
    const id = setInterval(() => setT(calc(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (t.done) return <p className="countdown__done">It’s happening — see you there.</p>;

  const parts = [
    ["Days", t.days],
    ["Hours", t.hours],
    ["Mins", t.minutes],
    ["Secs", t.seconds],
  ];

  return (
    <div className="countdown" role="timer" aria-label="Time until the event">
      {parts.map(([label, value]) => (
        <div className="countdown__cell" key={label}>
          <span className="countdown__num">{String(value).padStart(2, "0")}</span>
          <span className="countdown__label">{label}</span>
        </div>
      ))}
    </div>
  );
};

export default Countdown;
