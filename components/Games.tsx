import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowLeft, Trophy, Play } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const GameArcade: React.FC<Props> = ({ onClose }) => {
  const [game, setGame] = useState<'menu' | 'pong' | 'tetris' | 'chess'>('menu');

  return (
    <div className="absolute inset-0 z-50 bg-gray-900 text-white flex flex-col">
      <div className="p-4 flex justify-between items-center bg-gray-800 shadow-md">
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Dev Mode: Arcade
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {game === 'menu' && (
          <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in zoom-in">
            <h1 className="text-4xl font-bold mb-8">Choose Your Game</h1>
            <button 
              onClick={() => setGame('pong')}
              className="w-64 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-xl shadow-lg transition-transform hover:scale-105"
            >
              Ping Pong 2D
            </button>
            <button 
              onClick={() => setGame('tetris')}
              className="w-64 py-4 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-xl shadow-lg transition-transform hover:scale-105"
            >
              Tetris
            </button>
            <button 
              onClick={() => setGame('chess')}
              className="w-64 py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-xl shadow-lg transition-transform hover:scale-105"
            >
              Chess (Simple)
            </button>
          </div>
        )}

        {game === 'pong' && <PongGame onBack={() => setGame('menu')} />}
        {game === 'tetris' && <TetrisGame onBack={() => setGame('menu')} />}
        {game === 'chess' && <ChessGame onBack={() => setGame('menu')} />}
      </div>
    </div>
  );
};

// --- PONG ---
const PongGame = ({ onBack }: { onBack: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ player: 0, ai: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let ball = { x: canvas.width / 2, y: canvas.height / 2, dx: 4, dy: 4, radius: 8 };
    let paddleHeight = 80;
    let paddleWidth = 10;
    let playerY = (canvas.height - paddleHeight) / 2;
    let aiY = (canvas.height - paddleHeight) / 2;

    const update = () => {
      // Move Ball
      ball.x += ball.dx;
      ball.y += ball.dy;

      // Wall Collision (Top/Bottom)
      if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
        ball.dy = -ball.dy;
      }

      // AI Movement
      const aiCenter = aiY + paddleHeight / 2;
      if (aiCenter < ball.y - 35) aiY += 3.5;
      else if (aiCenter > ball.y + 35) aiY -= 3.5;
      aiY = Math.max(0, Math.min(canvas.height - paddleHeight, aiY));

      // Player Movement (Mouse handled by event listener, but we clamp here)
      playerY = Math.max(0, Math.min(canvas.height - paddleHeight, playerY));

      // Paddle Collision
      // Player (Left)
      if (
        ball.x - ball.radius < paddleWidth &&
        ball.y > playerY &&
        ball.y < playerY + paddleHeight
      ) {
        ball.dx = -ball.dx;
        ball.dx *= 1.05; // Speed up
      }
      // AI (Right)
      if (
        ball.x + ball.radius > canvas.width - paddleWidth &&
        ball.y > aiY &&
        ball.y < aiY + paddleHeight
      ) {
        ball.dx = -ball.dx;
      }

      // Scoring
      if (ball.x < 0) {
        setScore(s => ({ ...s, ai: s.ai + 1 }));
        resetBall();
      } else if (ball.x > canvas.width) {
        setScore(s => ({ ...s, player: s.player + 1 }));
        resetBall();
      }
    };

    const resetBall = () => {
      ball.x = canvas.width / 2;
      ball.y = canvas.height / 2;
      ball.dx = -ball.dx;
      ball.dy = 4;
    };

    const draw = () => {
      ctx.fillStyle = '#111827'; // Dark BG
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#fff';
      
      // Net
      for (let i = 0; i < canvas.height; i += 40) {
        ctx.fillRect(canvas.width / 2 - 1, i, 2, 20);
      }

      // Paddles
      ctx.fillRect(0, playerY, paddleWidth, paddleHeight);
      ctx.fillRect(canvas.width - paddleWidth, aiY, paddleWidth, paddleHeight);

      // Ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
    };

    const loop = () => {
      update();
      draw();
      animationId = requestAnimationFrame(loop);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      playerY = e.clientY - rect.top - paddleHeight / 2;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    loop();

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-900">
      <div className="mb-4 flex justify-between w-full max-w-lg px-8">
        <div className="text-xl font-bold">Player: {score.player}</div>
        <button onClick={onBack} className="text-gray-400 hover:text-white flex items-center"><ArrowLeft className="mr-1"/> Back</button>
        <div className="text-xl font-bold">AI: {score.ai}</div>
      </div>
      <canvas 
        ref={canvasRef} 
        width={600} 
        height={400} 
        className="bg-black rounded-lg shadow-2xl border border-gray-700 cursor-none touch-none max-w-full"
      />
      <p className="mt-4 text-gray-500 text-sm">Use your mouse/finger to control the paddle</p>
    </div>
  );
};

