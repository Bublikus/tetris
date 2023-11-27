import { shapes } from './shapes';
import { InputHandler } from './InputHandler';

type Config = {
  renderer: Renderer;
  width?: number;
  height?: number;
  tickMs?: number;
  minTickMs?: number;
  winScore?: number;
  timeToMaxSpeedMs?: number;
};
type Coord = [number, number];
type Cell = [...Coord, string];
type Shape = Cell[];
type Origin = Coord;
type GameArea = string[][];
type Renderer = (area: GameArea) => void;

export class Tetris {
  config: Required<Config> = {
    renderer: (area: GameArea) => null,
    width: 10,
    height: 20,
    tickMs: 500,
    minTickMs: 200,
    winScore: 100,
    timeToMaxSpeedMs: 5 * 60 * 1000,
  };
  private gameArea: GameArea = [];
  private cellsHistory: Record<string, Cell> = {};
  private activeShape: Shape = [];
  private currentShape: Shape = [];
  private prevOrigin: Origin = [0, 0];
  private origin: Origin = [0, 0];
  private tickInterval:  ReturnType<typeof setInterval> | undefined;
  private initialTickMs: number = 0;
  private startedAt: number = 0;
  private pausedAt: number = 0;
  private pausedTime: number = 0;
  private renderer: Renderer = () => null;
  private inputHandler: InputHandler | undefined;
  private onceInputHandler: InputHandler | undefined;
  private quickInputHandler: InputHandler | undefined;

  isPaused: boolean = false;
  isEndGame: boolean = false;
  erasedLines: number = 0;

  constructor(config: Config) {
    this.init(config);
  }

  start() {
    this.isEndGame = false;
    this.erasedLines = 0;
    this.startedAt = Date.now();
    this.bindKeys();
    this.createShape();
    this.resetOrigin();
    this.startTick();
  }

  pause() {
    this.isPaused = true;
    this.pausedAt = Date.now();
    clearTimeout(this.tickInterval);
  }

  play() {
    this.isPaused = false;
    this.pausedTime += this.pausedAt && Date.now() - this.pausedAt;
    this.pausedAt = 0;
    clearTimeout(this.tickInterval);
    this.startTick();
  }

  private init(config: Config) {
    this.config = { ...this.config, ...config };
    this.renderer = this.config.renderer;
    this.initialTickMs = this.config.tickMs;
    this.gameArea = this.createGameArea();
    this.renderer(this.gameArea);
  }

  private bindKeys() {
    this.inputHandler?.destroy();
    this.inputHandler = new InputHandler({ swipeTickThresholdPX: 40 });
    this.inputHandler.handleActions({
      ArrowUp: () => this.rotateShape(),
      ArrowDown: () => this.moveShapeDown(),
      ArrowLeft: () => this.moveShapeLeft(),
      ArrowRight: () => this.moveShapeRight(),
      tap: () => this.rotateShape(),
      swipeLeft: () => this.moveShapeLeft(),
      swipeRight: () => this.moveShapeRight(),
    });

    this.quickInputHandler?.destroy();
    this.quickInputHandler = new InputHandler({ swipeTickThresholdPX: 20 });
    this.quickInputHandler.handleActions({
      swipeDown: () => this.moveShapeDown(),
    });

    this.onceInputHandler?.destroy();
    this.onceInputHandler = new InputHandler({ swipeTickThresholdPX: 0 });
    this.onceInputHandler.handleActions({
      swipeUp: () => this.rotateShape(),
    });
  }

  private moveShapeLeft() {
    this.setOrigin([this.origin[0] - 1, this.origin[1]]);
    this.updateCurrentShape();

    if (!this.isValidOrigin()) {
      this.revertOrigin();
      this.updateCurrentShape();
      return;
    }

    this.render();
  }

  private moveShapeRight() {
    this.setOrigin([this.origin[0] + 1, this.origin[1]]);
    this.updateCurrentShape();

    if (!this.isValidOrigin()) {
      this.revertOrigin();
      this.updateCurrentShape();
      return;
    }

    this.render();
  }

