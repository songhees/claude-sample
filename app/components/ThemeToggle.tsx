'use client'

import { useTheme } from '../providers/ThemeProvider'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1000,
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: '1px solid',
        borderColor: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(30,58,138,0.3)',
        background: theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(220,232,255,0.9)',
        color: theme === 'dark' ? '#8fb2ff' : '#1e3a8a',
        cursor: 'pointer',
        fontSize: 18,
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
      }}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  )
}
