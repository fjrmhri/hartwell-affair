import { createRoot } from 'react-dom/client';

// Self-hosted fonts, subset latin saja (semua glyph UI/cerita ada di rentang latin).
// Catatan: berkas per-subset @fontsource tidak punya unicode-range, jadi latin-ext tidak boleh
// diimpor bersamaan (akan menimpa latin). Bila kelak butuh glyph latin-ext, pakai varian gabungan (mis. 500.css).
import '@fontsource/playfair-display/latin-700.css';
import '@fontsource/playfair-display/latin-900.css';
import '@fontsource/oswald/latin-500.css';
import '@fontsource/crimson-pro/latin-400.css';
import '@fontsource/crimson-pro/latin-400-italic.css';

import App from './App.jsx';
import './styles.css';
createRoot(document.getElementById('root')).render(<App />);