  private moveShapeDown() {
    this.setOrigin([this.origin[0], this.origin[1] + 1]);
    this.updateCurrentShape();

    if (!this.isValidOrigin()) {
      this.revertOrigin();
      this.updateCurrentShape();
      return;
    }

    this.render();
  }

  private rotateShape() {
    const prevActiveShape = this.activeShape;

    this.activeShape = this.getRotatedShape(this.activeShape);
    this.activeShape = this.getNormalizedShape(this.activeShape);
    this.updateCurrentShape();

    if (!this.isValidOrigin()) {
      this.activeShape = prevActiveShape;
      this.updateCurrentShape();
      return;
    }

    this.render();
  }

  private startTick() {
    this.tickInterval = setTimeout(
      () =>
        requestAnimationFrame(() => {
          if (this.isPaused) return;

          this.gameTick();
          this.speedUpTick();

          if (!this.isEndGame) this.startTick();
        }),
      this.config.tickMs
    );
  }

  private gameTick() {
    this.setOrigin([this.origin[0], this.origin[1] + 1]);
    this.updateGame();
  }

  private speedUpTick() {
    const startedAt = this.startedAt;
    const pauseTime = this.pausedTime;
    const minTick = this.config.minTickMs;
    const initialTick = this.initialTickMs;
    const timeToMaxSpeedMs = this.config.timeToMaxSpeedMs;
    const pregressTime = Date.now() - startedAt - pauseTime;
    const progress = Math.min(pregressTime / timeToMaxSpeedMs, 1);
    this.config.tickMs = initialTick - progress * (initialTick - minTick);
  }

  private render() {
    this.updateGameArea();
    this.renderer(this.gameArea);
  }

  private setOrigin(origin: Coord) {
    this.prevOrigin = this.origin;
    this.origin = origin;
  }

  private revertOrigin() {
    this.origin = this.prevOrigin;
  }

  private resetOrigin() {
    this.setOrigin(this.getInitialOrigin());
  }

  private updateGame() {
    if (this.isPaused) return;

    try {
      this.updateCurrentShape();

      if (this.isCollision()) {
        this.revertOrigin();
        this.updateCurrentShape();
        this.createShape();
        this.resetOrigin();
        this.removeHorizontals();
        this.updateGameArea();

        if (this.isCollision()) {
          this.renderer(this.gameArea);
          this.endGame();
          return;
        }
      }

      this.render();
    } catch (err) {
      console.log(err);
      this.endGame();
    }
  }

  private getInitialOrigin(): Coord {
    const lowestShapeY = this.activeShape?.reduce((acc, cell) => {
      return -cell[1] < acc ? -cell[1] : acc;
    }, -1);

    return [Math.floor(this.config.width / 2), lowestShapeY ?? -1];
  }

  private createShape() {
    if (this.currentShape) {
      this.currentShape.forEach((cell) => {
        this.cellsHistory[this.geCoordKey(cell)] = cell;
      });
    }

    const shape = this.getRandomShape();

    const positionedShape = shape.map<Cell>((cell) => {
      return [
        this.getInitialOrigin()[0] + cell[0],
        this.getInitialOrigin()[1] + cell[1],
        cell[2],
      ];
    });

    this.activeShape = shape;
    this.currentShape = positionedShape;
  }

  private getRandomShape(): Shape {
    const shapesKeys = Object.keys(shapes);
    const index = Math.floor(Math.random() * shapesKeys.length);
    const key = shapesKeys[index];
    const shape = shapes[key];
    const newShape = shape.map((coords) => [...coords, key]);
    const normalizedShape = this.getNormalizedShape(newShape as Shape);

    return normalizedShape;
  }

  private updateCurrentShape() {
    this.currentShape = this.activeShape.map<Cell>((coord) => {
      return [this.origin[0] + coord[0], this.origin[1] + coord[1], coord[2]];
    });
  }