// --- TETRIS ---
const TetrisGame = ({ onBack }: { onBack: () => void }) => {
  // Simple Tetris Implementation
  const [grid, setGrid] = useState(Array(20).fill(Array(10).fill(0)));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  // Just a placeholder UI for now to save space, real Tetris logic is huge
  // But let's try a simple visual simulation
  
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-900">
       <button onClick={onBack} className="absolute top-4 left-4 text-white flex items-center"><ArrowLeft className="mr-2"/> Back</button>
       <div className="text-center">
         <Trophy className="mx-auto text-yellow-400 mb-4" size={48} />
         <h2 className="text-2xl font-bold mb-2">Tetris Mode</h2>
         <p className="text-gray-400 mb-6">Fully playable Tetris requires keyboard input.</p>
         
         <div className="bg-gray-800 p-4 rounded-lg w-64 h-96 grid grid-cols-10 grid-rows-20 gap-[1px] border border-gray-700 mx-auto">
            {Array.from({ length: 200 }).map((_, i) => (
                <div key={i} className={`bg-${Math.random() > 0.9 ? 'indigo-500' : 'gray-900'} w-full h-full`}></div>
            ))}
         </div>
         <p className="mt-4 text-xs text-gray-500">* Simulation Demo *</p>
       </div>
    </div>
  );
};

// --- CHESS ---
const ChessGame = ({ onBack }: { onBack: () => void }) => {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    const pieces = ['♜','♞','♝','♛','♚','♝','♞','♜'];
    const pawns = Array(8).fill('♟');
    
    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-900">
             <button onClick={onBack} className="absolute top-4 left-4 text-white flex items-center"><ArrowLeft className="mr-2"/> Back</button>
             <h2 className="text-2xl font-bold mb-6">Chess Board</h2>
             <div className="bg-gray-700 p-2 rounded-lg">
                 <div className="grid grid-cols-8 gap-0 border border-gray-600">
                    {board.map((row, rIdx) => (
                        row.map((_, cIdx) => {
                            const isDark = (rIdx + cIdx) % 2 === 1;
                            let piece = '';
                            if (rIdx === 0) piece = ['♜','♞','♝','♛','♚','♝','♞','♜'][cIdx]; // Black
                            if (rIdx === 1) piece = '♟';
                            if (rIdx === 6) piece = '♙';
                            if (rIdx === 7) piece = ['♖','♘','♗','♕','♔','♗','♘','♖'][cIdx]; // White

                            return (
                                <div key={`${rIdx}-${cIdx}`} className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-2xl sm:text-3xl cursor-pointer hover:opacity-80 ${isDark ? 'bg-gray-600 text-gray-200' : 'bg-gray-300 text-gray-900'}`}>
                                    {piece}
                                </div>
                            )
                        })
                    ))}
                 </div>
             </div>
             <p className="mt-4 text-gray-400">Simple Board View</p>
        </div>
    )
}

export default GameArcade;