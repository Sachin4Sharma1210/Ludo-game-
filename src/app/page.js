'use client'
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// बोर्ड का रास्ता (Coordinates)
const PATH = [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]];

export default function LudoPro() {
  const [game, setGame] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  
  const moveSound = useRef(null);
  const killSound = useRef(null);

  useEffect(() => {
    moveSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    killSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2045/2045-preview.mp3');

    const init = async () => {
      const { data } = await supabase.from('games').select('*').limit(1).single();
      if (data) { setGame(data); setGameId(data.id); }
    };
    init();
  }, []);

  useEffect(() => {
    if (!gameId) return;
    const sub = supabase.channel('ludo').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games' }, p => setGame(p.new)).subscribe();
    return () => supabase.removeChannel(sub);
  }, [gameId]);

  const roll = async () => {
    if (isRolling || (game && game.last_roll > 0)) return;
    setIsRolling(true);
    const num = Math.floor(Math.random() * 6) + 1;
    setTimeout(async () => {
      await supabase.from('games').update({ last_roll: num }).eq('id', gameId);
      setIsRolling(false);
    }, 600);
  };

  const moveToken = async (color, index) => {
    if (game.current_turn !== color || game.last_roll === 0) return;

    let steps = game.last_roll;
    let newState = { ...game.board_state };
    
    for (let i = 1; i <= steps; i++) {
      await new Promise(r => setTimeout(r, 200));
      if(moveSound.current) moveSound.current.play().catch(e => console.log(e));
      newState[color][index] = (newState[color][index] + 1) % 52;
      setGame({ ...game, board_state: newState });
    }

    const enemy = color === 'RED' ? 'GREEN' : 'RED';
    let killed = false;
    newState[enemy] = newState[enemy].map(p => {
      if (p === newState[color][index] && ![0, 13, 26, 39].includes(p)) {
        killed = true;
        if(killSound.current) killSound.current.play().catch(e => console.log(e));
        return -1;
      }
      return p;
    });

    const colors = ['RED', 'GREEN', 'YELLOW', 'BLUE'];
    const nextIdx = (colors.indexOf(color) + (killed ? 0 : 1)) % 4;
    const nextTurn = colors[nextIdx];

    await supabase.from('games').update({ 
      board_state: newState, 
      current_turn: nextTurn, 
      last_roll: 0 
    }).eq('id', gameId);
  };

  if (!game) return <div className="bg-black h-screen text-white flex items-center justify-center font-bold">लोड हो रहा है...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center p-4 font-sans text-white">
      <h1 className="text-2xl font-black text-yellow-500 mb-4 italic">LUDO PRO LIVE</h1>

      <div className="relative w-full max-w-[450px] aspect-square bg-white border-4 border-zinc-800 grid grid-cols-15 grid-rows-15 shadow-2xl overflow-hidden">
        {/* रेड बेस */}
        <div className="col-span-6 row-span-6 bg-red-600 p-2 flex items-center justify-center relative border border-black">
          <div className="w-full h-full bg-white rounded-lg grid grid-cols-2 p-2 gap-2">
            {game.board_state.RED.map((p, i) => p === -1 && (
              <div key={i} onClick={() => moveToken('RED', i)} className={`bg-red-600 rounded-full ${game.current_turn === 'RED' && game.last_roll > 0 ? 'animate-pulse ring-4 ring-yellow-400' : ''}`}></div>
            ))}
          </div>
        </div>
        <div className="col-span-3 row-span-6 bg-zinc-100 border border-black"></div>
        {/* ग्रीन बेस */}
        <div className="col-span-6 row-span-6 bg-green-600 p-2 flex items-center justify-center border border-black">
          <div className="w-full h-full bg-white rounded-lg grid grid-cols-2 p-2 gap-2">
            {game.board_state.GREEN.map((p, i) => p === -1 && <div key={i} className="bg-green-600 rounded-full"></div>)}
          </div>
        </div>
        <div className="col-span-15 row-span-3 bg-zinc-200 border-y border-black"></div>
        <div className="col-span-6 row-span-6 bg-blue-600 border border-black"></div>
        <div className="col-span-3 row-span-6 bg-zinc-100 border border-black"></div>
        <div className="col-span-6 row-span-6 bg-yellow-500 border border-black"></div>

        {/* गोटियां */}
        {['RED', 'GREEN', 'YELLOW', 'BLUE'].map(color => 
          game.board_state[color].map((pos, i) => {
            if (pos === -1) return null;
            const [r, c] = PATH[pos];
            const canMove = game.current_turn === color && game.last_roll > 0;
            return (
              <div key={`${color}-${i}`} onClick={() => moveToken(color, i)}
                className={`absolute w-[6.66%] h-[6.66%] rounded-full border border-white shadow-md z-20 
                ${color === 'RED' ? 'bg-red-600' : color === 'GREEN' ? 'bg-green-600' : color === 'YELLOW' ? 'bg-yellow-500' : 'bg-blue-600'}
                ${canMove ? 'animate-pulse ring-2 ring-black scale-110' : ''}`}
                style={{ top: `${r * 6.66}%`, left: `${c * 6.66}%` }}
              ></div>
            )
          })
        )}
      </div>

      <div className="mt-8 w-full max-w-[350px] bg-zinc-900 p-4 rounded-2xl flex items-center justify-between border-b-4 border-yellow-600">
        <div className="font-bold">
          <p className="text-zinc-500 text-[10px]">TURN</p>
          <p className={game.current_turn === 'RED' ? 'text-red-500' : 'text-green-500'}>{game.player_names[game.current_turn]}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-2xl font-black text-black">
            {isRolling ? '🎲' : (game.last_roll || '0')}
          </div>
          <button onClick={roll} disabled={isRolling || game.last_roll > 0} className="bg-yellow-600 px-6 py-2 rounded-xl font-bold disabled:opacity-50">ROLL</button>
        </div>
      </div>
    </div>
  );
}