  private getRotatedShape(shape: Shape): Shape {
    return shape.reduce<Shape>((acc, cell) => {
      acc.push([-cell[1], cell[0], ...cell.slice(2)] as Cell);
      return acc;
    }, []);
  }

  private getNormalizedShape(shape: Shape): Shape {
    const minCoords = shape.reduce<[number, number]>(
      (acc, cell) => [
        acc[0] === null || cell[0] < acc[0]  ? cell[0] : acc[0],
        acc[1] === null || cell[1] < acc[1] ? cell[1] : acc[1],
      ],
      [null, null] as unknown as [number, number]
    );

    const maxCoords = shape.reduce<[number, number]>(
      (acc, cell) => [
        acc[0] === null || cell[0] > acc[0] ? cell[0] : acc[0],
        acc[1] === null || cell[1] > acc[1] ? cell[1] : acc[1],
      ],
      [null, null] as unknown as [number, number]
    );

    const shiftX = Math.round((maxCoords[0] + minCoords[0]) / 2);
    const shiftY = Math.round((maxCoords[1] + minCoords[1]) / 2);

    return shape.map((cell) => {
      return [cell[0] - shiftX, cell[1] - shiftY, ...cell.slice(2)] as Cell;
    });
  }

  private isValidOrigin(): boolean {
    const isInvalid = this.currentShape.some((coord) => {
      return coord[0] === -1 || coord[0] === this.config.width;
    });

    return !isInvalid && !this.isCollision();
  }

  private isCollision(): boolean {
    const isCollision = this.currentShape.some((currCoord) => {
      return this.cellsHistory[this.geCoordKey(currCoord)];
    });

    const isBottom = this.currentShape.some((coord) => {
      return coord[1] === this.config.height;
    });

    return isCollision || isBottom;
  }

  private geCoordKey(coord: Coord | Cell): string {
    return `${coord[0]}-${coord[1]}`;
  }

  private endGame() {
    this.isEndGame = true;
    this.destroy();
  }

  private removeHorizontals() {
    const fullRowIndexes = this.gameArea.reduce<number[]>((acc, row, i) => {
      const isFull = row.every(Boolean);
      return isFull ? acc.concat(i) : acc;
    }, []);

    this.erasedLines += fullRowIndexes.length;

    this.cellsHistory = Object.values(this.cellsHistory).reduce((acc, cell) => {
      if (!fullRowIndexes.includes(cell[1])) {
        // @ts-ignore
        acc[this.geCoordKey(cell)] = cell;
      }
      return acc;
    }, {});

    this.cellsHistory = Object.values(this.cellsHistory).reduce((acc, cell) => {
      const emptyRowsBelow = fullRowIndexes.filter((i) => i > cell[1]);
      const updatedCell: Cell = [
        cell[0],
        cell[1] + emptyRowsBelow.length,
        cell[2],
      ];
      // @ts-ignore
      acc[this.geCoordKey(updatedCell)] = updatedCell;
      return acc;
    }, {});
  }

  private createGameArea() {
    return [...Array(this.config.height)].map(() => {
      return [...Array(this.config.width)].map(() => '');
    });
  }

  private updateGameArea() {
    this.gameArea = this.gameArea.map((row, y) => {
      return row.map((cell, x) => {
        let shapeName = '';

        this.currentShape.some((coord) => {
          const isCell = coord[0] === x && coord[1] === y;
          if (isCell) shapeName = coord[2];
          return isCell;
        });

        const historyCell = this.cellsHistory[this.geCoordKey([x, y])];
        shapeName = historyCell?.[2] ?? shapeName;

        return shapeName;
      });
    });
  }

  destroy() {
    this.inputHandler?.destroy();
    this.onceInputHandler?.destroy();
    this.quickInputHandler?.destroy();
    clearInterval(this.tickInterval);
  }
}
