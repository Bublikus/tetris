import React, { FC, useState, useRef, useEffect } from "react";
import { Tetris } from "./Tetris";
import { addPayerToLeaderboard, getLeaderboard, Leader } from "./firebase";
import "./style.css";

const isTouch = "touchstart" in window || navigator.maxTouchPoints;

let isInstance = false;

export const App: FC = () => {
  const tetrisRef = useRef<Tetris>();

  const [loading, setLoading] = useState(true);
  const [gameArea, setGameArea] = useState<string[][]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [isShownLeaderboard, setIsShownLeaderboard] = useState(false);

  const sortedLeaders = leaders.sort((a, b) => b.lines - a.lines).slice(0, 10);

  const restart = () => {
    if (!isInstance) {
      isInstance = true;
      tetrisRef.current = undefined;
      tetrisRef.current = new Tetris({ renderer: setGameArea });
      tetrisRef.current.start();
    }
  };

  useEffect(() => {
    const endGame = async () => {
      setIsShownLeaderboard(true);

      if (tetrisRef.current?.erasedLines) {
        const player = prompt(
          `Lines: ${tetrisRef.current?.erasedLines}\n\nEnter your name: `
        );
        const playerName = player?.trim().slice(0, 50) || "Player";
        await addPayerToLeaderboard(
          playerName,
          tetrisRef.current?.erasedLines || 0
        );
        await getLeaderboard().then(setLeaders);
      }

      isInstance = false;
      tetrisRef.current?.destroy();
    };

    if (tetrisRef.current?.isEndGame) endGame();
  }, [tetrisRef.current?.isEndGame]);

  useEffect(() => {
    if (!loading) restart();
  }, [loading]);

  useEffect(() => {
    getLeaderboard().then(setLeaders);
  }, []);

  useEffect(() => {
    const checkSelectionInterval = setInterval(
      () => window.getSelection()?.removeAllRanges?.(),
      20
    );

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        tetrisRef.current?.pause();
      } else {
        tetrisRef.current?.play();
      }
    });

    const blockGestures = (e: Event) => {
      e.preventDefault();
      (document.body.style as any).zoom = 1;
    };

    document.addEventListener("gesturestart", blockGestures);
    document.addEventListener("gesturechange", blockGestures);
    document.addEventListener("gestureend", blockGestures);

    return () => {
      document.removeEventListener("gesturestart", blockGestures);
      document.removeEventListener("gesturechange", blockGestures);
      document.removeEventListener("gestureend", blockGestures);

      clearInterval(checkSelectionInterval);
    };
  }, []);

  const isFull =
    (tetrisRef.current?.erasedLines || 0) >=
    (tetrisRef.current?.config.height || 0);
  const isFill = (i: number) =>
    i + 1 > gameArea.length - (tetrisRef.current?.erasedLines || 0);

  const emoji = [
    isFull && "😎",
    !isFull && tetrisRef.current?.isEndGame && "🫣",
    "🧐",
  ].find(Boolean);

  return (
    <>
      {loading && <p className="loading">loading...</p>}
      <main className={loading ? "loading" : ""}>
        <img
          className="bg"
          src="https://stackblitz.com/storage/blobs/eyJfcmFpbHMiOnsibWVzc2FnZSI6IkJBaHBBMVFGQ1E9PSIsImV4cCI6bnVsbCwicHVyIjoiYmxvYl9pZCJ9fQ==--4a5575ba353ee148033a35717f39154a2471941f/tetris-bg-5.jpg"
          alt="bg"
          onLoad={() => setLoading(false)}
        />

        <header>
          <h1>Tetris Game</h1>
          <h3>
            Lines: {tetrisRef.current?.erasedLines || 0} {emoji}
          </h3>
        </header>

        {tetrisRef.current && (
          <section className="grid">
            {gameArea.map((row, i) => (
              <div key={i} className={`row ${isFill(i) ? "fill" : ""}`}>
                {row.map((cell, ii) => (
                  <div
                    key={ii}
                    className={`cell ${cell} ${cell ? "shape" : ""}`}
                  />
                ))}
              </div>
            ))}
          </section>
        )}

        {isShownLeaderboard && (
          <div
            role="button"
            className="leaderboard"
            onClick={() => (setIsShownLeaderboard(false), restart())}
          >
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
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{leader.player.slice(0, 20).padEnd(20, ".")}</td>
                      <td>{leader.lines}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <footer>
          {tetrisRef.current?.isEndGame ? (
            <button type="button" className="restart-button" onClick={restart}>
              Restart
            </button>
          ) : (
            <strong className="help">
              <span>{isTouch ? "Swipe" : "Arrows"} &nbsp;</span>
              <div>
                <div>
                  &nbsp;&nbsp;&thinsp;&thinsp;↑ &nbsp;&nbsp;&nbsp;&nbsp; -
                  Rotate
                </div>
                <div>← → &thinsp;&thinsp;- Move</div>
                <div>
                  &nbsp;&nbsp;&thinsp;&thinsp;↓ &nbsp;&nbsp;&nbsp;&nbsp; - Speed
                  up
                </div>
              </div>
            </strong>
          )}
        </footer>
      </main>
    </>
  );
};
