import React, { FC, useState, useRef, useEffect } from "react";
import { Tetris } from "./Tetris";
import "./style.css";

const isTouch = "touchstart" in window || navigator.maxTouchPoints;

let isInstance = false;

export const App: FC = () => {
  const tetrisRef = useRef<Tetris>();

  const [loading, setLoading] = useState(true);
  const [gameArea, setGameArea] = useState<string[][]>([]);

  const restart = () => {
    if (!isInstance) {
      isInstance = true;
      tetrisRef.current = new Tetris({ renderer: setGameArea });
      tetrisRef.current.start();
    }
  };

  useEffect(() => {
    if (tetrisRef.current?.isEndGame) {
      isInstance = false;
      tetrisRef.current?.destroy();
      tetrisRef.current = undefined;
    }
  }, [tetrisRef.current?.isEndGame]);

  useEffect(() => {
    if (!loading) restart();
  }, [loading]);

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
