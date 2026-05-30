'use client'
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// बोर्ड का रास्ता (Coordinates)
const PATH = [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]];

export default function LudoPro() {
  const [game, setGame] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  
  // साउंड रिफ्स
  const moveSound = useRef(null);
  const killSound = useRef(null);

  useEffect(() => {
    // साउंड लोड करना (Free Online Links)
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

  // पासा फेंकना
  const roll = async () => {
    if (isRolling || game.last_roll > 0) return;
    setIsRolling(true);
    const num = Math.floor(Math.random() * 6) + 1;
    setTimeout(async () => {
      await supabase.from('games').update({ last_roll: num }).eq('id', gameId);
      setIsRolling(false);
    }, 600);
  };

  // गोटी चलाना (Animation + Sound + Blinking Logic)
  const moveToken = async (color, index) => {
    if (game.current_turn !== color || game.last_roll === 0) return;

    let steps = game.last_roll;
    let newState = { ...game.board_state };
    
    for (let i = 1; i <= steps; i++) {
      await new Promise(r => setTimeout(r, 200));
      moveSound.current.play(); // "तक-तक" साउंड
      newState[color][index] = (newState[color][index] + 1) % 52;
      setGame({ ...game, board_state: newState });
    }

    // गोटी काटना (Kill Logic)
    const enemy = color === 'RED' ? 'GREEN' : 'RED';
    let killed = false;
    newState[enemy] = newState[enemy].map(p => {
      if (p === newState[color][index] && ![0, 13, 26, 39].includes(p)) {
        killed = true;
        killSound.current.play(); // "शूं..." साउंड
        return -1;
      }
      return p;
    });

    const nextIdx = (['RED', 'GREEN', 'YELLOW', 'BLUE'].indexOf(color) + (killed ? 0 : 1)) % 4;
    const nextTurn = ['RED', 'GREEN', 'YELLOW', 'BLUE'][nextIdx];

    await supabase.from('games').update({ 
      board_state: newState, 
      current_turn: nextTurn, 
      last_roll: 0 
    }).eq('id', gameId);
  };

  if (!game) return <div className="bg-black h-screen text-white flex items-center justify-center">तैयार हो रहा है...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center p-4 font-sans text-white">
      <div className="mb-4 text-center">
        <h1 className="text-3xl font-black text-yellow-500 italic">LUDO SUPREME PRO</h1>
        <p className="text-zinc-500 text-xs tracking-[0.3em]">MULTIPLAYER LIVE</p>
      </div>

      {/* लूडो बोर्ड */}
      <div className="relative w-full max-w-[480px] aspect-square bg-white border-[6px] border-zinc-800 grid grid-cols-15 grid-rows-15 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        {/* रेड बेस */}
        <div className="col-span-6 row-span-6 bg-red-600 p-4 border border-black flex items-center justify-center relative">
          <span className="absolute top-1 left-2 text-[10px] opacity-50">{game.player_names.RED}</span>
          <div className="w-full h-full bg-white rounded-xl grid grid-cols-2 p-2 gap-2">
            {game.board_state.RED.map((p, i) => p === -1 && (
              <div key={i} onClick={() => moveToken('RED', i)} className={`bg-red-600 rounded-full shadow-lg ${game.current_turn === 'RED' && game.last_roll > 0 ? 'animate-pulsing ring-4 ring-yellow-400' : ''}`}></div>
            ))}
          </div>
        </div>

        {/* ग्रीन बेस */}
        <div className="col-span-3 row-span-6 bg-zinc-100 border border-black"></div>
        <div className="col-span-6 row-span-6 bg-green-600 p-4 border border-black flex items-center justify-center relative">
          <span className="absolute top-1 left-2 text-[10px] opacity-50">{game.player_names.GREEN}</span>
          <div className="w-full h-full bg-white rounded-xl grid grid-cols-2 p-2 gap-2">
            {game.board_state.GREEN.map((p, i) => p === -1 && <div key={i} className="bg-green-600 rounded-full shadow-lg"></div>)}
          </div>
        </div>

        {/* पाथवे */}
        <div className="col-span-15 row-span-3 bg-zinc-300 border-y-2 border-zinc-800 flex items-center justify-center font-black text-zinc-400 tracking-tighter">PLAY ZONE</div>

        {/* ब्लू और येलो बेस */}
        <div className="col-span-6 row-span-6 bg-blue-600 border border-black p-4"></div>
        <div className="col-span-3 row-span-6 bg-zinc-100 border border-black"></div>
        <div className="col-span-6 row-span-6 bg-yellow-500 border border-black p-4"></div>

        {/* गोटियां (Blinking Effect included) */}
        {['RED', 'GREEN', 'YELLOW', 'BLUE'].map(color => 
          game.board_state[color].map((pos, i) => {
            if (pos === -1) return null;
            const [r, c] = PATH[pos];
            const canMove = game.current_turn === color && game.last_roll > 0;
            return (
              <div key={`${color}-${i}`} onClick={() => moveToken(color, i)}
                className={`absolute w-[6.66%] h-[6.66%] rounded-full border-2 border-white shadow-xl cursor-pointer z-30 transition-all duration-300
                ${color === 'RED' ? 'bg-red-600' : color === 'GREEN' ? 'bg-green-600' : color === 'YELLOW' ? 'bg-yellow-500' : 'bg-blue-600'}
                ${canMove ? 'animate-pulsing ring-4 ring-white scale-110' : ''}`}
                style={{ top: `${r * 6.66}%`, left: `${c * 6.66}%` }}
              ></div>
            )
          })
        )}
      </div>

      {/* कंट्रोलर */}
      <div className="mt-8 w-full max-w-[400px] bg-zinc-900 border-t-4 border-yellow-600 p-6 rounded-3xl shadow-2xl flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Turn Now</span>
          <span className={`text-xl font-black ${game.current_turn === 'RED' ? 'text-red-500' : 'text-green-500'}`}>{game.player_names[game.current_turn]}</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-4xl font-black text-black shadow-[inset_0_0_10px_rgba(0,0,0,0.2)] ${isRolling ? 'animate-bounce' : ''}`}>
            {isRolling ? '🎲' : (game.last_roll || '?')}
          </div>
          <button onClick={roll} disabled={isRolling || game.last_roll > 0} className="bg-yellow-600 hover:bg-yellow-500 px-8 py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all disabled:opacity-50">ROLL</button>
        </div>
      </div>
    </div>
  );
      }
    
