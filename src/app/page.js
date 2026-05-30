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
    // साउंड सेटिंग्स
    moveSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    killSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2045/2045-preview.mp3');

    const init = async () => {
      try {
        const { data, error } = await supabase.from('games').select('*').limit(1).single();
        
        if (data) {
          setGame(data);
          setGameId(data.id);
        } else {
          // अगर डेटाबेस में कुछ न मिले तो यह डिफॉल्ट स्टेट लोड करेगा
          console.log("Using Default State");
          setGame({
            player_names: { RED: "खिलाड़ी 1", GREEN: "खिलाड़ी 2", YELLOW: "खिलाड़ी 3", BLUE: "खिलाड़ी 4" },
            board_state: { RED: [0], GREEN: [13], YELLOW: [26], BLUE: [39] },
            current_turn: "RED",
            last_roll: 0
          });
        }
      } catch (err) {
        console.error("Init Error:", err);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!gameId) return;
    const sub = supabase.channel('ludo')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games' }, p => setGame(p.new))
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [gameId]);

  const roll = async () => {
    if (isRolling || (game && game.last_roll > 0)) return;
    setIsRolling(true);
    const num = Math.floor(Math.random() * 6) + 1;
    
    setTimeout(async () => {
      if (gameId) {
        await supabase.from('games').update({ last_roll: num }).eq('id', gameId);
      } else {
        setGame(prev => ({ ...prev, last_roll: num }));
      }
      setIsRolling(false);
    }, 600);
  };

  const moveToken = async (color, index) => {
    if (game.current_turn !== color || game.last_roll === 0) return;

    let steps = game.last_roll;
    let newState = { ...game.board_state };
    
    for (let i = 1; i <= steps; i++) {
      await new Promise(r => setTimeout(r, 200));
      if(moveSound.current) moveSound.current.play().catch(() => {});
      newState[color][index] = (newState[color][index] + 1) % 52;
      setGame(prev => ({ ...prev, board_state: newState }));
    }

    const enemy = color === 'RED' ? 'GREEN' : 'RED';
    let killed = false;
    newState[enemy] = newState[enemy].map(p => {
      if (p === newState[color][index] && ![0, 13, 26, 39].includes(p)) {
        killed = true;
        if(killSound.current) killSound.current.play().catch(() => {});
        return -1;
      }
      return p;
    });

    const colors = ['RED', 'GREEN', 'YELLOW', 'BLUE'];
    const nextIdx = (colors.indexOf(color) + (killed ? 0 : 1)) % 4;
    const nextTurn = colors[nextIdx];

    if (gameId) {
      await supabase.from('games').update({ 
        board_state: newState, 
        current_turn: nextTurn, 
        last_roll: 0 
      }).eq('id', gameId);
    } else {
      setGame(prev => ({ ...prev, board_state: newState, current_turn: nextTurn, last_roll: 0 }));
    }
  };

  if (!game) return <div className="bg-black h-screen text-white flex items-center justify-center font-bold text-xl">LUDO LOADING...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center p-4 font-sans text-white">
      <h1 className="text-3xl font-black text-yellow-500 mb-6 italic tracking-tighter shadow-orange-500">LUDO SUPREME LIVE</h1>

      <div className="relative w-full max-w-[450px] aspect-square bg-white border-[6px] border-zinc-800 grid grid-cols-15 grid-rows-15 shadow-2xl rounded-sm overflow-hidden">
        {/* RED BASE */}
        <div className="col-span-6 row-span-6 bg-red-600 p-2 flex items-center justify-center border border-black">
          <div className="w-full h-full bg-white rounded-lg grid grid-cols-2 p-2 gap-2 shadow-inner">
            {game.board_state.RED.map((p, i) => p === -1 && (
              <div key={i} onClick={() => moveToken('RED', i)} className={`bg-red-600 rounded-full shadow-md ${game.current_turn === 'RED' && game.last_roll > 0 ? 'animate-bounce ring-4 ring-yellow-400' : ''}`}></div>
            ))}
          </div>
        </div>
        <div className="col-span-3 row-span-6 bg-zinc-100 border border-black"></div>
        {/* GREEN BASE */}
        <div className="col-span-6 row-span-6 bg-green-600 p-2 flex items-center justify-center border border-black">
          <div className="w-full h-full bg-white rounded-lg grid grid-cols-2 p-2 gap-2 shadow-inner">
            {game.board_state.GREEN.map((p, i) => p === -1 && <div key={i} onClick={() => moveToken('GREEN', i)} className="bg-green-600 rounded-full shadow-md"></div>)}
          </div>
        </div>

        <div className="col-span-15 row-span-3 bg-zinc-300 border-y-2 border-zinc-800 flex items-center justify-center font-black text-zinc-500 text-xs">CROSSING AREA</div>

        {/* BLUE/YELLOW */}
        <div className="col-span-6 row-span-6 bg-blue-600 border border-black"></div>
        <div className="col-span-3 row-span-6 bg-zinc-100 border border-black"></div>
        <div className="col-span-6 row-span-6 bg-yellow-500 border border-black"></div>

        {/* TOKENS ON PATH */}
        {['RED', 'GREEN', 'YELLOW', 'BLUE'].map(color => 
          game.board_state[color].map((pos, i) => {
            if (pos === -1) return null;
            const [r, c] = PATH[pos];
            const isTurn = game.current_turn === color && game.last_roll > 0;
            return (
              <div key={`${color}-${i}`} onClick={() => moveToken(color, i)}
                className={`absolute w-[6.66%] h-[6.66%] rounded-full border-2 border-white shadow-lg z-30 transition-all duration-300
                ${color === 'RED' ? 'bg-red-600' : color === 'GREEN' ? 'bg-green-600' : color === 'YELLOW' ? 'bg-yellow-500' : 'bg-blue-600'}
                ${isTurn ? 'animate-pulse scale-125 ring-2 ring-black' : ''}`}
                style={{ top: `${r * 6.66}%`, left: `${c * 6.66}%` }}
              ></div>
            )
          })
        )}
      </div>

      {/* CONTROLS */}
      <div className="mt-10 w-full max-w-[400px] bg-zinc-900 p-6 rounded-3xl flex items-center justify-between border-b-8 border-yellow-700 shadow-2xl">
        <div className="flex flex-col">
          <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Active Player</span>
          <span className={`text-2xl font-black ${game.current_turn === 'RED' ? 'text-red-500' : 'text-green-500'}`}>{game.player_names[game.current_turn]}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-4xl font-black text-black shadow-inner ${isRolling ? 'animate-spin' : ''}`}>
            {isRolling ? '🎲' : (game.last_roll || '0')}
          </div>
          <button onClick={roll} disabled={isRolling || game.last_roll > 0} className="bg-yellow-600 hover:bg-yellow-500 px-8 py-4 rounded-2xl font-black text-xl shadow-xl active:translate-y-1 transition-all disabled:opacity-50">ROLL</button>
        </div>
      </div>
    </div>
  );
}
