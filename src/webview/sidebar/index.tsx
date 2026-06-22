import React from 'react';
import ReactDOM from 'react-dom/client';
import '../global.css';
import { SidebarApp } from './SidebarApp';

const root = ReactDOM.createRoot(document.getElementById('app')!);
root.render(<SidebarApp />);
