import { BrowserRouter, Routes, Route } from "react-router-dom";
import './styles/global.css';

import { Music2, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import Player from './components/Player';

function App() {
  return <Player />;
}

export default App;