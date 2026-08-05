import React from 'react'
import { createRoot } from 'react-dom/client'
import { EditorApp } from './EditorApp'
import './styles.css'
import './overrides.css'
createRoot(document.getElementById('root')!).render(<React.StrictMode><EditorApp /></React.StrictMode>)
