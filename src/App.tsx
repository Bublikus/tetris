import React, { FC, useState, useRef, useEffect } from "react";
import { Tetris } from "./Tetris";
import {
  addPayerToLeaderboard,
  getLeaderboard,
  Leader,
  trackGameFinish,
  trackGameRestart,
  trackSignGameFinish,
} from "./firebase";
import { GameContainer } from "./components/GameContainer";
import { Instructions } from "./components/Instructions";
import { Leaderboard } from "./components/Leaderboard";
import {PlayerModal} from './components/PlayerModal';
import { useRemoveSelection } from "./hooks/useRemoveSelection";
import { useVisibilityChange } from "./hooks/useVisibilityChange";
import { useBlockGestures } from "./hooks/useBlockGestures";
import "./style.css";

const isTouch = "touchstart" in window || !!navigator.maxTouchPoints;

let isInstance = false;

const defaultPlayer: Leader = {
  id: "",
  player: `player_${Math.floor(new Date().getTime() / 1000)}`,
  lines: 0,
  date: new Date().toLocaleString(),
};

export const App: FC = () => {
  const tetrisRef = useRef<Tetris>();
  const isOverlay = useRef(false);

  const [gameArea, setGameArea] = useState<string[][]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [player, setPlayer] = useState<Leader>(defaultPlayer);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [isShownLeaderboard, setIsShownLeaderboard] = useState(false);
  const [isShownInstructions, setIsShownInstructions] = useState(isTouch);

  isOverlay.current =
    isShownLeaderboard || isShownInstructions || showPlayerModal;

  const restart = () => {
    if (!isInstance) {
      isInstance = true;
      tetrisRef.current = undefined;
      tetrisRef.current = new Tetris({ renderer: setGameArea });
      tetrisRef.current.start();
    }
  };

  const handleRestart = () => {
    setIsShownLeaderboard(false);
    setPlayer(defaultPlayer);
    trackGameRestart();
    restart();
    setIsShownInstructions(false);
    tetrisRef.current?.play();
  };

  const onPlayerModalClose = async (playerName: string) => {
    const score = tetrisRef.current?.erasedLines || 0;

    setShowPlayerModal(false);

    if (score && playerName) {
      const playerId = await addPayerToLeaderboard(playerName, score);
      if (playerId) setPlayer((prev) => ({ ...prev, id: playerId }));
      trackSignGameFinish(score, playerName);
      await getLeaderboard().then(setLeaders);
    }
  };

  useEffect(() => {
    const endGame = async () => {
      const score = tetrisRef.current?.erasedLines || 0;
      trackGameFinish(score);
      setIsShownLeaderboard(true);

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (score) setShowPlayerModal(true);
      tetrisRef.current?.destroy();
      isInstance = false;
    };

    if (tetrisRef.current?.isEndGame) endGame();
  }, [tetrisRef.current?.isEndGame]);

  useEffect(() => {
    getLeaderboard().then(setLeaders);
    if (!isShownInstructions) restart();
  }, []);

  useRemoveSelection(!isOverlay.current);
  useVisibilityChange((visible) =>
    visible && !isOverlay.current
      ? tetrisRef.current?.play()
      : tetrisRef.current?.pause()
  );
  useBlockGestures();

  const isFull =
    (tetrisRef.current?.erasedLines || 0) >=
    (tetrisRef.current?.config.height || 0);
  const isFill = (i: number) =>
    i + 1 > gameArea.length - (tetrisRef.current?.erasedLines || 0);

  const emoji = [isFull && "😎"].find(Boolean);

  return (
    <GameContainer>
      <Instructions open={isShownInstructions} onClose={handleRestart} />

      <header>
        <h1>Tetris</h1>
        <h3>
          Lines: 🕹{tetrisRef.current?.erasedLines || 0} {emoji}
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

      <Leaderboard
        open={isShownLeaderboard}
        active={!isShownInstructions && !showPlayerModal}
        player={player}
        leaders={leaders}
        onClose={handleRestart}
      />

      <footer>
        <strong className="help">
          <span>{isTouch ? "Swipe" : "Arrows"} &nbsp;</span>
          <div>
            <div>
              &nbsp;&nbsp;&thinsp;&thinsp;↑ &nbsp;&nbsp;&nbsp;&nbsp; - Rotate
            </div>
            <div>← → &thinsp;&thinsp;- Move</div>
            <div>
              &nbsp;&nbsp;&thinsp;&thinsp;↓ &nbsp;&nbsp;&nbsp;&nbsp; - Speed up
            </div>
          </div>
        </strong>
      </footer>

      <PlayerModal
        open={showPlayerModal}
        score={tetrisRef.current?.erasedLines || 0}
        defaultName={defaultPlayer.player}
        onClose={onPlayerModalClose}
      />
    </GameContainer>
  );
};
