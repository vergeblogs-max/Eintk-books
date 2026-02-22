
import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import type { UserData } from '../types';
import { updateUserPoints, saveGameProgress, useArcadeBoost } from '../services/firestoreService';
import { saveGameAsset, getGameAsset, hasGameAsset } from '../services/offlineService';
import LeaderboardPage from './LeaderboardPage';
import { Gamepad2, Trophy, Lock, Hash, Search, Flag, X, LayoutGrid, HelpCircle, Grid3X3, Clock, Lightbulb, CircleDashed, Wand2, Play, Star, RotateCcw, Brain, ArrowDown, CheckCircle, Globe, Type, Layers, ArrowRight, LogOut, Loader2, Download, WifiOff, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { TRIVIA_QUESTIONS, FLAGS, TUTORIAL_DATA, HANGMAN_WORDS, CROSSWORD_TEMPLATES, WORD_SEARCH_LISTS, TIMELINE_EVENTS, MEMORY_ICONS, CAPITALS, SYNONYMS, ODD_ONE_OUT } from '../data/gameData';
import * as LucideIcons from 'lucide-react';
import { formatPoints } from '../utils/formatters';
import { ConnectivityStatus } from './LibraryPage';

interface ArcadePageProps {
  user: User | null;
  userData: UserData | null;
}

type BoostType = 'hint' | 'half' | 'solve' | null;

const GAMES_LIST = [
    { id: 'sudoku', name: 'Sudoku Logic', icon: Hash, description: 'Fill the grid with numbers 1-9.', color: 'bg-blue-600', free: true, difficulty: 1 },
    { id: 'flags', name: 'Flag Master', icon: Flag, description: 'Identify flags from around the world.', color: 'bg-green-600', free: true, difficulty: 1, requiresAssets: true },
    { id: 'hangman', name: 'Hangman', icon: HelpCircle, description: 'Guess the educational term.', color: 'bg-yellow-600', free: false, difficulty: 2 },
    { id: 'word-search', name: 'Word Hunter', icon: Search, description: 'Find hidden words in the grid.', color: 'bg-purple-600', free: false, difficulty: 2 },
    { id: 'crossword', name: 'Crossword Mini', icon: LayoutGrid, description: 'Solve quick clues.', color: 'bg-teal-600', free: false, difficulty: 3 },
    { id: 'tic-tac-trivia', name: 'Trivia Tic-Tac', icon: X, description: 'Answer correctly to place your X.', color: 'bg-red-600', free: false, difficulty: 3 },
    { id: 'memory', name: 'Memory Match', icon: Grid3X3, description: 'Find matching pairs.', color: 'bg-indigo-600', free: false, difficulty: 2 },
    { id: 'timeline', name: 'Timeline', icon: Clock, description: 'Order historical events.', color: 'bg-orange-700', free: false, difficulty: 3 },
    { id: 'capital-city', name: 'Capital Quiz', icon: Globe, description: 'Match countries to capitals.', color: 'bg-cyan-600', free: false, difficulty: 2 },
    { id: 'synonym-blast', name: 'Synonym Blast', icon: Type, description: 'Find the similar word.', color: 'bg-pink-600', free: false, difficulty: 2 },
    { id: 'odd-one-out', name: 'Odd One Out', icon: Layers, description: 'Find the item that does not belong.', color: 'bg-emerald-600', free: false, difficulty: 2 },
];

const calculatePoints = (gameId: string, level: number) => {
    return Math.min(10, level);
};

// --- TUTORIAL COMPONENT ---
const GameTutorial: React.FC<{ gameId: string, onComplete: () => void }> = ({ gameId, onComplete }) => {
    const [step, setStep] = useState(0);
    const tutorial = TUTORIAL_DATA[gameId] || [{ step: 1, text: "Follow on-screen instructions." }];
    
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const nextStep = () => { 
        if (step < tutorial.length - 1) setStep(s => s + 1); 
        else {
            localStorage.setItem(`tutorial_seen_${gameId}`, 'true');
            onComplete(); 
        }
    };

    return ( 
        <div className="fixed inset-0 z-[100] bg-gray-900/95 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-800 border border-orange-500 p-6 rounded-xl shadow-2xl w-full max-w-sm relative">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-orange-600 p-3 rounded-full border-4 border-gray-900">
                    <Lightbulb size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 mt-4">How to Play</h3>
                <div className="h-1 w-12 bg-orange-500 mx-auto rounded-full mb-4"></div>
                
                <div className="min-h-[80px] flex items-center justify-center mb-4">
                    <p className="text-gray-200 text-sm leading-relaxed">{tutorial[step].text}</p>
                </div>

                <div className="flex justify-between items-center">
                    <div className="flex space-x-1">
                        {tutorial.map((_, i) => (
                            <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === step ? 'bg-orange-500' : 'bg-gray-600'}`} />
                        ))}
                    </div>
                    <button onClick={nextStep} className="bg-white hover:bg-gray-200 text-gray-900 px-6 py-2 rounded-lg font-bold text-sm transition-colors shadow-lg">
                        {step === tutorial.length - 1 ? "Play" : "Next"}
                    </button>
                </div>
            </div>
        </div> 
    );
};

const BoostBar: React.FC<{ userData: UserData | null, onBoost: (type: 'hint' | 'half' | 'solve') => void }> = ({ userData, onBoost }) => {
    const isPro = userData?.subscriptionStatus === 'pro' || userData?.subscriptionStatus === 'day_pass';
    
    const boosts = userData?.arcadeBoosts || { hintsUsed: 0, halvesUsed: 0, solvesUsed: 0, lastReset: null };
    
    const limits = isPro ? { hint: 5, half: 3, solve: 1 } : { hint: 1, half: 0, solve: 0 };
    
    const remaining = {
        hint: Math.max(0, limits.hint - boosts.hintsUsed),
        half: Math.max(0, limits.half - boosts.halvesUsed),
        solve: Math.max(0, limits.solve - boosts.solvesUsed)
    };

    return (
        <div className="bg-gray-900 border-t border-gray-700 p-2 flex justify-around items-center w-full shrink-0 h-20">
            <button 
                onClick={() => onBoost('hint')} 
                disabled={remaining.hint <= 0}
                className={`flex flex-col items-center justify-center w-16 transition-colors ${remaining.hint > 0 ? 'text-orange-400 hover:text-white' : 'text-gray-600 cursor-not-allowed'}`}
            >
                <Lightbulb size={20}/>
                <span className="text-[10px] font-bold mt-1">Hint</span>
                <span className="text-[9px] text-gray-500">{remaining.hint}/{limits.hint}</span>
            </button>

            <button 
                onClick={() => onBoost('half')} 
                disabled={!isPro || remaining.half <= 0}
                className={`flex flex-col items-center justify-center w-16 transition-colors relative ${isPro && remaining.half > 0 ? 'text-orange-400 hover:text-white' : 'text-gray-600 cursor-not-allowed'}`}
            >
                <CircleDashed size={20}/>
                <span className="text-[10px] font-bold mt-1">50/50</span>
                {!isPro ? <Lock size={8} className="absolute top-0 right-2"/> : <span className="text-[9px] text-gray-500">{remaining.half}/{limits.half}</span>}
            </button>

            <button 
                onClick={() => onBoost('solve')} 
                disabled={!isPro || remaining.solve <= 0}
                className={`flex flex-col items-center justify-center w-16 transition-colors relative ${isPro && remaining.solve > 0 ? 'text-orange-400 hover:text-white' : 'text-gray-600 cursor-not-allowed'}`}
            >
                <Wand2 size={20}/>
                <span className="text-[10px] font-bold mt-1">Solve</span>
                {!isPro ? <Lock size={8} className="absolute top-0 right-2"/> : <span className="text-[9px] text-gray-500">{remaining.solve}/{limits.solve}</span>}
            </button>
        </div>
    );
};

interface GameEngineProps {
    level: number;
    onWin: () => void;
    boost: BoostType;
    onBoostConsumed: () => void;
}

const SudokuGame: React.FC<GameEngineProps> = ({ level, onWin, boost, onBoostConsumed }) => {
    const solution = [
        [5,3,4,6,7,8,9,1,2], [6,7,2,1,9,5,3,4,8], [1,9,8,3,4,2,5,6,7],
        [8,5,9,7,6,1,4,2,3], [4,2,6,8,5,3,7,9,1], [7,1,3,9,2,4,8,5,6],
        [9,6,1,5,3,7,2,8,4], [2,8,7,4,1,9,6,3,5], [3,4,5,2,8,6,1,7,9]
    ];
    
    const [board, setBoard] = useState<number[][]>([]);
    
    useEffect(() => {
        const cellsToRemove = Math.min(60, 20 + Math.floor(level / 10));
        const newBoard = solution.map(row => [...row]);
        for(let i=0; i<cellsToRemove; i++) {
            const r = Math.floor(Math.random()*9);
            const c = Math.floor(Math.random()*9);
            newBoard[r][c] = 0;
        }
        setBoard(newBoard);
    }, [level]);

    useEffect(() => {
        if (boost === 'solve') {
            setBoard(solution);
            setTimeout(onWin, 500);
            onBoostConsumed();
        } else if (boost === 'hint') {
            const emptyCells = [];
            for(let r=0; r<9; r++) for(let c=0; c<9; c++) if(board[r][c]===0) emptyCells.push({r,c});
            if(emptyCells.length > 0) {
                const {r,c} = emptyCells[Math.floor(Math.random()*emptyCells.length)];
                const newBoard = [...board.map(row => [...row])];
                newBoard[r][c] = solution[r][c];
                setBoard(newBoard);
            }
            onBoostConsumed();
        } else if (boost === 'half') {
            const emptyCells = [];
            for(let r=0; r<9; r++) for(let c=0; c<9; c++) if(board[r][c]===0) emptyCells.push({r,c});
            const toFillCount = Math.ceil(emptyCells.length / 2);
            const shuffled = emptyCells.sort(() => 0.5 - Math.random());
            const toFill = shuffled.slice(0, toFillCount);
            const newBoard = [...board.map(row => [...row])];
            toFill.forEach(({r, c}) => {
                newBoard[r][c] = solution[r][c];
            });
            setBoard(newBoard);
            onBoostConsumed();
        }
    }, [boost]);

    const handleChange = (r: number, c: number, val: string) => {
        const num = parseInt(val) || 0;
        if (num >= 0 && num <= 9) {
            const newBoard = [...board.map(row => [...row])];
            newBoard[r][c] = num;
            setBoard(newBoard);
        }
    };

    const check = () => {
        if(JSON.stringify(board) === JSON.stringify(solution)) onWin();
        else alert("Not quite right!");
    }

    if(board.length === 0) return null;

    return (
        <div className="flex flex-col items-center w-full pb-4">
            <div className="grid grid-cols-9 gap-px bg-gray-500 border-2 border-gray-500 shadow-2xl mb-4">
                {board.map((row, r) => row.map((cell, c) => (
                    <input
                        key={`${r}-${c}`}
                        type="number"
                        value={cell === 0 ? '' : cell}
                        onChange={(e) => handleChange(r, c, e.target.value)}
                        className={`w-8 h-8 text-center text-lg font-bold focus:outline-none focus:bg-orange-200 p-0
                            ${cell !== 0 ? 'bg-white text-blue-600' : 'bg-gray-200'} 
                            ${(c + 1) % 3 === 0 && c !== 8 ? 'border-r-2 border-gray-800' : ''} 
                            ${(r + 1) % 3 === 0 && r !== 8 ? 'border-b-2 border-gray-800' : ''}`}
                    />
                )))}
            </div>
            <button onClick={check} className="bg-green-600 hover:bg-green-500 px-8 py-2 rounded-lg font-bold text-white shadow-lg text-sm">Check Solution</button>
        </div>
    );
};

const FlagGame: React.FC<GameEngineProps> = ({ level, onWin, boost, onBoostConsumed }) => {
    const [streak, setStreak] = useState(0);
    const [currentFlag, setCurrentFlag] = useState<any>(null);
    const [options, setOptions] = useState<string[]>([]);
    const [removedOptions, setRemovedOptions] = useState<string[]>([]);
    const [flagImgSrc, setFlagImgSrc] = useState<string | null>(null);
    
    const requiredStreak = Math.min(20, 5 + Math.floor(level / 20));

    const loadLevel = () => {
        const correct = FLAGS[Math.floor(Math.random() * FLAGS.length)];
        setCurrentFlag(correct);
        const distractors = FLAGS.filter(f => f.code !== correct.code).sort(() => 0.5 - Math.random()).slice(0, 3).map(f => f.name);
        setOptions([...distractors, correct.name].sort(() => 0.5 - Math.random()));
        setRemovedOptions([]);
        setFlagImgSrc(null); 
    };

    useEffect(() => {
        const loadImage = async () => {
            if (!currentFlag) return;
            const assetKey = `flag_${currentFlag.code}`;
            const cachedSrc = await getGameAsset(assetKey);
            if (cachedSrc) {
                setFlagImgSrc(cachedSrc);
            } else {
                setFlagImgSrc(`https://flagcdn.com/w320/${currentFlag.code}.png`);
            }
        };
        loadImage();
    }, [currentFlag]);

    useEffect(() => { loadLevel(); }, [level]);

    useEffect(() => {
        if(!currentFlag) return;
        if (boost === 'solve') {
            onWin();
            onBoostConsumed();
        } else if (boost === 'hint') {
            alert(`Starts with ${currentFlag.name.charAt(0)}`);
            onBoostConsumed();
        } else if (boost === 'half') {
            const wrong = options.filter(o => o !== currentFlag.name && !removedOptions.includes(o));
            const toRemove = wrong.slice(0, 2);
            setRemovedOptions(prev => [...prev, ...toRemove]);
            onBoostConsumed();
        }
    }, [boost]);

    const handleGuess = (country: string) => {
        if (country === currentFlag.name) {
            if (streak + 1 >= requiredStreak) onWin();
            else { setStreak(s => s + 1); loadLevel(); }
        } else {
            setStreak(0); alert(`Incorrect! That was ${currentFlag.name}. Streak reset.`); loadLevel();
        }
    };

    if (!currentFlag) return null;

    return (
        <div className="flex flex-col items-center w-full">
            <div className="w-full flex justify-between mb-2 px-4 text-xs">
                <span className="font-bold text-orange-400">Level {level}</span>
                <span className="font-bold text-green-400">Streak: {streak}/{requiredStreak}</span>
            </div>
            <div className="bg-white p-2 rounded-xl shadow-2xl transform rotate-1 mb-4 border-4 border-gray-200">
                {flagImgSrc ? (
                    <img src={flagImgSrc} alt="Flag" className="w-64 h-40 object-cover rounded shadow-inner"/>
                ) : (
                    <div className="w-64 h-40 bg-gray-200 flex items-center justify-center rounded">
                        <Loader2 className="animate-spin text-gray-400"/>
                    </div>
                )}
            </div>
            <div className="grid grid-cols-2 gap-3 w-full px-2">
                {options.map(opt => (
                    <button 
                        key={opt} 
                        onClick={() => handleGuess(opt)}
                        disabled={removedOptions.includes(opt)}
                        className={`text-white font-bold py-3 px-2 rounded-xl shadow-md transition-all text-xs ${removedOptions.includes(opt) ? 'bg-gray-800 opacity-30 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600 active:scale-95'}`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
};

const HangmanGame: React.FC<GameEngineProps> = ({ level, onWin, boost, onBoostConsumed }) => {
    const [wordData, setWordData] = useState<{word: string, hint: string} | null>(null);
    const [guessed, setGuessed] = useState<string[]>([]);
    const [mistakes, setMistakes] = useState(0);
    const [won, setWon] = useState(false);
    const [disabledKeys, setDisabledKeys] = useState<string[]>([]);
    
    useEffect(() => { 
        setWordData(HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)]); 
        setGuessed([]);
        setDisabledKeys([]);
        setMistakes(0);
        setWon(false);
    }, [level]);

    useEffect(() => {
        if(!wordData || won) return;
        if (boost === 'solve') {
            setGuessed([...guessed, ...wordData.word.split('')]);
            setWon(true);
            setTimeout(onWin, 1000);
            onBoostConsumed();
        } else if (boost === 'hint') {
            const ungessed = wordData.word.split('').filter(c => !guessed.includes(c));
            if (ungessed.length > 0) {
                setGuessed(prev => [...prev, ungessed[0]]);
            }
            onBoostConsumed();
        } else if (boost === 'half') {
            const allChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('');
            const correctChars = wordData.word.split('');
            const wrongChars = allChars.filter(c => !correctChars.includes(c) && !guessed.includes(c) && !disabledKeys.includes(c));
            const toRemove = wrongChars.slice(0, Math.ceil(wrongChars.length / 2));
            setDisabledKeys(prev => [...prev, ...toRemove]);
            onBoostConsumed();
        }
    }, [boost]);

    useEffect(() => {
        if (wordData && !won) {
            const isWinner = wordData.word.split('').every(char => guessed.includes(char));
            if (isWinner) {
                setWon(true);
                setTimeout(onWin, 1000);
            }
        }
    }, [guessed, wordData]);

    if (!wordData) return null;
    const isLoser = mistakes >= 6;

    const handleGuess = (char: string) => {
        if (guessed.includes(char) || disabledKeys.includes(char) || won || isLoser) return;
        setGuessed([...guessed, char]);
        if (!wordData.word.includes(char)) setMistakes(m => m + 1);
    };

    return (
        <div className="flex flex-col items-center w-full">
            <div className="relative w-20 h-20 border-b-4 border-white mb-2">
                <div className="absolute left-2 bottom-0 w-1 h-full bg-white"></div>
                <div className="absolute left-2 top-0 w-12 h-1 bg-white"></div>
                <div className="absolute left-12 top-0 w-1 h-4 bg-white"></div>
                {mistakes > 0 && <div className="absolute left-[42px] top-4 w-6 h-6 rounded-full border-2 border-white"></div>}
                {mistakes > 1 && <div className="absolute left-12 top-10 w-1 h-6 bg-white"></div>}
                {mistakes > 2 && <div className="absolute left-12 top-12 w-4 h-1 bg-white -rotate-45 origin-left"></div>}
                {mistakes > 3 && <div className="absolute left-12 top-12 w-4 h-1 bg-white rotate-45 origin-left"></div>}
                {mistakes > 4 && <div className="absolute left-12 top-16 w-4 h-1 bg-white -rotate-45 origin-top-left"></div>}
                {mistakes > 5 && <div className="absolute left-12 top-16 w-4 h-1 bg-white rotate-45 origin-top-left"></div>}
            </div>
            <p className="text-xs text-orange-400 mb-4 font-bold text-center max-w-xs">Hint: {wordData.hint}</p>
            <div className="flex flex-wrap justify-center gap-1 mb-4">
                {wordData.word.split('').map((char, i) => (
                    <div key={i} className="w-5 h-7 border-b-2 border-white flex items-end justify-center text-md font-bold">{guessed.includes(char) || isLoser ? char : ''}</div>
                ))}
            </div>
            <div className="flex flex-wrap justify-center gap-1">
                {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split('').map(char => (
                    <button 
                        key={char} 
                        onClick={() => handleGuess(char)} 
                        disabled={guessed.includes(char) || disabledKeys.includes(char) || won || isLoser} 
                        className={`w-7 h-8 rounded font-bold text-xs ${guessed.includes(char) ? 'bg-gray-900 text-gray-500' : disabledKeys.includes(char) ? 'bg-gray-800 opacity-20' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
                    >
                        {char}
                    </button>
                ))}
            </div>
        </div>
    );
};

const WordSearchGame: React.FC<GameEngineProps> = ({ level, onWin, boost, onBoostConsumed }) => {
    const [selected, setSelected] = useState<string[]>([]);
    const gridSize = Math.min(10, 6 + Math.floor(level / 50));
    const [grid, setGrid] = useState<string[][]>([]);
    const [targets, setTargets] = useState<string[]>([]);
    const [foundWords, setFoundWords] = useState<string[]>([]); 

    useEffect(() => {
        const wordData = WORD_SEARCH_LISTS[Math.floor(Math.random() * WORD_SEARCH_LISTS.length)];
        const words = wordData.words.slice(0, 3); 
        const newGrid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
        
        words.forEach(word => {
            let placed = false;
            let attempts = 0;
            while(!placed && attempts < 100) {
                const isVert = Math.random() > 0.5;
                const r = Math.floor(Math.random() * (gridSize - (isVert ? word.length : 0)));
                const c = Math.floor(Math.random() * (gridSize - (isVert ? 0 : word.length)));
                let fits = true;
                for(let i=0; i<word.length; i++) {
                    const cell = newGrid[isVert ? r+i : r][isVert ? c : c+i];
                    if (cell !== '' && cell !== word[i]) fits = false;
                }
                if(fits) {
                    for(let i=0; i<word.length; i++) newGrid[isVert ? r+i : r][isVert ? c : c+i] = word[i];
                    placed = true;
                }
                attempts++;
            }
        });

        for(let r=0; r<gridSize; r++) for(let c=0; c<gridSize; c++) if(newGrid[r][c] === '') newGrid[r][c] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random()*26)];
        
        setGrid(newGrid);
        setTargets(words);
        setSelected([]);
        setFoundWords([]);
    }, [level]);

    useEffect(() => {
        if(boost === 'solve') { 
            setFoundWords(targets);
            onWin(); 
            onBoostConsumed(); 
        } else if (boost === 'hint') { 
            const missing = targets.filter(t => !foundWords.includes(t));
            if (missing.length > 0) {
                alert(`Look for ${missing[0]}... it starts near the top/left?`);
            }
            onBoostConsumed(); 
        } else if (boost === 'half') {
            const missing = targets.filter(t => !foundWords.includes(t));
            const countToFind = Math.ceil(missing.length / 2);
            const toAdd = missing.slice(0, countToFind);
            setFoundWords(prev => [...prev, ...toAdd]);
            
            if (foundWords.length + countToFind >= targets.length) {
                onWin();
            }
            onBoostConsumed();
        }
    }, [boost]);

    const toggleCell = (r: number, c: number) => {
        const id = `${r}-${c}`;
        setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const checkWin = () => {
        onWin();
    };

    return (
        <div className="w-full text-center">
            <p className="mb-4 text-gray-300 text-xs">Find: <span className="font-bold text-white">{targets.map(t => foundWords.includes(t) ? <span key={t} className="text-green-500 line-through mr-1">{t}</span> : <span key={t} className="mr-1">{t}</span>)}</span></p>
            <div className="mx-auto bg-gray-800 p-1 rounded-lg inline-block">
                <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
                    {grid.map((row, r) => row.map((char, c) => (
                        <button key={`${r}-${c}`} onClick={() => toggleCell(r, c)} className={`w-7 h-7 flex items-center justify-center font-bold rounded-sm transition-colors text-sm ${selected.includes(`${r}-${c}`) ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}`}>{char}</button>
                    )))}
                </div>
            </div>
            <button onClick={checkWin} className="mt-4 block w-full bg-green-600 hover:bg-green-500 px-8 py-2 rounded-lg font-bold text-white text-sm">Found Them!</button>
        </div>
    );
};

const CrosswordGame: React.FC<GameEngineProps> = ({ level, onWin, boost, onBoostConsumed }) => {
    const template = CROSSWORD_TEMPLATES[0]; 
    const [inputs, setInputs] = useState<string[][]>(template.grid.map(row => row.map(cell => cell === '.' ? '.' : '')));

    useEffect(() => {
        if(boost === 'solve') { setInputs(template.grid); onBoostConsumed(); }
        else if (boost === 'hint') {
            for(let r=0;r<5;r++) for(let c=0;c<5;c++) {
                if(template.grid[r][c]!=='.' && inputs[r][c]!==template.grid[r][c]) {
                    const n = [...inputs.map(row=>[...row])]; n[r][c]=template.grid[r][c]; setInputs(n); onBoostConsumed(); return;
                }
            }
        } else if (boost === 'half') {
            const incorrectCells: {r: number, c: number}[] = [];
            for(let r=0;r<5;r++) for(let c=0;c<5;c++) {
                if(template.grid[r][c]!=='.' && inputs[r][c]!==template.grid[r][c]) {
                    incorrectCells.push({r,c});
                }
            }
            const countToFill = Math.ceil(incorrectCells.length / 2);
            const toFill = incorrectCells.sort(() => 0.5 - Math.random()).slice(0, countToFill);
            const n = [...inputs.map(row=>[...row])];
            toFill.forEach(({r,c}) => {
                n[r][c] = template.grid[r][c];
            });
            setInputs(n);
            onBoostConsumed();
        }
    }, [boost]);

    const handleChange = (r: number, c: number, val: string) => {
        const char = val.toUpperCase().slice(-1);
        if (template.grid[r][c] !== '.') {
            const newInputs = [...inputs.map(row => [...row])];
            newInputs[r][c] = char;
            setInputs(newInputs);
        }
    };

    const checkWin = () => {
        let isCorrect = true;
        for(let r=0; r<5; r++) for(let c=0; c<5; c++) if (template.grid[r][c] !== '.' && inputs[r][c] !== template.grid[r][c]) isCorrect = false;
        if (isCorrect) onWin(); else alert("Not correct yet!");
    };

    return (
        <div className="w-full flex flex-col items-center">
            <div className="grid grid-cols-5 gap-px bg-black p-1 border-2 border-gray-600 mb-4">
                {inputs.map((row, r) => row.map((cell, c) => {
                    const isBlack = template.grid[r][c] === '.';
                    return (
                        <div key={`${r}-${c}`} className={`w-8 h-8 relative ${isBlack ? 'bg-black' : 'bg-white'}`}>
                            {!isBlack && <input type="text" value={cell} onChange={e => handleChange(r, c, e.target.value)} className="w-full h-full text-center text-md font-bold text-black uppercase outline-none p-0" />}
                        </div>
                    )
                }))}
            </div>
            <div className="w-full grid grid-cols-2 gap-2 text-left text-[9px] text-gray-300 bg-gray-800 p-3 rounded-lg mb-4">
                <div><strong className="text-orange-400 block mb-1">Across</strong>{template.clues.across.map(clue => <p key={clue.num}>{clue.num}. {clue.text}</p>)}</div>
                <div><strong className="text-orange-400 block mb-1">Down</strong>{template.clues.down.map(clue => <p key={clue.num}>{clue.num}. {clue.text}</p>)}</div>
            </div>
            <button onClick={checkWin} className="bg-blue-600 px-6 py-2 rounded-full font-bold text-white text-sm">Check Puzzle</button>
        </div>
    );
};

const MemoryMatchGame: React.FC<GameEngineProps> = ({ level, onWin, boost, onBoostConsumed }) => {
    const [cards, setCards] = useState<{id: number, icon: string, flipped: boolean, matched: boolean}[]>([]);
    const [flippedIds, setFlippedIds] = useState<number[]>([]);
    const pairCount = Math.min(12, 4 + Math.floor(level / 10)); 
    
    useEffect(() => {
        const deckIcons = MEMORY_ICONS.slice(0, pairCount);
        const deck = [...deckIcons, ...deckIcons].sort(()=>0.5-Math.random()).map((icon, i) => ({ id: i, icon, flipped: false, matched: false }));
        setCards(deck);
    }, [level]);

    useEffect(() => {
        if (boost === 'solve') {
            setCards(cards.map(c => ({...c, flipped: true, matched: true})));
            setTimeout(onWin, 1000);
            onBoostConsumed();
        } else if (boost === 'hint') {
            const prev = cards.map(c => ({...c})); 
            setCards(prev.map(c => c.matched ? c : {...c, flipped: true}));
            setTimeout(() => { 
                setCards(prev); 
                onBoostConsumed(); 
            }, 1500);
        } else if (boost === 'half') {
            const unmatchedCards = cards.filter(c => !c.matched);
            const uniqueIcons = Array.from(new Set(unmatchedCards.map(c => c.icon)));
            const countToMatch = Math.ceil(uniqueIcons.length / 2);
            const iconsToMatch = uniqueIcons.slice(0, countToMatch);
            const newCards = cards.map(c => iconsToMatch.includes(c.icon) ? {...c, matched: true, flipped: true} : c);
            setCards(newCards);
            if (newCards.every(c => c.matched)) setTimeout(onWin, 500);
            onBoostConsumed();
        }
    }, [boost]);

    const handleCardClick = (id: number) => {
        if (flippedIds.length === 2 || cards.find(c => c.id === id)?.flipped || cards.find(c => c.id === id)?.matched) return;
        const newCards = cards.map(c => {
             if (c.id === id) return { ...c, flipped: true };
             return c;
        });
        setCards(newCards);
        const newFlipped = [...flippedIds, id];
        setFlippedIds(newFlipped);
        if (newFlipped.length === 2) {
            const c1 = newCards.find(c => c.id === newFlipped[0]);
            const c2 = newCards.find(c => c.id === newFlipped[1]);
            if (c1?.icon === c2?.icon) {
                setTimeout(() => {
                    setCards(prev => prev.map(c => newFlipped.includes(c.id) ? { ...c, matched: true } : c));
                    setFlippedIds([]);
                    if (cards.filter(c => !c.matched).length <= 2) setTimeout(onWin, 500);
                }, 500);
            } else {
                setTimeout(() => {
                    setCards(prev => prev.map(c => newFlipped.includes(c.id) ? { ...c, flipped: false } : c));
                    setFlippedIds([]);
                }, 1000);
            }
        }
    };

    return (
        <div className="flex flex-col items-center w-full">
            <div className="grid grid-cols-4 gap-2 p-2">
                {cards.map(card => {
                    const Icon = LucideIcons[card.icon as keyof typeof LucideIcons] || Brain;
                    return (
                        <div key={card.id} onClick={() => handleCardClick(card.id)} className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg cursor-pointer flex items-center justify-center transition-all duration-300 ${card.flipped || card.matched ? 'bg-orange-600 rotate-y-180' : 'bg-gray-700'}`}>
                            {(card.flipped || card.matched) && <Icon size={24} className="text-white" />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const TriviaTicTacToeGame: React.FC<GameEngineProps> = ({ level, onWin, boost, onBoostConsumed }) => {
    const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const [showQuestion, setShowQuestion] = useState(false);
    const [targetCell, setTargetCell] = useState<number | null>(null);
    const [currentQ, setCurrentQ] = useState<any>(null);
    const [qRemovedOptions, setQRemovedOptions] = useState<string[]>([]);

    useEffect(() => {
        setBoard(Array(9).fill(null));
        setIsPlayerTurn(true);
    }, [level]);

    useEffect(() => {
        if (!showQuestion || !currentQ) return;
        if (boost === 'solve') {
            handleAnswer(currentQ.a);
            onBoostConsumed();
        } else if (boost === 'hint') {
            alert(`Hint: The answer starts with '${currentQ.a.charAt(0)}'`);
            onBoostConsumed();
        } else if (boost === 'half') {
            const wrong = currentQ.options.filter((o: string) => o !== currentQ.a && !qRemovedOptions.includes(o));
            const toRemove = wrong.slice(0, 2);
            setQRemovedOptions(prev => [...prev, ...toRemove]);
            onBoostConsumed();
        }
    }, [boost, showQuestion]);

    const checkWinner = (b: (string | null)[]) => {
        const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for (let i=0; i<lines.length; i++) {
            const [x,y,z] = lines[i];
            if (b[x] && b[x]===b[y] && b[x]===b[z]) return b[x];
        }
        return null;
    };

    const handleCellClick = (i: number) => {
        if (board[i] || !isPlayerTurn) return;
        setTargetCell(i);
        const q = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];
        setCurrentQ(q);
        setQRemovedOptions([]);
        setShowQuestion(true);
    };

    const handleAnswer = (ans: string) => {
        if (ans === currentQ.a) {
            const newBoard = [...board];
            if (targetCell !== null) newBoard[targetCell] = 'X';
            setBoard(newBoard);
            setShowQuestion(false);
            if (checkWinner(newBoard) === 'X') {
                setTimeout(onWin, 500);
            } else {
                setIsPlayerTurn(false);
                setTimeout(() => botMove(newBoard), 1000);
            }
        } else {
            alert("Wrong answer! Turn lost.");
            setShowQuestion(false);
            setIsPlayerTurn(false);
            setTimeout(() => botMove(board), 1000);
        }
    };

    const botMove = (currentBoard: (string | null)[]) => {
        const empty = currentBoard.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];
        if (empty.length > 0) {
            const move = empty[Math.floor(Math.random() * empty.length)];
            const newBoard = [...currentBoard];
            newBoard[move] = 'O';
            setBoard(newBoard);
            if (checkWinner(newBoard) === 'O') alert("Bot Wins! Try again.");
            else setIsPlayerTurn(true);
        }
    };

    return (
        <div className="flex flex-col items-center p-2 w-full">
            {showQuestion ? (
                <div className="bg-gray-800 p-4 rounded-lg text-center w-full max-w-xs">
                    <p className="text-sm font-bold mb-4 text-white">{currentQ.q}</p>
                    <div className="grid grid-cols-1 gap-2">
                        {currentQ.options.map((o: string) => (
                            <button 
                                key={o} 
                                onClick={() => handleAnswer(o)} 
                                disabled={qRemovedOptions.includes(o)}
                                className={`p-2 rounded text-white text-sm ${qRemovedOptions.includes(o) ? 'bg-gray-900 opacity-20 cursor-not-allowed' : 'bg-gray-700 hover:bg-orange-600'}`}
                            >
                                {o}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-2 bg-gray-600 p-2 rounded-lg">
                    {board.map((cell, i) => (
                        <div key={i} onClick={() => handleCellClick(i)} className="w-16 h-16 bg-gray-800 flex items-center justify-center text-3xl font-bold text-white cursor-pointer hover:bg-gray-700">
                            {cell === 'X' && <X className="text-blue-500" size={32}/>}
                            {cell === 'O' && <CircleDashed className="text-red-500" size={32}/>}
                        </div>
                    ))}
                </div>
            )}
            <p className="mt-4 text-gray-400 text-xs">{isPlayerTurn ? "Your Turn" : "Bot Thinking..."}</p>
        </div>
    );
};

const TimelineGame: React.FC<GameEngineProps> = ({ level, onWin, boost, onBoostConsumed }) => {
    const [events, setEvents] = useState(TIMELINE_EVENTS.sort(() => Math.random() - 0.5));
    useEffect(() => {
        if (boost === 'solve') {
            setEvents([...TIMELINE_EVENTS].sort((a,b) => a.year - b.year));
            onBoostConsumed();
        } else if (boost === 'hint') {
            const sorted = [...TIMELINE_EVENTS].sort((a,b) => a.year - b.year);
            const current = [...events];
            for(let i=0; i<sorted.length; i++) {
                if (current[i].id !== sorted[i].id) {
                    const correctId = sorted[i].id;
                    const correctIdxInCurrent = current.findIndex(e => e.id === correctId);
                    const temp = current[i];
                    current[i] = current[correctIdxInCurrent];
                    current[correctIdxInCurrent] = temp;
                    setEvents(current);
                    alert(`Moved "${sorted[i].text}" to correct position.`);
                    break;
                }
            }
            onBoostConsumed();
        } else if (boost === 'half') {
            const sorted = [...TIMELINE_EVENTS].sort((a,b) => a.year - b.year);
            const halfCount = Math.ceil(sorted.length / 2);
            const topHalfCorrect = sorted.slice(0, halfCount);
            const rest = events.filter(e => !topHalfCorrect.some(c => c.id === e.id));
            setEvents([...topHalfCorrect, ...rest]);
            onBoostConsumed();
        }
    }, [boost]);

    const moveEvent = (idx: number, direction: number) => {
        const newEvents = [...events];
        const temp = newEvents[idx];
        newEvents[idx] = newEvents[idx + direction];
        newEvents[idx + direction] = temp;
        setEvents(newEvents);
    };

    const check = () => {
        let sorted = true;
        for(let i=0; i<events.length-1; i++) if(events[i].year > events[i+1].year) sorted = false;
        if(sorted) onWin(); else alert("Order is incorrect.");
    };

    return (
        <div className="p-2 w-full max-w-xs">
            <p className="text-center mb-2 text-gray-300 text-xs">Order: Oldest (Top) to Newest (Bottom)</p>
            <div className="space-y-2 mb-4">
                {events.map((ev, i) => (
                    <div key={ev.id} className="bg-gray-800 p-2 rounded-lg flex justify-between items-center border border-gray-700 text-xs">
                        <span className="font-bold text-white">{ev.text}</span>
                        <div className="flex flex-col">
                            <button onClick={() => moveEvent(i, -1)} disabled={i === 0} className="text-orange-500 disabled:text-gray-600"><ArrowDown size={14} className="rotate-180"/></button>
                            <button onClick={() => moveEvent(i, 1)} disabled={i === events.length - 1} className="text-orange-500 disabled:text-gray-600"><ArrowDown size={14}/></button>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={check} className="w-full bg-green-600 py-2 rounded-lg font-bold text-white text-sm">Check Order</button>
        </div>
    );
};

const CapitalCityGame: React.FC<GameEngineProps> = ({ level, onWin, boost, onBoostConsumed }) => {
    const [q, setQ] = useState<any>(null);
    const [streak, setStreak] = useState(0);
    const [removedOptions, setRemovedOptions] = useState<string[]>([]);
    const reqStreak = Math.min(20, 5 + Math.floor(level / 10));
    useEffect(() => { loadQ(); }, [level]);
    const loadQ = () => {
        const item = CAPITALS[Math.floor(Math.random() * CAPITALS.length)];
        const distractors = CAPITALS.filter(c => c.city !== item.city).sort(() => 0.5 - Math.random()).slice(0, 3).map(c => c.city);
        setQ({ ...item, options: [...distractors, item.city].sort(() => 0.5 - Math.random()) });
        setRemovedOptions([]);
    };
    useEffect(() => {
        if(!q) return;
        if (boost === 'solve') {
            onWin();
            onBoostConsumed();
        } else if (boost === 'hint') {
            alert(`Starts with ${q.city.charAt(0)}`);
            onBoostConsumed();
        } else if (boost === 'half') {
            const wrong = q.options.filter((o:string) => o !== q.city && !removedOptions.includes(o));
            const toRemove = wrong.slice(0, 2);
            setRemovedOptions(prev => [...prev, ...toRemove]);
            onBoostConsumed();
        }
    }, [boost]);
    const handleGuess = (ans: string) => {
        if (ans === q.city) {
            if (streak + 1 >= reqStreak) onWin();
            else { setStreak(s => s + 1); loadQ(); }
        } else {
            setStreak(0); alert("Wrong!"); loadQ();
        }
    };
    if (!q) return null;
    return (
        <div className="p-4 w-full text-center">
            <p className="text-gray-400 mb-2 text-xs">Level {level} • Streak {streak}/{reqStreak}</p>
            <h3 className="text-lg font-bold text-white mb-4">Capital of {q.country}?</h3>
            <div className="grid grid-cols-2 gap-3">
                {q.options.map((opt: string) => (
                    <button key={opt} onClick={() => handleGuess(opt)} disabled={removedOptions.includes(opt)} className={`p-3 rounded-lg text-white font-bold transition-colors text-sm ${removedOptions.includes(opt) ? 'bg-gray-800 opacity-20 cursor-not-allowed' : 'bg-gray-700 hover:bg-cyan-700'}`}>{opt}</button>
                ))}
            </div>
        </div>
    );
};

const SynonymGame: React.FC<GameEngineProps> = ({ level, onWin, boost, onBoostConsumed }) => {
    const [q, setQ] = useState<any>(null);
    const [streak, setStreak] = useState(0);
    const [removedOptions, setRemovedOptions] = useState<string[]>([]);
    const reqStreak = Math.min(20, 5 + Math.floor(level / 10));
    useEffect(() => { loadQ(); }, [level]);
    const loadQ = () => {
        const item = SYNONYMS[Math.floor(Math.random() * SYNONYMS.length)];
        setQ(item);
        setRemovedOptions([]);
    };
    useEffect(() => {
        if(!q) return;
        if (boost === 'solve') {
            onWin();
            onBoostConsumed();
        } else if (boost === 'hint') {
            alert(`Starts with ${q.synonym.charAt(0)}`);
            onBoostConsumed();
        } else if (boost === 'half') {
            const wrong = q.options.filter((o:string) => o !== q.synonym && !removedOptions.includes(o));
            const toRemove = wrong.slice(0, 2);
            setRemovedOptions(prev => [...prev, ...toRemove]);
            onBoostConsumed();
        }
    }, [boost]);
    const handleGuess = (ans: string) => {
        if (ans === q.synonym) {
            if (streak + 1 >= reqStreak) onWin();
            else { setStreak(s => s + 1); loadQ(); }
        } else {
            setStreak(0); alert("Wrong!"); loadQ();
        }
    };
    if (!q) return null;
    return (
        <div className="p-4 w-full text-center">
            <p className="text-gray-400 mb-2 text-xs">Level {level} • Streak {streak}/{reqStreak}</p>
            <h3 className="text-sm font-bold text-white mb-1">Synonym for:</h3>
            <h2 className="text-3xl font-black text-pink-500 mb-6">{q.word}</h2>
            <div className="grid grid-cols-2 gap-3">
                {q.options.map((opt: string) => (
                    <button key={opt} onClick={() => handleGuess(opt)} disabled={removedOptions.includes(opt)} className={`p-3 rounded-lg text-white font-bold transition-colors text-sm ${removedOptions.includes(opt) ? 'bg-gray-800 opacity-20 cursor-not-allowed' : 'bg-gray-700 hover:bg-pink-700'}`}>{opt}</button>
                ))}
            </div>
        </div>
    );
};

const OddOneOutGame: React.FC<GameEngineProps> = ({ level, onWin, boost, onBoostConsumed }) => {
    const [q, setQ] = useState<any>(null);
    const [streak, setStreak] = useState(0);
    const [removedOptions, setRemovedOptions] = useState<string[]>([]);
    const reqStreak = Math.min(15, 5 + Math.floor(level / 10));
    useEffect(() => { loadQ(); }, [level]);
    const loadQ = () => {
        setQ(ODD_ONE_OUT[Math.floor(Math.random() * ODD_ONE_OUT.length)]);
        setRemovedOptions([]);
    };
    useEffect(() => {
        if(!q) return;
        if (boost === 'solve') {
            onWin();
            onBoostConsumed();
        } else if (boost === 'hint') {
            alert(`Hint: ${q.reason}`);
            onBoostConsumed();
        } else if (boost === 'half') {
            const wrong = q.options.filter((o:string) => o !== q.answer && !removedOptions.includes(o));
            const toRemove = wrong.slice(0, 2);
            setRemovedOptions(prev => [...prev, ...toRemove]);
            onBoostConsumed();
        }
    }, [boost]);
    const handleGuess = (ans: string) => {
        if (ans === q.answer) {
            if (streak + 1 >= reqStreak) onWin();
            else { setStreak(s => s + 1); loadQ(); }
        } else {
            setStreak(0); alert("Wrong!"); loadQ();
        }
    };
    if (!q) return null;
    return (
        <div className="p-4 w-full text-center">
            <p className="text-gray-400 mb-2 text-xs">Level {level} • Streak {streak}/{reqStreak}</p>
            <h3 className="text-lg font-bold text-white mb-4">Which does NOT belong?</h3>
            <div className="grid grid-cols-1 gap-2">
                {q.options.map((opt: string) => (
                    <button key={opt} onClick={() => handleGuess(opt)} disabled={removedOptions.includes(opt)} className={`p-3 rounded-lg text-white font-bold transition-colors text-sm ${removedOptions.includes(opt) ? 'bg-gray-800 opacity-20 cursor-not-allowed' : 'bg-gray-700 hover:bg-emerald-700'}`}>{opt}</button>
                ))}
            </div>
        </div>
    );
};

const ArcadePage: React.FC<ArcadePageProps> = ({ user, userData }) => {
    const [activeTab, setActiveTab] = useState<'games' | 'leaderboard'>('games');
    const [activeGame, setActiveGame] = useState<string | null>(null);
    const [showTutorial, setShowTutorial] = useState(false);
    const [activeBoost, setActiveBoost] = useState<BoostType>(null);
    const [showWinOverlay, setShowWinOverlay] = useState(false);
    const [internalLevel, setInternalLevel] = useState(1);
    const [isTransitioning, setIsTransitioning] = useState(false);
    
    const [downloadingAssets, setDownloadingAssets] = useState(false);
    const [assetsStatus, setAssetsStatus] = useState<'checked' | 'downloading' | 'ready'>('checked');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    const navigate = useNavigate();
    const isPro = userData?.subscriptionStatus === 'pro' || userData?.subscriptionStatus === 'day_pass';

    useEffect(() => {
        const handleStatusChange = () => setIsOffline(!navigator.onLine);
        window.addEventListener('online', handleStatusChange);
        window.addEventListener('offline', handleStatusChange);
        return () => {
            window.removeEventListener('online', handleStatusChange);
            window.removeEventListener('offline', handleStatusChange);
        };
    }, []);

    // SILENT BACKGROUND ASSET CHECK & DOWNLOAD
    useEffect(() => {
        const checkAndDownloadAssets = async () => {
            if (!navigator.onLine) return;
            
            let missingAssets = false;
            if (FLAGS.length > 0) {
                // Check if assets are already present
                const hasFirst = await hasGameAsset(`flag_${FLAGS[0].code}`);
                if (!hasFirst) missingAssets = true;
                else setAssetsStatus('ready');
            }

            // Silent background download if missing
            if (missingAssets) {
                console.log("[Arcade] Missing assets detected. Initiating background download...");
                for (const flag of FLAGS) {
                    const id = `flag_${flag.code}`;
                    const url = `https://flagcdn.com/w320/${flag.code}.png`;
                    await saveGameAsset(id, url);
                }
                setAssetsStatus('ready');
            }
        };
        checkAndDownloadAssets();
    }, []);

    const handleDownloadAssets = async () => {
        if (!navigator.onLine) {
            alert("You need to be online to download game assets.");
            return;
        }
        setDownloadingAssets(true);
        setAssetsStatus('downloading');
        let successCount = 0;
        const total = FLAGS.length;
        for (const flag of FLAGS) {
            const url = `https://flagcdn.com/w320/${flag.code}.png`;
            const id = `flag_${flag.code}`;
            const success = await saveGameAsset(id, url);
            if (success) successCount++;
        }
        setDownloadingAssets(false);
        setAssetsStatus('ready');
        alert(`Downloaded ${successCount}/${total} flags for offline play!`);
    };

    const launchGame = (gameId: string, isFree: boolean) => {
        if (!user || !userData) { navigate('/auth'); return; }
        if (!isFree && !isPro) { navigate('/upgrade'); return; } 
        const savedLevel = (userData.gameProgress?.[gameId] || 0) + 1;
        setInternalLevel(savedLevel);
        const hasSeenTutorial = localStorage.getItem(`tutorial_seen_${gameId}`);
        if (savedLevel === 1 && !hasSeenTutorial) setShowTutorial(true);
        else setShowTutorial(false);
        setActiveGame(gameId);
        setActiveBoost(null);
        setShowWinOverlay(false);
    };

    const handleBoostConsumption = async (type: 'hint' | 'half' | 'solve') => {
        if (!user) return;
        setActiveBoost(type);
        await useArcadeBoost(user.uid, type);
    };

    const handleBoostReset = () => { setActiveBoost(null); };

    const handleWin = async () => {
        if (user && activeGame && !showWinOverlay && !isTransitioning) {
            const points = calculatePoints(activeGame, internalLevel);
            await updateUserPoints(user.uid, points);
            setShowWinOverlay(true);
        }
    };

    const handleNextLevel = async () => {
        if (user && activeGame) {
            setIsTransitioning(true);
            setActiveBoost(null);
            setTimeout(async () => {
                const nextLvl = internalLevel + 1;
                setInternalLevel(nextLvl);
                await saveGameProgress(user.uid, activeGame, nextLvl);
                setShowWinOverlay(false);
                setIsTransitioning(false); 
            }, 100);
        }
    };

    const handleQuit = () => { setActiveGame(null); setShowWinOverlay(false); };

    const renderActiveGame = () => {
        if (isTransitioning) {
            return <div className="flex items-center justify-center h-[70vh] bg-gray-900"><Loader2 className="animate-spin text-orange-500" size={48} /></div>;
        }
        const commonProps = { key: `${activeGame}-${internalLevel}`, level: internalLevel, onWin: handleWin, boost: activeBoost, onBoostConsumed: handleBoostReset };
        let GameComponent = null;
        switch(activeGame) {
            case 'sudoku': GameComponent = <SudokuGame {...commonProps} />; break;
            case 'flags': GameComponent = <FlagGame {...commonProps} />; break;
            case 'hangman': GameComponent = <HangmanGame {...commonProps} />; break;
            case 'word-search': GameComponent = <WordSearchGame {...commonProps} />; break;
            case 'crossword': GameComponent = <CrosswordGame {...commonProps} />; break;
            case 'tic-tac-trivia': GameComponent = <TriviaTicTacToeGame {...commonProps} />; break;
            case 'memory': GameComponent = <MemoryMatchGame {...commonProps} />; break;
            case 'timeline': GameComponent = <TimelineGame {...commonProps} />; break;
            case 'capital-city': GameComponent = <CapitalCityGame {...commonProps} />; break;
            case 'synonym-blast': GameComponent = <SynonymGame {...commonProps} />; break;
            case 'odd-one-out': GameComponent = <OddOneOutGame {...commonProps} />; break;
            default: return null;
        }
        const pointsForLevel = activeGame ? calculatePoints(activeGame, internalLevel) : 0;
        return (
            <div className="flex flex-col h-[70vh] w-full bg-gray-900 rounded-lg overflow-hidden relative">
                <div className="flex justify-between items-center p-3 bg-gray-800 border-b border-gray-700 shrink-0">
                    <span className="font-bold text-orange-400">Level {internalLevel}</span>
                    <span className="text-xs text-gray-400">Win: +{pointsForLevel} pts</span>
                </div>
                <div className="flex-grow overflow-y-auto p-4 custom-scrollbar flex flex-col items-center w-full">
                    {GameComponent}
                </div>
                <BoostBar userData={userData} onBoost={handleBoostConsumption} />
                {showWinOverlay && (
                    <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6 text-center animate-fade-in backdrop-blur-sm">
                        <Trophy size={64} className="text-yellow-400 mb-4 animate-bounce" />
                        <h2 className="text-3xl font-bold text-white mb-2">Level Complete!</h2>
                        <p className="text-green-400 font-bold text-xl mb-8">+{pointsForLevel} Points</p>
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <button onClick={handleNextLevel} className="w-full py-3 bg-orange-600 hover:bg-orange-700 rounded-xl font-bold text-white flex items-center justify-center shadow-lg transform hover:scale-105 transition-all"><ArrowRight size={18} className="ml-2"/> Next Level</button>
                            <button onClick={handleQuit} className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-white flex items-center justify-center"><LogOut size={18} className="mr-2"/> Quit</button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="pb-24 max-w-5xl mx-auto px-4">
            <div className="flex items-center justify-between mb-2 pt-4">
                <h1 className="text-4xl font-extrabold text-orange-500 flex items-center tracking-tight"><Gamepad2 className="mr-3" size={36} /> Arcade</h1>
                <div className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-full border border-gray-700"><Star className="text-yellow-400 fill-current" size={18} /><span className="font-bold text-white">{formatPoints(userData?.points || 0)} PTS</span></div>
            </div>

            <ConnectivityStatus isOffline={isOffline} isPro={isPro} />

            <div className="flex border-b-2 border-gray-700 mb-8">
                <button onClick={() => setActiveTab('games')} className={`flex-1 py-4 font-bold text-lg transition-colors ${activeTab === 'games' ? 'text-orange-500 border-b-4 border-orange-500 -mb-[2px]' : 'text-gray-400 hover:text-white'}`}>Game Library</button>
                <button onClick={() => setActiveTab('leaderboard')} className={`flex-1 py-4 font-bold text-lg transition-colors ${activeTab === 'leaderboard' ? 'text-orange-500 border-b-4 border-orange-500 -mb-[2px]' : 'text-gray-400 hover:text-white'}`}>Leaderboard</button>
            </div>
            {activeTab === 'games' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {GAMES_LIST.map(game => (
                        <div key={game.id} onClick={() => launchGame(game.id, game.free)} className={`group relative bg-gray-800 rounded-2xl p-6 border-2 border-gray-700 cursor-pointer hover:border-orange-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[180px] ${!game.free && !isPro ? 'opacity-75' : ''}`}>
                            <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold flex items-center ${!game.free ? 'bg-gray-700 text-gray-300' : 'bg-green-600/20 text-green-400 border border-green-600/50'}`}>
                                {!game.free ? <><Lock size={12} className="mr-1"/> Pro</> : "Free"}
                            </div>
                            <div className="flex items-start space-x-5">
                                <div className={`p-4 rounded-2xl ${game.color} text-white shadow-lg group-hover:scale-110 transition-transform`}><game.icon size={32} strokeWidth={2.5}/></div>
                                <div><h3 className="font-black text-xl text-white mb-1 group-hover:text-orange-400 transition-colors">{game.name}</h3><p className="text-sm text-gray-400 leading-snug">{game.description}</p></div>
                            </div>
                            <div className="mt-6 flex items-center justify-between border-t border-gray-700/50 pt-4">
                                <div className="flex flex-col"><span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Level</span><span className="text-white font-bold">{(userData?.gameProgress?.[game.id] || 0) + 1}</span></div>
                                <button className="bg-gray-700 group-hover:bg-white group-hover:text-orange-600 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors flex items-center"><Play size={16} className="mr-2 fill-current" /> Play</button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <LeaderboardPage user={user} userData={userData} />
            )}
            {showTutorial && activeGame && <GameTutorial gameId={activeGame} onComplete={() => setShowTutorial(false)} />}
            <Modal isOpen={!!activeGame && !showTutorial} onClose={() => setActiveGame(null)} title={GAMES_LIST.find(g=>g.id===activeGame)?.name || 'Game'}>
                {activeGame && !showTutorial && renderActiveGame()}
            </Modal>
        </div>
    );
};

export default ArcadePage;
