import React, { useEffect, useRef } from "react";
import { Leader } from "../../firebase";
import "./styles.css";

interface LeaderboardProps {
  open: boolean;
  active: boolean;
  player: Leader;
  leaders: Leader[];
  onClose(): void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  open,
  active,
  player,
  leaders,
  onClose,
}) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const sortedLeaders = leaders.sort((a, b) => b.lines - a.lines).slice(0, 10);

  const getPrize = (i: number) => {
    if (i === 0) {
      return "🥇";
    } else if (i === 1) {
      return "🥈";
    } else if (i === 2) {
      return "🥉";
    } else {
      return "";
    }
  };

  useEffect(() => {
    const handleEscClose = (e: KeyboardEvent) => {
      if (["Escape", "Enter", "Space"].includes(e.code)) onCloseRef.current();
    };

    if (open && active) {
      window.addEventListener("keydown", handleEscClose);
    }

    return () => {
      window.removeEventListener("keydown", handleEscClose);
    };
  }, [open, active]);

  return !open ? null : (
    <div role="button" className="leaderboard" onClick={onClose}>
      <div className="leaderboard-box">
        <h3>Leaderboard</h3>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Lines</th>
            </tr>
          </thead>
          <tbody>
            {sortedLeaders.map((leader, i) => (
              <tr
                key={leader.id}
                className={leader.id === player.id ? "strong" : ""}
              >
                <td>
                  <span>{leader.id === player.id ? "→ " : ""}</span>
                  <span>{i + 1}</span>
                  <span>
                    {getPrize(i) || <span className="invisible">🥉</span>}
                  </span>
                </td>
                <td>{leader.player.slice(0, 20).padEnd(20, ".")}</td>
                <td>{leader.lines}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
